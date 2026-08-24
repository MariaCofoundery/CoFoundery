-- Enforce relationship-advisor consent and invite lifecycle operations in the database.
-- Authenticated clients retain read access through RLS, but all writes use the narrow RPCs below.

drop policy if exists relationship_advisors_insert_founders on public.relationship_advisors;
drop policy if exists relationship_advisors_update_founders on public.relationship_advisors;
drop policy if exists relationship_advisors_insert_allowed on public.relationship_advisors;
drop policy if exists relationship_advisors_update_allowed on public.relationship_advisors;

revoke insert, update, delete on table public.relationship_advisors from authenticated;

create or replace function public.propose_relationship_advisor(
  p_relationship_id uuid,
  p_source_invitation_id uuid,
  p_advisor_name text,
  p_advisor_email text
)
returns public.relationship_advisors
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_relationship public.relationships%rowtype;
  v_invitation public.invitations%rowtype;
  v_existing public.relationship_advisors%rowtype;
  v_result public.relationship_advisors%rowtype;
  v_email text := lower(btrim(coalesce(p_advisor_email, '')));
  v_name text := nullif(btrim(coalesce(p_advisor_name, '')), '');
  v_is_founder_a boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'advisor_email_invalid' using errcode = '22023';
  end if;

  select * into v_relationship
  from public.relationships
  where id = p_relationship_id
  for update;

  if not found or v_uid not in (v_relationship.user_a_id, v_relationship.user_b_id) then
    raise exception 'relationship_advisor_forbidden' using errcode = '42501';
  end if;

  select * into v_invitation
  from public.invitations
  where id = p_source_invitation_id;

  if not found
     or v_invitation.inviter_user_id is null
     or v_invitation.invitee_user_id is null
     or not (
       (v_invitation.inviter_user_id = v_relationship.user_a_id and v_invitation.invitee_user_id = v_relationship.user_b_id)
       or
       (v_invitation.inviter_user_id = v_relationship.user_b_id and v_invitation.invitee_user_id = v_relationship.user_a_id)
     ) then
    raise exception 'relationship_advisor_invitation_mismatch' using errcode = '42501';
  end if;

  v_is_founder_a := v_uid = v_invitation.inviter_user_id;

  select * into v_existing
  from public.relationship_advisors
  where relationship_id = p_relationship_id
    and lower(btrim(coalesce(advisor_email, ''))) = v_email
    and revoked_at is null
  for update;

  if found then
    update public.relationship_advisors
    set advisor_name = coalesce(v_name, advisor_name),
        founder_a_approved = case when v_is_founder_a then true else founder_a_approved end,
        founder_b_approved = case when not v_is_founder_a then true else founder_b_approved end,
        status = case
          when status in ('linked', 'invited') then status
          when (founder_a_approved or v_is_founder_a)
             and (founder_b_approved or not v_is_founder_a) then 'approved'::public.relationship_advisor_status
          else 'pending'::public.relationship_advisor_status
        end,
        approved_at = case
          when (founder_a_approved or v_is_founder_a)
             and (founder_b_approved or not v_is_founder_a) then coalesce(approved_at, pg_catalog.now())
          else approved_at
        end
    where id = v_existing.id
    returning * into v_result;
  else
    insert into public.relationship_advisors (
      relationship_id,
      advisor_name,
      advisor_email,
      status,
      founder_a_approved,
      founder_b_approved,
      requested_by_user_id,
      source_invitation_id
    ) values (
      p_relationship_id,
      v_name,
      v_email,
      'pending',
      v_is_founder_a,
      not v_is_founder_a,
      v_uid,
      p_source_invitation_id
    )
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

create or replace function public.approve_relationship_advisor(
  p_advisor_id uuid,
  p_relationship_id uuid
)
returns public.relationship_advisors
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.relationship_advisors%rowtype;
  v_relationship public.relationships%rowtype;
  v_invitation public.invitations%rowtype;
  v_is_founder_a boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_row
  from public.relationship_advisors
  where id = p_advisor_id
    and relationship_id = p_relationship_id
  for update;

  if not found or v_row.revoked_at is not null or v_row.status = 'revoked' then
    raise exception 'relationship_advisor_not_found' using errcode = '42501';
  end if;

  select * into v_relationship
  from public.relationships
  where id = v_row.relationship_id;

  if not found or v_uid not in (v_relationship.user_a_id, v_relationship.user_b_id) then
    raise exception 'relationship_advisor_forbidden' using errcode = '42501';
  end if;

  if v_row.source_invitation_id is not null then
    select * into v_invitation
    from public.invitations
    where id = v_row.source_invitation_id;
  end if;

  if found
     and v_invitation.inviter_user_id is not null
     and v_invitation.invitee_user_id is not null
     and v_uid in (v_invitation.inviter_user_id, v_invitation.invitee_user_id) then
    v_is_founder_a := v_uid = v_invitation.inviter_user_id;
  else
    -- Compatibility fallback for historical relationship-advisor rows without a source invitation.
    v_is_founder_a := v_uid = v_relationship.user_a_id;
  end if;

  update public.relationship_advisors
  set founder_a_approved = case when v_is_founder_a then true else founder_a_approved end,
      founder_b_approved = case when not v_is_founder_a then true else founder_b_approved end,
      status = case
        when status in ('linked', 'invited') then status
        when (founder_a_approved or v_is_founder_a)
           and (founder_b_approved or not v_is_founder_a) then 'approved'::public.relationship_advisor_status
        else 'pending'::public.relationship_advisor_status
      end,
      approved_at = case
        when (founder_a_approved or v_is_founder_a)
           and (founder_b_approved or not v_is_founder_a) then coalesce(approved_at, pg_catalog.now())
        else approved_at
      end
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.issue_relationship_advisor_invite(
  p_advisor_id uuid,
  p_invite_token_hash text
)
returns public.relationship_advisors
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.relationship_advisors%rowtype;
  v_relationship public.relationships%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_invite_token_hash is null or p_invite_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'advisor_invite_token_invalid' using errcode = '22023';
  end if;

  select * into v_row
  from public.relationship_advisors
  where id = p_advisor_id
  for update;

  if not found
     or v_row.revoked_at is not null
     or v_row.status not in ('approved', 'invited')
     or not v_row.founder_a_approved
     or not v_row.founder_b_approved
     or nullif(btrim(coalesce(v_row.advisor_email, '')), '') is null then
    raise exception 'relationship_advisor_not_ready' using errcode = '42501';
  end if;

  select * into v_relationship
  from public.relationships
  where id = v_row.relationship_id;

  if not found or v_uid not in (v_relationship.user_a_id, v_relationship.user_b_id) then
    raise exception 'relationship_advisor_forbidden' using errcode = '42501';
  end if;

  update public.relationship_advisors
  set status = 'invited',
      invite_token_hash = p_invite_token_hash,
      invited_at = pg_catalog.now(),
      invite_expires_at = pg_catalog.now() + interval '14 days'
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.revoke_relationship_advisor(
  p_advisor_id uuid,
  p_relationship_id uuid
)
returns public.relationship_advisors
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.relationship_advisors%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select ra.* into v_row
  from public.relationship_advisors ra
  join public.relationships r on r.id = ra.relationship_id
  where ra.id = p_advisor_id
    and ra.relationship_id = p_relationship_id
    and v_uid in (r.user_a_id, r.user_b_id)
  for update of ra;

  if not found then
    raise exception 'relationship_advisor_forbidden' using errcode = '42501';
  end if;

  if v_row.status <> 'revoked' or v_row.revoked_at is null then
    update public.relationship_advisors
    set status = 'revoked',
        revoked_at = pg_catalog.now(),
        invite_token_hash = null,
        invite_expires_at = null
    where id = v_row.id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.propose_relationship_advisor(uuid, uuid, text, text) from public, anon;
revoke all on function public.approve_relationship_advisor(uuid, uuid) from public, anon;
revoke all on function public.issue_relationship_advisor_invite(uuid, text) from public, anon;
revoke all on function public.revoke_relationship_advisor(uuid, uuid) from public, anon;
grant execute on function public.propose_relationship_advisor(uuid, uuid, text, text) to authenticated;
grant execute on function public.approve_relationship_advisor(uuid, uuid) to authenticated;
grant execute on function public.issue_relationship_advisor_invite(uuid, text) to authenticated;
grant execute on function public.revoke_relationship_advisor(uuid, uuid) to authenticated;

drop policy if exists advisor_team_invites_insert_own on public.advisor_team_invites;
drop policy if exists advisor_team_invites_update_own on public.advisor_team_invites;
revoke insert, update, delete on table public.advisor_team_invites from authenticated;

create or replace function public.create_advisor_team_invite(
  p_advisor_name text,
  p_team_name text,
  p_founder_a_email text,
  p_founder_b_email text,
  p_founder_a_token_hash text,
  p_founder_b_token_hash text
)
returns public.advisor_team_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_advisor_email text;
  v_founder_a_email text := lower(btrim(coalesce(p_founder_a_email, '')));
  v_founder_b_email text := lower(btrim(coalesce(p_founder_b_email, '')));
  v_row public.advisor_team_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select lower(btrim(coalesce(email, ''))) into v_advisor_email
  from auth.users
  where id = v_uid;

  if v_founder_a_email = '' or position('@' in v_founder_a_email) <= 1 then
    raise exception 'invalid_founder_a_email' using errcode = '22023';
  end if;
  if v_founder_b_email = '' or position('@' in v_founder_b_email) <= 1 then
    raise exception 'invalid_founder_b_email' using errcode = '22023';
  end if;
  if v_founder_a_email = v_founder_b_email then
    raise exception 'founder_emails_must_differ' using errcode = '22023';
  end if;
  if p_founder_a_token_hash is null or p_founder_a_token_hash !~ '^[0-9a-f]{64}$'
     or p_founder_b_token_hash is null or p_founder_b_token_hash !~ '^[0-9a-f]{64}$'
     or p_founder_a_token_hash = p_founder_b_token_hash then
    raise exception 'advisor_team_invite_token_invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.advisor_team_invites ati
    where ati.advisor_user_id = v_uid
      and ati.status in ('pending', 'activating')
      and (
        (ati.founder_a_email = v_founder_a_email and ati.founder_b_email = v_founder_b_email)
        or
        (ati.founder_a_email = v_founder_b_email and ati.founder_b_email = v_founder_a_email)
      )
  ) then
    raise exception 'duplicate_advisor_team_invite' using errcode = '23505';
  end if;

  insert into public.advisor_team_invites (
    advisor_user_id,
    advisor_email,
    advisor_name,
    team_name,
    founder_a_email,
    founder_b_email,
    founder_a_token_hash,
    founder_b_token_hash,
    status
  ) values (
    v_uid,
    nullif(v_advisor_email, ''),
    nullif(btrim(coalesce(p_advisor_name, '')), ''),
    nullif(btrim(coalesce(p_team_name, '')), ''),
    v_founder_a_email,
    v_founder_b_email,
    p_founder_a_token_hash,
    p_founder_b_token_hash,
    'pending'
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.revoke_pending_advisor_team_invite(
  p_invite_id uuid
)
returns public.advisor_team_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.advisor_team_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  update public.advisor_team_invites
  set status = 'revoked'
  where id = p_invite_id
    and advisor_user_id = v_uid
    and status = 'pending'
    and relationship_id is null
  returning * into v_row;

  if not found then
    raise exception 'advisor_team_invite_revoke_forbidden' using errcode = '42501';
  end if;

  return v_row;
end;
$$;

revoke all on function public.create_advisor_team_invite(text, text, text, text, text, text) from public, anon;
revoke all on function public.revoke_pending_advisor_team_invite(uuid) from public, anon;
grant execute on function public.create_advisor_team_invite(text, text, text, text, text, text) to authenticated;
grant execute on function public.revoke_pending_advisor_team_invite(uuid) to authenticated;
