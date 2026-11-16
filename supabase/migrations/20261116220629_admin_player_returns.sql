-- Lifetime return groups are independent of the overview's date/source filters.
-- Multiple clips on one Berlin calendar day are one visit, not a return.
begin;
create function public.admin_analytics_returns(
 p_token text, p_cohort text default 'exclude_invites',
 p_group text default 'returned', p_offset integer default 0
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 as_of timestamptz := now();
 today date := (now() at time zone 'Europe/Berlin')::date;
 result jsonb;
begin
 if not public.admin_review_session_valid(p_token) then
  raise exception 'Unauthorized' using errcode='42501';
 end if;
 if p_cohort is null or p_cohort not in ('all','exclude_invites','invites_only')
  or p_group is null or p_group not in ('returned','not_returned','no_sessions')
  or p_offset is null or p_offset<0 or p_offset>100000 or p_offset%25<>0 then
  raise exception 'Invalid return filter' using errcode='22023';
 end if;
 with invite_people as materialized (
  select distinct user_id from private.apple_subscriptions
  where environment='Production' and offer_code_redeemed
 ), people as materialized (
  select p.id,p.display_name,p.country_code,p.created_at from public.profiles p
  where p.deletion_requested_at is null and p.created_at<=as_of
   and (p_cohort='all'
    or (p_cohort='exclude_invites' and not exists(select 1 from invite_people i where i.user_id=p.id))
    or (p_cohort='invites_only' and exists(select 1 from invite_people i where i.user_id=p.id)))
 ), history as materialized (
  select p.id as user_id,p.display_name as player,p.country_code as country,p.created_at,
   count(s.id) as sessions,
   count(distinct (s.completed_at at time zone 'Europe/Berlin')::date) as active_days,
   min(s.completed_at) as first_session,max(s.completed_at) as last_session
  from people p left join public.juggling_sessions s on s.user_id=p.id and s.completed_at<=as_of
  group by p.id,p.display_name,p.country_code,p.created_at
 ), classified as materialized (
  select h.*,today-(last_session at time zone 'Europe/Berlin')::date as days_since_last,
   coalesce((first_session at time zone 'Europe/Berlin')::date=today,false) as first_day_today,
   case when active_days>=2 then 'returned' when active_days=1 then 'not_returned' else 'no_sessions' end as return_group
  from history h
 ), selected as (
  select * from classified where return_group=p_group
 )
 select jsonb_build_object(
  'generated_at',as_of,'timezone','Europe/Berlin','cohort',p_cohort,'group',p_group,'offset',p_offset,
  'summary',jsonb_build_object('accounts',(select count(*) from classified),
   'returned',(select count(*) from classified where return_group='returned'),
   'not_returned',(select count(*) from classified where return_group='not_returned'),
   'no_sessions',(select count(*) from classified where return_group='no_sessions'),
   'first_day_today',(select count(*) from classified where return_group='not_returned' and first_day_today)),
  'total',(select count(*) from selected),
  'rows',coalesce((select jsonb_agg(to_jsonb(r) order by last_session desc nulls last,created_at desc,user_id)
   from (select * from selected order by last_session desc nulls last,created_at desc,user_id limit 25 offset p_offset) r),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.admin_analytics_returns(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_analytics_returns(text,text,text,integer) to service_role;
notify pgrst,'reload schema';
commit;
