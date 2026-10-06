-- Phase 12C.0b: Advisor-Einladungen erst ansehen, dann ausdruecklich annehmen.
--
-- /invite/person-access/[token] und /invite/advisor-org/[token] riefen beim
-- Seitenaufruf (GET) sofort claim_advisor_person_invite bzw.
-- claim_advisor_org_invite auf: Zugriffsanfragen entstanden, eine
-- Org-Mitgliedschaft wurde aktiv und die Einladung galt als eingeloest - durch
-- Klick, Prefetch, Link-Vorschau oder Crawler.
--
-- Dieser Schritt:
--   * Lesefunktionen fuer die beiden Einladungen (nur fuer die eingeladene,
--     bestaetigte Adresse; sonst 'unavailable', ohne Details).
--   * Bestaetigte E-Mail-Adresse als serverseitige Voraussetzung fuer jede
--     Einladungsannahme (auch die Founder-Einladung aus 12C.0) - statt sich
--     allein auf die Supabase-Projekteinstellung zu verlassen.
--   * Org-Einloesung stuft eine aktive Inhaberin nicht still herab.
-- Die Einloesungslogik selbst (Anfragen statt Zugaenge, geltende Zugaenge
-- bleiben unangetastet, Sperre gegen parallele Einloesung) bleibt unveraendert.

-- Bestaetigte Adresse der angemeldeten Person.
create or replace function public.current_user_email_verified()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null and coalesce(btrim(email), '') <> ''
  );
$$;
revoke all on function public.current_user_email_verified() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Founder-Einladung (12C.0): zusaetzlich bestaetigte Adresse
-- ---------------------------------------------------------------------------
create or replace function public.accept_invitation_core(p_invitation_id uuid)
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
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if v_user_email = '' then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  if not public.current_user_email_verified() then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;

  select * into v_inv
  from public.invitations
  where id = p_invitation_id
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
revoke all on function public.accept_invitation_core(uuid)
from public, anon, authenticated, service_role;

create or replace function public.get_invitation_decision_state(p_invitation_id uuid)
returns text
language plpgsql stable security definer set search_path='' as $$
declare v public.invitations%rowtype; mail text := lower(btrim(coalesce(auth.jwt() ->> 'email','')));
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into v from public.invitations where id=p_invitation_id;
 if not found then return 'unavailable'; end if;
 if v.status::text='accepted' then
  return case when v.invitee_user_id=auth.uid() then 'accepted' else 'unavailable' end;
 end if;
 if mail='' or lower(btrim(v.invitee_email))<>mail then return 'unavailable'; end if;
 if v.invitee_user_id is not null and v.invitee_user_id<>auth.uid() then return 'unavailable'; end if;
 if not public.current_user_email_verified() then return 'unverified'; end if;
 if v.status::text='revoked' or v.revoked_at is not null then return 'revoked'; end if;
 if v.status::text='expired' or v.expires_at<now() then return 'expired'; end if;
 if v.status::text in ('sent','opened') then return 'pending'; end if;
 return 'unavailable';
end $$;
revoke all on function public.get_invitation_decision_state(uuid) from public,anon;
grant execute on function public.get_invitation_decision_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Personenzugang: ansehen
-- ---------------------------------------------------------------------------
-- state: open | claimed (von dieser Person) | expired | revoked | self |
--        unverified | unavailable. Details nur fuer die eingeladene Adresse.
create or replace function public.get_advisor_person_invite_preview(p_token_hash text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v public.advisor_person_invites;
  v_state text;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('state', 'unavailable'); end if;
  select lower(btrim(coalesce(email, ''))) into v_email from auth.users where id = v_user;
  select * into v from public.advisor_person_invites where token_hash = p_token_hash;
  if not found then return jsonb_build_object('state', 'unavailable'); end if;
  if v.status = 'claimed' then
    return jsonb_build_object('state', case when v.claimed_by_user_id = v_user then 'claimed' else 'unavailable' end);
  end if;
  if v.invitee_email <> v_email then return jsonb_build_object('state', 'unavailable'); end if;
  v_state := case
    when not public.current_user_email_verified() then 'unverified'
    when v.status = 'revoked' then 'revoked'
    when v.status = 'expired' or v.expires_at <= pg_catalog.now() then 'expired'
    when v.advisor_user_id = v_user then 'self'
    when v.status = 'sent' then 'open'
    else 'unavailable' end;
  if v_state <> 'open' then return jsonb_build_object('state', v_state); end if;
  return jsonb_build_object(
    'state', 'open',
    'advisor_name', (select nullif(btrim(display_name), '') from public.person_core where user_id = v.advisor_user_id),
    'org_name', (select name from public.advisor_orgs where id = v.org_id),
    'scopes', to_jsonb(v.scopes),
    'note', v.note,
    'expires_at', v.expires_at
  );
end;
$$;
revoke all on function public.get_advisor_person_invite_preview(text) from public, anon;
grant execute on function public.get_advisor_person_invite_preview(text) to authenticated;

-- Einloesen (nur nach Klick): unveraendert bis auf die bestaetigte Adresse.
create or replace function public.claim_advisor_person_invite(p_token_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_invite public.advisor_person_invites;
  v_scope text;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.current_user_email_verified() then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;

  select lower(btrim(coalesce(email, ''))) into v_email from auth.users where id = v_user;

  select * into v_invite from public.advisor_person_invites
  where token_hash = p_token_hash for update;
  if not found then
    raise exception 'invite_unknown' using errcode = '42501';
  end if;
  if v_invite.status <> 'sent' or v_invite.expires_at <= pg_catalog.now() then
    raise exception 'invite_not_open' using errcode = '42501';
  end if;
  if v_invite.invitee_email <> v_email then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;
  if v_invite.advisor_user_id = v_user then
    raise exception 'advisor_cannot_invite_self' using errcode = '42501';
  end if;

  foreach v_scope in array v_invite.scopes loop
    if v_invite.org_id is not null then
      insert into public.advisor_person_grants (
        subject_user_id, org_id, scope, requested_by_user_id, request_note
      )
      values (v_user, v_invite.org_id, v_scope, v_invite.advisor_user_id, v_invite.note)
      on conflict (subject_user_id, org_id, scope) where org_id is not null do update
        set status = 'requested',
            requested_by_user_id = v_invite.advisor_user_id,
            request_note = v_invite.note,
            approved_at = null,
            revoked_at = null
        where public.advisor_person_grants.status in ('declined', 'revoked');
    else
      insert into public.advisor_person_grants (
        subject_user_id, advisor_user_id, scope, requested_by_user_id, request_note
      )
      values (v_user, v_invite.advisor_user_id, v_scope, v_invite.advisor_user_id, v_invite.note)
      on conflict (subject_user_id, advisor_user_id, scope) where advisor_user_id is not null do update
        set status = 'requested',
            requested_by_user_id = v_invite.advisor_user_id,
            request_note = v_invite.note,
            approved_at = null,
            revoked_at = null
        where public.advisor_person_grants.status in ('declined', 'revoked');
    end if;
    v_count := v_count + 1;
  end loop;

  update public.advisor_person_invites
  set status = 'claimed', claimed_at = pg_catalog.now(), claimed_by_user_id = v_user
  where id = v_invite.id;

  return v_count;
end;
$$;
revoke all on function public.claim_advisor_person_invite(text) from public, anon;
grant execute on function public.claim_advisor_person_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Organisation: ansehen
-- ---------------------------------------------------------------------------
-- state: open | claimed (von dieser Person) | expired | revoked | unverified |
--        unavailable. already_member: aktive Mitgliedschaft besteht schon.
create or replace function public.get_advisor_org_invite_preview(p_token_hash text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v public.advisor_org_invites;
  v_state text;
  v_member public.advisor_org_members;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('state', 'unavailable'); end if;
  select lower(btrim(coalesce(email, ''))) into v_email from auth.users where id = v_user;
  select * into v from public.advisor_org_invites where token_hash = p_token_hash;
  if not found then return jsonb_build_object('state', 'unavailable'); end if;
  if v.status = 'claimed' then
    return jsonb_build_object('state', case when v.claimed_by_user_id = v_user then 'claimed' else 'unavailable' end);
  end if;
  if v.invitee_email <> v_email then return jsonb_build_object('state', 'unavailable'); end if;
  v_state := case
    when not public.current_user_email_verified() then 'unverified'
    when v.status = 'revoked' then 'revoked'
    when v.expires_at <= pg_catalog.now() then 'expired'
    when v.status = 'sent' then 'open'
    else 'unavailable' end;
  if v_state <> 'open' then return jsonb_build_object('state', v_state); end if;
  select * into v_member from public.advisor_org_members where org_id = v.org_id and user_id = v_user;
  return jsonb_build_object(
    'state', 'open',
    'org_name', (select name from public.advisor_orgs where id = v.org_id),
    'role', v.role,
    'inviter_name', (select nullif(btrim(display_name), '') from public.person_core where user_id = v.invited_by_user_id),
    'already_member', coalesce(v_member.status = 'active', false),
    'current_role', case when v_member.status = 'active' then v_member.role end,
    'expires_at', v.expires_at
  );
end;
$$;
revoke all on function public.get_advisor_org_invite_preview(text) from public, anon;
grant execute on function public.get_advisor_org_invite_preview(text) to authenticated;

-- Einloesen (nur nach Klick). Neu: bestaetigte Adresse; eine aktive Inhaberin
-- wird durch eine Advisor-Einladung nicht still herabgestuft.
create or replace function public.claim_advisor_org_invite(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_invite public.advisor_org_invites;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.current_user_email_verified() then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;

  select lower(btrim(coalesce(email, ''))) into v_email from auth.users where id = v_user;

  select * into v_invite from public.advisor_org_invites
  where token_hash = p_token_hash for update;
  if not found then
    raise exception 'invite_unknown' using errcode = '42501';
  end if;
  if v_invite.status <> 'sent' or v_invite.expires_at <= pg_catalog.now() then
    raise exception 'invite_not_open' using errcode = '42501';
  end if;
  if v_invite.invitee_email <> v_email then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;

  insert into public.advisor_org_members (org_id, user_id, role)
  values (v_invite.org_id, v_user, v_invite.role)
  on conflict (org_id, user_id) do update
    set status = 'active',
        revoked_at = null,
        role = case
          when public.advisor_org_members.status = 'active' and public.advisor_org_members.role = 'owner' then 'owner'
          else v_invite.role
        end;

  update public.advisor_org_invites
  set status = 'claimed', claimed_at = pg_catalog.now(), claimed_by_user_id = v_user
  where id = v_invite.id;

  return v_invite.org_id;
end;
$$;
revoke all on function public.claim_advisor_org_invite(text) from public, anon;
grant execute on function public.claim_advisor_org_invite(text) to authenticated;
