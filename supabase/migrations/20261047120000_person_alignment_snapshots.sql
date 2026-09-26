begin;

-- ---------------------------------------------------------------------------
-- Der Einzelreport - fuer den Accelerator lesbar, ohne die Rohantworten
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 26.09.2026: "Der Accelerator soll ggf. nach Freigabe entweder
-- den Einzelpersonen-Report und dann ggf. auch die Team-Auswertung bekommen."
--
-- Der Umfang `alignment_report` ist seit 20261040120000 freigebbar - und war
-- bis heute nirgends darstellbar. Das liegt an einer Regel, die dieses Produkt
-- ernst nimmt und sogar prueft
-- (`supabase/tests/founder_alignment_raw_answer_access.sql`):
--
--   DIE ROHANTWORTEN SIEHT NIEMAND AUSSER DER PERSON SELBST. Nicht der
--   Co-Founder, nicht der Advisor, nicht nach angenommener Einladung. Eine
--   Antwort je Frage ist verraeterischer als jedes Ergebnis daraus, und aus
--   Rohantworten kann sich jeder seine eigene Auswertung bauen.
--
-- Der Ausweg ist derselbe wie beim Beziehungsreport (`report_runs`): Der
-- vertraute Pfad rechnet, das ERGEBNIS wird abgelegt, geteilt wird das
-- Ergebnis.
--
-- WAS HIER ABGELEGT WIRD, SIND ZAHLEN - KEIN FERTIGER TEXT. Das ist der
-- Unterschied zu `report_runs`, und er ist Absicht:
--
--   Ein abgelegter Text veraltet still. Aendert sich eine Formulierung im
--   Produkt, liest der Accelerator weiter die alte - und niemand merkt es.
--
--   Zahlen sind pruefbar. "Das haben wir freigegeben" ist bei einer Handvoll
--   Werten eine Aussage, die jemand nachvollziehen kann; bei zwei Seiten
--   erzeugtem Text ist es keine.
--
-- Die Texte entstehen weiterhin aus dem aktuellen Code, aus genau diesen
-- Zahlen - dieselben Bausteine, die die Person auf ihrer eigenen Seite sieht.
-- ---------------------------------------------------------------------------

create table public.person_alignment_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,

  /**
   * Die Dimensionswerte. Ein Objekt `{"vision": 3.2, ...}` und keine Spalten:
   * Die Dimensionen stehen in der Registratur im Code, und eine Spalte je
   * Dimension waere eine zweite Liste davon, die beim naechsten Zuschnitt
   * auseinanderlaeuft.
   */
  scores jsonb not null,

  /**
   * Das abgeleitete Werteprofil, falls das Modul abgeschlossen ist. Auch das
   * ist ein Ergebnis und keine Antwort.
   */
  values_profile jsonb,
  values_status text not null default 'not_started',
  values_answered integer not null default 0,
  values_total integer not null default 0,

  /**
   * Worauf die Zahlen beruhen. Ohne diese Angaben liest sich eine duenne
   * Auswertung wie ein Befund ueber einen Menschen, obwohl sie eine Auskunft
   * darueber ist, wie viel er beantwortet hat.
   */
  basis_answered integer not null default 0,
  basis_total integer not null default 0,

  /** Welcher Fragebogen zugrunde liegt - damit der Stand zuzuordnen ist. */
  base_assessment_id uuid references public.assessments (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint person_alignment_snapshots_values_status_check
    check (values_status in ('not_started', 'in_progress', 'completed')),
  constraint person_alignment_snapshots_scores_object
    check (jsonb_typeof(scores) = 'object'),
  -- Ein Abbild ohne einen einzigen Wert waere eine Behauptung ueber einen
  -- Menschen, die auf nichts beruht.
  constraint person_alignment_snapshots_scores_not_empty
    check (scores <> '{}'::jsonb),
  constraint person_alignment_snapshots_counts
    check (basis_answered >= 0 and basis_total >= 0 and values_answered >= 0 and values_total >= 0)
);

comment on table public.person_alignment_snapshots is
  'Das abgeleitete Selbstbild einer Person - Zahlen, keine Rohantworten und '
  'kein fertiger Text. Geschrieben von der Person selbst, gelesen von '
  'Advisors nur mit dem Umfang alignment_report.';

alter table public.person_alignment_snapshots enable row level security;
revoke all on public.person_alignment_snapshots from public, anon, authenticated;
grant select, insert, update on public.person_alignment_snapshots to authenticated;

-- NUR DIE PERSON SELBST, in beide Richtungen. Advisors lesen nicht ueber
-- diese Policy, sondern ueber die enge Funktion weiter unten: Eine Policy,
-- die Advisors einschliesst, waere breiter als der Umfang, um den es geht.
create policy person_alignment_snapshots_own on public.person_alignment_snapshots
  for select to authenticated using (user_id = auth.uid());
create policy person_alignment_snapshots_insert_own on public.person_alignment_snapshots
  for insert to authenticated with check (user_id = auth.uid());
create policy person_alignment_snapshots_update_own on public.person_alignment_snapshots
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger person_alignment_snapshots_updated_at
  before update on public.person_alignment_snapshots
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- Und was ein Advisor davon sieht
-- ---------------------------------------------------------------------------
--
-- Dieselbe Bauart wie die vier Leser aus 20261045120000: Die Funktion prueft
-- selbst, statt sich darauf zu verlassen, dass die Seite es tut.

create or replace function public.get_advisor_person_alignment(p_subject_user_id uuid)
returns table (
  scores jsonb,
  values_profile jsonb,
  values_status text,
  values_answered integer,
  values_total integer,
  basis_answered integer,
  basis_total integer,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_advisor_person_access(p_subject_user_id, 'alignment_report') then
    raise exception 'advisor_scope_not_granted' using errcode = '42501';
  end if;

  return query
  select snapshot.scores, snapshot.values_profile, snapshot.values_status,
         snapshot.values_answered, snapshot.values_total,
         snapshot.basis_answered, snapshot.basis_total, snapshot.updated_at
  from public.person_alignment_snapshots snapshot
  where snapshot.user_id = p_subject_user_id;
end;
$$;

revoke all on function public.get_advisor_person_alignment(uuid) from public, anon;
grant execute on function public.get_advisor_person_alignment(uuid) to authenticated;

comment on function public.get_advisor_person_alignment(uuid) is
  'Das abgeleitete Selbstbild einer Person fuer einen Advisor mit dem Umfang '
  'alignment_report. Gibt Zahlen heraus, nie Rohantworten - die bleiben bei '
  'der Person, auch nach jeder Freigabe.';

commit;
