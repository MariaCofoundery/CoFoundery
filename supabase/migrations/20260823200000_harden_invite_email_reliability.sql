-- Invite reliability hardening: atomic founder invite setup, one open invite per context,
-- advisor-team duplicate protection, and expiring email-bound advisor invitations.

-- Close stale open founder invitations before enforcing the active-row uniqueness contract.
update public.invitations
set status = 'expired', updated_at = now()
where status in ('sent', 'opened')
  and revoked_at is null
  and expires_at <= now();

-- Keep the newest usable row where historical races created duplicate open invitations.
with ranked as (
  select
    id,
    row_number() over (
      partition by inviter_user_id, lower(btrim(invitee_email)), coalesce(team_context, '')
      order by updated_at desc, created_at desc, id desc
    ) as position
  from public.invitations
  where status in ('sent', 'opened')
    and revoked_at is null
)
update public.invitations invitation
set status = 'revoked', revoked_at = coalesce(invitation.revoked_at, now()), updated_at = now()
from ranked
where invitation.id = ranked.id
  and ranked.position > 1;

create unique index if not exists invitations_one_open_context_uidx
  on public.invitations (
    inviter_user_id,
    lower(btrim(invitee_email)),
    coalesce(team_context, '')
  )
  where status in ('sent', 'opened') and revoked_at is null;

-- Creates one open founder invitation and its required modules in one transaction. The advisory
-- lock serializes requests and reports a stable duplicate instead of rotating concurrent links.
create or replace function public.create_founder_invitation_reliable(
  p_invitee_email text,
  p_label text,
  p_inviter_display_name text,
  p_inviter_email text,
  p_team_context text,
  p_report_scope text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns table (invitation_id uuid, reused boolean)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_invitee_email text := lower(btrim(coalesce(p_invitee_email, '')));
  v_invitation_id uuid;
  v_reused boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_invitee_email = '' or position('@' in v_invitee_email) = 0 then
    raise exception 'invalid_invitee_email' using errcode = '22023';
  end if;
  if v_actor_email = '' or v_actor_email = v_invitee_email then
    raise exception 'self_invitation_not_allowed' using errcode = '42501';
  end if;
  if lower(btrim(coalesce(p_inviter_email, ''))) <> v_actor_email then
    raise exception 'inviter_email_mismatch' using errcode = '42501';
  end if;
  if p_team_context not in ('pre_founder', 'existing_team') then
    raise exception 'invalid_team_context' using errcode = '22023';
  end if;
  if p_report_scope not in ('basis', 'basis_plus_values') then
    raise exception 'invalid_report_scope' using errcode = '22023';
  end if;
  if char_length(coalesce(p_token_hash, '')) <> 64 or p_expires_at <= now() then
    raise exception 'invalid_invitation_token_state' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_uid::text || '|' || v_invitee_email || '|' || p_team_context,
      0
    )
  );

  update public.invitations
  set status = 'expired', updated_at = now()
  where inviter_user_id = v_uid
    and lower(btrim(invitee_email)) = v_invitee_email
    and coalesce(team_context, '') = p_team_context
    and status in ('sent', 'opened')
    and revoked_at is null
    and expires_at <= now();

  select id
    into v_invitation_id
  from public.invitations
  where inviter_user_id = v_uid
    and lower(btrim(invitee_email)) = v_invitee_email
    and coalesce(team_context, '') = p_team_context
    and status in ('sent', 'opened')
    and revoked_at is null
    and expires_at > now()
  order by updated_at desc, created_at desc
  limit 1
  for update;

  if v_invitation_id is null then
    insert into public.invitations (
      inviter_user_id,
      invitee_email,
      label,
      inviter_display_name,
      inviter_email,
      team_context,
      token_hash,
      expires_at,
      status
    ) values (
      v_uid,
      v_invitee_email,
      nullif(btrim(coalesce(p_label, '')), ''),
      nullif(btrim(coalesce(p_inviter_display_name, '')), ''),
      nullif(lower(btrim(coalesce(p_inviter_email, ''))), ''),
      p_team_context,
      p_token_hash,
      p_expires_at,
      'sent'
    )
    returning id into v_invitation_id;
  else
    raise exception 'duplicate_open_invitation' using errcode = '23505';
  end if;

  insert into public.invitation_modules (invitation_id, module)
  values (v_invitation_id, 'base')
  on conflict do nothing;

  if p_report_scope = 'basis_plus_values' then
    insert into public.invitation_modules (invitation_id, module)
    values (v_invitation_id, 'values')
    on conflict do nothing;
  else
    delete from public.invitation_modules
    where invitation_modules.invitation_id = v_invitation_id
      and invitation_modules.module = 'values';
  end if;

  return query select v_invitation_id, v_reused;
end;
$$;

revoke all on function public.create_founder_invitation_reliable(
  text, text, text, text, text, text, text, timestamptz
) from public, anon, service_role;
grant execute on function public.create_founder_invitation_reliable(
  text, text, text, text, text, text, text, timestamptz
) to authenticated;

-- Advisor invitations expire after 14 days. Recent legacy email-bound invites get a bounded
-- transition window; older/unverifiable unclaimed links are closed and require a re-invite.
alter table public.relationship_advisors
  add column if not exists invite_expires_at timestamptz;

update public.relationship_advisors
set invite_expires_at = invited_at + interval '14 days'
where advisor_user_id is null
  and revoked_at is null
  and invite_token_hash is not null
  and advisor_email is not null
  and invited_at is not null
  and invited_at + interval '14 days' > now();

update public.relationship_advisors
set
  invite_token_hash = null,
  invite_expires_at = null,
  invited_at = null,
  status = case
    when founder_a_approved and founder_b_approved then 'approved'::public.relationship_advisor_status
    else status
  end
where advisor_user_id is null
  and invite_token_hash is not null
  and invite_expires_at is null;

create index if not exists relationship_advisors_invite_expiry_idx
  on public.relationship_advisors (invite_expires_at)
  where advisor_user_id is null and invite_token_hash is not null and revoked_at is null;

-- Extend the P0 service-role identity guard with a server-side expiry boundary. A row already
-- linked to the same advisor remains idempotent even after the original invitation expires.
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

      if old.invite_expires_at is null or old.invite_expires_at <= now() then
        raise exception 'advisor_invitation_expired' using errcode = '42501';
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

  -- Rolling-deploy compatibility: the pre-expiry app already rotates an email-bound token,
  -- but does not send the new column. Give that token the same bounded lifetime in the DB.
  if new.advisor_user_id is null
     and new.invite_token_hash is distinct from old.invite_token_hash
     and new.invite_token_hash is not null
     and new.advisor_email is not null
     and new.invite_expires_at is null then
    new.invite_expires_at := now() + interval '14 days';
  end if;

  if new.relationship_id is distinct from old.relationship_id
     or new.advisor_user_id is distinct from old.advisor_user_id then
    raise exception 'advisor_relationship_identity_is_immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Collapse historical open advisor-team duplicates before adding an unordered pair guard.
with ranked as (
  select
    id,
    row_number() over (
      partition by
        advisor_user_id,
        least(lower(btrim(founder_a_email)), lower(btrim(founder_b_email))),
        greatest(lower(btrim(founder_a_email)), lower(btrim(founder_b_email)))
      order by
        (case when founder_a_user_id is not null then 1 else 0 end
         + case when founder_b_user_id is not null then 1 else 0 end) desc,
        updated_at desc,
        created_at desc,
        id desc
    ) as position
  from public.advisor_team_invites
  where status in ('pending', 'activating')
)
update public.advisor_team_invites invite
set status = 'revoked', updated_at = now()
from ranked
where invite.id = ranked.id
  and ranked.position > 1;

create unique index if not exists advisor_team_invites_one_open_pair_uidx
  on public.advisor_team_invites (
    advisor_user_id,
    least(lower(btrim(founder_a_email)), lower(btrim(founder_b_email))),
    greatest(lower(btrim(founder_a_email)), lower(btrim(founder_b_email)))
  )
  where status in ('pending', 'activating');
