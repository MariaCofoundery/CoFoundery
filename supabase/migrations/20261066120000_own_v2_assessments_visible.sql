begin;

-- ---------------------------------------------------------------------------
-- Auch die Kopfzeile des eigenen Fragebogens
-- ---------------------------------------------------------------------------
--
-- Dritter Anlauf, und der Grund ist derselbe wie beim zweiten: Die Berechtigung
-- haengt nicht an einer Stelle, sondern an jeder Tabelle auf dem Weg.
--
-- Die Seite sucht zuerst den Fragebogen (`assessments`) und liest dann seine
-- Antworten. `assessments_select_owner` verlangt `has_founder_assessment_access()`,
-- also findet die Seite gar keinen Fragebogen - und alles Weitere ist
-- gegenstandslos, auch wenn die Antwortpolicy inzwischen richtig ist.
--
-- NUR FUER v2, UND DAS IST ABSICHT. Fuer v1 bleibt alles, wie es ist: Dort
-- gibt es keine Freigabe von Rohantworten, also auch nicht die Asymmetrie,
-- wegen der diese Aenderung noetig wurde. Eine Regel, die ich nicht brauche,
-- aendere ich nicht - erst recht nicht kurz vor einem Release.

create policy assessments_select_own_alignment_v2 on public.assessments
  for select to authenticated
  using (
    user_id = auth.uid()
    and instrument_id = 'founder-alignment-v2'
  );

comment on policy assessments_select_own_alignment_v2 on public.assessments is
  'Den eigenen v2-Fragebogen sieht man immer - ohne Berechtigungspruefung. '
  'Sonst koennten Freigabeempfaenger die Antworten lesen und die eigene '
  'Person nicht.';

commit;
