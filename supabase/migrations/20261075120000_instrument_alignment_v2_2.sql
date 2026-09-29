begin;

-- ---------------------------------------------------------------------------
-- Zwei Fragebogen statt einem - und jede Antwort weiss, wofuer sie gilt
-- ---------------------------------------------------------------------------
--
-- Die Master-Arbeitsfassung v0.2 vom 29.09.2026 nennt vier Baender mit
-- VERSCHIEDENER Gueltigkeit: Das Arbeitsprofil ist "relativ portabel", U/K
-- sind "team-/rollenabhaengig", S/R/G/B "vorhabensspezifisch und
-- zeitgebunden".
--
-- Ein Fragebogen kann nicht gleichzeitig portabel und zeitgebunden sein. Wer
-- beides in eine Fassung giesst, muss spaeter bei jeder Antwort
-- rekonstruieren, ob "15 Stunden" allgemein galt oder fuer dieses Vorhaben im
-- September - und das steht dann nirgends.
--
-- Ausserdem koennen sich die Teile getrennt weiterentwickeln. Bisher hiess
-- jede Aenderung an einem Teil eine neue Gesamtfassung: v2, v2.1, v2.2 -
-- dreimal in drei Tagen, obwohl sich jedes Mal nur ein Teil geaendert hat.
--
-- U/K LIEGT BEIM VORHABEN. Die Quelle sagt "beim Teamstart bestaetigen" - das
-- ist nicht portabel. "Bestaetigen" statt "neu beantworten" loest die
-- Oberflaeche, indem sie die letzte Antwort vorbelegt.

insert into public.instruments (id, label, status, introduced_at) values
  ('founder-profile-v1',   'Founder-Arbeitsprofil v1', 'draft', null),
  ('venture-alignment-v1', 'Venture-Alignment v1',     'draft', null);

-- ---------------------------------------------------------------------------
-- v2 und v2.1 werden archiviert
-- ---------------------------------------------------------------------------
--
-- Maria am 29.09.2026: "wobei Version 2 und 2.1 ja im Prinzip auch weg
-- koennen." Weg heisst hier archiviert, nicht geloescht. Die Kennung steht in
-- `assessments.instrument_id` als Fremdschluessel, und in Production gibt es
-- Antworten unter v2.1. Sie zu loeschen hiesse, sie heimatlos zu machen.
--
-- Wer seine Antworten wirklich loeschen will, loescht seinen Fragebogen - das
-- raeumt alles daran haengende mit ab. Eine Entscheidung je Person, keine
-- Migration.

update public.instruments
   set status = 'archived'
 where id in ('founder-alignment-v2', 'founder-alignment-v2-1');

-- ---------------------------------------------------------------------------
-- Zu welchem Vorhaben gehoert dieser Fragebogen?
-- ---------------------------------------------------------------------------
--
-- NULLABLE, UND DAS IST DER PUNKT. Das Arbeitsprofil gehoert zu keinem
-- Vorhaben - es gilt fuer die Person. Eine Pflichtspalte haette entweder ein
-- erfundenes Vorhaben verlangt oder eine zweite Tabelle.
--
-- `on delete set null` und nicht `cascade`: Wenn ein Team aufgeloest wird,
-- verschwinden die Antworten nicht. Sie verlieren ihren Bezug, und das gehoert
-- sichtbar - wer seine Zusagen fuer ein Vorhaben gemacht hat, das es nicht
-- mehr gibt, hat sie trotzdem gemacht.

alter table public.assessments
  add column venture_id uuid references public.founder_teams (id) on delete set null;

comment on column public.assessments.venture_id is
  'Das Vorhaben, fuer das diese Antworten gelten. Leer beim Arbeitsprofil: Das '
  'gehoert zur Person und nicht zu einem Vorhaben.';

-- Ein Arbeitsprofil hat kein Vorhaben. Ohne diese Regel koennte dieselbe
-- Person zwei Arbeitsprofile haben, eins je Team - und dann waere es keins.
alter table public.assessments
  add constraint assessments_profile_has_no_venture
    check (module <> 'founder_profile' or venture_id is null);

comment on column public.assessments.module is
  'Wozu der Fragebogen gehoert: founder_profile (zur Person, portabel) oder '
  'venture_alignment (zu einem Vorhaben und einem Zeitraum). Die alten Werte '
  'base und values gehoeren zu v1 und bleiben gueltig.';

create index assessments_venture_idx on public.assessments (venture_id)
  where venture_id is not null;

commit;
