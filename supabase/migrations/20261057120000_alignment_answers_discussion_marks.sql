begin;

-- ---------------------------------------------------------------------------
-- Die Gespraechsmarkierung - Teil E (Ablauf jeder Wertekarte) und Teil F6
-- ---------------------------------------------------------------------------
--
-- Teil E sieht zu jeder Wertekarte zwei freiwillige Zusatzangaben vor: "Welche
-- Bedingung wuerde deine Wahl aendern?" und "Soll das im Team besprochen
-- werden?". Und Teil F6 macht die zweite zur WICHTIGSTEN REGEL der
-- Gespraechsagenda - Prioritaet 1 von vier:
--
--   "Ein Thema wurde von mindestens einer Person zur Besprechung markiert."
--
-- WARUM DAS VOR ALLEN RECHENREGELN STEHT. Die Alternative waere, die groessten
-- Unterschiede nach oben zu sortieren - und genau das verbietet F6
-- ausdruecklich: "Nicht still die groessten numerischen Differenzen als die
-- wichtigsten Konflikte waehlen." Ein Mensch, der sagt "darueber moechte ich
-- reden", weiss besser als jede Rechnung, was bei ihm dran ist. Auch dann,
-- wenn beide dieselbe Antwort gegeben haben.
--
-- "Die Markierung ist freiwillig und wird nicht als Wertscore interpretiert."
-- Sie zaehlt also nicht mit, sie sortiert nur.

alter table public.alignment_answers
  add column marked_for_discussion boolean not null default false,
  -- "Welche Bedingung wuerde deine Wahl aendern?" - freiwillig, und
  -- ausdruecklich keine Antwort auf die Frage selbst. Deshalb eine eigene
  -- Spalte und kein Feld in `value`: Sonst waere eine Bedingung, die jemand
  -- nennt, Teil dessen, was verglichen wird.
  add column change_condition text;

alter table public.alignment_answers
  add constraint alignment_answers_change_condition_len
  check (change_condition is null or char_length(btrim(change_condition)) between 1 and 2000);

comment on column public.alignment_answers.marked_for_discussion is
  'Von der Person selbst zur Besprechung markiert. Prioritaet 1 der '
  'Gespraechsagenda - steht vor jeder Rechnung und zaehlt in keine ein.';

comment on column public.alignment_answers.change_condition is
  'Freiwillig: was die eigene Wahl aendern wuerde. Keine Antwort auf die '
  'Frage selbst und deshalb nicht Teil des Vergleichs.';

-- Die Agenda fragt quer ueber einen Fragebogen nach Markierungen.
create index alignment_answers_marked_idx
  on public.alignment_answers (assessment_id)
  where marked_for_discussion;

commit;
