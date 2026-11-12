-- ---------------------------------------------------------------------------
-- Staerken entdecken (Fassung 3 des Staerken-Gespraechs)
-- ---------------------------------------------------------------------------
--
-- Statt zehn fester Aufforderungen waehlt die Person fuenf oder sechs von zwoelf Szenen und
-- beantwortet jede in drei kleinen Schritten. Dazu braucht das Gespraech vier Felder - sonst
-- nichts. Tabellen, Policies, Auswertung (`request_strength_proposals`) und Vorschlaege bleiben
-- unveraendert.
--
--   capability_interview_sessions.guide_version
--       2 = das fruehere Staerken-Interview (feste Fragen), 3 = Staerken entdecken. Alle
--       bestehenden Gespraeche bekommen 2; sie bleiben les- und auswertbar. Capability- und
--       Direction-Gespraeche tragen ebenfalls 2 und lassen die Spalte unbeachtet.
--   capability_interview_sessions.intro_notes
--       Stichworte, die die Person im Intro festhalten wollte. Freiwillig, nur fuer sie selbst
--       (die Policies der Tabelle gelten), sie gehen NICHT in die Auswertung.
--   capability_interview_turns.answer_parts
--       Die drei Teile einer Szene (situation, action, outcome) - oder {"skipped": true} fuer
--       eine uebersprungene Frage. `answer` bleibt der zusammengesetzte Text; die Auswertung
--       liest nur `answer`, die Zitat-Pruefung bleibt dadurch unveraendert.
--   capability_interview_turns.happened_when
--       Wann die Szene ungefaehr war. Geht nicht in die Auswertung.
--
-- Keine bestehende Zeile wird veraendert (die Voreinstellung der neuen Spalten gilt fuer sie).
-- ---------------------------------------------------------------------------

alter table public.capability_interview_sessions
  add column guide_version smallint not null default 2,
  add column intro_notes text[] not null default '{}';

alter table public.capability_interview_sessions
  add constraint capability_interview_sessions_guide_version_check
    check (guide_version in (2, 3)),
  add constraint capability_interview_sessions_intro_notes_check
    check (cardinality(intro_notes) <= 8 and char_length(array_to_string(intro_notes, '|')) <= 600);

alter table public.capability_interview_turns
  add column answer_parts jsonb,
  add column happened_when text;

alter table public.capability_interview_turns
  add constraint capability_interview_turns_answer_parts_check
    check (answer_parts is null or jsonb_typeof(answer_parts) = 'object'),
  add constraint capability_interview_turns_happened_when_check
    check (happened_when is null or happened_when in ('year', 'few', 'long'));

comment on column public.capability_interview_sessions.guide_version is
  '2 = Staerken-Interview mit festen Fragen, 3 = Staerken entdecken (Szenen in drei Runden).';
comment on column public.capability_interview_sessions.intro_notes is
  'Freiwillige Stichworte aus dem Intro von Staerken entdecken. Nur fuer die Person selbst, nicht Teil der Auswertung.';
comment on column public.capability_interview_turns.answer_parts is
  'Die drei Teile einer Szene (situation, action, outcome) oder {"skipped": true}. `answer` ist der zusammengesetzte Text.';
comment on column public.capability_interview_turns.happened_when is
  'Wann die Szene ungefaehr war: year (dieses Jahr), few (vor 1 bis 3 Jahren), long (laenger her). Nicht Teil der Auswertung.';
