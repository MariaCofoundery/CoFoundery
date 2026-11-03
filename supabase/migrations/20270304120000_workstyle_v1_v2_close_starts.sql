-- Workstyle 8.5a-v1 und -v2 wie v3 (20270302120000): nur noch fortsetzen, nie neu beginnen.
--
-- start_workstyle_pretest war der einzige Weg, der noch neue v1/v2-Teilnahmen
-- anlegte. Die App beginnt diese Fassungen seit dem Cutover nicht mehr neu; die
-- Datenbank tut es ab hier auch nicht. Damit legt die Funktion fuer keine Fassung
-- mehr etwas an: Sie gibt eine bestehende, nicht widerrufene Teilnahme zurueck
-- (bei p_new nur, solange sie nicht abgeschlossen ist) und lehnt alles andere mit
-- workstyle_version_closed ab. Speichern, Abschluss, Feedback, Widerruf und Lesen
-- bestehender Teilnahmen bleiben unveraendert.
begin;

create or replace function public.start_workstyle_pretest(p_consent_version text, p_context jsonb, p_new boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; selected_version text;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 selected_version:=case p_consent_version when 'workstyle_research_v1' then '8.5a-v1' when 'workstyle_research_v2' then '8.5a-v2' when 'workstyle_research_v3' then '8.5a-v3' end;
 if selected_version is null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if p_context is null or jsonb_typeof(p_context)<>'object'
   or (p_context - array['founder_experience','team_size','venture_phase'])<>'{}'
   or (selected_version='8.5a-v1' and coalesce(p_context->>'founder_experience','') not in ('none','first_venture','multiple_ventures'))
   or (selected_version in ('8.5a-v2','8.5a-v3') and coalesce(p_context->>'founder_experience','') not in ('0','1','2-3','4-5','6_plus','prefer_not_to_say'))
   or coalesce(p_context->>'team_size','') not in ('solo','two','larger','no_venture')
   or (p_context ? 'venture_phase' and coalesce(p_context->>'venture_phase','') not in ('idea','building','operating','')) then
   raise exception 'invalid_workstyle_context' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-'||selected_version,0));
 select s.* into current_session from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id
 where a.user_id=auth.uid() and s.assessment_version=selected_version order by s.started_at desc,s.assessment_id limit 1 for update of s;
 if found and current_session.withdrawn_at is null and (current_session.completed_at is null or not p_new) then
   return public.get_my_workstyle_pretest_version(selected_version);
 end if;
 -- Alle drei Fassungen sind historisch: nur fortsetzen (siehe Kopf).
 raise exception 'workstyle_version_closed' using errcode='55000';
end $$;

commit;
