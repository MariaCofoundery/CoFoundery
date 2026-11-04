-- Auswertung fuer die Organisation: Zahlen zu Veranstaltungen, Teilnahme, Zusagen und Gespraechen.
--
-- Wunsch von Maria (Feedback 04.11.2026): "Reports ziehen, wie viele Gespraeche man gefuehrt hat,
-- wer wo teilgenommen hat, wie viele Events stattgefunden haben, wie viele da waren oder nicht."
--
-- Zwei Lesefunktionen, keine neue Tabelle. Sie geben nur heraus, was die Organisation ohnehin
-- sieht - zusammengezaehlt:
--   - Sichtbar dieselben Teams wie bei der Anwesenheit: Inhaber alle aktiven Programme der
--     Organisation, Bezugspersonen nur die eigenen.
--   - Eine Veranstaltung zaehlt fuer ein Team erst ab dem Tag, an dem sein Programm aktiv wurde.
--     Sonst sieht ein spaeter aufgenommenes Team aus, als haette es gefehlt.
--   - Gespraeche ("Gespraech zum Stand", program_check_ins) nur mit eingeschalteten Erfolgen -
--     wie ueberall sonst. Ohne sie kommt null, nicht 0: "nicht erfasst" ist nicht "keins".
--   - Die Zusammenfassungen der Gespraeche kommen NICHT mit, nur Anzahl und Datum.
--   - Keine Rangfolge, keine Quote: Zaehlwerte je Team und je Veranstaltung.
--
-- Der Zeitraum gilt nach Berliner Datum; leer heisst offen.

begin;

-- Wer sieht welches Team? Dieselbe Regel wie get_event_attendance (20270208120000).
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
      public.is_advisor_org_owner_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    );
$$;
revoke all on function public.program_report_programs(uuid) from public, anon, authenticated;

-- Je Veranstaltung und Team: Anwesenheit und Zusagen (Personen).
create or replace function public.get_org_report_attendance(p_org_id uuid, p_from date, p_to date)
returns table (
  event_id uuid, title text, kind text, starts_at timestamptz,
  program_id uuid, team_name text, members integer,
  attendance text, rsvp_yes integer, rsvp_no integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.kind, e.starts_at,
    p.program_id, p.team_name, p.members,
    a.status,
    (select count(*)::integer from public.team_program_event_rsvps v
       join public.founder_team_members m on m.user_id = v.user_id and m.team_id = p.team_id
       where v.event_id = e.id and v.program_id = p.program_id and v.response = 'yes'),
    (select count(*)::integer from public.team_program_event_rsvps v
       join public.founder_team_members m on m.user_id = v.user_id and m.team_id = p.team_id
       where v.event_id = e.id and v.program_id = p.program_id and v.response = 'no')
  from public.team_program_events e
  join public.program_report_programs(p_org_id) p
    on (e.starts_at at time zone 'Europe/Berlin')::date >= p.active_since
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.program_id
  where e.org_id = p_org_id
    and (p_from is null or (e.starts_at at time zone 'Europe/Berlin')::date >= p_from)
    and (p_to is null or (e.starts_at at time zone 'Europe/Berlin')::date <= p_to)
  order by e.starts_at, e.id, p.team_name nulls last, p.program_id;
$$;
revoke all on function public.get_org_report_attendance(uuid, date, date) from public, anon;
grant execute on function public.get_org_report_attendance(uuid, date, date) to authenticated;

-- Je Team: Gespraeche im Zeitraum, das letzte und das vereinbarte naechste.
create or replace function public.get_org_report_check_ins(p_org_id uuid, p_from date, p_to date)
returns table (
  program_id uuid, team_name text, members integer,
  check_ins integer, last_held_on date, next_on date
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.program_id, p.team_name, p.members,
    case when public.org_success_enabled(p_org_id) then (
      select count(*)::integer from public.program_check_ins c
      where c.program_id = p.program_id
        and (p_from is null or c.held_on >= p_from)
        and (p_to is null or c.held_on <= p_to)) end,
    case when public.org_success_enabled(p_org_id) then (
      select max(c.held_on) from public.program_check_ins c
      where c.program_id = p.program_id
        and (p_from is null or c.held_on >= p_from)
        and (p_to is null or c.held_on <= p_to)) end,
    -- Das naechste vereinbarte Gespraech: aus dem zuletzt gefuehrten, unabhaengig vom Zeitraum.
    case when public.org_success_enabled(p_org_id) then (
      select c.next_on from public.program_check_ins c
      where c.program_id = p.program_id
      order by c.held_on desc, c.created_at desc limit 1) end
  from public.program_report_programs(p_org_id) p
  order by p.team_name nulls last, p.program_id;
$$;
revoke all on function public.get_org_report_check_ins(uuid, date, date) from public, anon;
grant execute on function public.get_org_report_check_ins(uuid, date, date) to authenticated;

commit;
