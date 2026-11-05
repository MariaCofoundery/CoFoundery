-- Foerderauflagen: was eine Foerderung vorschreibt, eingepflegt, abgehakt und als Bericht gezogen.
--
-- Wunsch von Maria (05.11.2026): Ein oeffentlich gefoerderter Accelerator muss ein vorgeschriebenes
-- Programm erfuellen (z. B. 8 Workshops, 10 Coaching-Stunden je Team, Zwischenbericht bis 30.6.).
-- Das soll im Accelerator-Bereich stehen, abgehakt werden und den Sachbericht liefern.
--
-- Aufbau:
--   - Eine Foerderung (advisor_org_grants): Name, Geldgeber, Aktenzeichen, Laufzeit.
--   - Ihre Auflagen (advisor_org_requirements), je eine von drei Arten:
--       once     einmalig (erfuellt durch einen Nachweis oder eine erledigte Aufgabe),
--       count    Zielzahl fuer die Organisation,
--       per_team Zielzahl je Team im Programm.
--     Wie gezaehlt wird (measure): von Hand (manual) oder aus dem, was ohnehin erfasst ist -
--     Veranstaltungen im Programmplan (events, optional nur eine Art), Teams im Programm (teams),
--     Teilnahme je Team (event_attendance), Gespraeche zum Stand je Team (check_ins).
--     Gezaehlt wird innerhalb der Laufzeit. Nachweise von Hand kommen immer dazu.
--   - Nachweise (advisor_org_requirement_entries): Datum, Menge (z. B. Stunden), Notiz, optional Team.
--   - "Stand festhalten" (advisor_org_funding_snapshots): Endet ein Programm, loescht das System
--     Teilnahme und Gespraeche dieses Teams (Datensparsamkeit). Ein Bericht wuerde dann nachtraeglich
--     schrumpfen. Ein festgehaltener Stand bleibt, wie er war.
--
-- Regeln:
--   - Eine schaltbare Funktion ('funding'), standardmaessig aus.
--   - Lesen: aktive Mitglieder. Teams im Programm sehen nichts davon.
--   - Foerderung, Auflagen und festgehaltene Staende pflegt die Fuehrung. Nachweise traegt jedes
--     Mitglied ein; fuer ein Team nur, wer das Team sieht (Inhaberin oder Bezugsperson).
--   - Zahlen je Team nur fuer Teams, die die lesende Person sieht - dieselbe Regel wie die Auswertung.
--   - Keine Prozente, keine Ampel: "6 von 8", "erfuellt", "noch offen".

begin;

-- ---------------------------------------------------------------------------
-- Die Funktion 'funding' (Stand 20270223120000 plus ein Schluessel).
-- ---------------------------------------------------------------------------
alter table public.advisor_orgs drop constraint advisor_orgs_features_known;
alter table public.advisor_orgs
  add constraint advisor_orgs_features_known check (features <@ array['plan', 'materials', 'learning', 'experts', 'orgdata', 'funding']::text[]);

create or replace function public.set_org_features(p_org_id uuid, p_features text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wanted text[] := coalesce(p_features, '{}'::text[]);
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if not (v_wanted <@ array['plan', 'materials', 'learning', 'experts', 'orgdata', 'success', 'funding']::text[]) then
    raise exception 'org_feature_unknown' using errcode = 'P0002';
  end if;
  update public.advisor_orgs
  set features = array(select distinct f from unnest(v_wanted) as f where f <> 'success' order by f),
      program_success_enabled = 'success' = any (v_wanted),
      features_setup_done = true
  where id = p_org_id;
end;
$$;
revoke all on function public.set_org_features(uuid, text[]) from public, anon;
grant execute on function public.set_org_features(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table public.advisor_org_grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  name text not null,
  funder text,
  reference text,
  starts_on date not null,
  ends_on date not null,
  notes text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_org_grants_name check (char_length(btrim(name)) between 1 and 160),
  constraint advisor_org_grants_funder check (funder is null or char_length(funder) <= 160),
  constraint advisor_org_grants_reference check (reference is null or char_length(reference) <= 80),
  constraint advisor_org_grants_notes check (notes is null or char_length(notes) <= 2000),
  constraint advisor_org_grants_period check (ends_on >= starts_on)
);
create index advisor_org_grants_org_idx on public.advisor_org_grants (org_id);
create index advisor_org_grants_created_by_idx on public.advisor_org_grants (created_by_user_id);

create table public.advisor_org_requirements (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.advisor_org_grants (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  title text not null,
  kind text not null,
  measure text not null default 'manual',
  event_kind text,
  target numeric(10, 2),
  unit text,
  due_on date,
  notes text,
  sort_order integer not null default 0,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_org_requirements_title check (char_length(btrim(title)) between 1 and 200),
  constraint advisor_org_requirements_kind check (kind in ('once', 'count', 'per_team')),
  constraint advisor_org_requirements_measure check (
    (kind = 'once' and measure = 'manual')
    or (kind = 'count' and measure in ('manual', 'events', 'teams'))
    or (kind = 'per_team' and measure in ('manual', 'event_attendance', 'check_ins'))
  ),
  constraint advisor_org_requirements_event_kind check (event_kind is null or (event_kind in ('education', 'internal', 'external') and measure in ('events', 'event_attendance'))),
  constraint advisor_org_requirements_target check ((kind = 'once' and target is null) or (kind <> 'once' and target > 0 and target <= 100000)),
  constraint advisor_org_requirements_unit check (unit is null or char_length(unit) <= 40),
  constraint advisor_org_requirements_notes check (notes is null or char_length(notes) <= 2000)
);
create index advisor_org_requirements_grant_idx on public.advisor_org_requirements (grant_id, sort_order);
create index advisor_org_requirements_org_idx on public.advisor_org_requirements (org_id);
create index advisor_org_requirements_created_by_idx on public.advisor_org_requirements (created_by_user_id);

create table public.advisor_org_requirement_entries (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.advisor_org_requirements (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  program_id uuid references public.team_programs (id) on delete set null,
  done_on date not null,
  amount numeric(10, 2) not null default 1,
  note text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint advisor_org_requirement_entries_amount check (amount > 0 and amount <= 100000),
  constraint advisor_org_requirement_entries_note check (note is null or char_length(note) <= 1000)
);
create index advisor_org_requirement_entries_req_idx on public.advisor_org_requirement_entries (requirement_id, done_on);
create index advisor_org_requirement_entries_org_idx on public.advisor_org_requirement_entries (org_id);
create index advisor_org_requirement_entries_program_idx on public.advisor_org_requirement_entries (program_id) where program_id is not null;
create index advisor_org_requirement_entries_created_by_idx on public.advisor_org_requirement_entries (created_by_user_id);

create table public.advisor_org_funding_snapshots (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.advisor_org_grants (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  taken_at timestamptz not null default now(),
  taken_by_user_id uuid references auth.users (id) on delete set null,
  note text,
  data jsonb not null,
  constraint advisor_org_funding_snapshots_note check (note is null or char_length(note) <= 500)
);
create index advisor_org_funding_snapshots_grant_idx on public.advisor_org_funding_snapshots (grant_id, taken_at desc);
create index advisor_org_funding_snapshots_org_idx on public.advisor_org_funding_snapshots (org_id);
create index advisor_org_funding_snapshots_taken_by_idx on public.advisor_org_funding_snapshots (taken_by_user_id);

alter table public.advisor_org_tasks
  add column requirement_id uuid references public.advisor_org_requirements (id) on delete set null;
create index advisor_org_tasks_requirement_idx on public.advisor_org_tasks (requirement_id) where requirement_id is not null;

alter table public.advisor_org_grants enable row level security;
alter table public.advisor_org_requirements enable row level security;
alter table public.advisor_org_requirement_entries enable row level security;
alter table public.advisor_org_funding_snapshots enable row level security;
revoke all on public.advisor_org_grants from anon, authenticated;
revoke all on public.advisor_org_requirements from anon, authenticated;
revoke all on public.advisor_org_requirement_entries from anon, authenticated;
revoke all on public.advisor_org_funding_snapshots from anon, authenticated;
grant select on public.advisor_org_grants to authenticated;
grant select on public.advisor_org_requirements to authenticated;
grant select on public.advisor_org_requirement_entries to authenticated;
grant select on public.advisor_org_funding_snapshots to authenticated;
create policy advisor_org_grants_members_read on public.advisor_org_grants
  for select to authenticated using (public.is_advisor_org_member(org_id));
create policy advisor_org_requirements_members_read on public.advisor_org_requirements
  for select to authenticated using (public.is_advisor_org_member(org_id));
-- Ein Nachweis fuer ein Team nur fuer die, die das Team sehen.
create policy advisor_org_requirement_entries_members_read on public.advisor_org_requirement_entries
  for select to authenticated using (
    public.is_advisor_org_member(org_id)
    and (program_id is null or public.can_see_org_program(org_id, program_id))
  );
create policy advisor_org_funding_snapshots_members_read on public.advisor_org_funding_snapshots
  for select to authenticated using (public.is_advisor_org_owner_of(org_id));

-- can_see_org_program war nur intern (20270312120000); die Zeilensicherheit ruft sie jetzt auf.
grant execute on function public.can_see_org_program(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Foerderung und Auflagen: die Fuehrung
-- ---------------------------------------------------------------------------
create or replace function public.save_org_grant(
  p_grant_id uuid, p_org_id uuid, p_name text, p_funder text, p_reference text,
  p_starts_on date, p_ends_on date, p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := p_org_id;
  v_id uuid;
begin
  if p_grant_id is not null then
    select g.org_id into v_org from public.advisor_org_grants g where g.id = p_grant_id;
  end if;
  if v_org is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then
    raise exception 'org_funding_invalid' using errcode = '22023';
  end if;
  if p_grant_id is null then
    insert into public.advisor_org_grants (org_id, name, funder, reference, starts_on, ends_on, notes, created_by_user_id)
    values (v_org, btrim(coalesce(p_name, '')), nullif(btrim(coalesce(p_funder, '')), ''), nullif(btrim(coalesce(p_reference, '')), ''),
            p_starts_on, p_ends_on, nullif(btrim(coalesce(p_notes, '')), ''), auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_grants
    set name = btrim(coalesce(p_name, '')), funder = nullif(btrim(coalesce(p_funder, '')), ''),
        reference = nullif(btrim(coalesce(p_reference, '')), ''), starts_on = p_starts_on, ends_on = p_ends_on,
        notes = nullif(btrim(coalesce(p_notes, '')), ''), updated_at = pg_catalog.now()
    where id = p_grant_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_org_grant(uuid, uuid, text, text, text, date, date, text) from public, anon;
grant execute on function public.save_org_grant(uuid, uuid, text, text, text, date, date, text) to authenticated;

create or replace function public.delete_org_grant(p_grant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_advisor_org_owner_of((select g.org_id from public.advisor_org_grants g where g.id = p_grant_id)) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.advisor_org_grants where id = p_grant_id;
  return found;
end;
$$;
revoke all on function public.delete_org_grant(uuid) from public, anon;
grant execute on function public.delete_org_grant(uuid) to authenticated;

create or replace function public.save_org_requirement(
  p_requirement_id uuid, p_grant_id uuid, p_title text, p_kind text, p_measure text, p_event_kind text,
  p_target numeric, p_unit text, p_due_on date, p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant uuid := p_grant_id;
  v_org uuid;
  v_id uuid;
begin
  if p_requirement_id is not null then
    select r.grant_id into v_grant from public.advisor_org_requirements r where r.id = p_requirement_id;
  end if;
  select g.org_id into v_org from public.advisor_org_grants g where g.id = v_grant;
  if v_org is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_requirement_id is null then
    insert into public.advisor_org_requirements (grant_id, org_id, title, kind, measure, event_kind, target, unit, due_on, notes, sort_order, created_by_user_id)
    values (v_grant, v_org, btrim(coalesce(p_title, '')), p_kind, coalesce(p_measure, 'manual'), nullif(p_event_kind, ''),
            case when p_kind = 'once' then null else p_target end, nullif(btrim(coalesce(p_unit, '')), ''), p_due_on,
            nullif(btrim(coalesce(p_notes, '')), ''),
            coalesce((select max(r.sort_order) + 1 from public.advisor_org_requirements r where r.grant_id = v_grant), 0),
            auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_requirements
    set title = btrim(coalesce(p_title, '')), kind = p_kind, measure = coalesce(p_measure, 'manual'), event_kind = nullif(p_event_kind, ''),
        target = case when p_kind = 'once' then null else p_target end, unit = nullif(btrim(coalesce(p_unit, '')), ''),
        due_on = p_due_on, notes = nullif(btrim(coalesce(p_notes, '')), ''), updated_at = pg_catalog.now()
    where id = p_requirement_id
    returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'org_funding_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_requirement(uuid, uuid, text, text, text, text, numeric, text, date, text) from public, anon;
grant execute on function public.save_org_requirement(uuid, uuid, text, text, text, text, numeric, text, date, text) to authenticated;

create or replace function public.delete_org_requirement(p_requirement_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_advisor_org_owner_of((select r.org_id from public.advisor_org_requirements r where r.id = p_requirement_id)) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.advisor_org_requirements where id = p_requirement_id;
  return found;
end;
$$;
revoke all on function public.delete_org_requirement(uuid) from public, anon;
grant execute on function public.delete_org_requirement(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Nachweise: jedes Mitglied; fuer ein Team nur, wer es sieht
-- ---------------------------------------------------------------------------
create or replace function public.add_org_requirement_entry(p_requirement_id uuid, p_program_id uuid, p_done_on date, p_amount numeric, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.advisor_org_requirements%rowtype;
  v_id uuid;
begin
  select * into v_req from public.advisor_org_requirements r where r.id = p_requirement_id;
  if v_req.id is null or not public.can_work_in_org(v_req.org_id) then
    raise exception 'org_funding_not_yours' using errcode = '42501';
  end if;
  if v_req.kind = 'per_team' and p_program_id is null then
    raise exception 'org_funding_team_needed' using errcode = '22023';
  end if;
  if p_program_id is not null and (v_req.kind <> 'per_team' or not public.can_see_org_program(v_req.org_id, p_program_id)) then
    raise exception 'org_task_program_not_visible' using errcode = '42501';
  end if;
  if p_done_on is null or p_done_on > current_date + 1 then
    raise exception 'org_funding_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_org_requirement_entries (requirement_id, org_id, program_id, done_on, amount, note, created_by_user_id)
  values (p_requirement_id, v_req.org_id, p_program_id, p_done_on, coalesce(p_amount, 1), nullif(btrim(coalesce(p_note, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
exception
  when check_violation then
    raise exception 'org_funding_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.add_org_requirement_entry(uuid, uuid, date, numeric, text) from public, anon;
grant execute on function public.add_org_requirement_entry(uuid, uuid, date, numeric, text) to authenticated;

create or replace function public.delete_org_requirement_entry(p_entry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.advisor_org_requirement_entries%rowtype;
begin
  select * into v_entry from public.advisor_org_requirement_entries e where e.id = p_entry_id;
  if v_entry.id is null then
    return false;
  end if;
  if not public.can_work_in_org(v_entry.org_id)
     or not (v_entry.created_by_user_id = auth.uid() or public.is_advisor_org_owner_of(v_entry.org_id)) then
    raise exception 'org_funding_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_requirement_entries where id = p_entry_id;
  return true;
end;
$$;
revoke all on function public.delete_org_requirement_entry(uuid) from public, anon;
grant execute on function public.delete_org_requirement_entry(uuid) to authenticated;

-- Eine einmalige Auflage als Aufgabe aufs Board (mit Frist). Gibt es schon eine, kommt sie zurueck.
create or replace function public.create_org_task_for_requirement(p_requirement_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.advisor_org_requirements%rowtype;
  v_id uuid;
begin
  select * into v_req from public.advisor_org_requirements r where r.id = p_requirement_id;
  if v_req.id is null or not public.can_work_in_org(v_req.org_id) then
    raise exception 'org_funding_not_yours' using errcode = '42501';
  end if;
  select t.id into v_id from public.advisor_org_tasks t where t.requirement_id = p_requirement_id order by t.created_at limit 1;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.advisor_org_tasks (org_id, title, status, due_on, requirement_id, created_by_user_id)
  values (v_req.org_id, left(v_req.title, 200), 'open', v_req.due_on, p_requirement_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_org_task_for_requirement(uuid) from public, anon;
grant execute on function public.create_org_task_for_requirement(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Der Stand: je Auflage eine Zeile fuer die Organisation, bei "je Team" eine je sichtbarem Team.
-- auto = gezaehlt aus Programmplan, Teilnahme, Gespraechen, Teams (innerhalb der Laufzeit),
-- manual = Summe der Nachweise, tasks_done = erledigte Aufgaben zu dieser Auflage.
-- ---------------------------------------------------------------------------
create or replace function public.get_org_funding_progress(p_grant_id uuid)
returns table (requirement_id uuid, program_id uuid, team_name text, auto_value numeric, manual_value numeric, tasks_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  with g as (
    select g.* from public.advisor_org_grants g
    where g.id = p_grant_id and public.is_advisor_org_member(g.org_id)
  ),
  period as (
    select g.org_id, g.starts_on, least(g.ends_on, (pg_catalog.now() at time zone 'Europe/Berlin')::date) as until_on from g
  ),
  visible as (
    select p.* from period, public.program_report_programs(period.org_id) p
  )
  -- Fuer die Organisation
  select r.id, null::uuid, null::text,
    case r.measure
      when 'events' then (
        select count(*)::numeric from public.team_program_events e, period
        where e.org_id = r.org_id
          and (e.starts_at at time zone 'Europe/Berlin')::date between period.starts_on and period.until_on
          and (r.event_kind is null or e.kind = r.event_kind))
      when 'teams' then (select count(*)::numeric from visible)
      else 0::numeric
    end,
    coalesce((select sum(en.amount) from public.advisor_org_requirement_entries en where en.requirement_id = r.id and en.program_id is null), 0),
    (select count(*)::integer from public.advisor_org_tasks t where t.requirement_id = r.id and t.status = 'done')
  from public.advisor_org_requirements r
  join g on g.id = r.grant_id
  where r.kind <> 'per_team'
  union all
  -- Je Team, nur sichtbare Teams
  select r.id, v.program_id, v.team_name,
    case r.measure
      when 'event_attendance' then (
        select count(*)::numeric from public.team_program_attendance a
        join public.team_program_events e on e.id = a.event_id, period
        where a.program_id = v.program_id and a.status = 'present'
          and (e.starts_at at time zone 'Europe/Berlin')::date between period.starts_on and period.until_on
          and (r.event_kind is null or e.kind = r.event_kind))
      when 'check_ins' then (
        select count(*)::numeric from public.program_check_ins c, period
        where c.program_id = v.program_id and c.held_on between period.starts_on and period.until_on)
      else 0::numeric
    end,
    coalesce((select sum(en.amount) from public.advisor_org_requirement_entries en where en.requirement_id = r.id and en.program_id = v.program_id), 0),
    0
  from public.advisor_org_requirements r
  join g on g.id = r.grant_id
  cross join visible v
  where r.kind = 'per_team';
$$;
revoke all on function public.get_org_funding_progress(uuid) from public, anon;
grant execute on function public.get_org_funding_progress(uuid) to authenticated;

-- Einen Stand festhalten: die Fuehrung legt den Bericht ab, wie er gerade ist (Daten kommen aus der App,
-- dieselbe Form wie der Bericht). Bleibt, auch wenn Programme spaeter enden.
create or replace function public.save_org_funding_snapshot(p_grant_id uuid, p_note text, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select g.org_id into v_org from public.advisor_org_grants g where g.id = p_grant_id;
  if v_org is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 2000000 then
    raise exception 'org_funding_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_org_funding_snapshots (grant_id, org_id, taken_by_user_id, note, data)
  values (p_grant_id, v_org, auth.uid(), nullif(left(btrim(coalesce(p_note, '')), 500), ''), p_data)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.save_org_funding_snapshot(uuid, text, jsonb) from public, anon;
grant execute on function public.save_org_funding_snapshot(uuid, text, jsonb) to authenticated;

create or replace function public.delete_org_funding_snapshot(p_snapshot_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_advisor_org_owner_of((select s.org_id from public.advisor_org_funding_snapshots s where s.id = p_snapshot_id)) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.advisor_org_funding_snapshots where id = p_snapshot_id;
  return found;
end;
$$;
revoke all on function public.delete_org_funding_snapshot(uuid) from public, anon;
grant execute on function public.delete_org_funding_snapshot(uuid) to authenticated;

commit;
