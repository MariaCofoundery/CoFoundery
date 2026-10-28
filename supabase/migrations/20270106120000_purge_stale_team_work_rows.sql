begin;

-- ---------------------------------------------------------------------------
-- Loeschfristen fuer Check-in, Testprojekt und Erinnerungs-Stempel
-- ---------------------------------------------------------------------------
--
-- Grundsatz: Es bleibt nur, was das Produkt noch nutzt. Nach einem Check-in zeigt die
-- Seite nur den LETZTEN abgeschlossenen; aeltere Antworten hat kein Feature mehr.
--
--   Check-in, Antworten und Notizen   p_answer_days  (Vorgabe 365) nach Abschluss/Ueberspringen.
--                                     Gehen mit den Themen (Antworten haengen daran), den Abgaben
--                                     und den eigenen Punkten im Freitext weg.
--   Check-in, Rueckblick              p_retro_days   (Vorgabe 180) nach Abschluss: Antworten,
--                                     Einladungen und die Fragen des Rueckblicks. Freitext, am
--                                     persoenlichsten, deshalb kuerzer.
--   Check-in selbst (Zeile)           bleibt: Datum und Status braucht die Berechnung, wann der
--                                     naechste faellig ist. Enthaelt nichts Persoenliches.
--   Testprojekt, nie gestartet        p_draft_days   (Vorgabe 90) nach der letzten Aenderung.
--   Testprojekt, beendet/abgebrochen  p_answer_days nach dem Ende. Ein laufendes bleibt.
--   Erinnerungs-Stempel               p_stamp_days   (Vorgabe 365) nach der Faelligkeit.
--
-- Die Fristen sind Vorgaben, keine Rechtsfristen. Rechte wie die anderen Loeschfunktionen:
-- ausschliesslich service_role. Offene Check-ins und laufende Testprojekte werden nie angefasst.
-- ---------------------------------------------------------------------------
create function public.purge_stale_team_work_rows(
  p_answer_days integer default 365,
  p_retro_days integer default 180,
  p_draft_days integer default 90,
  p_stamp_days integer default 365
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_answer_days integer := coalesce(p_answer_days, 365);
  v_retro_days integer := coalesce(p_retro_days, 180);
  v_draft_days integer := coalesce(p_draft_days, 90);
  v_stamp_days integer := coalesce(p_stamp_days, 365);
  v_retro_answers integer := 0;
  v_retro_invites integer := 0;
  v_topics integer := 0;
  v_submissions integer := 0;
  v_drafts integer := 0;
  v_projects integer := 0;
  v_stamps integer := 0;
begin
  if v_answer_days < 30 or v_answer_days > 1825 or v_retro_days < 30 or v_retro_days > 1825
     or v_draft_days < 30 or v_draft_days > 1825 or v_stamp_days < 30 or v_stamp_days > 1825 then
    raise exception 'invalid_retention_days';
  end if;

  -- Rueckblick zuerst und frueher: Antworten, Einladungen, Fragen.
  delete from public.team_check_in_retro_answers a
  using public.team_check_ins c
  where c.id = a.check_in_id and c.status <> 'open'
    and coalesce(c.closed_at, c.started_at) < date_trunc('day', now()) - make_interval(days => v_retro_days);
  get diagnostics v_retro_answers = row_count;

  delete from public.team_check_in_retro_invites i
  using public.team_check_ins c
  where c.id = i.check_in_id and c.status <> 'open'
    and coalesce(c.closed_at, c.started_at) < date_trunc('day', now()) - make_interval(days => v_retro_days);
  get diagnostics v_retro_invites = row_count;

  update public.team_check_ins
  set retro_questions = '[]'::jsonb, retro_offered_by_user_id = null
  where status <> 'open'
    and coalesce(closed_at, started_at) < date_trunc('day', now()) - make_interval(days => v_retro_days)
    and (retro_questions <> '[]'::jsonb or retro_offered_by_user_id is not null);

  -- Themen (damit ihre Antworten und die eigenen Punkte im Freitext) und Abgaben.
  delete from public.team_check_in_topics t
  using public.team_check_ins c
  where c.id = t.check_in_id and c.status <> 'open'
    and coalesce(c.closed_at, c.started_at) < date_trunc('day', now()) - make_interval(days => v_answer_days);
  get diagnostics v_topics = row_count;

  delete from public.team_check_in_submissions s
  using public.team_check_ins c
  where c.id = s.check_in_id and c.status <> 'open'
    and coalesce(c.closed_at, c.started_at) < date_trunc('day', now()) - make_interval(days => v_answer_days);
  get diagnostics v_submissions = row_count;

  -- Testprojekt: nie gestartete Entwuerfe, dann Beendete.
  delete from public.relationship_test_projects
  where status = 'draft' and updated_at < date_trunc('day', now()) - make_interval(days => v_draft_days);
  get diagnostics v_drafts = row_count;

  delete from public.relationship_test_projects
  where status in ('closed', 'cancelled')
    and coalesce(closed_at, updated_at) < date_trunc('day', now()) - make_interval(days => v_answer_days);
  get diagnostics v_projects = row_count;

  delete from public.team_check_in_reminders
  where due_on < current_date - v_stamp_days;
  get diagnostics v_stamps = row_count;

  return jsonb_build_object(
    'answerDays', v_answer_days,
    'retroDays', v_retro_days,
    'draftDays', v_draft_days,
    'stampDays', v_stamp_days,
    'deletedRetroAnswers', v_retro_answers,
    'deletedRetroInvites', v_retro_invites,
    'deletedCheckInTopics', v_topics,
    'deletedCheckInSubmissions', v_submissions,
    'deletedTestProjectDrafts', v_drafts,
    'deletedTestProjects', v_projects,
    'deletedReminderStamps', v_stamps
  );
end;
$$;

comment on function public.purge_stale_team_work_rows(integer, integer, integer, integer) is
  'Loescht Check-in-Antworten/-Themen/-Abgaben nach p_answer_days und den Rueckblick nach p_retro_days (je nach Abschluss), nie gestartete Testprojekt-Entwuerfe nach p_draft_days, beendete Testprojekte nach p_answer_days und Erinnerungs-Stempel nach p_stamp_days (alle 30-1825). Offene Check-ins und laufende Testprojekte bleiben. Nur service_role.';

revoke all on function public.purge_stale_team_work_rows(integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.purge_stale_team_work_rows(integer, integer, integer, integer) to service_role;

commit;
