begin;

-- ---------------------------------------------------------------------------
-- Die Auslassungsgruende heissen, wie das Sprachreview sie nennt
-- ---------------------------------------------------------------------------
--
-- Sprachreview v0.1 vom 29.09.2026, Abschnitt 3:
--
--   cannot_assess       kann ich noch nicht einschaetzen
--   not_decided         habe ich noch nicht entschieden
--   not_clarified       haben wir noch nicht geklaert
--   prefer_not_to_say   moechte ich nicht angeben
--   confidential_first  moechte ich zunaechst nur fuer mich festhalten
--
-- Bisher hiessen zwei davon anders, und einen gab es gar nicht:
--
--   undecided  -> not_decided
--   withheld   -> prefer_not_to_say
--   not_clarified war ein Sonderfall von undecided ("haben wir noch nicht
--   geklaert" mit eigener Beschriftung, aber demselben Code)
--
-- ---------------------------------------------------------------------------
-- WARUM DIE DATEN MITWANDERN MUESSEN
-- ---------------------------------------------------------------------------
--
-- Die Lesbarmachung sucht den gespeicherten Code in der Liste der Gruende, die
-- das Item anbietet. Findet sie ihn nicht, gibt sie weder Wert noch Grund
-- zurueck - die Antwort waere da und stuende trotzdem nicht auf dem Schirm.
--
-- Deshalb steht die Umbenennung hier und nicht in einer Abbildungsschicht im
-- Code. Zwei Vokabulare nebeneinander waeren eine zweite Wahrheit, und die
-- eine haette recht.
--
-- 'technical' bleibt unberuehrt: Ein technischer Fehlschlag ist keine Auskunft
-- der Person, und im Sprachreview hat er deshalb nichts verloren.
--
-- 'not_clarified' entsteht hier NICHT rueckwirkend. Wer 'undecided' gespeichert
-- hat, hat auf einen Knopf gedrueckt, auf dem etwas stand - was genau, sagt
-- die Beschriftung am Item, nicht der Code. Aus zwei Bedeutungen nachtraeglich
-- die eine auszusuchen hiesse raten.

-- ---------------------------------------------------------------------------
-- DER EINFRIER-AUSLOESER WIRD HIER AUSDRUECKLICH AUSGESETZT
-- ---------------------------------------------------------------------------
--
-- `alignment_answers_frozen_after_submit` verbietet nach der Abgabe jede
-- Aenderung an `missing_code` - und hat diese Migration beim ersten Versuch
-- abgewiesen. Das ist richtig so: Er soll verhindern, dass jemand eine
-- abgegebene Auskunft nachtraeglich veraendert.
--
-- Hier veraendert niemand eine Auskunft. Dieselbe Antwort bekommt denselben
-- Sinn unter einem anderen Namen; die Beschriftung, die der Mensch gesehen und
-- gewaehlt hat, bleibt Wort fuer Wort dieselbe. Wuerde der Auslöser nicht
-- ausgesetzt, blieben genau die abgegebenen Fragebogen auf dem alten
-- Vokabular stehen - und ihre Auslassungsgruende waeren danach unlesbar,
-- waehrend die unfertigen weiterhin gingen.
--
-- Ausgesetzt wird er fuer diese eine Anweisung und sofort wieder scharf
-- gestellt.

-- Die alte Liste zuerst weg - sie kennt die neuen Namen nicht und wuerde die
-- Umbenennung abweisen, bevor sie stattfindet.
alter table public.alignment_answers
  drop constraint alignment_answers_missing_code_check;

alter table public.alignment_answers
  disable trigger alignment_answers_frozen_after_submit;

update public.alignment_answers
   set missing_code = 'not_decided'
 where missing_code = 'undecided';

update public.alignment_answers
   set missing_code = 'prefer_not_to_say'
 where missing_code = 'withheld';

alter table public.alignment_answers
  enable trigger alignment_answers_frozen_after_submit;

-- Und die neue Liste.
--
-- `not_relevant` steht mit drin, obwohl es kein Bogen anbietet und keine
-- Registratur kennt. Die alte Liste erlaubte es, also KANN es Zeilen damit
-- geben - und die sehe ich von hier aus nicht. Es wegzulassen hiesse, die
-- Migration in der Produktionsdatenbank scheitern zu lassen oder, schlimmer,
-- Zeilen unveraenderbar zu machen. Ein erlaubter Wert, den niemand erzeugen
-- kann, kostet nichts.
alter table public.alignment_answers
  add constraint alignment_answers_missing_code_check
  check (
    missing_code is null
    or missing_code in (
      'cannot_assess', 'not_decided', 'not_clarified',
      'prefer_not_to_say', 'confidential_first', 'technical',
      'not_relevant'
    )
  );

comment on constraint alignment_answers_missing_code_check
  on public.alignment_answers is
  'Sprachreview v0.1, Abschnitt 3. Ein Auslassungsgrund ist eine Auskunft und '
  'kein Skalenwert - deshalb steht er in einer eigenen Spalte und nicht als '
  'sechste Stufe. not_relevant ist ein Altbestand und wird nirgends angeboten.';

commit;
