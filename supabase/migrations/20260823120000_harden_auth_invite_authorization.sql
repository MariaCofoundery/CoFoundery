begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Founder invite acceptance is email-bound, single-assignee and idempotent for that assignee.
create or replace function public.accept_invitation(p_token text)
returns table (invitation_id uuid, relationship_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_inv public.invitations%rowtype;
  v_rel_id uuid;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if v_user_email = '' then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  v_hash := encode(digest(coalesce(p_token, ''), 'sha256'::text), 'hex');

  select * into v_inv
  from public.invitations
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'invalid_token';
  end if;

  if lower(btrim(v_inv.invitee_email)) <> v_user_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  if v_inv.status = 'accepted' then
    if v_inv.invitee_user_id is distinct from v_uid then
      raise exception 'invitation_already_accepted' using errcode = '42501';
    end if;

    insert into public.relationships(user_a_id, user_b_id)
    values (v_inv.inviter_user_id, v_uid)
    on conflict (user_low, user_high)
    do nothing
    returning id into v_rel_id;

    if v_rel_id is null then
      select id into v_rel_id
      from public.relationships
      where user_low = least(v_inv.inviter_user_id, v_uid)
        and user_high = greatest(v_inv.inviter_user_id, v_uid);
    end if;

    return query select v_inv.id, v_rel_id;
    return;
  end if;

  if v_inv.status = 'revoked' or v_inv.revoked_at is not null then
    raise exception 'revoked';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at < now() then
    raise exception 'expired';
  end if;

  if v_inv.status not in ('sent', 'opened') then
    raise exception 'invalid_invitation_status';
  end if;

  if v_inv.invitee_user_id is not null and v_inv.invitee_user_id is distinct from v_uid then
    raise exception 'invitation_already_accepted' using errcode = '42501';
  end if;

  insert into public.relationships(user_a_id, user_b_id)
  values (v_inv.inviter_user_id, v_uid)
  on conflict (user_low, user_high)
  do nothing
  returning id into v_rel_id;

  if v_rel_id is null then
    select id into v_rel_id
    from public.relationships
    where user_low = least(v_inv.inviter_user_id, v_uid)
      and user_high = greatest(v_inv.inviter_user_id, v_uid);
  end if;

  update public.invitations
  set status = 'accepted',
      invitee_user_id = v_uid,
      accepted_at = coalesce(accepted_at, now()),
      updated_at = now()
  where id = v_inv.id
    and status in ('sent', 'opened')
    and (invitee_user_id is null or invitee_user_id = v_uid);

  if not found then
    raise exception 'invitation_acceptance_conflict' using errcode = '40001';
  end if;

  return query select v_inv.id, v_rel_id;
end;
$$;

revoke all on function public.accept_invitation(text)
from public, anon, authenticated, service_role;
grant execute on function public.accept_invitation(text) to authenticated;

-- RLS cannot express OLD-vs-NEW column immutability, so this trigger is the field-level
-- companion to the narrowed inviter policy below. SECURITY DEFINER RPCs and service-role
-- maintenance retain the ability to perform the protected acceptance transition.
create or replace function public.enforce_invitation_client_security()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_revocation boolean := false;
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.invitee_user_id is not null
       or new.accepted_at is not null
       or new.revoked_at is not null
       or nullif(to_jsonb(new) ->> 'relationship_id', '') is not null
       or new.status::text <> 'sent' then
      raise exception 'invitation_security_fields_are_server_managed' using errcode = '42501';
    end if;
    return new;
  end if;

  v_is_revocation :=
    old.status::text in ('sent', 'opened')
    and new.status::text = 'revoked'
    and new.revoked_at is not null;

  if new.inviter_user_id is distinct from old.inviter_user_id
     or new.invitee_email is distinct from old.invitee_email
     or new.invitee_user_id is distinct from old.invitee_user_id
     or new.accepted_at is distinct from old.accepted_at
     or (to_jsonb(new) -> 'relationship_id') is distinct from
        (to_jsonb(old) -> 'relationship_id') then
    raise exception 'invitation_identity_fields_are_server_managed' using errcode = '42501';
  end if;

  if new.status is distinct from old.status and not v_is_revocation then
    raise exception 'invitation_acceptance_status_is_server_managed' using errcode = '42501';
  end if;

  if new.revoked_at is distinct from old.revoked_at and not v_is_revocation then
    raise exception 'invitation_revocation_state_is_invalid' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_invitations_enforce_client_security on public.invitations;
create trigger trg_invitations_enforce_client_security
before insert or update on public.invitations
for each row execute function public.enforce_invitation_client_security();

drop policy if exists invitations_update_inviter on public.invitations;
create policy invitations_update_inviter
on public.invitations
for update to authenticated
using (
  inviter_user_id = auth.uid()
  and status in ('sent', 'opened')
)
with check (inviter_user_id = auth.uid());

-- Legacy workbook-advisor invitations have no bound advisor email. Keep historical rows readable,
-- but prevent every client/service-role claim through that unverifiable identity path. The current
-- application uses relationship_advisors for all new, email-bound claims.
create or replace function public.block_unbound_legacy_advisor_claim()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.advisor_user_id is distinct from old.advisor_user_id then
    raise exception 'legacy_advisor_invitation_requires_reinvite' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_block_unbound_legacy_advisor_claim
on public.founder_alignment_workbook_advisors;
create trigger trg_block_unbound_legacy_advisor_claim
before update on public.founder_alignment_workbook_advisors
for each row execute function public.block_unbound_legacy_advisor_claim();

-- relationship_advisors is founder/server-managed. Advisors retain read access but no longer
-- receive a direct UPDATE/INSERT path. The trigger also makes both identity columns immutable
-- for normal authenticated clients, including founders.
create or replace function public.advisor_claim_email_matches(
  p_advisor_user_id uuid,
  p_advisor_email text
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = p_advisor_user_id
      and lower(btrim(coalesce(u.email, ''))) = lower(btrim(coalesce(p_advisor_email, '')))
      and nullif(btrim(coalesce(p_advisor_email, '')), '') is not null
  );
$$;

revoke all on function public.advisor_claim_email_matches(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.advisor_claim_email_matches(uuid, text)
to service_role;

create or replace function public.enforce_relationship_advisor_client_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_bound_email text;
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if current_user = 'service_role' then
    if tg_op = 'INSERT' then
      if new.advisor_user_id is null then
        return new;
      end if;
      v_bound_email := lower(btrim(coalesce(new.advisor_email, '')));
    else
      if new.relationship_id is distinct from old.relationship_id then
        raise exception 'advisor_relationship_identity_is_immutable' using errcode = '42501';
      end if;

      if new.advisor_user_id is not distinct from old.advisor_user_id then
        return new;
      end if;

      if old.advisor_user_id is not null
         or new.advisor_user_id is null
         or new.advisor_email is distinct from old.advisor_email then
        raise exception 'advisor_identity_is_immutable' using errcode = '42501';
      end if;

      v_bound_email := lower(btrim(coalesce(old.advisor_email, '')));
    end if;

    if v_bound_email = ''
       or not public.advisor_claim_email_matches(new.advisor_user_id, v_bound_email) then
      raise exception 'advisor_invitation_email_mismatch' using errcode = '42501';
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.advisor_user_id is not null then
      raise exception 'advisor_identity_is_server_managed' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.relationship_id is distinct from old.relationship_id
     or new.advisor_user_id is distinct from old.advisor_user_id then
    raise exception 'advisor_relationship_identity_is_immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_relationship_advisors_enforce_client_identity
on public.relationship_advisors;
create trigger trg_relationship_advisors_enforce_client_identity
before insert or update on public.relationship_advisors
for each row execute function public.enforce_relationship_advisor_client_identity();

drop policy if exists relationship_advisors_insert_allowed on public.relationship_advisors;
create policy relationship_advisors_insert_founders
on public.relationship_advisors
for insert to authenticated
with check (
  exists (
    select 1
    from public.relationships r
    where r.id = relationship_advisors.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
);

drop policy if exists relationship_advisors_update_allowed on public.relationship_advisors;
create policy relationship_advisors_update_founders
on public.relationship_advisors
for update to authenticated
using (
  exists (
    select 1
    from public.relationships r
    where r.id = relationship_advisors.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
)
with check (
  exists (
    select 1
    from public.relationships r
    where r.id = relationship_advisors.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
);

-- Preserve the current finalization implementation byte-for-byte behind a guarded public RPC.
-- Its grants are removed after the rename. The stable public name remains compatible with both
-- participant calls and existing service-role maintenance/repair callers during rolling deploys.
alter function public.finalize_invitation_if_ready(uuid, jsonb)
rename to finalize_invitation_if_ready_unchecked_20260823;

revoke all on function public.finalize_invitation_if_ready_unchecked_20260823(uuid, jsonb)
from public, anon, authenticated, service_role;

create function public.finalize_invitation_if_ready(
  p_invitation_id uuid,
  p_payload jsonb default null
)
returns table (
  ready boolean,
  report_run_id uuid,
  relationship_id uuid,
  modules public.assessment_module[],
  assessment_ids uuid[],
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_auth_role text := coalesce(auth.role(), '');
  v_inv public.invitations%rowtype;
begin
  if v_auth_role = 'service_role' then
    return query
    select *
    from public.finalize_invitation_if_ready_unchecked_20260823(p_invitation_id, p_payload);
    return;
  end if;

  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_inv
  from public.invitations
  where id = p_invitation_id;

  if not found then
    return query
    select *
    from public.finalize_invitation_if_ready_unchecked_20260823(p_invitation_id, p_payload);
    return;
  end if;

  if v_uid is distinct from v_inv.inviter_user_id
     and v_uid is distinct from v_inv.invitee_user_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select *
  from public.finalize_invitation_if_ready_unchecked_20260823(p_invitation_id, p_payload);
end;
$$;

revoke all on function public.finalize_invitation_if_ready(uuid, jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.finalize_invitation_if_ready(uuid, jsonb)
to authenticated, service_role;

commit;
