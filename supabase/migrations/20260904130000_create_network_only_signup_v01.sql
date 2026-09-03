begin;

-- A pre-auth signup intent is a short-lived proof issued only by the trusted
-- beta start action. It contains hashes only and never grants a product role.
create table public.network_signup_intents (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint network_signup_intents_email_hash_check
    check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint network_signup_intents_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint network_signup_intents_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '2 hours')
);

create index network_signup_intents_expiry_idx
  on public.network_signup_intents (expires_at);
alter table public.network_signup_intents enable row level security;
revoke all on public.network_signup_intents from public, anon, authenticated;
grant select, insert, delete on public.network_signup_intents to service_role;

comment on table public.network_signup_intents is
  'Short-lived, hashed beta signup proofs. Service-issued and consumed once after Magic Link authentication.';

-- Account settings must remain reachable for a suspended Network-only account,
-- while every Network product route continues to use is_network_member().
create or replace function public.has_network_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.network_memberships membership
    where membership.user_id = auth.uid()
  );
$$;

revoke all on function public.has_network_account() from public, anon;
grant execute on function public.has_network_account() to authenticated, service_role;

-- Only the server's service-role client can consume a proof. The function also
-- binds it to the authenticated Auth user's normalized email before inserting
-- the independent Network capability. Existing suspended memberships are never
-- reactivated by signing up again.
create or replace function public.claim_network_signup_intent(
  p_user_id uuid,
  p_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_intent_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_user_id is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  select lower(btrim(auth_user.email))
  into v_email
  from auth.users auth_user
  where auth_user.id = p_user_id
    and auth_user.email_confirmed_at is not null;

  if v_email is null or v_email = '' then
    return false;
  end if;

  delete from public.network_signup_intents intent
  where intent.token_hash = p_token_hash
    and intent.email_hash = encode(
      extensions.digest(convert_to(v_email, 'UTF8'), 'sha256'),
      'hex'
    )
    and intent.expires_at > now()
  returning intent.id into v_intent_id;

  if v_intent_id is null then
    return false;
  end if;

  insert into public.network_memberships(user_id, status)
  values (p_user_id, 'active')
  on conflict (user_id) do nothing;

  return public.is_network_member(p_user_id);
end;
$$;

revoke all on function public.claim_network_signup_intent(uuid, text)
from public, anon, authenticated;
grant execute on function public.claim_network_signup_intent(uuid, text)
to service_role;

comment on function public.claim_network_signup_intent(uuid, text) is
  'Consumes one trusted beta signup proof and grants only Network access; never Founder or Advisor roles.';

commit;
