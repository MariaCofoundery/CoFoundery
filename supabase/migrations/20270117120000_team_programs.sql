-- Team <-> Programm: ein Team tritt einem Programm einer Organisation bei.
--
-- Feste Produktentscheidungen (Advisor-Konzept, 30.10.2026):
--   A. Die Organisation LAEDT EIN, das Team STIMMT ZU. Eine Einladung ist ein
--      Token (nur der Hash liegt hier). Wer ihn einloest, waehlt eines seiner
--      eigenen Teams - die Organisation sucht nie in Teams.
--   B. JEDES aktuelle Mitglied muss zustimmen. Aktiv ist ein Programm nur, solange
--      die Zustimmungen zum AKTUELLEN Roster passen; ein neues Mitglied ohne
--      Zustimmung macht es wieder inaktiv. Eine historische Zustimmung ist nie
--      eine aktuelle.
--   C. Mitgliedschaft in der Organisation gibt nichts frei. Das Programm gibt
--      nur das frei, was das Team ins Programm EINTRAEGT (spaetere Schritte:
--      Programmprofil, Meilensteine, Updates). Arbeitsweisen, Founder Setup und
--      Team-Review bleiben eigene Freigaben.
--   D. Bezugspersonen sind aktive Mitglieder der Organisation, vom Inhaber
--      zugeordnet. Sieht ein Team nur ueber sie; Inhaber (Admins) sehen alle
--      Programme ihrer Organisation.
--   E. Beenden kann jedes Teammitglied und der Inhaber - jederzeit.
--
-- Alle Tabellen sind geschlossen; gelesen und geschrieben wird nur ueber die
-- Funktionen unten.

begin;

create table public.team_program_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  created_by_user_id uuid references auth.users (id) on delete set null,
  label text,
  token_hash text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_at timestamptz,
  used_by_user_id uuid references auth.users (id) on delete set null,
  constraint team_program_invites_token_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint team_program_invites_token_unique unique (token_hash),
  constraint team_program_invites_status_check check (status in ('open', 'used', 'revoked')),
  constraint team_program_invites_used check ((status = 'used') = (used_at is not null)),
  constraint team_program_invites_label_len check (label is null or char_length(label) <= 120)
);
create index team_program_invites_org_idx on public.team_program_invites (org_id, status);

create table public.team_programs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  status text not null default 'invited',
  started_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  ended_at timestamptz,
  ended_by_user_id uuid references auth.users (id) on delete set null,
  constraint team_programs_status_check check (status in ('invited', 'active', 'ended')),
  constraint team_programs_ended check ((status = 'ended') = (ended_at is not null))
);
create unique index team_programs_one_open_per_team_org
  on public.team_programs (org_id, team_id) where status <> 'ended';
create index team_programs_team_idx on public.team_programs (team_id) where status <> 'ended';

create table public.team_program_consents (
  program_id uuid not null references public.team_programs (id) on delete cascade,
  founder_user_id uuid not null references auth.users (id) on delete cascade,
  approved_at timestamptz not null default now(),
  primary key (program_id, founder_user_id)
);

create table public.team_program_contacts (
  program_id uuid not null references public.team_programs (id) on delete cascade,
  advisor_user_id uuid not null references auth.users (id) on delete cascade,
  assigned_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (program_id, advisor_user_id)
);

alter table public.team_program_invites enable row level security;
alter table public.team_programs enable row level security;
alter table public.team_program_consents enable row level security;
alter table public.team_program_contacts enable row level security;
revoke all on public.team_program_invites, public.team_programs,
  public.team_program_consents, public.team_program_contacts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Intern: gilt die Zustimmung gerade fuer das AKTUELLE Roster?
-- ---------------------------------------------------------------------------
create or replace function public.team_program_is_active(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_programs program
    join public.founder_teams team on team.id = program.team_id and team.archived_at is null
    where program.id = p_program_id
      and program.status = 'active'
      and exists (select 1 from public.founder_team_members m where m.team_id = program.team_id)
      and not exists (
        select 1 from public.founder_team_members m
        where m.team_id = program.team_id
          and not exists (
            select 1 from public.team_program_consents c
            where c.program_id = program.id and c.founder_user_id = m.user_id
          )
      )
  );
$$;
revoke all on function public.team_program_is_active(uuid) from public, anon, authenticated;

-- Intern: aktiv setzen, sobald alle aktuellen Mitglieder zugestimmt haben.
create or replace function public.team_program_try_activate(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  select team_id into v_team from public.team_programs where id = p_program_id and status = 'invited';
  if v_team is null then return; end if;
  if exists (select 1 from public.founder_team_members m where m.team_id = v_team)
     and not exists (
       select 1 from public.founder_team_members m
       where m.team_id = v_team
         and not exists (
           select 1 from public.team_program_consents c
           where c.program_id = p_program_id and c.founder_user_id = m.user_id
         )
     )
  then
    update public.team_programs
    set status = 'active', activated_at = pg_catalog.now()
    where id = p_program_id and status = 'invited';
  end if;
end;
$$;
revoke all on function public.team_program_try_activate(uuid) from public, anon, authenticated;

create or replace function public.is_advisor_org_owner_of(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_org_members m
    join public.advisor_orgs o on o.id = m.org_id and o.status = 'active'
    where m.org_id = p_org_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role = 'owner'
  );
$$;
revoke all on function public.is_advisor_org_owner_of(uuid) from public, anon;
grant execute on function public.is_advisor_org_owner_of(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Einladung der Organisation
-- ---------------------------------------------------------------------------
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
  if not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  insert into public.team_program_invites (org_id, created_by_user_id, token_hash, label)
  values (p_org_id, auth.uid(), p_token_hash, nullif(btrim(coalesce(p_label, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_team_program_invite(uuid, text, text) from public, anon;
grant execute on function public.create_team_program_invite(uuid, text, text) to authenticated;

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
  if v_org is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_invites set status = 'revoked' where id = p_invite_id and status = 'open';
end;
$$;
revoke all on function public.revoke_team_program_invite(uuid) from public, anon;
grant execute on function public.revoke_team_program_invite(uuid) to authenticated;

-- Offene Einladungen: der Inhaber sieht sie, die Token nie.
create or replace function public.list_team_program_invites(p_org_id uuid)
returns table (invite_id uuid, label text, status text, created_at timestamptz, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.label, i.status, i.created_at, i.expires_at
  from public.team_program_invites i
  where i.org_id = p_org_id and public.is_advisor_org_owner_of(p_org_id)
  order by i.created_at desc;
$$;
revoke all on function public.list_team_program_invites(uuid) from public, anon;
grant execute on function public.list_team_program_invites(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Einloesen: eines der EIGENEN Teams waehlen. Die Organisation erfaehrt erst
-- dann etwas, wenn jemand aus dem Team das ausdruecklich tut.
-- ---------------------------------------------------------------------------
create or replace function public.get_team_program_invite_options(p_token_hash text)
returns table (org_name text, team_id uuid, team_name text, member_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, t.id, t.name, (select count(*)::integer from public.founder_team_members m2 where m2.team_id = t.id)
  from public.team_program_invites i
  join public.advisor_orgs o on o.id = i.org_id and o.status = 'active'
  join public.founder_team_members m on m.user_id = auth.uid()
  join public.founder_teams t on t.id = m.team_id and t.archived_at is null
  where i.token_hash = p_token_hash and i.status = 'open' and i.expires_at > pg_catalog.now()
    and auth.uid() is not null
  order by t.created_at;
$$;
revoke all on function public.get_team_program_invite_options(text) from public, anon;
grant execute on function public.get_team_program_invite_options(text) to authenticated;

create or replace function public.start_team_program(p_token_hash text, p_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.team_program_invites%rowtype;
  v_program uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.founder_team_members m
    join public.founder_teams t on t.id = m.team_id and t.archived_at is null
    where m.team_id = p_team_id and m.user_id = v_user
  ) then
    raise exception 'team_program_not_your_team' using errcode = '42501';
  end if;

  select * into v_invite from public.team_program_invites
  where token_hash = p_token_hash and status = 'open' and expires_at > pg_catalog.now()
  for update;
  if not found
     or not exists (select 1 from public.advisor_orgs o where o.id = v_invite.org_id and o.status = 'active') then
    raise exception 'team_program_invite_invalid' using errcode = '22023';
  end if;

  insert into public.team_programs (org_id, team_id, started_by_user_id)
  values (v_invite.org_id, p_team_id, v_user)
  returning id into v_program;

  insert into public.team_program_consents (program_id, founder_user_id) values (v_program, v_user);
  update public.team_program_invites
  set status = 'used', used_at = pg_catalog.now(), used_by_user_id = v_user
  where id = v_invite.id;

  perform public.team_program_try_activate(v_program);
  return v_program;
end;
$$;
revoke all on function public.start_team_program(text, uuid) from public, anon;
grant execute on function public.start_team_program(text, uuid) to authenticated;

create or replace function public.consent_team_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select team_id into v_team from public.team_programs where id = p_program_id and status <> 'ended';
  if v_team is null or not exists (
    select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid()
  ) then
    raise exception 'team_program_not_your_team' using errcode = '42501';
  end if;
  insert into public.team_program_consents (program_id, founder_user_id)
  values (p_program_id, auth.uid())
  on conflict do nothing;
  perform public.team_program_try_activate(p_program_id);
end;
$$;
revoke all on function public.consent_team_program(uuid) from public, anon;
grant execute on function public.consent_team_program(uuid) to authenticated;

-- Jedes Teammitglied kann seine Zustimmung zurueckziehen; das beendet das
-- Programm fuer das Team (eine Zustimmung, die fehlt, ist keine).
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
    or public.is_advisor_org_owner_of(v_org)
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  update public.team_programs
  set status = 'ended', ended_at = pg_catalog.now(), ended_by_user_id = auth.uid()
  where id = p_program_id;
  delete from public.team_program_contacts where program_id = p_program_id;
end;
$$;
revoke all on function public.end_team_program(uuid) from public, anon;
grant execute on function public.end_team_program(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Bezugspersonen: nur aktive Mitglieder der Organisation, nur vom Inhaber.
-- ---------------------------------------------------------------------------
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
  if v_org is null or not public.is_advisor_org_owner_of(v_org) then
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
revoke all on function public.set_team_program_contacts(uuid, uuid[]) from public, anon;
grant execute on function public.set_team_program_contacts(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Lesen auf der Seite der Organisation.
-- Inhaber: alle Programme. Andere Mitglieder: nur die, in denen sie
-- Bezugsperson sind. Der Teamname ist erst sichtbar, wenn ein Teammitglied
-- das Programm gestartet hat - dazu kommt es nur ueber das Einloesen.
-- ---------------------------------------------------------------------------
create or replace function public.get_org_team_programs(p_org_id uuid)
returns table (
  program_id uuid,
  team_id uuid,
  team_name text,
  status text,
  is_active boolean,
  member_count integer,
  approved_count integer,
  contact_user_ids uuid[],
  is_contact boolean
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
    exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
  from public.team_programs p
  join public.founder_teams t on t.id = p.team_id
  where p.org_id = p_org_id
    and p.status <> 'ended'
    and public.is_advisor_org_member(p_org_id)
    and (
      public.is_advisor_org_owner_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by t.name nulls last, p.created_at;
$$;
revoke all on function public.get_org_team_programs(uuid) from public, anon;
grant execute on function public.get_org_team_programs(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Lesen auf der Seite des Teams: wo bin ich, wer sieht mit, wer fehlt noch?
-- Namen der Bezugspersonen: aus dem Kern, den nur diese Funktion ausgibt - das
-- Team sieht, WER mitliest, sonst waere die Zustimmung ein Blankoscheck.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_team_programs()
returns table (
  program_id uuid,
  team_id uuid,
  org_name text,
  status text,
  is_active boolean,
  i_approved boolean,
  member_count integer,
  approved_count integer,
  contact_names text[],
  admin_names text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.team_id,
    o.name,
    p.status,
    public.team_program_is_active(p.id),
    exists (select 1 from public.team_program_consents c where c.program_id = p.id and c.founder_user_id = auth.uid()),
    (select count(*)::integer from public.founder_team_members m where m.team_id = p.team_id),
    (select count(*)::integer from public.founder_team_members m
       join public.team_program_consents c on c.program_id = p.id and c.founder_user_id = m.user_id
       where m.team_id = p.team_id),
    coalesce((select array_agg(coalesce(nullif(btrim(core.display_name), ''), '') order by c.created_at)
              from public.team_program_contacts c
              left join public.person_core core on core.user_id = c.advisor_user_id
              where c.program_id = p.id), '{}'::text[]),
    coalesce((select array_agg(coalesce(nullif(btrim(core.display_name), ''), '') order by om.created_at)
              from public.advisor_org_members om
              left join public.person_core core on core.user_id = om.user_id
              where om.org_id = p.org_id and om.role = 'owner' and om.status = 'active'), '{}'::text[])
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  where p.status <> 'ended'
    and auth.uid() is not null
    and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
  order by p.created_at;
$$;
revoke all on function public.get_my_team_programs() from public, anon;
grant execute on function public.get_my_team_programs() to authenticated;

commit;
