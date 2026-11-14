-- Private inventory of Apple's one-time codes. Usage marks are manual records,
-- separate from verified subscription entitlements and analytics provenance.
begin;
create table private.admin_invite_batches (
 id text primary key check(id ~ '^[0-9]{1,30}$'),
 label text not null check(char_length(label) between 1 and 120),
 plan text not null check(plan in ('monthly','yearly')),
 expires_at timestamptz not null,
 imported_at timestamptz not null default now()
);
create table private.admin_invite_codes (
 id uuid primary key default gen_random_uuid(),
 batch_id text not null references private.admin_invite_batches(id),
 code text unique not null check(code ~ '^[A-Z0-9]{8,32}$'),
 ordinal integer not null check(ordinal > 0),
 marked_used_at timestamptz,
 version integer not null default 0 check(version >= 0),
 unique(batch_id,ordinal)
);
create table private.admin_invite_audit (
 id bigint generated always as identity primary key,
 code_id uuid not null references private.admin_invite_codes(id),
 marked_used boolean not null,
 reviewer text not null,
 created_at timestamptz not null default now()
);
alter table private.admin_invite_batches enable row level security;
alter table private.admin_invite_codes enable row level security;
alter table private.admin_invite_audit enable row level security;
revoke all on private.admin_invite_batches,private.admin_invite_codes,private.admin_invite_audit from public,anon,authenticated;
grant all on private.admin_invite_batches,private.admin_invite_codes,private.admin_invite_audit to service_role;

create function private.admin_invite_row(p_id uuid) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',c.id,'batch_id',c.batch_id,'suffix',right(c.code,4),'ordinal',c.ordinal,
  'plan',b.plan,'label',b.label,'expires_at',b.expires_at,'expired',b.expires_at<=now(),
  'marked_used_at',c.marked_used_at,'version',c.version)
 from private.admin_invite_codes c join private.admin_invite_batches b on b.id=c.batch_id where c.id=p_id;
$$;
revoke all on function private.admin_invite_row(uuid) from public,anon,authenticated;

create function public.admin_invite_inventory(p_token text,p_batch text default 'all',p_status text default 'unmarked',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.admin_review_session_valid(p_token) then raise exception 'Unauthorized' using errcode='42501'; end if;
 if p_batch is null or (p_batch<>'all' and not exists(select 1 from private.admin_invite_batches where id=p_batch))
  or p_status is null or p_status not in ('all','unmarked','used','expired')
  or p_offset is null or p_offset<0 or p_offset>100000 or p_offset%25<>0 then
  raise exception 'Invalid invite filter' using errcode='22023';
 end if;
 with inventory as materialized (
  select c.*,b.expires_at,b.plan from private.admin_invite_codes c join private.admin_invite_batches b on b.id=c.batch_id
  where p_batch='all' or c.batch_id=p_batch
 ), selected as materialized (
  select * from inventory where p_status='all'
   or (p_status='unmarked' and marked_used_at is null and expires_at>now())
   or (p_status='used' and marked_used_at is not null)
   or (p_status='expired' and expires_at<=now() and marked_used_at is null)
 )
 select jsonb_build_object('batch',p_batch,'status',p_status,'offset',p_offset,
  'batches',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'plan',b.plan,'expires_at',b.expires_at,
    'total',(select count(*) from private.admin_invite_codes c where c.batch_id=b.id)) order by b.plan,b.id)
    from private.admin_invite_batches b),'[]'::jsonb),
  'summary',jsonb_build_object('total',(select count(*) from inventory),
    'unmarked',(select count(*) from inventory where marked_used_at is null and expires_at>now()),
    'used',(select count(*) from inventory where marked_used_at is not null),
    'expired',(select count(*) from inventory where marked_used_at is null and expires_at<=now()),
    'linked_invite_accounts',(select count(distinct s.user_id) from private.apple_subscriptions s join public.profiles p on p.id=s.user_id
      where s.environment='Production' and s.offer_code_redeemed and p.deletion_requested_at is null)),
  'total',(select count(*) from selected),
  'rows',coalesce((select jsonb_agg(private.admin_invite_row(r.id) order by r.plan,r.batch_id,r.ordinal)
    from (select * from selected order by plan,batch_id,ordinal limit 25 offset p_offset) r),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.admin_invite_find(p_token text,p_code text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.admin_review_session_valid(p_token) then raise exception 'Unauthorized' using errcode='42501'; end if;
 if p_code is null or p_code !~ '^[A-Z0-9]{8,32}$' then raise exception 'Invalid code' using errcode='22023'; end if;
 return (select private.admin_invite_row(id) from private.admin_invite_codes where code=p_code);
end $$;

create function public.admin_invite_copy(p_token text,p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.admin_review_session_valid(p_token) then raise exception 'Unauthorized' using errcode='42501'; end if;
 -- Recheck on the server, including when a different admin tab marked it used.
 return (select jsonb_build_object('code',c.code,'url','https://apps.apple.com/redeem?ctx=offercodes&id=6820780610&code='||c.code)
  from private.admin_invite_codes c join private.admin_invite_batches b on b.id=c.batch_id
  where c.id=p_id and c.marked_used_at is null and b.expires_at>now());
end $$;

create function public.admin_invite_mark(p_token text,p_id uuid,p_used boolean,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.admin_invite_codes; actor text;
begin
 select reviewer into actor from private.admin_review_sessions where token_hash=p_token and expires_at>now();
 if actor is null then raise exception 'Unauthorized' using errcode='42501'; end if;
 if p_used is null or p_version is null or p_version<0 then raise exception 'Invalid mark' using errcode='22023'; end if;
 select * into c from private.admin_invite_codes where id=p_id for update;
 if not found then return null; end if;
 if c.version<>p_version then raise exception 'Stale code status' using errcode='23505'; end if;
 if (c.marked_used_at is not null)<>p_used then
  update private.admin_invite_codes set marked_used_at=case when p_used then now() else null end,version=version+1 where id=p_id;
  insert into private.admin_invite_audit(code_id,marked_used,reviewer) values(p_id,p_used,actor);
 end if;
 return private.admin_invite_row(p_id);
end $$;
revoke all on function public.admin_invite_inventory(text,text,text,integer),public.admin_invite_find(text,text),
 public.admin_invite_copy(text,uuid),public.admin_invite_mark(text,uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.admin_invite_inventory(text,text,text,integer),public.admin_invite_find(text,text),
 public.admin_invite_copy(text,uuid),public.admin_invite_mark(text,uuid,boolean,integer) to service_role;
notify pgrst,'reload schema';
commit;
