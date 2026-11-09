-- Rollen der Organisation: Admin, Koordination, Advisor, Gast - mit Rechten pro Person.
--
-- Entwurf von Maria (9.11.2026), umgesetzt wie freigegeben:
--   * Es gibt mehrere Admins (technisch weiter `owner`, damit alte Daten und Schluessel unveraendert bleiben);
--     es bleibt immer mindestens einer.
--   * Neu: Koordination (fuehrt das Programm im Alltag) und Gast (nur lesen).
--   * Die Rolle gibt eine Voreinstellung; ein Admin schaltet sieben Rechte pro Person an oder aus:
--     invite (Mitglieder einladen/entfernen), plan (Termine, Formate, Materialien), teams (Startups aufnehmen,
--     Ansprechpersonen), people (Wer ist wer: eigene Karte; mit Koordination auch die anderer), room (Teamraum),
--     results (Auswertung), profile (Organisationsprofil, Programmseite).
--   * Nie einzeln schaltbar, nur Admin: Admins ernennen, Organisation loeschen, Funktionen/Erfolge, Foerderauflagen.
--   * Ein Advisor ohne das Recht `invite` schlaegt Einladungen vor; ein Admin oder die Koordination entscheidet.
--
-- GAESTE LIEGEN IN EINER EIGENEN TABELLE (`advisor_org_guests`), nicht in `advisor_org_members`. Alles, was heute an
-- "Mitglied" haengt - Freigaben von Personen, Team-Reviews, Teamraum, Chat, Aufgaben -, schliesst Gaeste damit von selbst
-- aus. Wer Gaeste lesen laesst (Kalender, Zahlen), sagt das ausdruecklich.
--
-- Die Rechte werden an EINER Stelle geprueft: `org_has_right(org, recht)`. "Sieht alle Startups der Organisation" ist
-- `is_advisor_org_lead_of(org)` (Admin oder Koordination) und ersetzt dort, wo bisher nur die Inhaberin alles sah, den
-- Inhaber-Test. Ein Team gibt dadurch nichts zusaetzlich frei: was ein Team nicht freigegeben hat, bleibt unsichtbar.

begin;

alter table public.advisor_org_members drop constraint if exists advisor_org_members_role_check;
alter table public.advisor_org_members add constraint advisor_org_members_role_check
  check (role in ('owner', 'coordinator', 'advisor'));
alter table public.advisor_org_invites drop constraint if exists advisor_org_invites_role_check;
alter table public.advisor_org_invites add constraint advisor_org_invites_role_check
  check (role in ('owner', 'coordinator', 'advisor', 'guest'));

alter table public.advisor_org_members
  add column rights jsonb not null default '{}'::jsonb,
  add column rights_updated_at timestamptz,
  add column rights_updated_by uuid references auth.users (id) on delete set null,
  add constraint advisor_org_members_rights_object check (jsonb_typeof(rights) = 'object');

create table public.advisor_org_guests (
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active',
  rights jsonb not null default '{}'::jsonb,
  rights_updated_at timestamptz,
  rights_updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  revoked_at timestamptz,
  primary key (org_id, user_id),
  constraint advisor_org_guests_status check (status in ('active', 'revoked')),
  constraint advisor_org_guests_revoked check ((status = 'revoked') = (revoked_at is not null)),
  constraint advisor_org_guests_rights_object check (jsonb_typeof(rights) = 'object')
);
alter table public.advisor_org_guests enable row level security;
revoke all on public.advisor_org_guests from anon, authenticated;
grant select on public.advisor_org_guests to authenticated;
create policy advisor_org_guests_select_self on public.advisor_org_guests
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Die Rechte
-- ---------------------------------------------------------------------------
create or replace function public.org_right_preset(p_role text, p_right text)
returns boolean language sql immutable set search_path = '' as $$
  select case p_role
    when 'owner' then p_right in ('invite', 'plan', 'teams', 'people', 'room', 'results', 'profile')
    when 'coordinator' then p_right in ('invite', 'plan', 'teams', 'people', 'room', 'results', 'profile')
    when 'advisor' then p_right in ('people', 'room', 'results')
    when 'guest' then p_right = 'results'
    else false
  end;
$$;

-- Ein Gast bekommt hoechstens `results`: kein Teamraum, nichts Aenderndes.
create or replace function public.org_role_allows(p_role text, p_right text)
returns boolean language sql immutable set search_path = '' as $$
  select p_right in ('invite', 'plan', 'teams', 'people', 'room', 'results', 'profile')
    and (p_role <> 'guest' or p_right = 'results')
    and p_role in ('owner', 'coordinator', 'advisor', 'guest');
$$;

create or replace function public.org_rights_valid(p_rights jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select p_rights is not null and jsonb_typeof(p_rights) = 'object'
    and not exists (
      select 1 from jsonb_each(p_rights) as r(key, value)
      where r.key not in ('invite', 'plan', 'teams', 'people', 'room', 'results', 'profile')
         or jsonb_typeof(r.value) <> 'boolean'
    );
$$;

create or replace function public.org_has_right(p_org_id uuid, p_right text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.advisor_org_members m
      join public.advisor_orgs o on o.id = m.org_id and o.status = 'active'
      where m.org_id = p_org_id and m.user_id = auth.uid() and m.status = 'active'
        and (
          m.role = 'owner'
          or (
            public.org_role_allows(m.role, p_right)
            and coalesce((m.rights ->> p_right)::boolean, public.org_right_preset(m.role, p_right))
          )
        )
    )
    or exists (
      select 1 from public.advisor_org_guests g
      join public.advisor_orgs o on o.id = g.org_id and o.status = 'active'
      where g.org_id = p_org_id and g.user_id = auth.uid() and g.status = 'active'
        and public.org_role_allows('guest', p_right)
        and coalesce((g.rights ->> p_right)::boolean, public.org_right_preset('guest', p_right))
    )
  );
$$;
revoke all on function public.org_has_right(uuid, text) from public, anon;
grant execute on function public.org_has_right(uuid, text) to authenticated;

create or replace function public.is_advisor_org_lead_of(p_org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.advisor_org_members m
    join public.advisor_orgs o on o.id = m.org_id and o.status = 'active'
    where m.org_id = p_org_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner', 'coordinator')
  );
$$;
revoke all on function public.is_advisor_org_lead_of(uuid) from public, anon;
grant execute on function public.is_advisor_org_lead_of(uuid) to authenticated;

create or replace function public.is_advisor_org_guest(p_org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.advisor_org_guests g
    join public.advisor_orgs o on o.id = g.org_id and o.status = 'active'
    where g.org_id = p_org_id and g.user_id = auth.uid() and g.status = 'active'
  );
$$;
revoke all on function public.is_advisor_org_guest(uuid) from public, anon;
grant execute on function public.is_advisor_org_guest(uuid) to authenticated;

-- Der Teamraum der Organisation ist ein Recht (`room`).
create or replace function public.can_work_in_org(p_org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.advisor_org_members m
    join public.advisor_orgs o on o.id = m.org_id and o.status = 'active'
    where m.org_id = p_org_id and m.user_id = auth.uid() and m.status = 'active'
  ) and public.org_has_right(p_org_id, 'room');
$$;

-- Gaeste sehen die Organisation (Name), mehr nicht.
drop policy advisor_orgs_select_involved on public.advisor_orgs;
create policy advisor_orgs_select_involved on public.advisor_orgs
  for select to authenticated using (
    public.is_advisor_org_member(advisor_orgs.id)
    or public.is_advisor_org_guest(advisor_orgs.id)
    or public.is_accompanied_by_advisor_org(advisor_orgs.id)
  );

-- ---------------------------------------------------------------------------
-- Mitglieder: Rolle, Rechte, Entfernen
-- ---------------------------------------------------------------------------
drop function if exists public.get_advisor_org_member_list(uuid);
create function public.get_advisor_org_member_list(p_org_id uuid)
returns table (
  user_id uuid, role text, status text, display_name text, is_self boolean,
  rights jsonb, rights_updated_at timestamptz, rights_updated_by_name text
)
language sql stable security definer set search_path = '' as $$
  with viewer as (
    select m.role from public.advisor_org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid() and m.status = 'active'
  ),
  everyone as (
    select m.user_id, m.role, m.status, m.rights, m.rights_updated_at, m.rights_updated_by, m.created_at
    from public.advisor_org_members m
    where m.org_id = p_org_id
      -- Wer gerade Gast ist, steht einmal da: als Gast (die fruehere Mitgliedschaft bleibt nur im Bestand).
      and not (m.status = 'revoked' and exists (select 1 from public.advisor_org_guests g where g.org_id = p_org_id and g.user_id = m.user_id and g.status = 'active'))
    union all
    select g.user_id, 'guest', g.status, g.rights, g.rights_updated_at, g.rights_updated_by, g.created_at
    from public.advisor_org_guests g
    where g.org_id = p_org_id
      and not (g.status = 'revoked' and exists (select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = g.user_id and m.status = 'active'))
  )
  select e.user_id, e.role, e.status, nullif(btrim(core.display_name), ''), e.user_id = auth.uid(),
    case when (select v.role from viewer v) = 'owner' then e.rights end,
    case when (select v.role from viewer v) = 'owner' then e.rights_updated_at end,
    case when (select v.role from viewer v) = 'owner' then nullif(btrim(by_core.display_name), '') end
  from everyone e
  left join public.person_core core on core.user_id = e.user_id
  left join public.person_core by_core on by_core.user_id = e.rights_updated_by
  where exists (select 1 from viewer)
    and (
      (e.status = 'active' and e.role <> 'guest')
      or (select v.role from viewer v) = 'owner'
      or (select v.role from viewer v) = 'coordinator'
    )
  order by (e.status = 'active') desc,
    case e.role when 'owner' then 0 when 'coordinator' then 1 when 'advisor' then 2 else 3 end,
    e.created_at;
$$;
revoke all on function public.get_advisor_org_member_list(uuid) from public, anon;
grant execute on function public.get_advisor_org_member_list(uuid) to authenticated;

-- Die Rolle aendern: nur ein Admin. Zwischen Mitglied und Gast wechselt die Person die Tabelle.
create or replace function public.set_advisor_org_member_role(p_org_id uuid, p_user_id uuid, p_role text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_owners integer;
  v_was_owner boolean;
  v_was_member boolean;
  v_was_guest boolean;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'coordinator', 'advisor', 'guest') then
    return false;
  end if;
  if not exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = v_user and member.role = 'owner' and member.status = 'active'
  ) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;

  -- Zwei Admins, die sich gleichzeitig herabstufen, duerfen nicht beide durchkommen.
  perform 1 from public.advisor_orgs org where org.id = p_org_id for update;

  select exists (select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active' and m.role = 'owner'),
         exists (select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active'),
         exists (select 1 from public.advisor_org_guests g where g.org_id = p_org_id and g.user_id = p_user_id and g.status = 'active')
  into v_was_owner, v_was_member, v_was_guest;
  if not v_was_member and not v_was_guest then
    return false;
  end if;

  if v_was_owner and p_role <> 'owner' then
    select count(*) into v_owners from public.advisor_org_members member
    where member.org_id = p_org_id and member.role = 'owner' and member.status = 'active';
    if v_owners <= 1 then
      raise exception 'advisor_org_needs_an_owner' using errcode = '42501';
    end if;
  end if;

  if p_role = 'guest' then
    if v_was_guest then
      return true;
    end if;
    -- Aus dem Kreis der Mitglieder heraus: der Trigger raeumt Aufgaben, Zustaendigkeiten und Ansprechpersonen ab.
    update public.advisor_org_members
    set status = 'revoked', revoked_at = pg_catalog.now()
    where org_id = p_org_id and user_id = p_user_id and status = 'active';
    insert into public.advisor_org_guests (org_id, user_id, rights_updated_at, rights_updated_by)
    values (p_org_id, p_user_id, pg_catalog.now(), v_user)
    on conflict (org_id, user_id) do update
      set status = 'active', revoked_at = null, rights = '{}'::jsonb, rights_updated_at = pg_catalog.now(), rights_updated_by = v_user;
    return true;
  end if;

  if v_was_guest then
    update public.advisor_org_guests set status = 'revoked', revoked_at = pg_catalog.now()
    where org_id = p_org_id and user_id = p_user_id and status = 'active';
    insert into public.advisor_org_members (org_id, user_id, role, rights_updated_at, rights_updated_by)
    values (p_org_id, p_user_id, p_role, pg_catalog.now(), v_user)
    on conflict (org_id, user_id) do update
      set status = 'active', revoked_at = null, role = p_role, rights = '{}'::jsonb,
          rights_updated_at = pg_catalog.now(), rights_updated_by = v_user;
    return true;
  end if;

  -- Die Rolle gibt die Voreinstellung: einzeln gesetzte Rechte gelten nicht fuer die neue Rolle.
  update public.advisor_org_members
  set role = p_role, rights = '{}'::jsonb, rights_updated_at = pg_catalog.now(), rights_updated_by = v_user
  where org_id = p_org_id and user_id = p_user_id and status = 'active';
  return found;
end;
$$;
revoke all on function public.set_advisor_org_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_advisor_org_member_role(uuid, uuid, text) to authenticated;

-- Rechte einzeln einstellen: nur ein Admin, nur fuer andere (Admins haben immer alles).
create or replace function public.set_org_member_rights(p_org_id uuid, p_user_id uuid, p_rights jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_clean jsonb;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = v_user and member.role = 'owner' and member.status = 'active'
  ) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;
  if not public.org_rights_valid(p_rights) then
    raise exception 'org_rights_invalid' using errcode = '22023';
  end if;

  select m.role into v_role from public.advisor_org_members m
  where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active';
  if v_role is null then
    if exists (select 1 from public.advisor_org_guests g where g.org_id = p_org_id and g.user_id = p_user_id and g.status = 'active') then
      v_role := 'guest';
    else
      return false;
    end if;
  end if;
  if v_role = 'owner' then
    raise exception 'org_rights_admin_fixed' using errcode = '22023';
  end if;

  -- Nur Rechte, die diese Rolle haben kann, und nur, wo sie von der Voreinstellung abweichen.
  select coalesce(jsonb_object_agg(r.key, r.value), '{}'::jsonb) into v_clean
  from jsonb_each(p_rights) as r(key, value)
  where public.org_role_allows(v_role, r.key)
    and (r.value)::text::boolean is distinct from public.org_right_preset(v_role, r.key);

  if v_role = 'guest' then
    update public.advisor_org_guests set rights = v_clean, rights_updated_at = pg_catalog.now(), rights_updated_by = v_user
    where org_id = p_org_id and user_id = p_user_id and status = 'active';
  else
    update public.advisor_org_members set rights = v_clean, rights_updated_at = pg_catalog.now(), rights_updated_by = v_user
    where org_id = p_org_id and user_id = p_user_id and status = 'active';
  end if;
  return true;
end;
$$;
revoke all on function public.set_org_member_rights(uuid, uuid, jsonb) from public, anon;
grant execute on function public.set_org_member_rights(uuid, uuid, jsonb) to authenticated;

-- Entfernen und wieder aufnehmen: wer `invite` darf; nur ein Admin fasst Admins an.
create or replace function public.set_advisor_org_membership(p_org_id uuid, p_user_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_owners integer;
  v_is_admin boolean;
  v_target_owner boolean;
  v_rows integer;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_status not in ('active', 'revoked') then
    return false;
  end if;
  if not public.org_has_right(p_org_id, 'invite') then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;
  v_is_admin := exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = v_user and member.role = 'owner' and member.status = 'active'
  );
  v_target_owner := exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = p_user_id and member.role = 'owner'
  );
  if v_target_owner and not v_is_admin then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;

  if p_status = 'revoked' and v_target_owner then
    select count(*) into v_owners from public.advisor_org_members member
    where member.org_id = p_org_id and member.role = 'owner' and member.status = 'active';
    if v_owners <= 1 then
      raise exception 'advisor_org_needs_an_owner' using errcode = '42501';
    end if;
  end if;

  update public.advisor_org_members
  set status = p_status, revoked_at = case when p_status = 'revoked' then pg_catalog.now() end
  where org_id = p_org_id and user_id = p_user_id;
  get diagnostics v_rows = row_count;

  update public.advisor_org_guests
  set status = p_status, revoked_at = case when p_status = 'revoked' then pg_catalog.now() end
  where org_id = p_org_id and user_id = p_user_id
    and not exists (select 1 from public.advisor_org_members mm where mm.org_id = p_org_id and mm.user_id = p_user_id and mm.status = 'active');
  return v_rows > 0 or found;
end;
$$;
revoke all on function public.set_advisor_org_membership(uuid, uuid, text) from public, anon;
grant execute on function public.set_advisor_org_membership(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Einladen mit Rolle, annehmen als Mitglied oder Gast
-- ---------------------------------------------------------------------------
create or replace function public.create_advisor_org_invite(p_org_id uuid, p_email text, p_token_hash text, p_role text default 'advisor')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_role text := coalesce(p_role, 'advisor');
  v_id uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if v_role not in ('owner', 'coordinator', 'advisor', 'guest') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  -- Wer das Recht `invite` hat, darf einladen - Admins aber ernennt nur ein Admin.
  if not public.org_has_right(p_org_id, 'invite')
     or (v_role = 'owner' and not public.is_advisor_org_owner_of(p_org_id)) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token' using errcode = '22023';
  end if;

  insert into public.advisor_org_invites (org_id, invited_by_user_id, invitee_email, token_hash, role)
  values (p_org_id, v_user, v_email, p_token_hash, v_role)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.claim_advisor_org_invite(p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
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

  select * into v_invite from public.advisor_org_invites where token_hash = p_token_hash for update;
  if not found then
    raise exception 'invite_unknown' using errcode = '42501';
  end if;
  if v_invite.status <> 'sent' or v_invite.expires_at <= pg_catalog.now() then
    raise exception 'invite_not_open' using errcode = '42501';
  end if;
  if v_invite.invitee_email <> v_email then
    raise exception 'invite_email_mismatch' using errcode = '42501';
  end if;

  if v_invite.role = 'guest' then
    -- Wer schon Mitglied ist, bleibt es: eine Gast-Einladung nimmt niemandem Rechte.
    if not exists (select 1 from public.advisor_org_members m where m.org_id = v_invite.org_id and m.user_id = v_user and m.status = 'active') then
      insert into public.advisor_org_guests (org_id, user_id)
      values (v_invite.org_id, v_user)
      on conflict (org_id, user_id) do update set status = 'active', revoked_at = null;
    end if;
  else
    update public.advisor_org_guests set status = 'revoked', revoked_at = pg_catalog.now()
    where org_id = v_invite.org_id and user_id = v_user and status = 'active';
    insert into public.advisor_org_members (org_id, user_id, role)
    values (v_invite.org_id, v_user, v_invite.role)
    on conflict (org_id, user_id) do update
      set status = 'active',
          revoked_at = null,
          role = case
            when public.advisor_org_members.status = 'active'
              and public.advisor_org_members.role = 'owner' then 'owner'
            when public.advisor_org_members.status = 'active'
              and public.advisor_org_members.role = 'coordinator' and v_invite.role = 'advisor' then 'coordinator'
            else v_invite.role
          end,
          rights = case when public.advisor_org_members.status = 'active' then public.advisor_org_members.rights else '{}'::jsonb end;
  end if;

  update public.advisor_org_invites
  set status = 'claimed', claimed_at = pg_catalog.now(), claimed_by_user_id = v_user
  where id = v_invite.id;
  return v_invite.org_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vorschlaege: ein Advisor sagt, wen er sich wuenscht; Admin oder Koordination entscheidet
-- ---------------------------------------------------------------------------
create table public.advisor_org_invite_suggestions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  suggested_by_user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'advisor',
  reason text,
  status text not null default 'open',
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint org_suggestion_email check (char_length(email) between 3 and 254 and position('@' in email) > 1),
  constraint org_suggestion_role check (role in ('advisor', 'guest')),
  constraint org_suggestion_status check (status in ('open', 'accepted', 'declined')),
  constraint org_suggestion_reason check (reason is null or char_length(reason) <= 500),
  constraint org_suggestion_note check (decision_note is null or char_length(decision_note) <= 300)
);
create unique index org_suggestion_one_open on public.advisor_org_invite_suggestions (org_id, email) where status = 'open';
alter table public.advisor_org_invite_suggestions enable row level security;
revoke all on public.advisor_org_invite_suggestions from anon, authenticated;
-- Lesen: wer vorgeschlagen hat (die eigenen) und wer entscheiden darf. Schreiben nur ueber die Funktionen.
create policy org_suggestions_read on public.advisor_org_invite_suggestions
  for select to authenticated using (
    suggested_by_user_id = auth.uid() or public.org_has_right(org_id, 'invite')
  );
grant select on public.advisor_org_invite_suggestions to authenticated;

create or replace function public.suggest_advisor_org_invite(p_org_id uuid, p_email text, p_role text, p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if auth.uid() is null or not public.is_advisor_org_member(p_org_id) then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;
  if p_role not in ('advisor', 'guest') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if v_email = '' or position('@' in v_email) <= 1 or char_length(v_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  if char_length(coalesce(p_reason, '')) > 500 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  -- Wer schon dazugehoert, wird nicht noch einmal vorgeschlagen.
  if exists (
    select 1 from public.advisor_org_members m join auth.users u on u.id = m.user_id
    where m.org_id = p_org_id and m.status = 'active' and lower(u.email) = v_email
  ) then
    raise exception 'already_member' using errcode = '22023';
  end if;
  insert into public.advisor_org_invite_suggestions (org_id, suggested_by_user_id, email, role, reason)
  values (p_org_id, auth.uid(), v_email, p_role, nullif(btrim(coalesce(p_reason, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.suggest_advisor_org_invite(uuid, text, text, text) from public, anon;
grant execute on function public.suggest_advisor_org_invite(uuid, text, text, text) to authenticated;

create or replace function public.list_advisor_org_invite_suggestions(p_org_id uuid)
returns table (
  id uuid, email text, role text, reason text, status text, decision_note text, created_at timestamptz,
  suggested_by_user_id uuid, suggested_by_name text, mine boolean
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.email, s.role, s.reason, s.status, s.decision_note, s.created_at,
    s.suggested_by_user_id, nullif(btrim(core.display_name), ''), s.suggested_by_user_id = auth.uid()
  from public.advisor_org_invite_suggestions s
  left join public.person_core core on core.user_id = s.suggested_by_user_id
  where s.org_id = p_org_id and auth.uid() is not null
    and (
      s.suggested_by_user_id = auth.uid()
      or (public.org_has_right(p_org_id, 'invite') and s.status = 'open')
    )
  order by (s.status = 'open') desc, s.created_at desc
  limit 100;
$$;
revoke all on function public.list_advisor_org_invite_suggestions(uuid) from public, anon;
grant execute on function public.list_advisor_org_invite_suggestions(uuid) to authenticated;

-- Entscheiden: wer `invite` darf. Bei "angenommen" legt die Anwendung vorher die Einladung an (wie jede andere).
create or replace function public.decide_advisor_org_invite_suggestion(p_id uuid, p_accept boolean, p_note text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  select s.org_id into v_org from public.advisor_org_invite_suggestions s where s.id = p_id and s.status = 'open';
  if v_org is null then
    return false;
  end if;
  if auth.uid() is null or not public.org_has_right(v_org, 'invite') then
    raise exception 'advisor_org_not_yours' using errcode = '42501';
  end if;
  if char_length(coalesce(p_note, '')) > 300 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;
  update public.advisor_org_invite_suggestions
  set status = case when p_accept then 'accepted' else 'declined' end,
      decided_by_user_id = auth.uid(), decided_at = pg_catalog.now(),
      decision_note = case when p_accept then null else nullif(btrim(coalesce(p_note, '')), '') end
  where id = p_id and status = 'open';
  return true;
end;
$$;
revoke all on function public.decide_advisor_org_invite_suggestion(uuid, boolean, text) from public, anon;
grant execute on function public.decide_advisor_org_invite_suggestion(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Gaeste lesen: Kalender und Zahlen
-- ---------------------------------------------------------------------------
-- Zahlen ohne Namen: so viele Startups, so viele Termine. Fuer alle mit dem Recht `results`, auch Gaeste.
create or replace function public.get_org_numbers(p_org_id uuid)
returns table (teams_active integer, events_upcoming integer, events_held integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::integer from public.team_programs p
       where p.org_id = p_org_id and p.status = 'active' and public.team_program_is_active(p.id)),
    (select count(*)::integer from public.team_program_events e
       where e.org_id = p_org_id and e.archived_at is null and e.starts_at >= pg_catalog.now()),
    (select count(*)::integer from public.team_program_events e
       where e.org_id = p_org_id and e.archived_at is null and e.starts_at < pg_catalog.now())
  where auth.uid() is not null and public.org_has_right(p_org_id, 'results');
$$;
revoke all on function public.get_org_numbers(uuid) from public, anon;
grant execute on function public.get_org_numbers(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Profil: wer das Recht `profile` hat
-- ---------------------------------------------------------------------------
create or replace function public.update_advisor_org_profile(
  p_org_id uuid, p_name text, p_description text, p_website_url text, p_focus text[], p_location_region text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  -- Ein Advisor arbeitet im Namen der Organisation - was sie ueber sich sagt, bestimmt, wer das Recht `profile` hat.
  if not public.org_has_right(p_org_id, 'profile') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.advisor_orgs
  set name = coalesce(nullif(btrim(p_name), ''), name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      website_url = nullif(btrim(coalesce(p_website_url, '')), ''),
      focus = case when p_focus is null then null when array_length(p_focus, 1) is null then null else p_focus end,
      location_region = nullif(btrim(coalesce(p_location_region, '')), ''),
      updated_at = pg_catalog.now()
  where id = p_org_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wer ist wer: das Recht `people`; fremde Karten bearbeitet, wer die Organisation fuehrt (Admin, Koordination)
-- ---------------------------------------------------------------------------
create or replace function public.save_org_member_card(
  p_org_id uuid, p_user_id uuid, p_headline text, p_about text, p_contact text, p_shown boolean,
  p_program_ids uuid[] default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_self boolean := p_user_id = auth.uid();
  v_owner boolean;
  v_old public.advisor_org_member_cards%rowtype;
  v_headline text := nullif(btrim(coalesce(p_headline, '')), '');
  v_about text := nullif(btrim(coalesce(p_about, '')), '');
  v_audience uuid[];
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'people') then
    raise exception 'org_card_not_yours' using errcode = '42501';
  end if;
  v_owner := public.is_advisor_org_lead_of(p_org_id);
  if not exists (select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active') then
    raise exception 'org_card_not_member' using errcode = '22023';
  end if;
  if not v_self and not v_owner then
    raise exception 'org_card_not_yours' using errcode = '42501';
  end if;
  if char_length(coalesce(v_headline, '')) > 120 or char_length(coalesce(v_about, '')) > 600 or char_length(coalesce(p_contact, '')) > 200 then
    raise exception 'org_card_invalid' using errcode = '22023';
  end if;

  select * into v_old from public.advisor_org_member_cards c where c.org_id = p_org_id and c.user_id = p_user_id;
  if not v_self and coalesce(p_shown, false) and coalesce(v_old.self_hidden, false) then
    raise exception 'org_card_self_hidden' using errcode = '42501';
  end if;

  -- Wer die Startups sind, die die Karte sehen: bestimmt, wer die Organisation fuehrt. null = unveraendert, leer = alle.
  if p_program_ids is not null then
    if not v_owner then
      raise exception 'org_card_not_yours' using errcode = '42501';
    end if;
    if exists (
      select 1 from unnest(p_program_ids) as ids(id)
      where not exists (select 1 from public.team_programs tp where tp.id = ids.id and tp.org_id = p_org_id)
    ) then
      raise exception 'org_card_audience_invalid' using errcode = '22023';
    end if;
    v_audience := case when cardinality(p_program_ids) = 0 then null else (select array_agg(distinct x) from unnest(p_program_ids) as x) end;
  else
    v_audience := v_old.audience_program_ids;
  end if;

  insert into public.advisor_org_member_cards (org_id, user_id, shown, self_hidden, headline, about, contact, audience_program_ids, updated_by_user_id, updated_at)
  values (
    p_org_id, p_user_id, coalesce(p_shown, false),
    v_self and not coalesce(p_shown, false) and (coalesce(v_old.shown, false) or coalesce(v_old.self_hidden, false)),
    v_headline, v_about,
    nullif(btrim(coalesce(p_contact, '')), ''),
    v_audience, auth.uid(), pg_catalog.now()
  )
  on conflict (org_id, user_id) do update
  set shown = excluded.shown,
      self_hidden = case
        when v_self then (not excluded.shown) and (public.advisor_org_member_cards.shown or public.advisor_org_member_cards.self_hidden)
        else public.advisor_org_member_cards.self_hidden
      end,
      headline = excluded.headline,
      about = excluded.about,
      contact = case when p_contact is null then public.advisor_org_member_cards.contact else excluded.contact end,
      audience_program_ids = excluded.audience_program_ids,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = excluded.updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Alles, was bisher "nur die Inhaberin" war und jetzt am Recht oder an der Fuehrung haengt (erzeugt aus dem Bestand)
-- ---------------------------------------------------------------------------
create or replace function public.archive_program_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_public uuid;
begin
  select e.org_id, e.public_event_id into v_org, v_public from public.team_program_events e where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_events set archived_at = coalesce(archived_at, pg_catalog.now()) where id = p_event_id;
  -- Ein oeffentlicher Vorschlag wird zurueckgenommen (er haengt am Termin im Plan).
  if v_public is not null then
    delete from public.ecosystem_events where id = v_public;
  end if;
end;
$$;

create or replace function public.restore_program_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select e.org_id into v_org from public.team_program_events e where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_events set archived_at = null where id = p_event_id;
end;
$$;

CREATE OR REPLACE FUNCTION public.save_program_event(p_org_id uuid, p_event_id uuid, p_title text, p_kind text, p_starts_at timestamp with time zone, p_location text, p_notes text, p_todos text, p_format_id uuid DEFAULT NULL::uuid, p_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_venue text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_program_ids uuid[] DEFAULT NULL::uuid[], p_mandatory boolean DEFAULT NULL::boolean, p_host text DEFAULT NULL::text, p_internal_note text DEFAULT NULL::text, p_make_public boolean DEFAULT NULL::boolean, p_public_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_old public.team_program_events%rowtype;
  v_audience text;
  v_host text;
  v_venue text;
  v_kind text;
  v_public uuid;
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_format_id is not null and not exists (select 1 from public.program_event_formats f where f.id = p_format_id and f.org_id = p_org_id) then
    raise exception 'program_event_format_invalid' using errcode = '22023';
  end if;
  if p_event_id is not null then
    select * into v_old from public.team_program_events e where e.id = p_event_id and e.org_id = p_org_id;
    if v_old.id is null then
      raise exception 'program_event_not_found' using errcode = 'P0002';
    end if;
    -- Ein archivierter Termin wird nicht mehr bearbeitet; erst wiederherstellen.
    if v_old.archived_at is not null then
      raise exception 'program_event_archived' using errcode = '55000';
    end if;
  end if;

  v_audience := coalesce(p_audience, case when p_kind = 'internal' then 'internal' else coalesce(v_old.audience, 'all') end);
  v_host := coalesce(p_host, case when p_kind = 'external' then 'partner' else coalesce(v_old.host, 'us') end);
  v_venue := coalesce(p_venue, v_old.venue, 'onsite');
  v_kind := case when v_audience = 'internal' then 'internal' when v_host = 'partner' then 'external' else 'education' end;
  if v_audience = 'selected' and (
    coalesce(cardinality(p_program_ids), 0) = 0
    or exists (select 1 from unnest(p_program_ids) as ids(id) where not exists (select 1 from public.team_programs tp where tp.id = ids.id and tp.org_id = p_org_id))
  ) then
    raise exception 'program_event_audience_invalid' using errcode = '22023';
  end if;

  if p_event_id is null then
    insert into public.team_program_events (
      org_id, title, kind, starts_at, ends_at, location, notes, todos, created_by_user_id, format_id,
      venue, audience, mandatory, host, internal_note, public_url
    ) values (
      p_org_id, btrim(p_title), v_kind, p_starts_at, p_ends_at, nullif(btrim(coalesce(p_location, '')), ''),
      nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_todos, '')), ''), auth.uid(), p_format_id,
      v_venue, v_audience, coalesce(p_mandatory, false), v_host, nullif(btrim(coalesce(p_internal_note, '')), ''),
      nullif(btrim(coalesce(p_public_url, '')), '')
    )
    returning id into v_id;
  else
    update public.team_program_events
    set title = btrim(p_title), kind = v_kind, starts_at = p_starts_at,
        ends_at = case when p_audience is null and p_ends_at is null then v_old.ends_at else p_ends_at end,
        location = nullif(btrim(coalesce(p_location, '')), ''),
        notes = nullif(btrim(coalesce(p_notes, '')), ''),
        todos = nullif(btrim(coalesce(p_todos, '')), ''),
        format_id = p_format_id,
        venue = v_venue, audience = v_audience,
        mandatory = coalesce(p_mandatory, v_old.mandatory),
        host = v_host,
        internal_note = case when p_audience is null and p_internal_note is null then v_old.internal_note else nullif(btrim(coalesce(p_internal_note, '')), '') end,
        public_url = case when p_audience is null and p_public_url is null then v_old.public_url else nullif(btrim(coalesce(p_public_url, '')), '') end
    where id = p_event_id
    returning id into v_id;
  end if;

  delete from public.team_program_event_audience where event_id = v_id;
  if v_audience = 'selected' then
    insert into public.team_program_event_audience (event_id, program_id, org_id)
    select distinct v_id, ids.id, p_org_id from unnest(p_program_ids) as ids(id);
  end if;

  -- Oeffentlich: einmal als Vorschlag in den Event-Kalender; abgewaehlt nimmt den Vorschlag zurueck.
  if p_make_public is not null then
    select e.public_event_id into v_public from public.team_program_events e where e.id = v_id;
    if p_make_public and v_audience <> 'internal' and v_public is null then
      if coalesce(p_public_url, '') !~ '^https://[^\s]+$' then
        raise exception 'program_event_public_url_required' using errcode = '22023';
      end if;
      v_public := public.submit_ecosystem_event(
        p_org_id, btrim(p_title), p_starts_at, p_ends_at, false, nullif(btrim(coalesce(p_location, '')), ''), null,
        v_venue = 'online', (select left(o.name, 120) from public.advisor_orgs o where o.id = p_org_id), btrim(p_public_url), true
      );
      update public.team_program_events set public_event_id = v_public where id = v_id;
    elsif (not p_make_public or v_audience = 'internal') and v_public is not null then
      delete from public.ecosystem_events where id = v_public;
    end if;
  end if;
  return v_id;
end;
$function$;

create or replace function public.delete_program_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_events where id = p_event_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_events where id = p_event_id;
end;
$$;

create or replace function public.save_program_event_format(p_org_id uuid, p_label text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_label text := btrim(coalesce(p_label, ''));
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if char_length(v_label) not between 1 and 60 then
    raise exception 'program_event_format_invalid' using errcode = '22023';
  end if;
  select f.id into v_id from public.program_event_formats f where f.org_id = p_org_id and lower(btrim(f.label)) = lower(v_label);
  if v_id is not null then
    return v_id;
  end if;
  if (select count(*) from public.program_event_formats f where f.org_id = p_org_id) >= 40 then
    raise exception 'program_event_format_too_many' using errcode = '22023';
  end if;
  insert into public.program_event_formats (org_id, label, created_by_user_id) values (p_org_id, v_label, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_program_event_format(p_format_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := (select f.org_id from public.program_event_formats f where f.id = p_format_id);
begin
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.program_event_formats where id = p_format_id;
end;
$$;

create or replace function public.save_program_material(
  p_org_id uuid, p_material_id uuid, p_title text, p_url text, p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_material_id is null then
    insert into public.team_program_materials (org_id, title, url, note, created_by_user_id)
    values (p_org_id, btrim(p_title), btrim(p_url), nullif(btrim(coalesce(p_note, '')), ''), auth.uid())
    returning id into v_id;
  else
    update public.team_program_materials
    set title = btrim(p_title), url = btrim(p_url), note = nullif(btrim(coalesce(p_note, '')), '')
    where id = p_material_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'program_material_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_program_material(p_material_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_materials where id = p_material_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_materials where id = p_material_id;
end;
$$;

create or replace function public.save_program_expert(
  p_org_id uuid, p_expert_id uuid, p_name text, p_topic text, p_company text,
  p_email text, p_phone text, p_website text, p_offer_link text, p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_expert_id is null then
    insert into public.team_program_experts (org_id, name, topic, company, email, phone, website, offer_link, note, created_by_user_id)
    values (
      p_org_id, btrim(p_name),
      nullif(btrim(coalesce(p_topic, '')), ''), nullif(btrim(coalesce(p_company, '')), ''),
      nullif(lower(btrim(coalesce(p_email, ''))), ''), nullif(btrim(coalesce(p_phone, '')), ''),
      nullif(btrim(coalesce(p_website, '')), ''), nullif(btrim(coalesce(p_offer_link, '')), ''),
      nullif(btrim(coalesce(p_note, '')), ''), auth.uid()
    )
    returning id into v_id;
  else
    update public.team_program_experts
    set name = btrim(p_name),
        topic = nullif(btrim(coalesce(p_topic, '')), ''),
        company = nullif(btrim(coalesce(p_company, '')), ''),
        email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
        phone = nullif(btrim(coalesce(p_phone, '')), ''),
        website = nullif(btrim(coalesce(p_website, '')), ''),
        offer_link = nullif(btrim(coalesce(p_offer_link, '')), ''),
        note = nullif(btrim(coalesce(p_note, '')), '')
    where id = p_expert_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'program_expert_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_program_expert(p_expert_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_experts where id = p_expert_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_experts where id = p_expert_id;
end;
$$;

create or replace function public.set_program_expert_archived(p_expert_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_experts where id = p_expert_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_experts set archived = coalesce(p_archived, false) where id = p_expert_id;
end;
$$;

create or replace function public.set_event_experts(p_event_id uuid, p_expert_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_events where id = p_event_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_expert_ids, '{}'::uuid[])) as wanted(id)
    where not exists (select 1 from public.team_program_experts e where e.id = wanted.id and e.org_id = v_org)
  ) then
    raise exception 'expert_not_in_org' using errcode = 'P0002';
  end if;
  delete from public.team_program_event_experts where event_id = p_event_id;
  insert into public.team_program_event_experts (event_id, expert_id)
  select p_event_id, w from (select distinct unnest(coalesce(p_expert_ids, '{}'::uuid[])) as w) s;
end;
$$;

create or replace function public.save_learning_module(
  p_org_id uuid, p_module_id uuid, p_title text, p_description text, p_position integer, p_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_module_id is null then
    insert into public.team_program_modules (org_id, title, description, position, published, created_by_user_id)
    values (p_org_id, btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), coalesce(p_position, 100), coalesce(p_published, false), auth.uid())
    returning id into v_id;
  else
    update public.team_program_modules
    set title = btrim(p_title), description = nullif(btrim(coalesce(p_description, '')), ''),
        position = coalesce(p_position, position), published = coalesce(p_published, published)
    where id = p_module_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'learning_module_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_learning_module(p_module_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_modules where id = p_module_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_modules where id = p_module_id;
end;
$$;

create or replace function public.save_learning_lesson(
  p_module_id uuid, p_lesson_id uuid, p_title text, p_note text, p_url text, p_minutes integer, p_speaker text, p_position integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select org_id into v_org from public.team_program_modules where id = p_module_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_lesson_id is null then
    insert into public.team_program_lessons (module_id, title, note, url, minutes, speaker, position)
    values (p_module_id, btrim(p_title), nullif(btrim(coalesce(p_note, '')), ''), btrim(p_url), p_minutes,
            nullif(btrim(coalesce(p_speaker, '')), ''), coalesce(p_position, 100))
    returning id into v_id;
  else
    update public.team_program_lessons
    set title = btrim(p_title), note = nullif(btrim(coalesce(p_note, '')), ''), url = btrim(p_url), minutes = p_minutes,
        speaker = nullif(btrim(coalesce(p_speaker, '')), ''), position = coalesce(p_position, position)
    where id = p_lesson_id and module_id = p_module_id
    returning id into v_id;
    if v_id is null then
      raise exception 'learning_lesson_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_learning_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select m.org_id into v_org from public.team_program_lessons l join public.team_program_modules m on m.id = l.module_id where l.id = p_lesson_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_lessons where id = p_lesson_id;
end;
$$;

create or replace function public.set_module_audience(
  p_module_id uuid, p_all_programs boolean, p_program_ids uuid[], p_person_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_modules where id = p_module_id;
  if v_org is null or auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_program_ids, '{}'::uuid[])) as w(id)
    where not exists (select 1 from public.team_programs p where p.id = w.id and p.org_id = v_org and p.status <> 'ended')
  ) then
    raise exception 'program_not_in_org' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_person_ids, '{}'::uuid[])) as w(id)
    where not public.person_grant_covers_org(w.id, v_org)
  ) then
    raise exception 'person_not_accompanied' using errcode = 'P0002';
  end if;

  update public.team_program_modules set published = coalesce(p_all_programs, false) where id = p_module_id;
  delete from public.team_program_module_shares where module_id = p_module_id;
  insert into public.team_program_module_shares (module_id, program_id)
  select p_module_id, w from (select distinct unnest(coalesce(p_program_ids, '{}'::uuid[])) as w) s;
  insert into public.team_program_module_shares (module_id, subject_user_id)
  select p_module_id, w from (select distinct unnest(coalesce(p_person_ids, '{}'::uuid[])) as w) s;
end;
$$;

create or replace function public.create_team_program_invite(p_org_id uuid, p_token_hash text, p_label text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.org_has_right(p_org_id, 'teams') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if (
    select count(*) from public.team_program_invites i
    where i.org_id = p_org_id and i.status = 'open' and i.expires_at > pg_catalog.now()
  ) >= 25 then
    raise exception 'team_program_invite_limit' using errcode = '53400';
  end if;
  insert into public.team_program_invites (org_id, created_by_user_id, token_hash, label)
  values (p_org_id, auth.uid(), p_token_hash, nullif(btrim(coalesce(p_label, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.revoke_team_program_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_invites where id = p_invite_id;
  if v_org is null or not public.org_has_right(v_org, 'teams') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_invites set status = 'revoked' where id = p_invite_id and status = 'open';
end;
$$;

create or replace function public.list_team_program_invites(p_org_id uuid)
returns table (invite_id uuid, label text, status text, created_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.label, i.status, i.created_at, i.expires_at
  from public.team_program_invites i
  where i.org_id = p_org_id and public.org_has_right(p_org_id, 'teams')
  order by i.created_at desc;
$$;

create or replace function public.create_team_program_code(
  p_org_id uuid, p_code text, p_label text default null, p_max_uses integer default 10, p_valid_days integer default 90
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not public.org_has_right(p_org_id, 'teams') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if (select count(*) from public.team_program_codes c
      where c.org_id = p_org_id and c.status = 'active' and c.expires_at > pg_catalog.now()) >= 5 then
    raise exception 'team_program_code_limit' using errcode = '53400';
  end if;
  insert into public.team_program_codes (org_id, created_by_user_id, label, code, max_uses, expires_at)
  values (
    p_org_id, auth.uid(), nullif(btrim(coalesce(p_label, '')), ''), p_code,
    least(greatest(coalesce(p_max_uses, 10), 1), 100),
    pg_catalog.now() + make_interval(days => least(greatest(coalesce(p_valid_days, 90), 1), 365))
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.revoke_team_program_code(p_code_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_codes where id = p_code_id;
  if v_org is null or not public.org_has_right(v_org, 'teams') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_codes set status = 'revoked' where id = p_code_id;
end;
$$;

create or replace function public.list_team_program_codes(p_org_id uuid)
returns table (code_id uuid, label text, code text, uses integer, max_uses integer, expires_at timestamptz, status text, accounts integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.label, c.code, c.uses, c.max_uses, c.expires_at,
         case when c.status = 'active' and c.expires_at <= pg_catalog.now() then 'expired' else c.status end,
         (select count(*)::integer from public.team_program_code_arrivals a where a.code_id = c.id)
  from public.team_program_codes c
  where c.org_id = p_org_id and public.org_has_right(p_org_id, 'teams')
  order by c.created_at desc;
$$;

create or replace function public.end_team_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_org uuid;
begin
  select team_id, org_id into v_team, v_org from public.team_programs where id = p_program_id and status <> 'ended';
  if v_team is null then return; end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid())
    or public.org_has_right(v_org, 'teams')
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  update public.team_programs
  set status = 'ended', ended_at = pg_catalog.now(), ended_by_user_id = auth.uid()
  where id = p_program_id;
  delete from public.team_program_contacts where program_id = p_program_id;
  delete from public.team_program_profiles where program_id = p_program_id;
  delete from public.team_program_milestones where program_id = p_program_id;
  delete from public.team_program_updates where program_id = p_program_id;
  delete from public.team_program_update_questions where program_id = p_program_id;
  -- Ein Hinweis auf ein beendetes Programm wartet auf niemanden mehr.
  update public.in_app_notices
  set read_at = coalesce(read_at, pg_catalog.now())
  where kind in ('program_invited', 'program_update_due') and subject_id = p_program_id;
end;
$$;

create or replace function public.remove_team_from_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_org uuid;
begin
  select team_id, org_id into v_team, v_org from public.team_programs where id = p_program_id and status <> 'ended';
  if v_team is null then
    raise exception 'team_program_not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is null or not public.org_has_right(v_org, 'teams') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;

  perform public.end_team_program(p_program_id);

  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  select m.user_id, auth.uid(), 'program_removed', p_program_id, '/programm'
  from public.founder_team_members m
  where m.team_id = v_team
  on conflict do nothing;
end;
$$;

create or replace function public.set_team_program_contacts(p_program_id uuid, p_advisor_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select org_id into v_org from public.team_programs where id = p_program_id and status <> 'ended';
  if v_org is null or not public.org_has_right(v_org, 'teams') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  foreach v_id in array coalesce(p_advisor_user_ids, '{}'::uuid[]) loop
    if not exists (
      select 1 from public.advisor_org_members m
      where m.org_id = v_org and m.user_id = v_id and m.status = 'active'
    ) then
      raise exception 'team_program_contact_not_member' using errcode = '22023';
    end if;
  end loop;
  delete from public.team_program_contacts
  where program_id = p_program_id and not (advisor_user_id = any (coalesce(p_advisor_user_ids, '{}'::uuid[])));
  insert into public.team_program_contacts (program_id, advisor_user_id, assigned_by_user_id)
  select p_program_id, u, auth.uid() from (select distinct unnest(coalesce(p_advisor_user_ids, '{}'::uuid[])) as u) as picked
  on conflict do nothing;
end;
$$;

create or replace function public.set_team_program_solo(p_program_id uuid, p_confirmed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program public.team_programs%rowtype;
  v_members integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into v_program from public.team_programs where id = p_program_id and status <> 'ended';
  if not found then
    raise exception 'team_program_not_found' using errcode = 'P0002';
  end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_program.team_id and m.user_id = auth.uid())
    or public.org_has_right(v_program.org_id, 'teams')
    or exists (select 1 from public.team_program_contacts c where c.program_id = v_program.id and c.advisor_user_id = auth.uid())
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;

  if p_confirmed then
    select count(*) into v_members from public.founder_team_members m where m.team_id = v_program.team_id;
    if v_members <> 1 then
      raise exception 'team_program_not_solo' using errcode = '23514';
    end if;
    update public.team_programs set solo_confirmed_at = pg_catalog.now(), solo_confirmed_by = auth.uid() where id = p_program_id;
  else
    -- Zuruecknehmen: nur das Team selbst. Die Organisation macht eine Markierung nicht rueckgaengig,
    -- sonst koennte sie ein Team wieder ausblenden, das gerade arbeitet - das darf nur das Team.
    if not exists (select 1 from public.founder_team_members m where m.team_id = v_program.team_id and m.user_id = auth.uid()) then
      raise exception 'team_program_not_yours' using errcode = '42501';
    end if;
    update public.team_programs set solo_confirmed_at = null, solo_confirmed_by = null where id = p_program_id;
  end if;
end;
$$;

CREATE OR REPLACE FUNCTION public.set_org_program_page(
  p_org_id uuid, p_slug text, p_published boolean, p_welcome text, p_accent text default null, p_accent_b text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := nullif(lower(btrim(coalesce(p_slug, ''))), '');
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'profile') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if v_slug is not null and v_slug in ('admin', 'api', 'login', 'start', 'dashboard', 'programm', 'advisor', 'account', 'connect', 'discovery', 'p', 'join', 'invite', 'team', 'teams', 'datenschutz', 'impressum', 'agb') then
    raise exception 'program_slug_reserved' using errcode = '22023';
  end if;
  if coalesce(p_published, false) and v_slug is null then
    raise exception 'program_page_needs_slug' using errcode = '22023';
  end if;
  update public.advisor_orgs
  set program_slug = v_slug,
      program_page_published = coalesce(p_published, false),
      program_welcome = nullif(btrim(coalesce(p_welcome, '')), ''),
      program_accent = nullif(lower(btrim(coalesce(p_accent, ''))), ''),
      program_accent_b = nullif(lower(btrim(coalesce(p_accent_b, ''))), '')
  where id = p_org_id;
end;
$$;

create or replace function public.set_org_program_logo(p_org_id uuid, p_logo_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'profile') then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_logo_path is not null and split_part(p_logo_path, '/', 1) <> p_org_id::text then
    raise exception 'program_logo_not_yours' using errcode = '42501';
  end if;
  select program_logo_path into v_old from public.advisor_orgs where id = p_org_id;
  update public.advisor_orgs set program_logo_path = p_logo_path where id = p_org_id;
  return v_old;
end;
$$;

create or replace function public.can_see_org_program(p_org_id uuid, p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_programs p
    where p.id = p_program_id and p.org_id = p_org_id
      and (
        public.is_advisor_org_lead_of(p_org_id)
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
      )
  );
$$;

create or replace function public.can_keep_program_notes(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_programs p
    where p.id = p_program_id
      and p.status <> 'ended'
      and auth.uid() is not null
      and (
        public.is_advisor_org_lead_of(p.org_id)
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
      )
  );
$$;

create or replace function public.program_side(p_program_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_advisor_org_lead_of(p.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()) then 'org'
    when exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid()) then 'team'
  end
  from public.team_programs p
  where p.id = p_program_id and auth.uid() is not null and p.status = 'active'
    and public.team_program_is_active(p.id) and public.org_success_enabled(p.org_id);
$$;

create or replace function public.program_check_in_side(p_program_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_advisor_org_lead_of(p.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()) then 'org'
    when exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid()) then 'team'
  end
  from public.team_programs p
  where p.id = p_program_id and auth.uid() is not null and p.status = 'active'
    and public.team_program_is_active(p.id);
$$;

create or replace function public.can_use_team_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.team_program_is_active(p_program_id)
    and exists (
      select 1 from public.team_programs p
      where p.id = p_program_id
        and (
          exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
          or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()
                     and public.is_advisor_org_member(p.org_id))
          or public.is_advisor_org_lead_of(p.org_id)
        )
    );
$$;

create or replace function public.can_manage_team_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.team_program_is_active(p_program_id)
    and exists (
      select 1 from public.team_programs p
      where p.id = p_program_id
        and (
          exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()
                  and public.is_advisor_org_member(p.org_id))
          or public.is_advisor_org_lead_of(p.org_id)
        )
    );
$$;

create or replace function public.program_tasks_access(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.team_programs p
    where p.id = p_program_id
      and p.status <> 'ended'
      and public.team_program_is_active(p.id)
      and (
        exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
        or public.is_advisor_org_lead_of(p.org_id)
        or exists (
          select 1 from public.team_program_contacts c
          where c.program_id = p.id and c.advisor_user_id = auth.uid() and public.is_advisor_org_member(p.org_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_org_team_programs(p_org_id uuid)
returns table (
  program_id uuid,
  team_id uuid,
  team_name text,
  status text,
  is_active boolean,
  member_count integer,
  approved_count integer,
  contact_user_ids uuid[],
  is_contact boolean,
  batch text,
  category text,
  is_alumni boolean,
  solo_confirmed boolean,
  includes_setup boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.team_id,
    t.name,
    p.status,
    public.team_program_is_active(p.id),
    (select count(*)::integer from public.founder_team_members m where m.team_id = p.team_id),
    (select count(*)::integer from public.founder_team_members m
       join public.team_program_consents c on c.program_id = p.id and c.founder_user_id = m.user_id
       where m.team_id = p.team_id),
    coalesce((select array_agg(c.advisor_user_id order by c.created_at) from public.team_program_contacts c where c.program_id = p.id), '{}'::uuid[]),
    exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()),
    p.batch,
    p.category,
    p.is_alumni,
    p.solo_confirmed_at is not null,
    p.includes_setup
  from public.team_programs p
  join public.founder_teams t on t.id = p.team_id
  where p.org_id = p_org_id
    and p.status <> 'ended'
    and public.is_advisor_org_member(p_org_id)
    and (
      public.is_advisor_org_lead_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by t.name nulls last, p.created_at;
$$;

create or replace function public.get_program_access_for_me(p_org_id uuid)
returns table (program_id uuid, team_review text, founder_setup text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case
      when exists (
        select 1 from public.advisor_team_reviews r
        where r.team_id = p.team_id
          and r.status = 'active'
          and r.team_access_ended_at is null
          and (
            r.advisor_user_id = auth.uid()
            or (r.org_id = p.org_id and public.is_advisor_org_member(p.org_id))
          )
      ) then 'active'
      when exists (
        select 1 from public.advisor_team_reviews r
        where r.advisor_user_id = auth.uid() and r.status = 'requested'
          and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id)
          and not exists (
            select 1 from public.advisor_team_review_members x
            where x.review_id = r.id
              and not exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = x.subject_user_id)
          )
          and not exists (
            select 1 from public.founder_team_members m
            where m.team_id = p.team_id and m.user_id <> auth.uid()
              and not exists (select 1 from public.advisor_team_review_members x where x.review_id = r.id and x.subject_user_id = m.user_id)
          )
      ) then 'requested'
      else 'none'
    end,
    case
      when p.includes_setup then 'active'
      when exists (
        select 1 from public.founder_team_advisor_setup_grants g
        where g.team_id = p.team_id and g.advisor_user_id = auth.uid() and g.status = 'active'
          and not exists (
            select 1 from public.founder_team_members m
            where m.team_id = p.team_id
              and not exists (
                select 1 from public.founder_team_advisor_setup_consents c
                where c.grant_id = g.id and c.founder_user_id = m.user_id
              )
          )
      ) then 'active'
      when exists (
        select 1 from public.founder_team_advisor_setup_grants g
        where g.team_id = p.team_id and g.advisor_user_id = auth.uid() and g.status in ('pending', 'active')
      ) then 'requested'
      else 'none'
    end
  from public.team_programs p
  where p.org_id = p_org_id
    and p.status <> 'ended'
    and public.team_program_is_active(p.id)
    and public.is_advisor_org_member(p_org_id)
    and (
      public.is_advisor_org_lead_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    );
$$;

create or replace function public.get_program_confirmed_setup(p_program_id uuid)
returns table (
  item_key text,
  resolution_status text,
  note text,
  documentation_reference text,
  confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select item.item_key, revision.resolution_status, revision.note, revision.documentation_reference, revision.confirmed_at
  from public.team_programs p
  join public.founder_team_setup_items item on item.team_id = p.team_id
  join public.founder_team_setup_revisions revision
    on revision.id = item.current_confirmed_revision_id and revision.setup_item_id = item.id
  where p.id = p_program_id
    and auth.uid() is not null
    and p.status = 'active'
    and p.includes_setup
    and public.team_program_is_active(p.id)
    and (
      public.is_advisor_org_lead_of(p.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
    and revision.confirmed_at is not null
    and revision.superseded_at is null
    and not exists (
      select 1 from public.founder_team_members current_member
      where current_member.team_id = p.team_id
        and not exists (
          select 1 from public.founder_team_setup_confirmations confirmation
          where confirmation.revision_id = revision.id
            and confirmation.user_id = current_member.user_id
            and public.setup_confirmation_is_current(p.team_id, confirmation.user_id, confirmation.confirmed_at)))
  order by item.item_key;
$$;

create or replace function public.get_program_outcomes(p_program_id uuid)
returns table (
  catalog_id uuid, default_key text, title text, stars integer,
  outcome_id uuid, achieved_on date, note text, confirmed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_team uuid;
begin
  select org_id, team_id into v_org, v_team from public.team_programs p
  where p.id = p_program_id and p.status = 'active' and public.team_program_is_active(p.id);
  if v_org is null or auth.uid() is null or not public.org_success_enabled(v_org) then
    return;
  end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid())
    or public.is_advisor_org_lead_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid())
  ) then
    return;
  end if;
  perform public.seed_outcome_catalog(v_org);
  return query
  select c.id, c.default_key, c.title, c.stars, o.id, o.achieved_on, o.note, (o.confirmed_at is not null)
  from public.program_outcome_catalog c
  left join public.program_outcomes o on o.catalog_id = c.id and o.program_id = p_program_id
  where c.org_id = v_org and (c.active or o.id is not null)
  order by c.sort_order, c.created_at;
end;
$$;

create or replace function public.delete_program_goal(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goal public.team_program_goals%rowtype;
begin
  select * into v_goal from public.team_program_goals g where g.id = p_goal_id;
  if v_goal.id is null then
    return;
  end if;
  if not public.program_tasks_access(v_goal.program_id)
     or not (v_goal.created_by_user_id = auth.uid() or exists (select 1 from public.team_programs p where p.id = v_goal.program_id and public.is_advisor_org_lead_of(p.org_id))) then
    raise exception 'program_goal_not_yours' using errcode = '42501';
  end if;
  delete from public.team_program_goals where id = p_goal_id;
end;
$$;

create or replace function public.delete_program_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.team_program_tasks%rowtype;
begin
  select * into v_task from public.team_program_tasks t where t.id = p_task_id;
  if v_task.id is null then
    return;
  end if;
  if not public.program_tasks_access(v_task.program_id)
     or not (
       v_task.created_by_user_id = auth.uid()
       or (v_task.visibility = 'shared' and exists (select 1 from public.team_programs p where p.id = v_task.program_id and public.is_advisor_org_lead_of(p.org_id)))
     ) then
    raise exception 'program_task_not_yours' using errcode = '42501';
  end if;
  delete from public.team_program_tasks where id = p_task_id;
end;
$$;

create or replace function public.delete_org_campaign(p_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.advisor_org_campaigns%rowtype;
begin
  select * into v_campaign from public.advisor_org_campaigns c where c.id = p_campaign_id;
  if v_campaign.id is null then
    return false;
  end if;
  if not public.can_work_in_org(v_campaign.org_id) or not (v_campaign.created_by_user_id = auth.uid() or public.is_advisor_org_lead_of(v_campaign.org_id)) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_campaigns where id = p_campaign_id;
  return true;
end;
$$;

create or replace function public.delete_org_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.advisor_org_posts%rowtype;
begin
  select * into v_post from public.advisor_org_posts p where p.id = p_post_id;
  if v_post.id is null then
    return false;
  end if;
  if not public.can_work_in_org(v_post.org_id) or not (v_post.created_by_user_id = auth.uid() or public.is_advisor_org_lead_of(v_post.org_id)) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_posts where id = p_post_id;
  return true;
end;
$$;

create or replace function public.delete_org_page(p_page_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.advisor_org_pages%rowtype;
begin
  select * into v_page from public.advisor_org_pages p where p.id = p_page_id;
  if v_page.id is null then
    return false;
  end if;
  if not public.can_use_org_page(p_page_id)
     or not (v_page.created_by_user_id = auth.uid() or (v_page.visibility = 'team' and public.is_advisor_org_lead_of(v_page.org_id))) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if exists (select 1 from public.advisor_org_pages c where c.parent_id = p_page_id) then
    raise exception 'org_page_has_children' using errcode = '55000';
  end if;
  delete from public.advisor_org_pages where id = p_page_id;
  return true;
end;
$$;

create or replace function public.update_org_chat_group(p_chat_id uuid, p_name text, p_member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chat public.advisor_org_chats%rowtype;
  v_members uuid[];
begin
  select * into v_chat from public.advisor_org_chats c where c.id = p_chat_id and c.kind = 'group';
  if v_chat.id is null or not public.can_work_in_org(v_chat.org_id) or not public.can_read_org_chat(p_chat_id)
     or not (v_chat.created_by_user_id = auth.uid() or public.is_advisor_org_lead_of(v_chat.org_id)) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'org_chat_invalid' using errcode = '22023';
  end if;
  v_members := public.clean_group_members(v_chat.org_id, p_member_ids);
  update public.advisor_org_chats set name = btrim(p_name) where id = p_chat_id;
  delete from public.advisor_org_chat_members where chat_id = p_chat_id and not (user_id = any (v_members));
  insert into public.advisor_org_chat_members (chat_id, user_id)
  select p_chat_id, member from unnest(v_members) as member
  on conflict do nothing;
end;
$$;

CREATE OR REPLACE FUNCTION public.set_program_attendance(p_event_id uuid, p_program_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_org uuid;
  v_archived timestamptz;
begin
  select e.org_id, e.archived_at into v_org, v_archived from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.id = p_program_id
  where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not (
    public.is_advisor_org_lead_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid())
  ) or not public.program_event_reaches(p_event_id, p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  -- Ein archivierter Termin ist eingefroren (die Teilnahme bleibt fuer die Auswertung, wie sie war).
  if v_archived is not null then
    raise exception 'program_event_archived' using errcode = '55000';
  end if;
  if not public.team_program_is_active(p_program_id) then
    raise exception 'team_program_not_active' using errcode = '55000';
  end if;
  if p_status is null or p_status = '' then
    delete from public.team_program_attendance where event_id = p_event_id and program_id = p_program_id;
  else
    insert into public.team_program_attendance (event_id, program_id, status, set_by_user_id)
    values (p_event_id, p_program_id, p_status, auth.uid())
    on conflict (event_id, program_id) do update
    set status = excluded.status, set_by_user_id = excluded.set_by_user_id, set_at = pg_catalog.now();
  end if;
end;
$function$;

create or replace function public.get_event_attendance(p_event_id uuid)
returns table (program_id uuid, team_name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, t.name, a.status
  from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.status = 'active' and public.team_program_is_active(p.id)
  join public.founder_teams t on t.id = p.team_id
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.id
  where e.id = p_event_id
    and auth.uid() is not null
    and public.program_event_reaches(e.id, p.id)
    and (
      public.is_advisor_org_lead_of(e.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by t.name nulls last, p.created_at;
$$;

create or replace function public.get_event_rsvps(p_event_id uuid)
returns table (program_id uuid, user_id uuid, display_name text, response text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, m.user_id, core.display_name, v.response
  from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.status = 'active' and public.team_program_is_active(p.id)
  join public.founder_team_members m on m.team_id = p.team_id
  left join public.person_core core on core.user_id = m.user_id
  left join public.team_program_event_rsvps v
    on v.event_id = e.id and v.program_id = p.id and v.user_id = m.user_id
  where e.id = p_event_id
    and auth.uid() is not null
    and public.program_event_reaches(e.id, p.id)
    and (
      public.is_advisor_org_lead_of(e.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by p.id, core.display_name nulls last, m.user_id;
$$;

create or replace function public.program_report_programs(p_org_id uuid)
returns table (program_id uuid, team_id uuid, team_name text, members integer, active_since date)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.team_id, t.name,
    (select count(*)::integer from public.founder_team_members m where m.team_id = p.team_id),
    (coalesce(p.activated_at, p.created_at) at time zone 'Europe/Berlin')::date
  from public.team_programs p
  join public.founder_teams t on t.id = p.team_id
  where p.org_id = p_org_id
    and auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and (
      (public.org_has_right(p_org_id, 'results') and public.is_advisor_org_lead_of(p_org_id))
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid() and public.org_has_right(p_org_id, 'results'))
    );
$$;

create or replace function public.get_org_outcome_counts(p_org_id uuid)
returns table (batch text, catalog_id uuid, default_key text, title text, teams_total integer, teams_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select p.id, p.batch
    from public.team_programs p
    where p.org_id = p_org_id
      and p.status = 'active'
      and public.team_program_is_active(p.id)
      and (public.is_advisor_org_member(p_org_id) or public.is_advisor_org_guest(p_org_id))
      and public.org_success_enabled(p_org_id)
      and (
        (public.org_has_right(p_org_id, 'results') and (public.is_advisor_org_lead_of(p_org_id) or public.is_advisor_org_guest(p_org_id)))
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid() and public.org_has_right(p_org_id, 'results'))
      )
  ),
  batches as (
    select v.batch, count(*)::integer as teams_total from visible v group by v.batch
  ),
  done as (
    select v.batch, o.catalog_id, count(*)::integer as n
    from visible v
    join public.program_outcomes o on o.program_id = v.id and o.confirmed_at is not null
    group by v.batch, o.catalog_id
  )
  select b.batch, c.id, c.default_key, c.title, b.teams_total, coalesce(d.n, 0)
  from batches b
  cross join public.program_outcome_catalog c
  left join done d on d.batch is not distinct from b.batch and d.catalog_id = c.id
  where c.org_id = p_org_id and (c.active or d.n is not null)
  order by b.batch nulls last, c.sort_order, c.created_at;
$$;

create or replace function public.get_org_program_stars(p_org_id uuid)
returns table (program_id uuid, stars integer, next_stars integer, next_title text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         public.program_star_total(p.id),
         nxt.stars_needed,
         nxt.title
  from public.team_programs p
  join public.founder_teams t on t.id = p.team_id
  left join lateral (
    select r.stars_needed, r.title from public.program_rewards r
    where r.org_id = p.org_id and r.active and r.stars_needed > public.program_star_total(p.id)
    order by r.stars_needed limit 1
  ) nxt on true
  where p.org_id = p_org_id
    and p.status = 'active'
    and auth.uid() is not null
    and public.org_success_enabled(p_org_id)
    and public.team_program_is_active(p.id)
    and (
      (public.org_has_right(p_org_id, 'results') and public.is_advisor_org_lead_of(p_org_id))
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid() and public.org_has_right(p_org_id, 'results'))
    )
  order by t.name nulls last, p.created_at;
$$;

create or replace function public.get_org_milestone_deadlines(p_org_id uuid)
returns table (program_id uuid, team_name text, milestone_title text, due_on date, target_count integer, done_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, t.name, m.title, m.due_on, m.target_count, m.done_count
  from public.team_program_milestones m
  join public.team_programs p on p.id = m.program_id and p.org_id = p_org_id
  join public.founder_teams t on t.id = p.team_id
  where public.can_use_team_program(p.id)
    and m.due_on is not null and m.due_on <= current_date
    and (m.target_count is null or m.done_count < m.target_count)
    and (
      (public.org_has_right(p_org_id, 'results') and public.is_advisor_org_lead_of(p_org_id))
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid() and public.org_has_right(p_org_id, 'results'))
    )
  order by m.due_on, t.name;
$$;

CREATE OR REPLACE FUNCTION public.list_program_events(p_org_id uuid)
 RETURNS TABLE(event_id uuid, title text, kind text, starts_at timestamp with time zone, location text, notes text, todos text, format_id uuid, format_label text, ends_at timestamp with time zone, venue text, audience text, program_ids uuid[], mandatory boolean, host text, internal_note text, public_url text, public_status text, archived_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.id, e.title, e.kind, e.starts_at, e.location, case when public.is_advisor_org_member(p_org_id) then e.notes end, case when public.is_advisor_org_member(p_org_id) then e.todos end, e.format_id, f.label,
    e.ends_at, e.venue, e.audience,
    coalesce((select array_agg(a.program_id) from public.team_program_event_audience a where a.event_id = e.id), '{}'),
    e.mandatory, e.host, case when public.is_advisor_org_member(p_org_id) then e.internal_note end, e.public_url,
    (select x.status from public.ecosystem_events x where x.id = e.public_event_id),
    e.archived_at
  from public.team_program_events e
  left join public.program_event_formats f on f.id = e.format_id
  where e.org_id = p_org_id and (public.is_advisor_org_member(p_org_id) or public.is_advisor_org_guest(p_org_id))
  order by e.starts_at;
$function$;

create or replace function public.get_program_task_people(p_program_id uuid)
returns table (user_id uuid, display_name text, side text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(nullif(btrim(core.display_name), ''), ''), 'team'::text
  from public.team_programs p
  join public.founder_team_members m on m.team_id = p.team_id
  left join public.person_core core on core.user_id = m.user_id
  where p.id = p_program_id and public.program_tasks_access(p.id)
  union
  select om.user_id, coalesce(nullif(btrim(core.display_name), ''), ''), 'org'::text
  from public.team_programs p
  join public.advisor_org_members om on om.org_id = p.org_id and om.status = 'active'
  left join public.person_core core on core.user_id = om.user_id
  where p.id = p_program_id and public.program_tasks_access(p.id)
    and (om.role in ('owner', 'coordinator') or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = om.user_id))
  order by 3, 2;
$$;

create or replace function public.program_task_assignee_ok(p_program_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_programs p
    where p.id = p_program_id
      and (
        exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = p_user_id)
        or exists (select 1 from public.advisor_org_members om where om.org_id = p.org_id and om.user_id = p_user_id and om.status = 'active' and om.role in ('owner', 'coordinator'))
        or exists (
          select 1 from public.team_program_contacts c
          join public.advisor_org_members om on om.org_id = p.org_id and om.user_id = c.advisor_user_id and om.status = 'active'
          where c.program_id = p.id and c.advisor_user_id = p_user_id
        )
      )
  );
$$;

commit;
