begin;

-- ---------------------------------------------------------------------------
-- Schritt 7: Was ein Advisor von v2 sieht - und wann er aufhoert, es zu sehen
-- ---------------------------------------------------------------------------
--
-- ZWEI SCHLUESSEL, NICHT EINER. Die Advisor-Freigabe sagt "diese Person
-- arbeitet mit mir". Die Antwort-Freigabe sagt "und sie darf diesen Fragebogen
-- sehen, diese Bloecke ausgenommen". Beides ist noetig, und keines ersetzt das
-- andere.
--
-- Der Unterschied ist nicht theoretisch. Ein Advisor bekommt heute Zugriff auf
-- Zusammenfassungen und Staerken - das ist etwas anderes als der Satz "ich
-- brauche ab Maerz mindestens 2400 Euro im Monat". Wer eine Beratung zulaesst,
-- hat damit nicht seine Finanzlage offengelegt.
--
-- ---------------------------------------------------------------------------
-- DAS LOCH, DAS DIESE MIGRATION SCHLIESST
-- ---------------------------------------------------------------------------
--
-- Die Freigabe aus Schritt 6a gilt, bis man sie einzeln zurueckzieht. Wer also
-- die ADVISOR-BEZIEHUNG beendet, haette weiterhin eine gueltige
-- Antwort-Freigabe an genau diese Person - und der ehemalige Advisor laese
-- weiter mit. Niemand wuerde daran denken, beides zu widerrufen: Man beendet
-- eine Zusammenarbeit und geht davon aus, dass sie beendet ist.
--
-- Ab jetzt folgt die Antwort-Freigabe der Advisor-Freigabe: Besteht zwischen
-- den beiden ueberhaupt eine Advisor-Beziehung, muss sie aktiv sein.
--
-- UMGEKEHRT NICHT. Eine aktive Advisor-Beziehung allein oeffnet gar nichts -
-- die Antwort-Freigabe bleibt eine eigene, ausdrueckliche Entscheidung.
-- ---------------------------------------------------------------------------

create function public.alignment_share_is_effective(
  p_assessment_id uuid,
  p_recipient_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.alignment_shares share
    join public.assessments assessment on assessment.id = share.assessment_id
    where share.assessment_id = p_assessment_id
      and share.recipient_user_id = p_recipient_user_id
      and share.revoked_at is null
      -- Besteht eine Advisor-Beziehung zwischen den beiden, muss sie aktiv
      -- sein. Besteht keine, aendert diese Bedingung nichts - ein
      -- Gruenderpaar teilt ohne Advisor-Grant.
      and (
        not exists (
          select 1 from public.advisor_person_grants grant_row
          where grant_row.subject_user_id = assessment.user_id
            and grant_row.advisor_user_id = p_recipient_user_id
        )
        or exists (
          select 1 from public.advisor_person_grants grant_row
          where grant_row.subject_user_id = assessment.user_id
            and grant_row.advisor_user_id = p_recipient_user_id
            and grant_row.status = 'active'
        )
      )
  );
$$;

comment on function public.alignment_share_is_effective(uuid, uuid) is
  'Gilt die Freigabe gerade? Zurueckgezogene zaehlen nicht, und bei einer '
  'Advisor-Beziehung muss diese aktiv sein - wer eine Zusammenarbeit beendet, '
  'soll nicht daran denken muessen, auch die Antworten einzeln zu entziehen.';

revoke all on function public.alignment_share_is_effective(uuid, uuid) from public, anon;
grant execute on function public.alignment_share_is_effective(uuid, uuid) to authenticated;

-- Die beiden Lesepolicies aus Schritt 6a gehen ueber die neue Funktion.
drop policy alignment_answers_select_shared on public.alignment_answers;

create policy alignment_answers_select_shared on public.alignment_answers
  for select to authenticated
  using (
    public.alignment_share_is_effective(alignment_answers.assessment_id, auth.uid())
    and not exists (
      select 1
      from public.alignment_shares share
      join public.alignment_share_hidden_blocks hidden on hidden.share_id = share.id
      where share.assessment_id = alignment_answers.assessment_id
        and share.recipient_user_id = auth.uid()
        and hidden.block_id = alignment_answers.block_id
    )
  );

drop policy assessments_select_alignment_share on public.assessments;

create policy assessments_select_alignment_share on public.assessments
  for select to authenticated
  using (public.alignment_share_is_effective(assessments.id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Und eine Organisation ist kein Empfaenger
-- ---------------------------------------------------------------------------
--
-- `advisor_person_grants` kann von einer Organisation gehalten werden. Fuer
-- Antworten geht das nicht: Teil F7 verlangt, dass eindeutig ist, WER wessen
-- konkrete Antworten sehen darf. "Der Accelerator" ist keine Person - wer
-- dort morgen anfaengt, laese mit, ohne dass jemand zugestimmt haette.
--
-- `recipient_user_id` zeigt deshalb auf auth.users, und das ist hier die
-- Aussage und nicht nur der Datentyp.

comment on column public.alignment_shares.recipient_user_id is
  'Genau ein Mensch. Keine Organisation: "der Accelerator" ist kein '
  'Empfaenger, weil sonst mitlaese, wer dort morgen anfaengt.';

commit;
