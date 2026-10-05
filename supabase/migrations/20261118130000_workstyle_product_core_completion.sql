-- Phase 11.6 - Arbeitsprofil (Produkt) und Forschung getrennt; gemeinsamer
-- Teambericht auch fuer Advisors erst bei gegenseitiger Bereitschaft.
--
-- Vorher (8.5a-v3): Start nur mit Forschungseinwilligung (start_workstyle_pretest),
-- Speichern nur in fester, gemischter Reihenfolge ueber alle 52 Screens,
-- Abschluss erst an Position 52 mit 29 Core- UND 23 Forschungsantworten; dabei
-- wurden assessments.submitted_at (Produkt) und sessions.completed_at
-- (Forschung) gemeinsam gesetzt.
--
-- Jetzt:
-- - PRODUKTABSCHLUSS = assessments.submitted_at, gesetzt sobald alle 29 aktuellen
--   Core-Antworten vorliegen. Alle Produktleser (Profil, Teambericht, Readiness,
--   FIND, Advisor-Person, Teilen, Dashboard, Join) lesen schon submitted_at -
--   keine zweite Abschlusslogik.
-- - FORSCHUNGSABSCHLUSS = sessions.completed_at, nur mit Forschungseinwilligung
--   und erst wenn auch alle 23 Forschungsantworten vorliegen. Ohne Wirkung auf
--   Produktleser.
-- - Forschungseinwilligung je Sitzung optional: consent_version/consent_given_at
--   duerfen fuer 8.5a-v3 leer sein. Ohne Einwilligung keine Forschungsantworten,
--   kein Kontext, keine Bearbeitungszeiten, kein Feedback (Constraint + RPC).
-- - start_workstyle_product: Produktstart ohne Einwilligung.
--   start_workstyle_research: Einwilligung + Kontext nachtraeglich, nur fuer ein
--   abgeschlossenes Arbeitsprofil. start_workstyle_pretest bleibt unveraendert.
-- - Reihenfolge nur noch innerhalb des jeweiligen Teils (Core / Forschung).
-- - Widerruf (erase_workstyle_research) betrifft nur Sitzungen mit Einwilligung;
--   "abgeschlossen" heisst jetzt Produktabschluss. Unvollstaendige Teilnahmen mit
--   Einwilligung werden wie bisher geloescht.
-- - Forschungsexport nur Sitzungen mit Einwilligung.
-- - Bestand: v3-Teilnahmen mit allen 29 Core-Antworten ohne submitted_at gelten
--   ab jetzt als Arbeitsprofil (Zeitpunkt = letzte Core-Antwort). Keine Antwort
--   wird geaendert, verschoben oder geloescht.
-- - get_workstyle_product_team / get_workstyle_team_inputs: Gegenseitigkeit fuer
--   jede lesende Person, auch Advisors. Personenfreigaben bleiben unabhaengig.
--
-- Keine neue Tabelle, keine neue Instrumentversion, keine Items, keine Scores,
-- keine automatische Freigabe, keine Rechteerweiterung.
begin;

-- 1. Sitzungsvertrag: Forschungseinwilligung fuer v3 optional.
alter table public.workstyle_pretest_sessions alter column consent_version drop not null;
alter table public.workstyle_pretest_sessions alter column consent_given_at drop not null;
alter table public.workstyle_pretest_sessions drop constraint workstyle_session_version_contract;
alter table public.workstyle_pretest_sessions add constraint workstyle_session_version_contract check (
 (assessment_version='8.5a-v1' and form is not null and form in ('A','B','C')
   and consent_version='workstyle_research_v1' and manifest_version is null and resume_position is null)
 or (assessment_version='8.5a-v2' and form is null and consent_version='workstyle_research_v2'
   and manifest_version is not null and manifest_version='2.0.0' and resume_position is not null and resume_position between 0 and 35)
 or (assessment_version='8.5a-v3' and form is null and (consent_version is null or consent_version='workstyle_research_v3')
   and manifest_version is not null and manifest_version='3.0.0' and resume_position is not null and resume_position between 0 and 51)
);
alter table public.workstyle_pretest_sessions add constraint workstyle_session_research_consent check (
 (consent_version is null)=(consent_given_at is null)
 and (consent_version is not null or (context='{}'::jsonb and timings='{}'::jsonb and feedback is null
   and completed_at is null and withdrawn_at is null))
);

-- 2. Abschluss je Teil. Intern; Produkt zuerst, Forschung nur mit Einwilligung.
create function public.workstyle_v3_sync_completion(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; done_at timestamptz:=clock_timestamp();
 core_total integer; research_total integer; core_n integer;
begin
 select * into s from public.workstyle_pretest_sessions where assessment_id=p_assessment_id and assessment_version='8.5a-v3';
 if not found then return; end if;
 select count(*) filter(where definition->>'usage'='core' and definition->>'scientific_status'='core'),
  count(*) filter(where not (definition->>'usage'='core' and definition->>'scientific_status'='core'))
 into core_total,research_total from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v3';
 select count(*) into core_n from public.alignment_answers r join public.workstyle_item_versions i
  on i.instrument_id='founder-workstyle-pretest-8-5a-v3' and i.item_key=r.block_id and i.item_version=r.item_version
  where r.assessment_id=p_assessment_id and i.definition->>'usage'='core' and i.definition->>'scientific_status'='core';
 if core_n<>core_total then return; end if;
 update public.assessments set submitted_at=done_at where id=p_assessment_id and submitted_at is null;
 if s.consent_version is null or s.withdrawn_at is not null or s.completed_at is not null then return; end if;
 if (select count(*) from public.workstyle_research_responses where assessment_id=p_assessment_id)=research_total then
  update public.workstyle_pretest_sessions set completed_at=done_at where assessment_id=p_assessment_id;
 end if;
end $$;
revoke all on function public.workstyle_v3_sync_completion(uuid) from public,anon,authenticated;

-- 3. Eigene Sitzung lesen: zusaetzlich der Produktabschluss.
create or replace function public.get_my_workstyle_pretest_version(p_assessment_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; answer_rows jsonb; product_done timestamptz;
begin
 if public.workstyle_instrument_for(p_assessment_version) is null then raise exception 'unknown_workstyle_version' using errcode='22023'; end if;
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=auth.uid() and r.assessment_version=p_assessment_version order by r.started_at desc,r.assessment_id limit 1;
 if not found then return null; end if;
 select submitted_at into product_done from public.assessments where id=s.assessment_id;
 answer_rows:=public.workstyle_answer_rows(s.assessment_id);
 return to_jsonb(s)||jsonb_build_object('answers',answer_rows,'submitted_at',product_done);
end $$;

-- 4. Produktstart ohne Forschungseinwilligung. Setzt eine laufende Teilnahme fort;
-- p_new beginnt nur nach abgeschlossenem Arbeitsprofil neu.
create function public.start_workstyle_product(p_new boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; product_done timestamptz; new_id uuid;
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
 insert into public.assessments(user_id,module,instrument_id)
 values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v3') returning id into new_id;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,consent_given_at,context,manifest_version,resume_position)
 values(new_id,'8.5a-v3',null,null,null,'{}','3.0.0',0);
 return public.get_my_workstyle_pretest_version('8.5a-v3');
end $$;

-- 5. Freiwillige Forschung: ausdrueckliche Einwilligung + Kontext, nur fuer ein
-- abgeschlossenes Arbeitsprofil und nie nach einem Widerruf derselben Sitzung.
create function public.start_workstyle_research(p_consent_version text,p_context jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; product_done timestamptz;
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
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=auth.uid() and r.assessment_version='8.5a-v3' order by r.started_at desc,r.assessment_id limit 1 for update of r;
 if not found then raise exception 'workstyle_product_required' using errcode='23514'; end if;
 if s.withdrawn_at is not null then raise exception 'research_withdrawn' using errcode='42501'; end if;
 if s.consent_version is not null then return public.get_my_workstyle_pretest_version('8.5a-v3'); end if;
 select submitted_at into product_done from public.assessments where id=s.assessment_id;
 if product_done is null then raise exception 'workstyle_product_required' using errcode='23514'; end if;
 update public.workstyle_pretest_sessions set consent_version=p_consent_version,consent_given_at=clock_timestamp(),context=p_context
 where assessment_id=s.assessment_id;
 return public.get_my_workstyle_pretest_version('8.5a-v3');
end $$;

-- 6. Speichern: Reihenfolge nur innerhalb des Teils; Forschungsantworten nur mit
-- Einwilligung; Bearbeitungszeiten nur mit Einwilligung; Abschluss automatisch.
-- p_finalize bleibt fuer bestehende Aufrufer erhalten und wird nur geprueft.
create or replace function public.save_workstyle_pretest_v3(
 p_assessment_id uuid,p_item_key text,p_item_version text,p_response_value integer,
 p_response_option text,p_missing_reason text,p_rendered_order jsonb,
 p_response_time_ms integer default null,p_finalize boolean default false
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; item jsonb; item_position integer; previous jsonb; answer_time timestamptz;
 is_core boolean; product_done timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.assessment_version<>'8.5a-v3' then
   raise exception 'workstyle_session_unavailable' using errcode='42501'; end if;
 select i.definition,i.position into item,item_position from public.workstyle_item_versions i
 where i.instrument_id='founder-workstyle-pretest-8-5a-v3' and i.item_key=p_item_key and i.item_version=p_item_version;
 if item is null or num_nonnulls(p_response_value,p_response_option,p_missing_reason)<>1
   or (p_missing_reason is not null and p_missing_reason<>'cannot_assess')
   or (p_response_time_ms is not null and p_response_time_ms not between 0 and 86400000)
   or p_rendered_order is distinct from nullif(item->'rendered_order','null'::jsonb)
   or p_finalize is null then
   raise exception 'invalid_workstyle_answer' using errcode='22023'; end if;
 if item->>'response_format' in ('comparative','behavioral') then
   if p_response_value is not null or (p_response_option is not null and not exists(
     select 1 from jsonb_array_elements(item->'options') o where o->>'option_id'=p_response_option)) then
     raise exception 'invalid_workstyle_choice' using errcode='22023'; end if;
 elsif p_response_option is not null or (p_response_value is not null and p_response_value not between 1 and 5) then
   raise exception 'invalid_workstyle_ordinal' using errcode='22023';
 end if;
 is_core:=item->>'usage'='core' and item->>'scientific_status'='core';
 if not is_core and s.consent_version is null then raise exception 'research_consent_required' using errcode='42501'; end if;
 select submitted_at into product_done from public.assessments where id=p_assessment_id;
 if (is_core and product_done is not null) or (not is_core and s.completed_at is not null) then
   -- Abgeschlossene Teile sind unveraenderlich; eine identische Wiederholung ist erlaubt.
   select a into previous from jsonb_array_elements(public.workstyle_answer_rows(p_assessment_id)) a where a->>'item_key'=p_item_key;
   if previous is null or previous->>'item_version' is distinct from p_item_version
     or (previous->>'response_value')::integer is distinct from p_response_value
     or previous->>'response_option' is distinct from p_response_option
     or previous->>'missing_reason' is distinct from p_missing_reason
     or nullif(previous->'rendered_order','null'::jsonb) is distinct from p_rendered_order then
     raise exception 'workstyle_completed_answer_immutable' using errcode='23514'; end if;
 else
   if exists(select 1 from public.workstyle_item_versions i where i.instrument_id='founder-workstyle-pretest-8-5a-v3'
     and i.position<item_position and ((i.definition->>'usage'='core' and i.definition->>'scientific_status'='core')=is_core)
     and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)
     and not exists(select 1 from public.workstyle_research_responses r where r.assessment_id=p_assessment_id and r.item_key=i.item_key)) then
     raise exception 'workstyle_previous_answer_required' using errcode='23514'; end if;
   answer_time:=clock_timestamp();
   if is_core then
     insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,missing_code,workstyle_rendered_order,answered_at)
     values(p_assessment_id,p_item_key,p_item_version,case when item->>'response_format' in ('comparative','behavioral') then 'single_choice' else 'ordinal_choice' end,
       case when p_response_value is not null then jsonb_build_object('scale',p_response_value)
            when p_response_option is not null then jsonb_build_object('optionId',p_response_option) end,p_missing_reason,p_rendered_order,answer_time)
     on conflict(assessment_id,block_id) do update set value=excluded.value,missing_code=excluded.missing_code,answered_at=excluded.answered_at;
   else
     insert into public.workstyle_research_responses(assessment_id,instrument_id,item_key,item_version,response_value,response_option,missing_reason,rendered_order,answered_at)
     values(p_assessment_id,'founder-workstyle-pretest-8-5a-v3',p_item_key,p_item_version,p_response_value,p_response_option,p_missing_reason,p_rendered_order,answer_time)
     on conflict(assessment_id,item_key) do update set response_value=excluded.response_value,response_option=excluded.response_option,missing_reason=excluded.missing_reason,answered_at=excluded.answered_at;
   end if;
   update public.workstyle_pretest_sessions set resume_position=least(item_position,51),
     timings=case when p_response_time_ms is null or s.consent_version is null then timings
     else timings||jsonb_build_object(p_item_key,p_response_time_ms) end where assessment_id=p_assessment_id;
   perform public.workstyle_v3_sync_completion(p_assessment_id);
 end if;
 return jsonb_build_object('assessment_id',p_assessment_id,
   'submitted_at',(select submitted_at from public.assessments where id=p_assessment_id),
   'completed_at',(select completed_at from public.workstyle_pretest_sessions where assessment_id=p_assessment_id),
   'answer',(select a from jsonb_array_elements(public.workstyle_answer_rows(p_assessment_id)) a where a->>'item_key'=p_item_key));
end $$;

-- 7. Expliziter Abschluss: v1/v2 unveraendert, v3 nach Teilen.
create or replace function public.complete_workstyle_pretest(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; completed_time timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.assessment_version='8.5a-v3' then
   perform public.workstyle_v3_sync_completion(p_assessment_id);
   if (select submitted_at from public.assessments where id=p_assessment_id) is null then
     raise exception 'workstyle_incomplete' using errcode='23514'; end if;
   return;
 end if;
 if s.completed_at is not null then return; end if;
 if (select count(*) from public.alignment_answers where assessment_id=p_assessment_id)<>(case s.assessment_version when '8.5a-v2' then 30 else 20 end)
   or (select count(*) from public.workstyle_research_responses where assessment_id=p_assessment_id)<>
     (select count(*) from public.workstyle_item_versions where definition->>'usage'='research_only' and definition->>'form' is not distinct from s.form
       and instrument_id=public.workstyle_instrument_for(s.assessment_version)) then
   raise exception 'workstyle_incomplete' using errcode='23514';
 end if;
 completed_time:=clock_timestamp();
 update public.assessments set submitted_at=completed_time where id=p_assessment_id;
 update public.workstyle_pretest_sessions set completed_at=completed_time where assessment_id=p_assessment_id;
end $$;

-- 8. Widerruf: nur Sitzungen mit Forschungseinwilligung. Ein abgeschlossenes
-- Arbeitsprofil (submitted_at) bleibt; eine unvollstaendige Teilnahme mit
-- Einwilligung wird wie bisher geloescht. Reine Produktsitzungen bleiben.
create or replace function public.erase_workstyle_research(p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s record;
begin
 for s in select r.assessment_id,a.submitted_at from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=p_user_id and r.withdrawn_at is null and r.consent_version is not null for update of r loop
   delete from public.workstyle_research_responses where assessment_id=s.assessment_id;
   if s.submitted_at is null then
     delete from public.alignment_answers where assessment_id=s.assessment_id;
     delete from public.assessments where id=s.assessment_id;
   else
     update public.workstyle_pretest_sessions set withdrawn_at=now(),context='{}',timings='{}',feedback=null where assessment_id=s.assessment_id;
   end if;
 end loop;
end $$;
revoke all on function public.erase_workstyle_research(uuid) from public,anon,authenticated,service_role;

-- 9. Forschungsexport: nur Sitzungen mit Einwilligung; Einwilligungszeitpunkt
-- zusaetzlich, weil Forschung jetzt nach dem Arbeitsprofil beginnen kann.
create or replace function public.get_workstyle_research_dataset_version(p_assessment_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if public.workstyle_instrument_for(p_assessment_version) is null then raise exception 'unknown_workstyle_version' using errcode='22023'; end if;
 if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'session_id',s.session_id,'form',s.form,'assessment_version',s.assessment_version,'consent_version',s.consent_version,
   'manifest_version',coalesce(s.manifest_version,'1.0.0'),'resume_position',s.resume_position,'started_at',s.started_at,
   'research_consent_given_at',s.consent_given_at,'completed_at',s.completed_at,'context',s.context,'feedback',s.feedback,'timings',s.timings,
   'answers',public.workstyle_answer_rows(s.assessment_id))) from public.workstyle_pretest_sessions s
   where s.withdrawn_at is null and s.consent_version is not null and s.assessment_version=p_assessment_version),'[]');
end $$;

-- 10. Bestand: v3-Teilnahmen mit allen 29 Core-Antworten gelten als Arbeitsprofil.
update public.assessments a set submitted_at=c.last_answer
from (select r.assessment_id,max(r.answered_at) last_answer
  from public.alignment_answers r
  join public.workstyle_item_versions i on i.instrument_id='founder-workstyle-pretest-8-5a-v3' and i.item_key=r.block_id
   and i.item_version=r.item_version and i.definition->>'usage'='core' and i.definition->>'scientific_status'='core'
  join public.workstyle_pretest_sessions s on s.assessment_id=r.assessment_id and s.assessment_version='8.5a-v3' and s.withdrawn_at is null
  group by r.assessment_id
  having count(*)=(select count(*) from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v3'
   and definition->>'usage'='core' and definition->>'scientific_status'='core')) c
where a.id=c.assessment_id and a.instrument_id='founder-workstyle-pretest-8-5a-v3' and a.submitted_at is null;

-- 11. Gemeinsamer Teambericht: Gegenseitigkeit fuer jede lesende Person.
create or replace function public.get_workstyle_product_team(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare team public.founder_teams; member record; profile jsonb; people jsonb:='[]'; caps jsonb; alignment jsonb; setup jsonb:='[]'; a public.assessments; rel record; allowed_setup boolean:=false;
begin
 if not public.can_read_workstyle_team(p_team_id) then return null; end if;
 select * into team from public.founder_teams where id=p_team_id;
 if not found then return null; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 -- Phase 11.5/11.6: Ein gemeinsamer Teambericht ist ein gemeinsames Artefakt. Es
 -- gibt ihn erst, wenn JEDE Person ihr aktuelles Arbeitsprofil fuer JEDE andere
 -- vollstaendig freigegeben hat - sonst fuer niemanden, auch fuer Advisors nicht.
 -- Advisors brauchen zusaetzlich weiterhin ihre eigenen Freigaben (unten ueber
 -- get_workstyle_product_profile). Hier wird nichts freigegeben.
 if exists(
  select 1 from public.founder_team_members x join public.founder_team_members y on y.team_id=x.team_id and y.user_id<>x.user_id
  where x.team_id=p_team_id and not public.workstyle_core_visible_to(x.user_id,y.user_id)) then
  return jsonb_build_object('status','not_ready');
 end if;
 for member in select m.user_id,coalesce(nullif(p.display_name,''),'Founder') name from public.founder_team_members m left join public.profiles p on p.user_id=m.user_id where m.team_id=p_team_id order by m.created_at,m.user_id loop
  profile:=public.get_workstyle_product_profile(member.user_id);
  if profile is null or jsonb_array_length(profile->'answers')<>29 then return jsonb_build_object('status','not_ready'); end if;
  caps:='[]';
  if member.user_id=auth.uid() then
   select coalesce(jsonb_agg(jsonb_build_object('area_id',area_id,'application_level',application_level,'ownership_wish',ownership_wish) order by area_id),'[]') into caps from public.person_capability_entries where user_id=member.user_id;
  elsif public.is_current_user_founder_team_member(p_team_id) then
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_disclosed_capability(member.user_id,'team') c;
  elsif public.has_advisor_person_access(member.user_id,'capability') then
   select coalesce(jsonb_agg(to_jsonb(c) order by c.area_id),'[]') into caps from public.get_advisor_person_capability(member.user_id) c;
  end if;
  alignment:=null;
  select * into a from public.assessments where user_id=member.user_id and instrument_id='venture-alignment-v1' and venture_id=p_team_id and submitted_at is not null order by created_at desc,id limit 1;
  if a.id is not null and (member.user_id=auth.uid() or public.alignment_share_is_effective(a.id,auth.uid())) then
   select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'value',r.value,'missing_reason',r.missing_code) order by r.block_id),'[]') into alignment from public.alignment_answers r where r.assessment_id=a.id
   and (member.user_id=auth.uid() or not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id));
  end if;
  people:=people||jsonb_build_array(jsonb_build_object('person_id',member.user_id,'name',member.name,'workstyle',profile,'capabilities',caps,'alignment',alignment));
 end loop;
 if public.is_current_user_founder_team_member(p_team_id) then
  allowed_setup:=true;
  select coalesce(jsonb_agg(jsonb_build_object('item_key',i.item_key,'resolution_status',r.resolution_status,'note',r.note,'confirmed_at',r.confirmed_at) order by i.item_key),'[]') into setup
  from public.founder_team_setup_items i join public.founder_team_setup_revisions r on r.id=i.current_confirmed_revision_id and r.setup_item_id=i.id
  where i.team_id=p_team_id and r.confirmed_at is not null and r.superseded_at is null
  and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.founder_team_setup_confirmations c where c.revision_id=r.id and c.user_id=m.user_id));
 else
  for rel in select id from public.relationships where founder_team_id=p_team_id order by id loop
   select coalesce(jsonb_agg(to_jsonb(s) order by s.item_key),'[]') into setup from public.get_advisor_confirmed_founder_setup(rel.id) s
   where exists(select 1 from public.founder_team_setup_items i where i.team_id=p_team_id and i.item_key=s.item_key
    and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.founder_team_setup_confirmations c where c.revision_id=i.current_confirmed_revision_id and c.user_id=m.user_id)));
   if jsonb_array_length(setup)>0 then allowed_setup:=true; exit; end if;
  end loop;
 end if;
 return jsonb_build_object('status','ready','alignment_instrument_id','venture-alignment-v1','alignment_manifest_version','1.0.0','team_id',team.id,'team_name',team.name,'team_context',team.team_context,'people',people,'setup',setup,'setup_available',allowed_setup,
 'taxonomy',jsonb_build_object('areas',(select jsonb_agg(jsonb_build_object('area_id',area_id,'family_id',family_id,'sourcing',sourcing,'sort_order',sort_order) order by sort_order,area_id) from public.capability_areas),'families',(select jsonb_agg(to_jsonb(f) order by f.sort_order,f.family_id) from public.capability_families f)));
end $$;

-- 12. Historischer Team-Adapter: dieselbe Gegenseitigkeit (fassungsunabhaengig).
create or replace function public.get_workstyle_team_inputs(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member record; core_id uuid; venture_id uuid; core_instrument text; core_version text; manifest text;
 first_instrument text; first_manifest text; core_data jsonb; venture_data jsonb; people jsonb:='[]'; expected_count integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not public.can_read_workstyle_team(p_team_id) then return jsonb_build_object('status','not_ready'); end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 -- Phase 11.6: dieselbe Gegenseitigkeit wie get_workstyle_product_team, hier
 -- fassungsunabhaengig (v1-v3): Jede Person muss ihr neuestes abgeschlossenes
 -- Arbeitsprofil fuer jede andere ohne ausgeblendete Bloecke freigegeben haben.
 -- Fehlt ein Profil ganz, liefert die Schleife unten ohnehin not_ready.
 if exists(select 1 from public.founder_team_members x join public.founder_team_members y on y.team_id=x.team_id and y.user_id<>x.user_id
  cross join lateral (select l.id from public.assessments l where l.user_id=x.user_id
   and l.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3')
   and l.submitted_at is not null order by l.created_at desc,l.id limit 1) latest
  where x.team_id=p_team_id and (not public.alignment_share_is_effective(latest.id,y.user_id) or exists(
   select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id
   where s.assessment_id=latest.id and s.recipient_user_id=y.user_id and s.revoked_at is null))) then
  return jsonb_build_object('status','not_ready');
 end if;
 for member in select user_id from public.founder_team_members where team_id=p_team_id order by user_id loop
   -- Latest completed portable profile, never silently fall back to an older compatible version.
   select a.id,a.instrument_id,s.assessment_version,coalesce(s.manifest_version,case when s.assessment_version='8.5a-v1' then '1.0.0' end)
   into core_id,core_instrument,core_version,manifest
   from public.assessments a join public.workstyle_pretest_sessions s on s.assessment_id=a.id
   where a.user_id=member.user_id and a.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3')
   and a.submitted_at is not null order by a.created_at desc,a.id limit 1;
   select id into venture_id from public.assessments where user_id=member.user_id
     and instrument_id='venture-alignment-v1' and public.assessments.venture_id=p_team_id
     and submitted_at is not null order by created_at desc,id limit 1;
   if core_id is null or venture_id is null or core_instrument is distinct from public.workstyle_instrument_for(core_version)
     or manifest is distinct from (case core_version when '8.5a-v1' then '1.0.0' when '8.5a-v2' then '2.0.0' when '8.5a-v3' then '3.0.0' end) then
     return jsonb_build_object('status','not_ready'); end if;
   if first_instrument is not null and (core_instrument<>first_instrument or manifest<>first_manifest) then
     return jsonb_build_object('status','not_ready'); end if;
   first_instrument:=core_instrument; first_manifest:=manifest;
   expected_count:=case core_version when '8.5a-v3' then 29 when '8.5a-v2' then 30 else 20 end;
   if member.user_id<>auth.uid() and (not public.alignment_share_is_effective(core_id,auth.uid())
     or not public.alignment_share_is_effective(venture_id,auth.uid())) then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'item_version',a.item_version,'value',a.value,'missing_reason',a.missing_code) || case when core_version='8.5a-v3' then jsonb_build_object('response_format',i.definition->>'response_format','rendered_order',a.workstyle_rendered_order) else '{}'::jsonb end order by i.position),'[]') into core_data
   from public.alignment_answers a join public.workstyle_item_versions i on i.item_key=a.block_id and i.item_version=a.item_version
   and i.instrument_id=core_instrument and i.definition->>'usage'='core' and not (i.definition->>'research_only')::boolean
   and (core_version<>'8.5a-v3' or i.definition->>'scientific_status'='core')
   where a.assessment_id=core_id and (member.user_id=auth.uid() or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=core_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(core_data)<>expected_count then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'value',a.value,'missing_reason',a.missing_code)),'[]') into venture_data
   from public.alignment_answers a where a.assessment_id=venture_id and (member.user_id=auth.uid() or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=venture_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(venture_data)=0 then return jsonb_build_object('status','not_ready'); end if;
   people:=people||jsonb_build_array(jsonb_build_object('person_id',member.user_id,'workstyle_assessment_id',core_id,
     'instrument_id',core_instrument,'assessment_version',core_version,'manifest_version',manifest,'core',core_data,
     'venture_assessment_id',venture_id,'venture_instrument','venture-alignment-v1',
     'venture_alignment',venture_data,'access_status','explicit_share_or_owner'));
 end loop;
 return jsonb_build_object('status','ready','team_id',p_team_id,'team_context',
   (select team_context from public.founder_teams where id=p_team_id),'people',people);
end $$;

revoke all on function public.start_workstyle_product(boolean),public.start_workstyle_research(text,jsonb) from public,anon;
grant execute on function public.start_workstyle_product(boolean),public.start_workstyle_research(text,jsonb) to authenticated;
commit;
