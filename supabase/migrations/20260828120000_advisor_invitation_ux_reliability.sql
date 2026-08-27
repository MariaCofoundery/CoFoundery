-- Persist per-recipient delivery state and allow narrow, expiring token rotation.

alter table public.advisor_team_invites
  add column if not exists founder_a_send_status text not null default 'not_sent',
  add column if not exists founder_b_send_status text not null default 'not_sent',
  add column if not exists founder_a_last_sent_at timestamptz,
  add column if not exists founder_b_last_sent_at timestamptz,
  add column if not exists founder_a_send_error_code text,
  add column if not exists founder_b_send_error_code text;

alter table public.advisor_team_invites
  drop constraint if exists advisor_team_invites_founder_a_send_status_check,
  drop constraint if exists advisor_team_invites_founder_b_send_status_check;

alter table public.advisor_team_invites
  add constraint advisor_team_invites_founder_a_send_status_check
    check (founder_a_send_status in ('not_sent', 'sent', 'failed')),
  add constraint advisor_team_invites_founder_b_send_status_check
    check (founder_b_send_status in ('not_sent', 'sent', 'failed'));

-- A successful claim proves that the recipient received a usable link. No other
-- historical delivery outcome is inferred during this additive backfill.
update public.advisor_team_invites
set founder_a_send_status = 'sent',
    founder_a_last_sent_at = coalesce(founder_a_last_sent_at, founder_a_claimed_at)
where founder_a_claimed_at is not null;

update public.advisor_team_invites
set founder_b_send_status = 'sent',
    founder_b_last_sent_at = coalesce(founder_b_last_sent_at, founder_b_claimed_at)
where founder_b_claimed_at is not null;

create or replace function public.record_advisor_team_invite_delivery(
  p_invite_id uuid,
  p_founder_slot text,
  p_send_status text,
  p_error_code text default null
)
returns public.advisor_team_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.advisor_team_invites%rowtype;
  v_error_code text := nullif(left(btrim(coalesce(p_error_code, '')), 80), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_founder_slot not in ('founder_a', 'founder_b')
     or p_send_status not in ('sent', 'failed') then
    raise exception 'advisor_team_invite_delivery_invalid' using errcode = '22023';
  end if;

  if p_founder_slot = 'founder_a' then
    update public.advisor_team_invites
    set founder_a_send_status = p_send_status,
        founder_a_last_sent_at = case when p_send_status = 'sent' then pg_catalog.now() else founder_a_last_sent_at end,
        founder_a_send_error_code = case when p_send_status = 'failed' then coalesce(v_error_code, 'delivery_failed') else null end
    where id = p_invite_id
      and advisor_user_id = v_uid
      and status in ('pending', 'activating')
      and expires_at > pg_catalog.now()
      and founder_a_user_id is null
    returning * into v_row;
  else
    update public.advisor_team_invites
    set founder_b_send_status = p_send_status,
        founder_b_last_sent_at = case when p_send_status = 'sent' then pg_catalog.now() else founder_b_last_sent_at end,
        founder_b_send_error_code = case when p_send_status = 'failed' then coalesce(v_error_code, 'delivery_failed') else null end
    where id = p_invite_id
      and advisor_user_id = v_uid
      and status in ('pending', 'activating')
      and expires_at > pg_catalog.now()
      and founder_b_user_id is null
    returning * into v_row;
  end if;

  if not found then
    raise exception 'advisor_team_invite_delivery_forbidden' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

create or replace function public.rotate_advisor_team_invite_founder_token(
  p_invite_id uuid,
  p_founder_slot text,
  p_token_hash text
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
  if p_founder_slot not in ('founder_a', 'founder_b')
     or p_token_hash is null
     or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'advisor_team_invite_token_invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.advisor_team_invites ati
    where ati.founder_a_token_hash = p_token_hash
       or ati.founder_b_token_hash = p_token_hash
  ) then
    raise exception 'advisor_team_invite_token_exists' using errcode = '23505';
  end if;

  if p_founder_slot = 'founder_a' then
    update public.advisor_team_invites
    set founder_a_token_hash = p_token_hash,
        founder_a_send_status = 'not_sent',
        founder_a_send_error_code = null
    where id = p_invite_id
      and advisor_user_id = v_uid
      and status in ('pending', 'activating')
      and expires_at > pg_catalog.now()
      and founder_a_user_id is null
      and founder_a_claimed_at is null
    returning * into v_row;
  else
    update public.advisor_team_invites
    set founder_b_token_hash = p_token_hash,
        founder_b_send_status = 'not_sent',
        founder_b_send_error_code = null
    where id = p_invite_id
      and advisor_user_id = v_uid
      and status in ('pending', 'activating')
      and expires_at > pg_catalog.now()
      and founder_b_user_id is null
      and founder_b_claimed_at is null
    returning * into v_row;
  end if;

  if not found then
    raise exception 'advisor_team_invite_resend_forbidden' using errcode = '42501';
  end if;
  return v_row;
end;
$$;

create or replace function public.create_advisor_team_invite_reliable(
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
  v_founder_a_email text := lower(btrim(coalesce(p_founder_a_email, '')));
  v_founder_b_email text := lower(btrim(coalesce(p_founder_b_email, '')));
  v_founder_a_user_id uuid;
  v_founder_b_user_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select id into v_founder_a_user_id from auth.users where lower(btrim(email)) = v_founder_a_email limit 1;
  select id into v_founder_b_user_id from auth.users where lower(btrim(email)) = v_founder_b_email limit 1;

  if v_founder_a_user_id is not null and v_founder_b_user_id is not null and exists (
    select 1
    from public.relationships r
    join public.relationship_advisors ra on ra.relationship_id = r.id
    where ra.advisor_user_id = v_uid
      and ra.status = 'linked'
      and ra.revoked_at is null
      and (
        (r.user_a_id = v_founder_a_user_id and r.user_b_id = v_founder_b_user_id)
        or (r.user_a_id = v_founder_b_user_id and r.user_b_id = v_founder_a_user_id)
      )
  ) then
    raise exception 'advisor_team_invite_already_linked' using errcode = '23505';
  end if;
  return public.create_advisor_team_invite(
    p_advisor_name,
    p_team_name,
    v_founder_a_email,
    v_founder_b_email,
    p_founder_a_token_hash,
    p_founder_b_token_hash
  );
end;
$$;

revoke all on function public.record_advisor_team_invite_delivery(uuid, text, text, text) from public, anon;
revoke all on function public.rotate_advisor_team_invite_founder_token(uuid, text, text) from public, anon;
revoke all on function public.create_advisor_team_invite_reliable(text, text, text, text, text, text) from public, anon;
grant execute on function public.record_advisor_team_invite_delivery(uuid, text, text, text) to authenticated;
grant execute on function public.rotate_advisor_team_invite_founder_token(uuid, text, text) to authenticated;
grant execute on function public.create_advisor_team_invite_reliable(text, text, text, text, text, text) to authenticated;
