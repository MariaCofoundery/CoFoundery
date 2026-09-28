begin;

-- ---------------------------------------------------------------------------
-- Was der Pretest messen muss - und warum nicht in den Analytics-Tabellen
-- ---------------------------------------------------------------------------
--
-- Die fachliche Durchsicht nennt fuer den Pilot woertlich: "Ausfuellduer
-- tatsaechlich messen; auch optionale und bedingte Antworten zaehlen zum
-- Aufwand" und "Auswerten: Haeufigkeiten der Antworten, Missinggruende,
-- einseitige Verteilungen, Abbruchstellen und welches Gespraech tatsaechlich
-- daraus entstand."
--
-- Davon misst die Anwendung bisher NICHTS. Es gibt seit April Tabellen dafuer
-- (analytics_question_timing_buckets_daily und analytics_questionnaire_funnel_daily),
-- aber es schreibt niemand hinein - und sie taugen hier auch nicht: Beide
-- verlangen `event_count >= 20`. Bei acht bis zwoelf kognitiven Interviews
-- entstuende dort nie eine Zeile. Sie sind fuer Masse gebaut, nicht fuer einen
-- Pretest.
--
-- Deshalb hier das kleinere, ehrlichere Ding: eine Zeile je Person und Frage.
--
-- ---------------------------------------------------------------------------
-- DAS IST PERSONENBEZOGEN, UND DAS WIRD NICHT VERSTECKT
-- ---------------------------------------------------------------------------
--
-- Wie lange jemand bei einer Frage gebraucht hat, gehoert zu dieser Person.
-- Eine Tabelle, die so tut, als waere sie anonym, weil "nur Zeitstempel" darin
-- stehen, waere eine Luege - bei zwoelf Teilnehmenden ist jede Zeile
-- zuordenbar.
--
-- Also: Sie haengt am Fragebogen, sie folgt denselben Regeln wie die
-- Antworten, und sie verschwindet mit ihnen (`on delete cascade`). Wer seinen
-- Fragebogen loescht, loescht auch die Messung.
--
-- Fuer die Auswertung liest Maria sie ueber die Datenbank, nicht ueber eine
-- Oberflaeche in der Anwendung. Eine Adminseite, die fremde Ausfuellzeiten
-- zeigt, waere ein eigener Vorgang mit eigener Berechtigung - und den gibt es
-- nicht, solange niemand ihn braucht.

create table public.alignment_item_views (
  assessment_id uuid not null
    references public.assessments (id) on delete cascade,
  block_id text not null,

  -- WANN DIE FRAGE ZUM ERSTEN MAL AUF DEM BILDSCHIRM WAR. Zusammen mit
  -- answered_at ergibt das die Dauer - und ohne das Zweite ist es eine
  -- Abbruchstelle: gesehen, nicht beantwortet.
  first_seen_at timestamptz not null default now(),
  answered_at timestamptz,

  -- WIE OFT JEMAND SEINE ANTWORT NOCH GEAENDERT HAT. Ein Zoegern-Signal, das
  -- im Interview eine Nachfrage wert ist: "Du bist da dreimal zurueck - woran
  -- lag das?" Es sagt NICHTS ueber die Guete der Antwort.
  revisions integer not null default 0 check (revisions >= 0),

  updated_at timestamptz not null default now(),

  primary key (assessment_id, block_id),

  constraint alignment_item_views_block_shape
    check (block_id ~ '^[A-Z][0-9]{2}[a-z]?$'),

  -- Eine Antwort kann nicht vor ihrer Frage da gewesen sein.
  constraint alignment_item_views_order
    check (answered_at is null or answered_at >= first_seen_at)
);

comment on table public.alignment_item_views is
  'Ausfuellverlauf je Frage fuer den Pretest: wann gesehen, wann beantwortet, '
  'wie oft geaendert. Personenbezogen - haengt am Fragebogen und verschwindet '
  'mit ihm.';

comment on column public.alignment_item_views.revisions is
  'Zoegern-Signal fuer die Nachfrage im Interview. Sagt nichts ueber die Guete '
  'einer Antwort - wer dreimal aendert, denkt vielleicht gruendlich nach.';

alter table public.alignment_item_views enable row level security;

-- Dieselbe Regel wie bei den Antworten: der eigene Fragebogen, sonst nichts.
-- Ausdruecklich KEINE Policy fuer Freigabeempfaenger oder Advisor: Wie lange
-- jemand bei einer Frage gezoegert hat, ist keine Antwort und wird nicht
-- mitgeteilt, auch nicht an Menschen, die die Antworten sehen duerfen.
create policy alignment_item_views_select_owner on public.alignment_item_views
  for select to authenticated
  using (public.owns_assessment(assessment_id));

create policy alignment_item_views_insert_owner on public.alignment_item_views
  for insert to authenticated
  with check (public.owns_assessment(assessment_id));

create policy alignment_item_views_update_owner on public.alignment_item_views
  for update to authenticated
  using (public.owns_assessment(assessment_id))
  with check (public.owns_assessment(assessment_id));

create policy alignment_item_views_delete_owner on public.alignment_item_views
  for delete to authenticated
  using (public.owns_assessment(assessment_id));

create index alignment_item_views_assessment_idx
  on public.alignment_item_views (assessment_id);

commit;
