-- Read-only operational analytics, behind the existing private admin session.
-- No browser/mobile role can execute this function or read subscription records.
begin;

create index if not exists juggling_sessions_analytics_date
  on public.juggling_sessions(completed_at desc, user_id);

create function public.admin_analytics(
  p_token text, p_days integer default 7, p_source text default 'all',
  p_list text default 'sessions', p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  as_of timestamptz := now();
  today date := (now() at time zone 'Europe/Berlin')::date;
  starts_at timestamptz;
  result jsonb;
begin
  if not public.admin_review_session_valid(p_token) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if p_days is null or p_days not in (7, 30, 90)
    or p_source is null or p_source not in ('all', 'recording', 'gallery')
    or p_list is null or p_list not in ('sessions', 'players', 'accounts', 'pro')
    or p_offset is null or p_offset < 0 or p_offset > 100000 or p_offset % 25 <> 0 then
    raise exception 'Invalid analytics filter' using errcode = '22023';
  end if;
  starts_at := (today - (p_days - 1))::timestamp at time zone 'Europe/Berlin';

  with people as materialized (
    select id, display_name, country_code, created_at from public.profiles
    where deletion_requested_at is null
  ), recent as materialized (
    select s.*, p.display_name as player, p.country_code as country
    from public.juggling_sessions s join people p on p.id = s.user_id
    where s.completed_at >= starts_at and s.completed_at <= as_of
      and (p_source = 'all' or s.source = p_source)
  ), players as materialized (
    select user_id, player, country, count(*) as sessions,
      count(distinct (completed_at at time zone 'Europe/Berlin')::date) as active_days,
      sum(touch_count) as touches, max(completed_at) as last_session
    from recent group by user_id, player, country
  ), accounts as materialized (
    select p.id as user_id, p.display_name as player, p.country_code as country,
      p.created_at, count(s.id) as sessions, max(s.completed_at) as last_session
    from people p left join public.juggling_sessions s on s.user_id = p.id and s.completed_at <= as_of
    where p.created_at >= starts_at and p.created_at <= as_of
    group by p.id, p.display_name, p.country_code, p.created_at
  ), pro as materialized (
    -- Count people, not transaction chains. A person can have multiple linked chains.
    select distinct on (s.user_id) s.user_id, p.display_name as player,
      s.product_id, s.status,
      to_timestamp(s.access_until_ms / 1000.0) as access_until,
      s.updated_at
    from private.apple_subscriptions s join people p on p.id = s.user_id
    where s.environment = 'Production' and s.status in (1, 4)
      and s.access_until_ms > extract(epoch from as_of) * 1000
    order by s.user_id, s.access_until_ms desc, s.updated_at desc, s.original_transaction_id
  ), daily_counts as (
    select (completed_at at time zone 'Europe/Berlin')::date as day,
      count(*) as sessions, count(distinct user_id) as players,
      count(*) filter (where source = 'recording') as recordings,
      count(*) filter (where source = 'gallery') as imports
    from recent group by 1
  ), daily as (
    select today - n as day, coalesce(d.sessions, 0) as sessions,
      coalesce(d.players, 0) as players, coalesce(d.recordings, 0) as recordings,
      coalesce(d.imports, 0) as imports
    from generate_series(0, p_days - 1) n
    left join daily_counts d on d.day = today - n
  ), versions as (
    select app_version, count(*) as players from (
      select distinct on (user_id) user_id, app_version from recent
      order by user_id, completed_at desc, received_at desc, id
    ) latest group by app_version
  ), countries as (
    select country, count(*) as players from players group by country
  ), selected_rows as (
    select to_jsonb(r) as row, row_number() over (order by completed_at desc, received_at desc, user_id, id) as position
    from (select id, user_id, player, country, completed_at, received_at,
      touch_count, duration_ms, source, app_version from recent) r
    where p_list = 'sessions'
    union all
    select to_jsonb(p), row_number() over (order by sessions desc, last_session desc, user_id)
    from players p where p_list = 'players'
    union all
    select to_jsonb(a), row_number() over (order by created_at desc, user_id)
    from accounts a where p_list = 'accounts'
    union all
    select to_jsonb(p), row_number() over (order by updated_at desc, user_id)
    from pro p where p_list = 'pro'
  )
  select jsonb_build_object(
    'generated_at', as_of, 'starts_at', starts_at, 'timezone', 'Europe/Berlin',
    'days', p_days, 'source', p_source, 'list', p_list, 'offset', p_offset,
    'summary', jsonb_build_object(
      'players', (select count(*) from players),
      'sessions', (select count(*) from recent),
      'recordings', (select count(*) from recent where source = 'recording'),
      'imports', (select count(*) from recent where source = 'gallery'),
      'returning_players', (select count(*) from players where active_days >= 2),
      'average_duration_seconds', (select coalesce(round(avg(duration_ms) / 1000.0, 1), 0) from recent),
      'new_accounts', (select count(*) from accounts),
      'new_accounts_with_sessions', (select count(*) from accounts where sessions > 0),
      'pro_accounts', (select count(*) from pro)
    ),
    'daily', (select jsonb_agg(to_jsonb(d) order by day) from daily d),
    'versions', coalesce((select jsonb_agg(to_jsonb(v) order by players desc, app_version) from versions v), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(to_jsonb(c) order by players desc, country nulls last) from countries c), '[]'::jsonb),
    'total', (select count(*) from selected_rows),
    'rows', coalesce((select jsonb_agg(row order by position) from selected_rows
      where position > p_offset and position <= p_offset + 25), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_analytics(text, integer, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.admin_analytics(text, integer, text, text, integer) to service_role;
notify pgrst, 'reload schema';
commit;
