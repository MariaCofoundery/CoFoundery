begin;

-- ---------------------------------------------------------------------------
-- Nachtrag: die eigene Berechtigung haengt eine Ebene tiefer
-- ---------------------------------------------------------------------------
--
-- Die Migration davor hat `has_founder_assessment_access()` aus der Lesepolicy
-- fuer eigene Antworten entfernt - und es hat nichts geaendert. Der pgTAP-Test
-- hat es sofort gezeigt.
--
-- DER GRUND: Die Policy prueft ueber ein `exists` auf `assessments`, und diese
-- Unterabfrage steht SELBST unter RLS. `assessments_select_owner` verlangt die
-- Berechtigung, also findet das `exists` nichts - und die Antwortzeile bleibt
-- unsichtbar, obwohl ihre eigene Policy sie laengst freigegeben hat.
--
-- Das ist die Sorte Fehler, die man nicht durch Lesen findet: Beide Policies
-- sehen fuer sich richtig aus. Erst zusammen ergeben sie ein Nein.
--
-- `public.owns_assessment` gibt es schon - sie wurde in Schritt 6a genau
-- deshalb als SECURITY DEFINER angelegt, damit eine Policy die Eigentumsfrage
-- stellen kann, ohne an der RLS der anderen Tabelle haengenzubleiben.

drop policy alignment_answers_select_owner on public.alignment_answers;

create policy alignment_answers_select_owner on public.alignment_answers
  for select to authenticated
  using (public.owns_assessment(alignment_answers.assessment_id));

comment on policy alignment_answers_select_owner on public.alignment_answers is
  'Die eigenen Antworten sind immer lesbar. Ueber owns_assessment, damit die '
  'Frage "gehoert das mir" nicht an der RLS von assessments scheitert.';

commit;
