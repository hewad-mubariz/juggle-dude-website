-- Additive website admin infrastructure. Existing mobile RPCs and immutable
-- device session totals are untouched. Only the server service role can call these.
begin;
create schema if not exists private;
create table private.admin_review_sessions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 reviewer text not null check(char_length(reviewer) between 1 and 120),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 check(expires_at > created_at and expires_at <= created_at + interval '4 hours')
);
create table private.admin_review_login_limits (
 key text primary key check(key ~ '^[a-f0-9]{64}$'),
 window_start timestamptz not null, attempts integer not null check(attempts>0)
);
create table private.admin_review_evidence (
 token_hash text not null references private.admin_review_sessions(token_hash) on delete cascade,
 attempt_id uuid not null references public.leaderboard_attempts(id) on delete cascade,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), verified_at timestamptz not null default now(),
 primary key(token_hash,attempt_id)
);
create table private.admin_review_batches (
 id uuid primary key, attempt_id uuid not null references public.leaderboard_attempts(id) on delete cascade,
 reviewer text not null, choices jsonb not null, reason text not null,
 count integer, start_ms integer, end_ms integer,
 created_at timestamptz not null default now()
);
alter table private.admin_review_sessions enable row level security;
alter table private.admin_review_login_limits enable row level security;
alter table private.admin_review_evidence enable row level security;
alter table private.admin_review_batches enable row level security;
revoke all on private.admin_review_sessions,private.admin_review_login_limits,private.admin_review_evidence,private.admin_review_batches from public,anon,authenticated;
grant all on private.admin_review_sessions,private.admin_review_login_limits,private.admin_review_evidence,private.admin_review_batches to service_role;

create function public.admin_review_login_allowed(p_ip text,p_global text) returns boolean
language plpgsql security definer set search_path='' as $$
declare k text; n integer; i integer:=0;
begin
 if p_ip !~ '^[a-f0-9]{64}$' or p_global !~ '^[a-f0-9]{64}$' or p_ip is null or p_global is null then return false; end if;
 delete from private.admin_review_login_limits where window_start<now()-interval '1 day';
 delete from private.admin_review_sessions where expires_at<now();
 foreach k in array array[p_ip,p_global] loop
  i:=i+1;
  insert into private.admin_review_login_limits(key,window_start,attempts) values(k,now(),1)
  on conflict(key) do update set
   attempts=case when admin_review_login_limits.window_start<now()-interval '15 minutes' then 1 else admin_review_login_limits.attempts+1 end,
   window_start=case when admin_review_login_limits.window_start<now()-interval '15 minutes' then now() else admin_review_login_limits.window_start end
  returning attempts into n;
  if n > (case when i=1 then 5 else 60 end) then return false; end if;
 end loop;
 return true;
end $$;
create function public.admin_review_create_session(p_token text,p_reviewer text) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into private.admin_review_sessions(token_hash,reviewer,expires_at) values(p_token,p_reviewer,now()+interval '4 hours');
end $$;
create function public.admin_review_session_valid(p_token text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.admin_review_sessions where token_hash=p_token and expires_at>now());
$$;
create function public.admin_review_logout(p_token text) returns void
language sql security definer set search_path='' as $$ delete from private.admin_review_sessions where token_hash=p_token; $$;
create function public.admin_review_verify_evidence(p_token text,p_id uuid,p_sha256 text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.admin_review_session_valid(p_token) or not exists(select 1 from public.leaderboard_attempts
  where id=p_id and video_sha256=p_sha256 and video_delete_requested_at is null and video_deleted_at is null
   and status in ('pending','approved','rejected')) then raise exception 'Evidence unavailable' using errcode='22023'; end if;
 insert into private.admin_review_evidence(token_hash,attempt_id,sha256) values(p_token,p_id,p_sha256)
 on conflict(token_hash,attempt_id) do update set sha256=excluded.sha256,verified_at=now();
end $$;
create function public.admin_review_queue(p_token text,p_status text,p_offset integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.admin_review_session_valid(p_token) then raise exception 'Unauthorized' using errcode='42501'; end if;
 if p_status is null or p_status not in ('pending','approved','rejected') or p_offset is null or p_offset not between 0 and 100000 then
  raise exception 'Invalid queue' using errcode='22023'; end if;
 select jsonb_build_object('items',coalesce((select jsonb_agg(row order by submitted_at,id) from (
  select a.submitted_at,a.id,(to_jsonb(a)-'object_path'-'video_sha256'-'video_bytes'-'touch_review') ||
   jsonb_build_object('touch_review',jsonb_build_object('moments',coalesce(a.touch_review->'moments','[]'::jsonb)),
    'player_name',p.display_name,'device_count',(to_jsonb(s)->>'streak_touches')::integer) as row
  from public.leaderboard_attempts a join public.profiles p on p.id=a.user_id
   join public.juggling_sessions s on s.user_id=a.user_id and s.id=a.session_id
  where a.status=p_status and p.deletion_requested_at is null
  order by a.submitted_at,a.id limit 25 offset p_offset
 ) q),'[]'::jsonb),
 'total',(select count(*) from public.leaderboard_attempts a join public.profiles p on p.id=a.user_id where a.status=p_status and p.deletion_requested_at is null),
 'pending',(select count(*) from public.leaderboard_attempts where status='pending'),
 'approved',(select count(*) from public.leaderboard_attempts where status='approved'),
 'rejected',(select count(*) from public.leaderboard_attempts where status='rejected')) into result;
 return result;
end $$;
create function public.admin_review_previous(p_token text,p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.admin_review_session_valid(p_token) then raise exception 'Unauthorized' using errcode='42501'; end if;
 return (select jsonb_build_object('choices',choices,'reason',reason,'created_at',created_at)
  from private.admin_review_batches where attempt_id=p_id order by created_at desc limit 1);
end $$;

-- The complete moment set, evidence receipt and final score are checked again
-- under the attempt row lock. A stale tab cannot overwrite a finished review.
create function public.admin_review_finish(p_token text,p_id uuid,p_request uuid,p_choices jsonb,
 p_count integer,p_start_ms integer,p_end_ms integer,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.leaderboard_attempts; reviewer_name text; saved private.admin_review_batches;
 m jsonb; c jsonb; ids text[]:='{}'; expected text[]; yes_count integer:=0; approved boolean; digest text;
begin
 select reviewer into reviewer_name from private.admin_review_sessions where token_hash=p_token and expires_at>now();
 if not found then raise exception 'Unauthorized' using errcode='42501'; end if;
 select * into a from public.leaderboard_attempts where id=p_id for update;
 if not found then raise exception 'Attempt unavailable' using errcode='22023'; end if;
 select * into saved from private.admin_review_batches where id=p_request;
 if found then
  if saved.attempt_id is distinct from p_id or saved.reviewer is distinct from reviewer_name
   or saved.choices is distinct from p_choices or saved.count is distinct from p_count
   or saved.start_ms is distinct from p_start_ms or saved.end_ms is distinct from p_end_ms
   or saved.reason is distinct from trim(p_reason) then raise exception 'Idempotency conflict' using errcode='23505'; end if;
  return jsonb_build_object('id',p_id,'status',a.status,'saved',true);
 end if;
 if a.status<>'pending' or a.video_delete_requested_at is not null or a.video_deleted_at is not null then
  raise exception 'Attempt already changed' using errcode='23505'; end if;
 select sha256 into digest from private.admin_review_evidence where token_hash=p_token and attempt_id=p_id
  and verified_at>now()-interval '1 hour' and sha256=a.video_sha256;
 if not found then raise exception 'Verify the video evidence first' using errcode='22023'; end if;
 if p_choices is null or jsonb_typeof(p_choices)<>'array' or jsonb_array_length(p_choices)>2000
  or p_reason is null or char_length(trim(p_reason)) not between 1 and 1000 then
  raise exception 'Invalid review' using errcode='22023'; end if;
 select coalesce(array_agg((value->>'kind')||'-'||(value->>'timeMS') order by (value->>'kind')||'-'||(value->>'timeMS')),'{}') into expected
  from jsonb_array_elements(coalesce(a.touch_review->'moments','[]')) where value->>'kind'<>'continuityGap';
 for c in select value from jsonb_array_elements(p_choices) loop
  if jsonb_typeof(c)<>'object' or c->>'decision' is null or c->>'decision' not in ('confirm','reject') or c->>'id' is null
   or (c->>'id')=any(ids) then raise exception 'Invalid moment decision' using errcode='22023'; end if;
  ids:=array_append(ids,c->>'id');
  if c->>'decision'='confirm' then yes_count:=yes_count+1; end if;
 end loop;
 select coalesce(array_agg(x order by x),'{}') into ids from unnest(ids) as x;
 if ids is distinct from expected then raise exception 'Decide every requested touch' using errcode='22023'; end if;
 approved:=yes_count>0 or (cardinality(expected)=0 and p_count is not null);
 if approved and (p_count is null or p_count not between 1 and a.proposed_count or p_start_ms is null
  or p_end_ms is null or p_start_ms<0 or p_end_ms<=p_start_ms or p_end_ms>a.duration_ms) then
  raise exception 'Invalid verified score' using errcode='22023'; end if;
 if not approved and (p_count is not null or p_start_ms is not null or p_end_ms is not null) then
  raise exception 'Rejected checks cannot change scores' using errcode='22023'; end if;
 perform public.review_leaderboard_attempt(p_id,approved,p_count,p_start_ms,p_end_ms,trim(p_reason),null,digest,reviewer_name);
 insert into private.admin_review_batches(id,attempt_id,reviewer,choices,reason,count,start_ms,end_ms)
 values(p_request,p_id,reviewer_name,p_choices,trim(p_reason),p_count,p_start_ms,p_end_ms);
 return jsonb_build_object('id',p_id,'status',case when approved then 'approved' else 'rejected' end,'saved',true);
end $$;
revoke all on function public.admin_review_login_allowed(text,text),public.admin_review_create_session(text,text),
 public.admin_review_session_valid(text),public.admin_review_logout(text),public.admin_review_verify_evidence(text,uuid,text),
 public.admin_review_queue(text,text,integer),public.admin_review_previous(text,uuid),
 public.admin_review_finish(text,uuid,uuid,jsonb,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.admin_review_login_allowed(text,text),public.admin_review_create_session(text,text),
 public.admin_review_session_valid(text),public.admin_review_logout(text),public.admin_review_verify_evidence(text,uuid,text),
 public.admin_review_queue(text,text,integer),public.admin_review_previous(text,uuid),
 public.admin_review_finish(text,uuid,uuid,jsonb,integer,integer,integer,text) to service_role;
notify pgrst,'reload schema';
commit;
