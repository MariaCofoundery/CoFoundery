begin;

-- ---------------------------------------------------------------------------
-- Die eigenen Antworten sind immer lesbar
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 28.09.2026 BEIM DURCHKLICKEN, nicht durch einen Test: Ein Profil
-- hatte zehn eingetragene Antworten und bekam trotzdem "Hier ist noch nichts"
-- zu sehen. Ursache war nicht die Anzeige, sondern die Policy.
--
-- `alignment_answers_select_owner` verlangte `has_founder_assessment_access()`.
-- Das ist die Berechtigung, die den Fragebogen ueberhaupt freischaltet - und
-- sie kann wegfallen, etwa weil sich eine Netzwerkmitgliedschaft aendert oder
-- eine Einladung ablaeuft.
--
-- ---------------------------------------------------------------------------
-- DAS EIGENTLICHE PROBLEM WAR DIE ASYMMETRIE
-- ---------------------------------------------------------------------------
--
-- `alignment_answers_select_shared` - die Policy fuer Menschen, denen ich
-- etwas freigegeben habe - verlangt diese Berechtigung NICHT.
--
-- Damit gab es einen Zustand, in dem ANDERE meine Antworten lesen koennen und
-- ich selbst nicht. Das ist unter keinem Gesichtspunkt richtig: nicht
-- datenschutzrechtlich, nicht produktlogisch und schon gar nicht gegenueber
-- jemandem, der gerade seinen Gehaltsbedarf eingetragen hat.
--
-- WAS DIE BERECHTIGUNG WEITERHIN GATED: schreiben. Um zu antworten, braucht man
-- den Fragebogen. Um zu lesen, was man selbst geschrieben hat, nicht - das ist
-- kein Produktmerkmal, sondern eine Selbstverstaendlichkeit.

drop policy alignment_answers_select_owner on public.alignment_answers;

create policy alignment_answers_select_owner on public.alignment_answers
  for select to authenticated
  using (
    exists (
      select 1 from public.assessments assessment
      where assessment.id = alignment_answers.assessment_id
        and assessment.user_id = auth.uid()
    )
  );

comment on policy alignment_answers_select_owner on public.alignment_answers is
  'Die eigenen Antworten sind immer lesbar - ohne Berechtigungspruefung. Wer '
  'schreiben will, braucht die Founder-Berechtigung; wer lesen will, was er '
  'selbst geschrieben hat, nicht.';

commit;
