-- Make advisor-to-founder invite secrets short-lived and founder revokes terminal.

alter table public.advisor_team_invites
  add column if not exists expires_at timestamptz;

update public.advisor_team_invites
set expires_at = created_at + interval '14 days'
where expires_at is null;

alter table public.advisor_team_invites
  alter column expires_at set default (pg_catalog.now() + interval '14 days'),
  alter column expires_at set not null,
  alter column founder_a_token_hash drop not null,
  alter column founder_b_token_hash drop not null;

alter table public.advisor_team_invites
  drop constraint if exists advisor_team_invites_status_check;

alter table public.advisor_team_invites
  add constraint advisor_team_invites_status_check
  check (status in ('pending', 'activating', 'activated', 'revoked', 'expired'));

-- Existing links keep their historical records, but old secrets are destroyed.
update public.advisor_team_invites
set status = case
      when status in ('pending', 'activating') and expires_at <= pg_catalog.now() then 'expired'
      else status
    end,
    founder_a_token_hash = case
      when status in ('activated', 'revoked')
        or expires_at <= pg_catalog.now()
        or founder_a_user_id is not null
        or founder_a_claimed_at is not null then null
      else founder_a_token_hash
    end,
    founder_b_token_hash = case
      when status in ('activated', 'revoked')
        or expires_at <= pg_catalog.now()
        or founder_b_user_id is not null
        or founder_b_claimed_at is not null then null
      else founder_b_token_hash
    end
where status in ('activated', 'revoked')
   or expires_at <= pg_catalog.now()
   or founder_a_user_id is not null
   or founder_b_user_id is not null
   or founder_a_claimed_at is not null
   or founder_b_claimed_at is not null;

create or replace function public.enforce_advisor_team_invite_terminal_tokens()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.expires_at <= pg_catalog.now() then
    if new.status <> 'expired'
       or new.founder_a_user_id is distinct from old.founder_a_user_id
       or new.founder_b_user_id is distinct from old.founder_b_user_id
       or new.founder_a_claimed_at is distinct from old.founder_a_claimed_at
       or new.founder_b_claimed_at is distinct from old.founder_b_claimed_at
       or new.invitation_id is distinct from old.invitation_id
       or new.relationship_id is distinct from old.relationship_id then
      raise exception 'advisor_team_invite_expired' using errcode = '42501';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status in ('revoked', 'expired') then
    if new.status <> old.status
       or new.founder_a_user_id is distinct from old.founder_a_user_id
       or new.founder_b_user_id is distinct from old.founder_b_user_id
       or new.invitation_id is distinct from old.invitation_id
       or new.relationship_id is distinct from old.relationship_id then
      raise exception 'advisor_team_invite_terminal' using errcode = '42501';
    end if;
  end if;

  if new.status in ('activated', 'revoked', 'expired') then
    new.founder_a_token_hash := null;
    new.founder_b_token_hash := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advisor_team_invites_terminal_tokens
  on public.advisor_team_invites;

create trigger trg_advisor_team_invites_terminal_tokens
before insert or update on public.advisor_team_invites
for each row
execute function public.enforce_advisor_team_invite_terminal_tokens();

create or replace function public.enforce_relationship_advisor_revoked_terminal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'linked' and exists (
    select 1
    from public.relationship_advisors revoked_ra
    where revoked_ra.advisor_user_id = new.advisor_user_id
      and revoked_ra.source_invitation_id = new.source_invitation_id
      and revoked_ra.id is distinct from new.id
      and (revoked_ra.status = 'revoked' or revoked_ra.revoked_at is not null)
  ) then
    raise exception 'relationship_advisor_revoked_terminal' using errcode = '42501';
  end if;

  if new.status = 'linked' and exists (
    select 1
    from public.advisor_team_invites ati
    where ati.advisor_user_id = new.advisor_user_id
      and ati.invitation_id = new.source_invitation_id
      and (
        ati.status in ('revoked', 'expired')
        or ati.expires_at <= pg_catalog.now()
      )
  ) then
    raise exception 'advisor_team_invite_unavailable' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and (old.status = 'revoked' or old.revoked_at is not null) then
    if new.status <> 'revoked' or new.revoked_at is null then
      raise exception 'relationship_advisor_revoked_terminal' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_relationship_advisors_revoked_terminal
  on public.relationship_advisors;

create trigger trg_relationship_advisors_revoked_terminal
before insert or update on public.relationship_advisors
for each row
execute function public.enforce_relationship_advisor_revoked_terminal();

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
    where ati.founder_a_token_hash in (p_founder_a_token_hash, p_founder_b_token_hash)
       or ati.founder_b_token_hash in (p_founder_a_token_hash, p_founder_b_token_hash)
  ) then
    raise exception 'advisor_team_invite_token_exists' using errcode = '23505';
  end if;

  update public.advisor_team_invites
  set status = 'expired'
  where advisor_user_id = v_uid
    and status in ('pending', 'activating')
    and expires_at <= pg_catalog.now();

  if exists (
    select 1
    from public.advisor_team_invites ati
    where ati.advisor_user_id = v_uid
      and ati.status in ('pending', 'activating')
      and ati.expires_at > pg_catalog.now()
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
    expires_at,
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
    pg_catalog.now() + interval '14 days',
    'pending'
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.claim_advisor_team_invite_founder(
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_row public.advisor_team_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_email = '' then
    raise exception 'advisor_team_invite_email_missing' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'advisor_team_invite_token_invalid' using errcode = '22023';
  end if;

  select * into v_row
  from public.advisor_team_invites
  where founder_a_token_hash = p_token_hash
     or founder_b_token_hash = p_token_hash
  limit 1
  for update;

  if not found then
    return null;
  end if;

  if v_row.status not in ('pending', 'activating') then
    return null;
  end if;

  if exists (
    select 1
    from public.relationship_advisors ra
    where ra.advisor_user_id = v_row.advisor_user_id
      and (ra.status = 'revoked' or ra.revoked_at is not null)
      and (
        (v_row.relationship_id is not null and ra.relationship_id = v_row.relationship_id)
        or
        (v_row.invitation_id is not null and ra.source_invitation_id = v_row.invitation_id)
      )
  ) then
    update public.advisor_team_invites
    set status = 'revoked'
    where id = v_row.id
    returning * into v_row;
    return null;
  end if;

  if v_row.expires_at <= pg_catalog.now() then
    update public.advisor_team_invites
    set status = 'expired'
    where id = v_row.id
    returning * into v_row;
    return null;
  end if;

  if v_row.founder_a_token_hash = p_token_hash then
    if lower(btrim(v_row.founder_a_email)) <> v_email then
      raise exception 'advisor_team_invite_email_mismatch' using errcode = '42501';
    end if;
    if v_row.founder_a_user_id is not null and v_row.founder_a_user_id <> v_uid then
      raise exception 'advisor_team_invite_already_claimed' using errcode = '42501';
    end if;

    update public.advisor_team_invites
    set founder_a_user_id = coalesce(founder_a_user_id, v_uid),
        founder_a_claimed_at = coalesce(founder_a_claimed_at, pg_catalog.now()),
        founder_a_token_hash = null
    where id = v_row.id
    returning * into v_row;
  elsif v_row.founder_b_token_hash = p_token_hash then
    if lower(btrim(v_row.founder_b_email)) <> v_email then
      raise exception 'advisor_team_invite_email_mismatch' using errcode = '42501';
    end if;
    if v_row.founder_b_user_id is not null and v_row.founder_b_user_id <> v_uid then
      raise exception 'advisor_team_invite_already_claimed' using errcode = '42501';
    end if;

    update public.advisor_team_invites
    set founder_b_user_id = coalesce(founder_b_user_id, v_uid),
        founder_b_claimed_at = coalesce(founder_b_claimed_at, pg_catalog.now()),
        founder_b_token_hash = null
    where id = v_row.id
    returning * into v_row;
  else
    return null;
  end if;

  return v_row.id;
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
    and status in ('pending', 'activating')
    and relationship_id is null
  returning * into v_row;

  if not found then
    raise exception 'advisor_team_invite_revoke_forbidden' using errcode = '42501';
  end if;

  return v_row;
end;
$$;

revoke all on function public.create_advisor_team_invite(text, text, text, text, text, text) from public, anon;
revoke all on function public.claim_advisor_team_invite_founder(text) from public, anon;
revoke all on function public.revoke_pending_advisor_team_invite(uuid) from public, anon;
grant execute on function public.create_advisor_team_invite(text, text, text, text, text, text) to authenticated;
grant execute on function public.claim_advisor_team_invite_founder(text) to authenticated;
grant execute on function public.revoke_pending_advisor_team_invite(uuid) to authenticated;
