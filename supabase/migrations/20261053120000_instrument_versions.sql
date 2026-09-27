begin;

-- ---------------------------------------------------------------------------
-- Schritt 0: Jede Antwort weiss, zu welchem Instrument sie gehoert
-- ---------------------------------------------------------------------------
--
-- VORBEREITUNG FUER DIE NEUFASSUNG DES FRAGEBOGENS. Architektur und Schritte
-- stehen in `docs/instrument-v2-architektur.md`. Diese Migration aendert am
-- Verhalten NICHTS - sie macht alles Weitere erst moeglich.
--
-- DER BEFUND, DER DAZU GEFUEHRT HAT: Es gab nirgends eine Versionsspalte.
-- Weder `assessments` noch `questions` noch `choices` wussten, zu welcher
-- Fassung des Instruments sie gehoeren. Die Registratur im Code fuehrt zwar
-- `registryVersion` und je Item ein `version`-Feld, aber nichts davon erreicht
-- je die Datenbank.
--
-- Damit waere ein Wechsel keine neue Version, sondern eine STILLE UMDEUTUNG
-- aller bisherigen Antworten. Und drei Dinge, die Maria ausdruecklich will,
-- waeren unmoeglich:
--
--   "Du kannst deine alte Fassung behalten" - dafuer muss eine Antwort
--   wissen, zu welcher Fassung sie gehoert.
--
--   "Das Alte landet im Archiv" - dafuer muss es unterscheidbar sein.
--
--   Und jede Auswertung muss wissen, ob sie ueberhaupt zustaendig ist.
--
-- EIN GEFAHRENPUNKT, DEN DIESE SPALTE ALLEIN NOCH NICHT LOEST: Der eindeutige
-- Index "ein abgegebener Fragebogen je Person und Modul" wurde am 21.02.2026
-- entfernt (20260221201500). Mehrere abgegebene Fragebogen sind also bereits
-- moeglich. Wer heute "den neuesten" liest, laese nach einem Wechsel
-- stillschweigend den neuen - genau die Umdeutung, die vermieden werden soll.
-- Es gibt 26 solcher Lesestellen in 11 Dateien; sie werden im selben Schritt
-- nachgezogen, solange alles noch v1 ist und die Aenderung nachweislich
-- nichts bewirkt.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Die Instrumente
-- ---------------------------------------------------------------------------
--
-- DAS ARCHIV IST KEIN EIGENER ORT, SONDERN EIN STATUS. Eine archivierte
-- Fassung bleibt vollstaendig lesbar und rechenbar; sie wird nur niemandem
-- mehr neu vorgelegt. Eine Tabelle "alte_antworten" waere ein zweiter
-- Speicher, und der laeuft irgendwann auseinander.

create table public.instruments (
  /** Sprechend und stabil, kein gen_random_uuid: Diese Kennung steht in
      Migrationen, in Code und spaeter in Exporten. */
  id text primary key,
  label text not null,

  /**
   * `draft`    - im Bau, wird niemandem vorgelegt
   * `active`   - wird neuen Personen vorgelegt
   * `archived` - wird nicht mehr vorgelegt, bleibt aber gueltig und lesbar
   */
  status text not null default 'draft',

  /** Ab wann es Menschen vorgelegt wurde. Fuer das Archiv und fuer Exporte. */
  introduced_at date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint instruments_status_check
    check (status in ('draft', 'active', 'archived')),
  constraint instruments_id_shape
    check (id ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  constraint instruments_label_len
    check (char_length(btrim(label)) between 2 and 120)
);

comment on table public.instruments is
  'Die Fassungen des Fragebogens. Eine archivierte Fassung bleibt gueltig und '
  'rechenbar - sie wird nur niemandem mehr neu vorgelegt.';

insert into public.instruments (id, label, status, introduced_at) values
  ('founder-compatibility-v1', 'Founder-Kompatibilität v1', 'active', date '2026-02-09');

-- Nachschlagedaten: alle duerfen lesen, niemand ueber die Anwendung
-- schreiben. Neue Fassungen entstehen durch Migrationen, nicht zur Laufzeit.
alter table public.instruments enable row level security;
revoke all on public.instruments from public, anon, authenticated;
grant select on public.instruments to authenticated, anon;

create policy instruments_readable on public.instruments
  for select to authenticated, anon using (true);

create trigger instruments_updated_at
  before update on public.instruments
  for each row execute function public.set_capability_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Die tragende Spalte
-- ---------------------------------------------------------------------------
--
-- `on delete restrict`: Ein Instrument, zu dem Antworten existieren, darf
-- nicht verschwinden. Archivieren ja, loeschen nein - sonst waeren die
-- Antworten von Menschen ploetzlich herrenlos.
--
-- Die Spalte zeigt NICHT auf auth.users und faellt damit nicht unter die
-- Loeschregel fuer Konten; `assessments` selbst haengt weiterhin per cascade
-- an der Person.

alter table public.assessments
  add column instrument_id text references public.instruments (id) on delete restrict;

-- Alles Bisherige ist v1. Das ist keine Annahme, sondern eine Tatsache: Es
-- gab bis heute nur eine Fassung.
update public.assessments set instrument_id = 'founder-compatibility-v1'
where instrument_id is null;

alter table public.assessments
  alter column instrument_id set default 'founder-compatibility-v1',
  alter column instrument_id set not null;

create index assessments_instrument_idx
  on public.assessments (user_id, module, instrument_id, submitted_at desc);

comment on column public.assessments.instrument_id is
  'Zu welcher Fassung des Fragebogens diese Antworten gehoeren. Ohne diese '
  'Angabe waere ein Wechsel eine stille Umdeutung aller bisherigen Antworten.';

-- ---------------------------------------------------------------------------
-- 3. Auch das Abbild weiss es
-- ---------------------------------------------------------------------------
--
-- `person_alignment_snapshots` traegt die abgeleiteten Zahlen, die ein
-- Advisor sehen darf. Ohne Instrumentkennung stuenden dort irgendwann v1- und
-- v2-Werte unbemerkt nebeneinander - in derselben Spalte, mit derselben
-- Beschriftung, aber aus verschiedenen Modellen.

alter table public.person_alignment_snapshots
  add column instrument_id text references public.instruments (id) on delete restrict;

update public.person_alignment_snapshots set instrument_id = 'founder-compatibility-v1'
where instrument_id is null;

alter table public.person_alignment_snapshots
  alter column instrument_id set default 'founder-compatibility-v1',
  alter column instrument_id set not null;

-- Die Lesefunktion fuer Advisors gibt die Kennung mit heraus: Wer eine Zahl
-- sieht, soll wissen koennen, aus welchem Modell sie stammt.
drop function if exists public.get_advisor_person_alignment(uuid);

create function public.get_advisor_person_alignment(p_subject_user_id uuid)
returns table (
  scores jsonb,
  values_profile jsonb,
  values_status text,
  values_answered integer,
  values_total integer,
  basis_answered integer,
  basis_total integer,
  instrument_id text,
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
         snapshot.basis_answered, snapshot.basis_total,
         snapshot.instrument_id, snapshot.updated_at
  from public.person_alignment_snapshots snapshot
  where snapshot.user_id = p_subject_user_id;
end;
$$;

revoke all on function public.get_advisor_person_alignment(uuid) from public, anon;
grant execute on function public.get_advisor_person_alignment(uuid) to authenticated;

commit;
