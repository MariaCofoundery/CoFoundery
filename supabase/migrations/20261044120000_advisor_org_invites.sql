begin;

-- ---------------------------------------------------------------------------
-- Advisor in eine Organisation aufnehmen - und im Namen der Organisation fragen
-- ---------------------------------------------------------------------------
--
-- ZWEI HAELFTEN DERSELBEN SACHE:
--
--   1. Eine Organisation laedt Advisorinnen ein. Per Mail mit Token, wie alles
--      andere hier - niemand legt Konten fuer andere Menschen an.
--
--   2. Eine Person wird im Namen der ORGANISATION gefragt, nicht im eigenen.
--      Sonst waere die Organisation eine Liste von Namen ohne Wirkung: Der
--      Zugang gehoerte weiter der einzelnen Advisorin, und mit ihr ginge er.
-- ---------------------------------------------------------------------------

create table public.advisor_org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  invited_by_user_id uuid references auth.users (id) on delete set null,

  invitee_email text not null,
  token_hash text not null,
  role text not null default 'advisor',

  status text not null default 'sent',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users (id) on delete set null,

  constraint advisor_org_invites_token_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint advisor_org_invites_token_unique unique (token_hash),
  constraint advisor_org_invites_email_format
    check (position('@' in invitee_email) > 1 and invitee_email = lower(btrim(invitee_email))),
  constraint advisor_org_invites_role_check check (role in ('owner', 'advisor')),
  constraint advisor_org_invites_status_check check (status in ('sent', 'claimed', 'revoked')),
  constraint advisor_org_invites_claimed check ((status = 'claimed') = (claimed_at is not null))
);

create index advisor_org_invites_org_idx on public.advisor_org_invites (org_id, status);

alter table public.advisor_org_invites enable row level security;
revoke all on public.advisor_org_invites from anon, authenticated;
grant select on public.advisor_org_invites to authenticated;

-- Die Mitglieder sehen die Einladungen ihrer Organisation. Die eingeladene
-- Person nicht - sie hat den Token, und der reicht.
create policy advisor_org_invites_select_members on public.advisor_org_invites
  for select to authenticated using (public.is_advisor_org_member(org_id));

create or replace function public.create_advisor_org_invite(
  p_org_id uuid,
  p_email text,
  p_token_hash text,
  p_role text default 'advisor'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  -- NUR WER SIE FUEHRT. Ein Mitglied, das weitere Mitglieder aufnehmen kann,
  -- waere eine Organisation, die sich selbst vergroessert.
  if not exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = v_user
      and member.role = 'owner' and member.status = 'active'
  ) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token' using errcode = '22023';
  end if;

  insert into public.advisor_org_invites (org_id, invited_by_user_id, invitee_email, token_hash, role)
  values (p_org_id, v_user, v_email, p_token_hash, coalesce(p_role, 'advisor'))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_advisor_org_invite(uuid, text, text, text) from public, anon;
grant execute on function public.create_advisor_org_invite(uuid, text, text, text) to authenticated;

/**
 * Die Einladung annehmen.
 *
 * Hier wird man Mitglied - anders als bei der Einladung an eine begleitete
 * Person, wo nur eine ANFRAGE entsteht. Der Unterschied ist richtig: Wer eine
 * Organisation betritt, entscheidet damit ueber sich selbst. Wer begleitet
 * wird, entscheidet ueber seine Daten, und das ist eine zweite Frage.
 *
 * Die Adresse muss passen - ein weitergeleiteter Link bewirkt nichts.
 */
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
    set status = 'active', revoked_at = null, role = v_invite.role;

  update public.advisor_org_invites
  set status = 'claimed', claimed_at = pg_catalog.now(), claimed_by_user_id = v_user
  where id = v_invite.id;

  return v_invite.org_id;
end;
$$;

revoke all on function public.claim_advisor_org_invite(text) from public, anon;
grant execute on function public.claim_advisor_org_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Im Namen der Organisation fragen
-- ---------------------------------------------------------------------------
alter table public.advisor_person_invites
  add column org_id uuid references public.advisor_orgs (id) on delete cascade;

comment on column public.advisor_person_invites.org_id is
  'Ist sie gesetzt, gehoert der entstehende Zugang der Organisation - und bleibt dort, wenn die einladende Person geht.';

create or replace function public.create_advisor_person_invite(
  p_email text,
  p_token_hash text,
  p_scopes text[],
  p_note text default null,
  p_org_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if v_advisor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token' using errcode = '22023';
  end if;
  if p_scopes is null or array_length(p_scopes, 1) is null then
    raise exception 'scopes_required' using errcode = '22023';
  end if;
  if v_email = (select lower(btrim(coalesce(email, ''))) from auth.users where id = v_advisor) then
    raise exception 'advisor_cannot_invite_self' using errcode = '22023';
  end if;

  -- Im Namen einer Organisation fragt nur, wer dort aktiv ist.
  if p_org_id is not null and not public.is_advisor_org_member(p_org_id, v_advisor) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;

  -- SITZE BEGRENZEN ANFRAGEN. Ist das Kontingent voll, entsteht keine weitere
  -- Einladung - und trotzdem kommt niemand ueber einen Sitz an Daten: Der
  -- Uebergang zu einem Zugang liegt weiterhin allein bei der Person.
  if p_org_id is not null then
    if (select org.person_seat_limit from public.advisor_orgs org where org.id = p_org_id) is not null
       and (
         select count(distinct grant_row.subject_user_id)
         from public.advisor_person_grants grant_row
         where grant_row.org_id = p_org_id and grant_row.status = 'active'
       ) >= (select org.person_seat_limit from public.advisor_orgs org where org.id = p_org_id)
    then
      raise exception 'advisor_org_seats_exhausted' using errcode = '53000';
    end if;
  end if;

  insert into public.advisor_person_invites (
    advisor_user_id, invitee_email, token_hash, scopes, note, org_id
  )
  values (
    v_advisor, v_email, p_token_hash, p_scopes,
    left(nullif(btrim(coalesce(p_note, '')), ''), 400), p_org_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_advisor_person_invite(text, text, text[], text, uuid)
  from public, anon;
grant execute on function public.create_advisor_person_invite(text, text, text[], text, uuid)
  to authenticated;

-- Die alte Fassung mit vier Parametern wird nicht mehr gebraucht - sie waere
-- ein zweiter Weg zu derselben Zeile, und einer davon kennt die Sitze nicht.
drop function if exists public.create_advisor_person_invite(text, text, text[], text);

/**
 * Annehmen - und der Zugang gehoert dem, in dessen Namen gefragt wurde.
 */
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

commit;
