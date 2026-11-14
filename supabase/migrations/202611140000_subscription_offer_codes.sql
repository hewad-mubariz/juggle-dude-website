-- Analytics provenance only. No change to entitlement, ownership or expiry rules.
begin;
alter table private.apple_subscriptions add column offer_code_redeemed boolean not null default false;
comment on column private.apple_subscriptions.offer_code_redeemed is
  'Apple-verified offerType=3 seen in this chain. Sticky across renewals; not proof of signup source or a paid sale.';

create or replace function public.record_apple_subscription(p_user_id uuid, p_state jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.profiles where id = p_user_id
    and deletion_requested_at is null for update;
  if not found then raise exception 'account_unavailable' using errcode = '42501'; end if;
  insert into private.apple_subscriptions as existing
    (environment, original_transaction_id, user_id, product_id, status,
     expires_at_ms, access_until_ms, signed_at_ms, offer_code_redeemed)
  values (p_state->>'environment', p_state->>'original_transaction_id', p_user_id,
    p_state->>'product_id', (p_state->>'status')::integer,
    (p_state->>'expires_at_ms')::bigint, (p_state->>'access_until_ms')::bigint,
    (p_state->>'signed_at_ms')::bigint, coalesce((p_state->>'offer_code_redeemed')::boolean, false))
  on conflict (environment, original_transaction_id) do update set
    product_id = excluded.product_id, status = excluded.status,
    expires_at_ms = excluded.expires_at_ms, access_until_ms = excluded.access_until_ms,
    signed_at_ms = excluded.signed_at_ms, updated_at = now(),
    offer_code_redeemed = existing.offer_code_redeemed or excluded.offer_code_redeemed
  where existing.user_id = excluded.user_id and existing.signed_at_ms <= excluded.signed_at_ms;
  -- Older signed events can still establish historical code usage without replacing
  -- newer billing state. This flag never grants access and can only become true.
  if p_state->>'offer_code_redeemed' = 'true' then
    update private.apple_subscriptions set offer_code_redeemed = true
    where environment = p_state->>'environment'
      and original_transaction_id = p_state->>'original_transaction_id'
      and user_id = p_user_id and not offer_code_redeemed;
  end if;
  if exists (select 1 from private.apple_subscriptions
    where environment = p_state->>'environment'
      and original_transaction_id = p_state->>'original_transaction_id'
      and user_id <> p_user_id) then
    raise exception 'subscription_already_linked' using errcode = '23505';
  end if;
end;
$$;

revoke all on function public.record_apple_subscription(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_apple_subscription(uuid,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
