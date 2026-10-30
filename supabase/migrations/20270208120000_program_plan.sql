-- Programmplan und Teilnahme.
--
-- Eine Organisation skizziert ihr Programm als Veranstaltungen (Education,
-- intern, extern) mit Datum, Ort, Hinweisen und To-dos. Die Teams im Programm
-- sehen sie. Die Teilnahme tragen Inhaber und Bezugspersonen von Hand ein
-- (da / fehlte / entschuldigt); das Team sieht nur seinen EIGENEN Eintrag.
--
-- Grenzen:
--   - Veranstaltungen gehoeren der Organisation, nicht einem Team.
--   - Sichtbar fuer Teams nur, solange ihr Programm aktiv ist (alle zugestimmt).
--   - Die Teilnahme steht an Programm und Veranstaltung, nicht an einer Person;
--     sie wird mit dem Ende des Programms geloescht (Trigger).
--   - Nur Inhaber legen Veranstaltungen an; Inhaber und Bezugspersonen des
--     Teams tragen die Teilnahme ein. Keine Zaehlung, keine Wertung.

begin;

create table public.team_program_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  title text not null,
  kind text not null default 'education',
  starts_at timestamptz not null,
  location text,
  notes text,
  todos text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_program_events_title check (char_length(btrim(title)) between 1 and 160),
  constraint team_program_events_kind check (kind in ('education', 'internal', 'external')),
  constraint team_program_events_location check (location is null or char_length(location) <= 200),
  constraint team_program_events_notes check (notes is null or char_length(notes) <= 2000),
  constraint team_program_events_todos check (todos is null or char_length(todos) <= 2000)
);
create index team_program_events_org_idx on public.team_program_events (org_id, starts_at);

create table public.team_program_attendance (
  event_id uuid not null references public.team_program_events (id) on delete cascade,
  program_id uuid not null references public.team_programs (id) on delete cascade,
  status text not null,
  set_by_user_id uuid references auth.users (id) on delete set null,
  set_at timestamptz not null default now(),
  primary key (event_id, program_id),
  constraint team_program_attendance_status check (status in ('present', 'absent', 'excused'))
);

alter table public.team_program_events enable row level security;
alter table public.team_program_attendance enable row level security;
revoke all on public.team_program_events, public.team_program_attendance from anon, authenticated;

-- Mit dem Ende des Programms ist die Teilnahme weg.
create or replace function public.delete_attendance_when_program_ends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    delete from public.team_program_attendance where program_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.delete_attendance_when_program_ends() from public, anon, authenticated;
create trigger delete_attendance_when_program_ends
after update of status on public.team_programs
for each row execute function public.delete_attendance_when_program_ends();

-- Anlegen und aendern: nur der Inhaber.
create or replace function public.save_program_event(
  p_org_id uuid, p_event_id uuid, p_title text, p_kind text, p_starts_at timestamptz,
  p_location text, p_notes text, p_todos text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_event_id is null then
    insert into public.team_program_events (org_id, title, kind, starts_at, location, notes, todos, created_by_user_id)
    values (p_org_id, btrim(p_title), p_kind, p_starts_at, nullif(btrim(coalesce(p_location, '')), ''),
            nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_todos, '')), ''), auth.uid())
    returning id into v_id;
  else
    update public.team_program_events
    set title = btrim(p_title), kind = p_kind, starts_at = p_starts_at,
        location = nullif(btrim(coalesce(p_location, '')), ''),
        notes = nullif(btrim(coalesce(p_notes, '')), ''),
        todos = nullif(btrim(coalesce(p_todos, '')), '')
    where id = p_event_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'program_event_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text) from public, anon;
grant execute on function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text) to authenticated;

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
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_events where id = p_event_id;
end;
$$;
revoke all on function public.delete_program_event(uuid) from public, anon;
grant execute on function public.delete_program_event(uuid) to authenticated;

-- Fuer die Organisation: Inhaber und Mitglieder sehen den Plan.
create or replace function public.list_program_events(p_org_id uuid)
returns table (event_id uuid, title text, kind text, starts_at timestamptz, location text, notes text, todos text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos
  from public.team_program_events e
  where e.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by e.starts_at;
$$;
revoke all on function public.list_program_events(uuid) from public, anon;
grant execute on function public.list_program_events(uuid) to authenticated;

-- Teilnahme je Veranstaltung: Inhaber sehen alle Teams, Bezugspersonen die eigenen.
-- Nur Teams mit aktivem Programm - sonst waere "fehlte" ein Eintrag ueber ein Team, das nicht zugestimmt hat.
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
    and (
      public.is_advisor_org_owner_of(e.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by t.name nulls last, p.created_at;
$$;
revoke all on function public.get_event_attendance(uuid) from public, anon;
grant execute on function public.get_event_attendance(uuid) to authenticated;

-- Eintragen: Inhaber oder Bezugsperson dieses Teams, bei aktivem Programm. "Leer" nimmt den Eintrag zurueck.
create or replace function public.set_program_attendance(p_event_id uuid, p_program_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select e.org_id into v_org from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.id = p_program_id
  where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not (
    public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid())
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
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
$$;
revoke all on function public.set_program_attendance(uuid, uuid, text) from public, anon;
grant execute on function public.set_program_attendance(uuid, uuid, text) to authenticated;

-- Fuer das Team: der Plan der Organisationen, in deren Programm es aktiv ist, mit dem EIGENEN Eintrag.
create or replace function public.get_my_program_events()
returns table (program_id uuid, org_name text, event_id uuid, title text, kind text, starts_at timestamptz,
               location text, notes text, todos text, my_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, o.name, e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos, a.status
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  join public.team_program_events e on e.org_id = p.org_id
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.id
  where auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
  order by e.starts_at;
$$;
revoke all on function public.get_my_program_events() from public, anon;
grant execute on function public.get_my_program_events() to authenticated;

commit;
