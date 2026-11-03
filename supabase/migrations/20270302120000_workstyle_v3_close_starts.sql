-- Workstyle v3 nach dem Go-live von v4 (03.11.2026): nur noch fortsetzen, nie neu beginnen.
--
-- Seit 20270301120000_workstyle_v4.sql gilt nur v4 als aktuelles Arbeitsprofil;
-- ein v3-Profil sieht nur die Person selbst. Die App beginnt v3 schon nicht mehr
-- neu, die Datenbank bisher schon. Ab hier:
-- - start_workstyle_product setzt eine bestehende v3-Teilnahme fort bzw. gibt die
--   fertige zurueck, legt aber keine neue an (auch nicht mit p_new);
-- - start_workstyle_research gibt eine bestehende Forschungsteilnahme zurueck, nimmt
--   aber keine neue v3-Einwilligung mehr an (Forschung kommt spaeter mit einer
--   grundsaetzlichen Einwilligung zurueck);
-- - start_workstyle_pretest mit der v3-Einwilligung setzt nur noch fort.
-- Speichern, Abschluss, Feedback, Widerruf und Lesen bestehender Teilnahmen bleiben
-- unveraendert. 8.5a-v1/-v2 sind nicht Teil dieser Migration.
begin;

create or replace function public.start_workstyle_product(p_new boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; product_done timestamptz;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if p_new is null then raise exception 'invalid_workstyle_start' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-8.5a-v3',0));
 select s.* into current_session from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id
 where a.user_id=auth.uid() and s.assessment_version='8.5a-v3' order by s.started_at desc,s.assessment_id limit 1 for update of s;
 if found then
  select submitted_at into product_done from public.assessments where id=current_session.assessment_id;
  if product_done is null or not p_new then return public.get_my_workstyle_pretest_version('8.5a-v3'); end if;
 end if;
 raise exception 'workstyle_version_closed' using errcode='55000';
end $$;

create or replace function public.start_workstyle_research(p_consent_version text, p_context jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if p_consent_version is distinct from 'workstyle_research_v3' then raise exception 'research_consent_required' using errcode='42501'; end if;
 if p_context is null or jsonb_typeof(p_context)<>'object'
   or (p_context - array['founder_experience','team_size','venture_phase'])<>'{}'
   or coalesce(p_context->>'founder_experience','') not in ('0','1','2-3','4-5','6_plus','prefer_not_to_say')
   or coalesce(p_context->>'team_size','') not in ('solo','two','larger','no_venture')
   or (p_context ? 'venture_phase' and coalesce(p_context->>'venture_phase','') not in ('idea','building','operating','')) then
   raise exception 'invalid_workstyle_context' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-8.5a-v3',0));
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=auth.uid() and r.assessment_version='8.5a-v3' order by r.started_at desc,r.assessment_id limit 1 for update of r;
 if found and s.withdrawn_at is not null then raise exception 'research_withdrawn' using errcode='42501'; end if;
 -- Nur eine bestehende Einwilligung wird fortgesetzt; neue gibt es fuer v3 nicht mehr.
 if found and s.consent_version is not null then return public.get_my_workstyle_pretest_version('8.5a-v3'); end if;
 raise exception 'workstyle_version_closed' using errcode='55000';
end $$;

create or replace function public.start_workstyle_pretest(p_consent_version text, p_context jsonb, p_new boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; new_id uuid; selected_form text; selected_version text;
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
 -- Serialize allocation, duplicate starts and the per-user resumption decision.
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-'||selected_version,0));
 select s.* into current_session from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id
 where a.user_id=auth.uid() and s.assessment_version=selected_version order by s.started_at desc,s.assessment_id limit 1 for update of s;
 if found and current_session.withdrawn_at is null and (current_session.completed_at is null or not p_new) then
   return public.get_my_workstyle_pretest_version(selected_version);
 end if;
 -- v3: nur noch fortsetzen (siehe Kopf).
 if selected_version='8.5a-v3' then raise exception 'workstyle_version_closed' using errcode='55000'; end if;
 if selected_version='8.5a-v1' then
 select f.form into selected_form from (values('A'),('B'),('C')) f(form)
 left join public.workstyle_pretest_sessions s on s.form=f.form and s.assessment_version=selected_version
 group by f.form order by count(s.assessment_id),f.form limit 1;
 end if;
 insert into public.assessments(user_id,module,instrument_id)
 values(auth.uid(),'founder_profile',public.workstyle_instrument_for(selected_version)) returning id into new_id;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,context,manifest_version,resume_position)
 values(new_id,selected_version,selected_form,p_consent_version,p_context,
   case selected_version when '8.5a-v2' then '2.0.0' when '8.5a-v3' then '3.0.0' end,case when selected_version in ('8.5a-v2','8.5a-v3') then 0 end);
 return public.get_my_workstyle_pretest_version(selected_version);
end $$;

commit;
