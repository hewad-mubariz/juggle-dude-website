-- Private, read-only account drill-down. No billing tokens, receipts or auth secrets.
begin;
create function public.admin_analytics_player(
  p_token text, p_user_id uuid, p_offset integer default 0, p_session_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  as_of timestamptz := now();
  person jsonb;
  result jsonb;
begin
  if not public.admin_review_session_valid(p_token) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if p_user_id is null or p_offset is null or p_offset < 0 or p_offset > 100000 or p_offset % 25 <> 0 then
    raise exception 'Invalid player filter' using errcode = '22023';
  end if;
  select jsonb_build_object('user_id', p.id, 'player', p.display_name, 'country', p.country_code,
    'created_at', p.created_at, 'email', u.email, 'last_sign_in_at', u.last_sign_in_at)
  into person from public.profiles p left join auth.users u on u.id = p.id
  where p.id = p_user_id and p.deletion_requested_at is null;
  if person is null then return null; end if;

  with history as materialized (
    select id, user_id, touch_count, duration_ms, source, completed_at, received_at, app_version,
      counter_version, score_status, streak_touches, streak_start_ms, streak_end_ms
    from public.juggling_sessions
    where user_id = p_user_id and completed_at <= as_of
  ), subscriptions as materialized (
    select product_id, status, to_timestamp(access_until_ms / 1000.0) as access_until, updated_at,
      (status in (1, 4) and access_until_ms > extract(epoch from as_of) * 1000) as has_access
    from private.apple_subscriptions where user_id = p_user_id and environment = 'Production'
  )
  select jsonb_build_object(
    'generated_at', as_of, 'profile', person, 'offset', p_offset,
    'summary', (select jsonb_build_object(
      'sessions', count(*), 'recordings', count(*) filter(where source = 'recording'),
      'imports', count(*) filter(where source = 'gallery'), 'touches', coalesce(sum(touch_count), 0),
      'active_days', count(distinct (completed_at at time zone 'Europe/Berlin')::date),
      'first_session', min(completed_at), 'last_session', max(completed_at),
      'average_duration_seconds', coalesce(round(avg(duration_ms) / 1000.0, 1), 0),
      'most_touches', max(touch_count),
      'latest_app_version', (select app_version from history order by completed_at desc, received_at desc, id limit 1)
    ) from history),
    'pro', jsonb_build_object(
      'active', exists(select 1 from subscriptions where has_access), 'total', (select count(*) from subscriptions),
      'subscriptions', coalesce((select jsonb_agg(to_jsonb(s) order by has_access desc, updated_at desc, access_until desc, product_id)
        from (select * from subscriptions order by has_access desc, updated_at desc, access_until desc, product_id limit 20) s), '[]'::jsonb)
    ),
    'sessions', coalesce((select jsonb_agg(to_jsonb(s) order by completed_at desc, received_at desc, id)
      from (select * from history order by completed_at desc, received_at desc, id limit 25 offset p_offset) s), '[]'::jsonb),
    'selected_session', (select to_jsonb(s) from history s where id = p_session_id)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_analytics_player(text, uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.admin_analytics_player(text, uuid, integer, uuid) to service_role;
notify pgrst, 'reload schema';
commit;
