-- Workstyle v4 - die 29 Produktfragen in der Endfassung (03.11.2026), ohne Forschungsteil.
--
-- Vorher (8.5a-v3): 29 Core-Fragen plus 23 Forschungsfragen in einem Instrument,
-- Manifest 3.0.0, Item-Version 8.4-v0.4. Das aktuelle Arbeitsprofil war das neueste
-- abgeschlossene Workstyle-Assessment, sofern es v3 war.
--
-- Jetzt:
-- - Neues Instrument founder-workstyle-pretest-8-5a-v4 (8.5a-v4, Manifest 4.0.0,
--   Item-Version v4.0). Eine zweite Fassung derselben Frage im v3-Instrument geht nicht
--   (unique(instrument_id,item_key), Items unveraenderlich), daher eine eigene Kennung.
-- - Kein Forschungsteil: keine Forschungsfragen, keine Einwilligung, kein Kontext, keine
--   Bearbeitungszeiten, kein Feedback, keine Forschungsantworten (Constraints).
-- - AKTUELLES ARBEITSPROFIL = neuestes abgeschlossenes v4-Assessment. Nur daran haengen
--   Teamfreigabe, Bereitschaft, Teambericht, Teilen, FIND-Signale und Advisor-Sicht.
--   Ein v3-Profil ist kein aktuelles Arbeitsprofil mehr und wird nie mit v4 verglichen.
-- - Den eigenen v3-Bericht sieht nur die Person selbst, und nur solange sie noch kein
--   v4-Profil hat (aeltere Fassung). Niemand sonst.
-- - start_workstyle_v4 / save_workstyle_v4: Start und Speichern; Abschluss automatisch,
--   sobald alle 29 Antworten vorliegen.
--
-- v1-v3 bleiben unveraendert: keine Definition, keine Sitzung, keine Antwort wird
-- geaendert, verschoben oder geloescht. Keine Scores, keine Typologie, keine
-- automatische Freigabe, keine Rechteerweiterung.
begin;

insert into public.instruments(id,label,status,introduced_at)
values ('founder-workstyle-pretest-8-5a-v4','Founder Workstyle v4 (29 Fragen, Endfassung)','draft','2026-11-03');

-- 1. Items: v4 kennt nur Core-Fragen.
alter table public.workstyle_item_versions drop constraint workstyle_item_form_by_version;
alter table public.workstyle_item_versions add constraint workstyle_item_form_by_version check (
 (assessment_version='8.5a-v1' and ((definition->>'usage'='core' and definition->>'form' is null)
   or (definition->>'usage'='research_only' and coalesce(definition->>'form','') in ('A','B','C'))))
 or (assessment_version in ('8.5a-v2','8.5a-v3') and definition->>'form' is null)
 or (assessment_version='8.5a-v4' and instrument_id='founder-workstyle-pretest-8-5a-v4' and definition->>'form' is null
   and definition->>'usage'='core' and definition->>'scientific_status'='core')
);

-- 2. Sitzungsvertrag: v4 ohne Forschungseinwilligung, 29 Positionen. Kontext, Zeiten,
-- Feedback, Forschungsabschluss und Widerruf bleiben ueber workstyle_session_research_consent leer.
alter table public.workstyle_pretest_sessions drop constraint workstyle_session_version_contract;
alter table public.workstyle_pretest_sessions add constraint workstyle_session_version_contract check (
 (assessment_version='8.5a-v1' and form is not null and form in ('A','B','C')
   and consent_version='workstyle_research_v1' and manifest_version is null and resume_position is null)
 or (assessment_version='8.5a-v2' and form is null and consent_version='workstyle_research_v2'
   and manifest_version is not null and manifest_version='2.0.0' and resume_position is not null and resume_position between 0 and 35)
 or (assessment_version='8.5a-v3' and form is null and (consent_version is null or consent_version='workstyle_research_v3')
   and manifest_version is not null and manifest_version='3.0.0' and resume_position is not null and resume_position between 0 and 51)
 or (assessment_version='8.5a-v4' and form is null and consent_version is null
   and manifest_version is not null and manifest_version='4.0.0' and resume_position is not null and resume_position between 0 and 28)
);
alter table public.workstyle_research_responses add constraint workstyle_research_none_for_v4
 check(instrument_id<>'founder-workstyle-pretest-8-5a-v4');

create or replace function public.workstyle_instrument_for(p_version text) returns text
language sql immutable set search_path='' as $$
 select case p_version when '8.5a-v1' then 'founder-workstyle-pretest-8-5a-v1'
 when '8.5a-v2' then 'founder-workstyle-pretest-8-5a-v2'
 when '8.5a-v3' then 'founder-workstyle-pretest-8-5a-v3'
 when '8.5a-v4' then 'founder-workstyle-pretest-8-5a-v4' end
$$;

-- 3. Schreibgrenzen: v4 wie v3 nur ueber RPCs, Antworten nur fuer Core-Items.
create or replace function public.guard_workstyle_assessment() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4')
    or (tg_op='UPDATE' and old.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4')) then
   if current_user not in ('postgres','service_role') then raise exception 'workstyle_rpc_required' using errcode='42501'; end if;
   if new.module<>'founder_profile' or new.venture_id is not null then raise exception 'workstyle_person_scope_required' using errcode='23514'; end if;
   if tg_op='UPDATE' and (new.instrument_id<>old.instrument_id or new.user_id<>old.user_id or new.id<>old.id
      or (old.submitted_at is not null and new.submitted_at is distinct from old.submitted_at)) then
     raise exception 'workstyle_assessment_identity_immutable' using errcode='23514';
   end if;
 end if;
 return new;
end $$;

create or replace function public.guard_workstyle_share() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assessments a where a.id=new.assessment_id
   and a.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4') and a.submitted_at is null) then
   raise exception 'workstyle_complete_before_sharing' using errcode='23514';
 end if;
 return new;
end $$;

create or replace function public.guard_workstyle_core_answer() returns trigger
language plpgsql set search_path='' as $$
declare instrument text; old_instrument text; item jsonb;
begin
 select a.instrument_id into instrument from public.assessments a where a.id=new.assessment_id;
 if tg_op='UPDATE' then
   select a.instrument_id into old_instrument from public.assessments a where a.id=old.assessment_id;
 end if;
 if instrument in ('founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4')
    or old_instrument in ('founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4') then
   if current_user not in ('postgres','service_role') then raise exception 'workstyle_rpc_required' using errcode='42501'; end if;
   if tg_op='UPDATE' and (new.assessment_id<>old.assessment_id or new.item_version is distinct from old.item_version
     or new.workstyle_rendered_order is distinct from old.workstyle_rendered_order) then
     raise exception 'workstyle_answer_identity_immutable' using errcode='23514'; end if;
   select i.definition into item from public.workstyle_item_versions i
     where i.instrument_id=instrument and i.item_key=new.block_id and i.item_version=new.item_version;
   if item is null or item->>'usage'<>'core' or item->>'scientific_status'<>'core'
     or new.missing_code is not null and new.missing_code<>'cannot_assess'
     or new.workstyle_rendered_order is distinct from nullif(item->'rendered_order','null'::jsonb) then
     raise exception 'invalid_workstyle_core_answer' using errcode='23514'; end if;
   if item->>'response_format' in ('comparative','behavioral') then
     if new.answer_format<>'single_choice' or (new.value is not null and (
       new.value<>jsonb_build_object('optionId',new.value->'optionId') or jsonb_typeof(new.value->'optionId') is distinct from 'string'
       or not exists(select 1 from jsonb_array_elements(item->'options') o where o->>'option_id'=new.value->>'optionId'))) then
       raise exception 'invalid_workstyle_choice' using errcode='23514'; end if;
   elsif new.answer_format<>'ordinal_choice' or (new.value is not null and (
     jsonb_typeof(new.value->'scale') is distinct from 'number' or new.value<>jsonb_build_object('scale',new.value->'scale')
     or (new.value->>'scale')::numeric not in (1,2,3,4,5))) then
     raise exception 'invalid_workstyle_ordinal' using errcode='23514';
   end if;
 elsif instrument in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2') or old_instrument in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2') then
   if current_user not in ('postgres','service_role') then raise exception 'workstyle_rpc_required' using errcode='42501'; end if;
   if tg_op='UPDATE' and (new.assessment_id<>old.assessment_id or new.item_version is distinct from old.item_version) then
     raise exception 'workstyle_answer_identity_immutable' using errcode='23514';
   end if;
   select i.definition into item from public.workstyle_item_versions i
     where i.instrument_id=instrument and i.item_key=new.block_id and i.item_version=new.item_version;
   if new.workstyle_rendered_order is not null or item is null or item->>'usage'<>'core' or new.answer_format<>'ordinal_choice'
     or (new.missing_code is not null and not (item->'missing_reasons' ? new.missing_code))
     or (new.value is not null and (jsonb_typeof(new.value->'scale') is distinct from 'number'
       or new.value<>jsonb_build_object('scale',new.value->'scale')
       or (new.value->>'scale')::numeric not in (1,2,3,4,5))) then
     raise exception 'invalid_workstyle_core_answer' using errcode='23514';
   end if;
 elsif new.workstyle_rendered_order is not null or new.item_version is not null or new.block_id like '%-%' then
   raise exception 'workstyle_item_requires_workstyle_instrument' using errcode='23514';
 end if;
 return new;
end $$;

-- 4. Alte Schreibwege lehnen v4 ausdruecklich ab (nicht erst ueber einen Constraint).
create or replace function public.save_workstyle_pretest_answer(p_assessment_id uuid,p_item_key text,p_item_version text,p_response_value integer,p_missing_reason text,p_response_time_ms integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; item jsonb; item_position integer;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.assessment_version='8.5a-v3' then raise exception 'workstyle_v3_answer_rpc_required' using errcode='22023'; end if;
 if s.assessment_version='8.5a-v4' then raise exception 'workstyle_v4_answer_rpc_required' using errcode='22023'; end if;
 if s.completed_at is not null then raise exception 'workstyle_already_completed' using errcode='23514'; end if;
 select i.definition,i.position into item,item_position from public.workstyle_item_versions i
 where i.instrument_id=public.workstyle_instrument_for(s.assessment_version) and i.item_key=p_item_key and i.item_version=p_item_version;
 if item is null or (item->>'usage'='research_only' and item->>'form' is distinct from s.form)
   or num_nonnulls(p_response_value,p_missing_reason)<>1
   or (p_response_value is not null and p_response_value not between 1 and 5)
   or (p_missing_reason is not null and not (item->'missing_reasons' ? p_missing_reason))
   or (p_response_time_ms is not null and p_response_time_ms not between 0 and 86400000) then
   raise exception 'invalid_workstyle_answer' using errcode='22023';
 end if;
 -- A fixed server order; revisiting saved items is allowed, skipping unanswered items is not.
 if s.assessment_version='8.5a-v2' and exists (
   select 1 from public.workstyle_item_versions i where i.instrument_id=public.workstyle_instrument_for(s.assessment_version)
   and i.position<item_position and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)
   and not exists(select 1 from public.workstyle_research_responses r where r.assessment_id=p_assessment_id and r.item_key=i.item_key)
 ) then raise exception 'workstyle_previous_answer_required' using errcode='23514'; end if;
 if item->>'usage'='core' then
   insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,missing_code)
   values(p_assessment_id,p_item_key,p_item_version,'ordinal_choice',case when p_response_value is null then null else jsonb_build_object('scale',p_response_value) end,p_missing_reason)
   on conflict(assessment_id,block_id) do update set value=excluded.value,missing_code=excluded.missing_code,answered_at=now();
 else
   if s.assessment_version='8.5a-v1' and (select count(*) from public.alignment_answers where assessment_id=p_assessment_id)<>20 then
     raise exception 'workstyle_core_required' using errcode='23514';
   end if;
   insert into public.workstyle_research_responses(assessment_id,instrument_id,item_key,item_version,response_value,missing_reason)
   values(p_assessment_id,public.workstyle_instrument_for(s.assessment_version),p_item_key,p_item_version,p_response_value,p_missing_reason)
   on conflict(assessment_id,item_key) do update set response_value=excluded.response_value,missing_reason=excluded.missing_reason,answered_at=now();
 end if;
 update public.workstyle_pretest_sessions set resume_position=case when s.assessment_version='8.5a-v2' then least(item_position,35) else null end, timings=case when p_response_time_ms is null then timings
   else timings||jsonb_build_object(p_item_key,p_response_time_ms) end where assessment_id=p_assessment_id;
end $$;

-- 5. Abschluss: v4 ist fertig, sobald alle 29 Antworten vorliegen. Intern.
create function public.workstyle_v4_sync_completion(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.alignment_answers r join public.workstyle_item_versions i
   on i.instrument_id='founder-workstyle-pretest-8-5a-v4' and i.item_key=r.block_id and i.item_version=r.item_version
   where r.assessment_id=p_assessment_id)
  =(select count(*) from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v4') then
  update public.assessments set submitted_at=clock_timestamp()
  where id=p_assessment_id and instrument_id='founder-workstyle-pretest-8-5a-v4' and submitted_at is null;
 end if;
end $$;
revoke all on function public.workstyle_v4_sync_completion(uuid) from public,anon,authenticated;

create or replace function public.complete_workstyle_pretest(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; completed_time timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.assessment_version in ('8.5a-v3','8.5a-v4') then
   if s.assessment_version='8.5a-v3' then perform public.workstyle_v3_sync_completion(p_assessment_id);
   else perform public.workstyle_v4_sync_completion(p_assessment_id); end if;
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

create or replace function public.set_workstyle_pretest_position(p_assessment_id uuid,p_position integer) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.completed_at is not null or s.assessment_version not in ('8.5a-v2','8.5a-v3','8.5a-v4') then
   raise exception 'workstyle_navigation_unavailable' using errcode='42501'; end if;
 if p_position is null or p_position not between 0 and (case s.assessment_version when '8.5a-v4' then 28 when '8.5a-v3' then 51 else 35 end) or exists (
   select 1 from public.workstyle_item_versions i where i.instrument_id=public.workstyle_instrument_for(s.assessment_version)
   and i.position<=p_position and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)
   and not exists(select 1 from public.workstyle_research_responses r where r.assessment_id=p_assessment_id and r.item_key=i.item_key)
 ) then raise exception 'invalid_workstyle_position' using errcode='22023'; end if;
 update public.workstyle_pretest_sessions set resume_position=p_position where assessment_id=p_assessment_id;
end $$;

-- 6. Start: setzt eine laufende v4-Teilnahme fort; p_new beginnt nur nach einem
-- abgeschlossenen v4-Arbeitsprofil neu. Ein v3-Profil wird nie uebernommen.
create function public.start_workstyle_v4(p_new boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; product_done timestamptz; new_id uuid;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if p_new is null then raise exception 'invalid_workstyle_start' using errcode='22023'; end if;
 -- Serialisiert doppelte Starts derselben Person.
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-8.5a-v4-'||auth.uid(),0));
 select s.* into current_session from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id
 where a.user_id=auth.uid() and s.assessment_version='8.5a-v4' order by s.started_at desc,s.assessment_id limit 1 for update of s;
 if found then
  select submitted_at into product_done from public.assessments where id=current_session.assessment_id;
  if product_done is null or not p_new then return public.get_my_workstyle_pretest_version('8.5a-v4'); end if;
 end if;
 insert into public.assessments(user_id,module,instrument_id)
 values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v4') returning id into new_id;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,consent_given_at,context,manifest_version,resume_position)
 values(new_id,'8.5a-v4',null,null,null,'{}','4.0.0',0);
 return public.get_my_workstyle_pretest_version('8.5a-v4');
end $$;

-- 7. Speichern: Rohwert, Kategorie oder "kann ich noch nicht einschaetzen"; feste
-- Reihenfolge (zurueckgehen ja, ueberspringen nein); abgeschlossene Profile sind
-- unveraenderlich, eine identische Wiederholung ist erlaubt.
create function public.save_workstyle_v4(
 p_assessment_id uuid,p_item_key text,p_item_version text,p_response_value integer,
 p_response_option text,p_missing_reason text,p_rendered_order jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; item jsonb; item_position integer; previous jsonb; product_done timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.assessment_version<>'8.5a-v4' then
   raise exception 'workstyle_session_unavailable' using errcode='42501'; end if;
 select i.definition,i.position into item,item_position from public.workstyle_item_versions i
 where i.instrument_id='founder-workstyle-pretest-8-5a-v4' and i.item_key=p_item_key and i.item_version=p_item_version;
 if item is null or num_nonnulls(p_response_value,p_response_option,p_missing_reason)<>1
   or (p_missing_reason is not null and p_missing_reason<>'cannot_assess')
   or p_rendered_order is distinct from nullif(item->'rendered_order','null'::jsonb) then
   raise exception 'invalid_workstyle_answer' using errcode='22023'; end if;
 if item->>'response_format'='comparative' then
   if p_response_value is not null or (p_response_option is not null and not exists(
     select 1 from jsonb_array_elements(item->'options') o where o->>'option_id'=p_response_option)) then
     raise exception 'invalid_workstyle_choice' using errcode='22023'; end if;
 elsif p_response_option is not null or (p_response_value is not null and p_response_value not between 1 and 5) then
   raise exception 'invalid_workstyle_ordinal' using errcode='22023';
 end if;
 select submitted_at into product_done from public.assessments where id=p_assessment_id;
 if product_done is not null then
   select a into previous from jsonb_array_elements(public.workstyle_answer_rows(p_assessment_id)) a where a->>'item_key'=p_item_key;
   if previous is null or previous->>'item_version' is distinct from p_item_version
     or (previous->>'response_value')::integer is distinct from p_response_value
     or previous->>'response_option' is distinct from p_response_option
     or previous->>'missing_reason' is distinct from p_missing_reason
     or nullif(previous->'rendered_order','null'::jsonb) is distinct from p_rendered_order then
     raise exception 'workstyle_completed_answer_immutable' using errcode='23514'; end if;
 else
   if exists(select 1 from public.workstyle_item_versions i where i.instrument_id='founder-workstyle-pretest-8-5a-v4'
     and i.position<item_position and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)) then
     raise exception 'workstyle_previous_answer_required' using errcode='23514'; end if;
   insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,missing_code,workstyle_rendered_order,answered_at)
   values(p_assessment_id,p_item_key,p_item_version,case when item->>'response_format'='comparative' then 'single_choice' else 'ordinal_choice' end,
     case when p_response_value is not null then jsonb_build_object('scale',p_response_value)
          when p_response_option is not null then jsonb_build_object('optionId',p_response_option) end,p_missing_reason,p_rendered_order,clock_timestamp())
   on conflict(assessment_id,block_id) do update set value=excluded.value,missing_code=excluded.missing_code,answered_at=excluded.answered_at;
   update public.workstyle_pretest_sessions set resume_position=least(item_position,28) where assessment_id=p_assessment_id;
   perform public.workstyle_v4_sync_completion(p_assessment_id);
 end if;
 return jsonb_build_object('assessment_id',p_assessment_id,
   'submitted_at',(select submitted_at from public.assessments where id=p_assessment_id),
   'answer',(select a from jsonb_array_elements(public.workstyle_answer_rows(p_assessment_id)) a where a->>'item_key'=p_item_key));
end $$;
revoke all on function public.start_workstyle_v4(boolean),public.save_workstyle_v4(uuid,text,text,integer,text,text,jsonb) from public,anon;
grant execute on function public.start_workstyle_v4(boolean),public.save_workstyle_v4(uuid,text,text,integer,text,text,jsonb) to authenticated;

-- 8. Aktuelles Arbeitsprofil: neuestes abgeschlossenes v4-Assessment oder null.
-- Teamfreigabe, Bereitschaft (get_workstyle_team_share_readiness,
-- team_member_shares_with_team, workstyle_core_visible_to) und Teambericht folgen
-- dieser einen Regel.
create or replace function public.workstyle_current_core_assessment(p_owner uuid) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments;
begin
 if p_owner is null then return null; end if;
 select * into a from public.assessments where user_id=p_owner and instrument_id='founder-workstyle-pretest-8-5a-v4'
  and submitted_at is not null order by created_at desc,id limit 1;
 if a.id is null then return null; end if;
 if not exists(select 1 from public.workstyle_pretest_sessions where assessment_id=a.id and manifest_version='4.0.0') then return null; end if;
 return a.id;
end $$;

create or replace function public.get_workstyle_product_profile(p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments; rows jsonb; manifest text; via_team boolean:=false; items_version text;
begin
 if auth.uid() is null then return null; end if;
 select * into a from public.assessments where id=public.workstyle_current_core_assessment(p_person_id);
 -- Aeltere Fassung: das eigene v3-Profil nur fuer die Person selbst, solange es kein v4 gibt.
 if a.id is null and p_person_id=auth.uid() then
  select * into a from public.assessments where user_id=p_person_id and instrument_id='founder-workstyle-pretest-8-5a-v3'
  and submitted_at is not null order by created_at desc,id limit 1;
 end if;
 if a.id is null then return null; end if;
 if p_person_id<>auth.uid() then
  -- Phase 11.7B: Teamfreigabe (immer vollstaendig) oder gerichtete Freigabe.
  via_team:=public.team_share_visible(p_person_id,auth.uid());
  if not via_team and not public.alignment_share_is_effective(a.id,auth.uid()) then return null; end if;
 end if;
 select manifest_version into manifest from public.workstyle_pretest_sessions where assessment_id=a.id;
 if manifest is distinct from (case a.instrument_id when 'founder-workstyle-pretest-8-5a-v4' then '4.0.0' when 'founder-workstyle-pretest-8-5a-v3' then '3.0.0' end) then return null; end if;
 items_version:=case a.instrument_id when 'founder-workstyle-pretest-8-5a-v4' then 'v4.0' else '8.4-v0.4' end;
 select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'item_version',r.item_version,'value',r.value,'missing_reason',r.missing_code) order by i.position),'[]') into rows
 from public.alignment_answers r join public.workstyle_item_versions i on i.instrument_id=a.instrument_id and i.item_key=r.block_id and i.item_version=r.item_version
 where r.assessment_id=a.id and i.item_version=items_version and i.definition->>'scientific_status'='core'
 and i.definition->>'usage'='core' and i.definition->>'research_only'='false'
 and (p_person_id=auth.uid() or via_team or not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id));
 if jsonb_array_length(rows)=0 then return null; end if;
 return jsonb_build_object('person_id',p_person_id,'assessment_id',a.id,'instrument_id',a.instrument_id,
  'assessment_version',case a.instrument_id when 'founder-workstyle-pretest-8-5a-v4' then '8.5a-v4' else '8.5a-v3' end,
  'manifest_version',manifest,'item_version',items_version,'completed_at',a.submitted_at,'answers',rows);
end $$;

-- 9. Teilen: nur das aktuelle v4-Profil.
create or replace function public.share_workstyle_product(p_recipient uuid,p_hidden text[] default '{}',p_revoke boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare a uuid; s uuid;
begin
 if auth.uid() is null or p_recipient=auth.uid() or p_recipient is null then raise exception 'not_authorized' using errcode='42501'; end if;
 a:=public.workstyle_current_core_assessment(auth.uid());
 if a is null then raise exception 'not_ready' using errcode='23514'; end if;
 if p_revoke then update public.alignment_shares set revoked_at=now() where assessment_id=a and recipient_user_id=p_recipient; return; end if;
 if not exists(select 1 from public.get_workstyle_share_recipients() where user_id=p_recipient) then raise exception 'recipient_not_connected' using errcode='42501'; end if;
 if p_hidden is null or exists(select 1 from unnest(p_hidden) k where not exists(select 1 from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v4' and item_key=k and definition->>'scientific_status'='core')) then raise exception 'invalid_item' using errcode='22023'; end if;
 insert into public.alignment_shares(assessment_id,recipient_user_id,revoked_at) values(a,p_recipient,null) on conflict(assessment_id,recipient_user_id) do update set revoked_at=null returning id into s;
 delete from public.alignment_share_hidden_blocks where share_id=s;
 insert into public.alignment_share_hidden_blocks(share_id,block_id) select s,k from (select distinct unnest(p_hidden) k) x;
end $$;

-- 10. FIND-Signale: nur zwei aktuelle v4-Profile, nie v3 mit v4.
create or replace function public.get_discovery_workstyle_signals(p_candidate_user_id uuid)
returns table(area_key text,pattern text)
language plpgsql stable security definer set search_path='' as $$
declare mine public.assessments; theirs public.assessments;
begin
 if auth.uid() is null or auth.uid()=p_candidate_user_id or not public.is_current_user_discovery_founder() then return; end if;
 if not exists(select 1 from public.founder_discovery_profiles where user_id=p_candidate_user_id and status='active') then return; end if;
 -- Each participant has explicitly enabled this purpose. A missing grant is not disclosed.
 if (select count(*) from public.founder_search_preferences where user_id in(auth.uid(),p_candidate_user_id)
   and workstyle_discovery_enabled and workstyle_discovery_consent_version='workstyle_discovery_v1' and workstyle_discovery_consented_at is not null)<>2 then return; end if;
 select * into mine from public.assessments where id=public.workstyle_current_core_assessment(auth.uid());
 select * into theirs from public.assessments where id=public.workstyle_current_core_assessment(p_candidate_user_id);
 if mine.instrument_id is distinct from 'founder-workstyle-pretest-8-5a-v4' or theirs.instrument_id is distinct from mine.instrument_id then return; end if;
 if (select count(*) from public.workstyle_pretest_sessions where assessment_id in(mine.id,theirs.id) and manifest_version='4.0.0' and assessment_version='8.5a-v4')<>2 then return; end if;
 if (select count(*) from public.alignment_answers r join public.workstyle_item_versions i
  on i.instrument_id=mine.instrument_id and i.item_key=r.block_id and i.item_version=r.item_version
  where r.assessment_id in(mine.id,theirs.id) and i.item_version='v4.0' and i.definition->>'usage'='core'
  and i.definition->>'scientific_status'='core' and i.definition->>'research_only'='false' and i.definition->>'area_status'='development_area')<>58 then return; end if;
 return query with pairs as (
  select i.definition->>'area_key' area,
   public.discovery_workstyle_band(a.value,a.missing_code,i.definition) a,
   public.discovery_workstyle_band(b.value,b.missing_code,i.definition) b
  from public.workstyle_item_versions i
  join public.alignment_answers a on a.assessment_id=mine.id and a.block_id=i.item_key and a.item_version=i.item_version
  join public.alignment_answers b on b.assessment_id=theirs.id and b.block_id=i.item_key and b.item_version=i.item_version
  where i.instrument_id=mine.instrument_id and i.item_version='v4.0' and i.definition->>'scientific_status'='core'
  and i.definition->>'usage'='core' and i.definition->>'research_only'='false' and i.definition->>'area_status'='development_area'
  and i.definition->>'response_format' in ('likelihood','influence','ambiguity_discomfort','comparative')
 ) select area,case when count(*) filter(where a is not null and b is not null)<greatest(2,ceil(count(*)/2.0)) then 'INSUFFICIENT_DATA'
 when bool_and(a=b) filter(where a is not null and b is not null) then 'SIMILAR_PATTERN' else 'DISCUSSION_POINT' end
 from pairs group by area order by area;
end $$;

-- 11. Teamstatus: "unavailable", solange ein Mitglied kein aktuelles v4-Profil hat.
create or replace function public.get_workstyle_product_team_status(p_team_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare m record; result jsonb;
begin
 if not public.can_read_workstyle_team(p_team_id) then return null; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id) not between 2 and 4 then return 'unavailable'; end if;
 for m in select user_id from public.founder_team_members where team_id=p_team_id loop
  if public.workstyle_current_core_assessment(m.user_id) is null then return 'unavailable'; end if;
 end loop;
 result:=public.get_workstyle_product_team(p_team_id);
 if result->>'status'='not_ready' then return 'share_missing'; end if;
 return 'available';
end $$;

-- 12. Historischer Team-Adapter (v1-v4): neueste abgeschlossene Fassung, keine
-- Rueckfalllogik, nur identische Fassungen. Die Teamfreigabe gilt nur fuer das
-- aktuelle Arbeitsprofil (jetzt v4); aeltere Fassungen brauchen gerichtete Freigaben.
create or replace function public.get_workstyle_team_inputs(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member record; core_id uuid; venture_id uuid; core_instrument text; core_version text; manifest text;
 first_instrument text; first_manifest text; core_data jsonb; venture_data jsonb; people jsonb:='[]'; expected_count integer;
 viewer_member boolean; core_via_team boolean; venture_via_team boolean;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not public.can_read_workstyle_team(p_team_id) then return jsonb_build_object('status','not_ready'); end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<2 then return jsonb_build_object('status','not_ready'); end if;
 viewer_member:=public.is_current_user_founder_team_member(p_team_id);
 if exists(select 1 from public.founder_team_members x join public.founder_team_members y on y.team_id=x.team_id and y.user_id<>x.user_id
  cross join lateral (select l.id,l.instrument_id from public.assessments l where l.user_id=x.user_id
   and l.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4')
   and l.submitted_at is not null order by l.created_at desc,l.id limit 1) latest
  where x.team_id=p_team_id and not (case
   -- Phase 11.7B.1: eine Teamentscheidung (aktiv oder widerrufen) ist autoritativ.
   when exists(select 1 from public.team_shares d where d.team_id=p_team_id and d.owner_user_id=x.user_id and d.scope='workstyle_capability')
    then latest.instrument_id='founder-workstyle-pretest-8-5a-v4' and public.team_share_active(p_team_id,x.user_id)
   else public.alignment_share_is_complete(latest.id,y.user_id) end)) then
  return jsonb_build_object('status','not_ready');
 end if;
 for member in select user_id from public.founder_team_members where team_id=p_team_id order by user_id loop
   select a.id,a.instrument_id,s.assessment_version,coalesce(s.manifest_version,case when s.assessment_version='8.5a-v1' then '1.0.0' end)
   into core_id,core_instrument,core_version,manifest
   from public.assessments a join public.workstyle_pretest_sessions s on s.assessment_id=a.id
   where a.user_id=member.user_id and a.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4')
   and a.submitted_at is not null order by a.created_at desc,a.id limit 1;
   select id into venture_id from public.assessments where user_id=member.user_id
     and instrument_id='venture-alignment-v1' and public.assessments.venture_id=p_team_id
     and submitted_at is not null order by created_at desc,id limit 1;
   if core_id is null or venture_id is null or core_instrument is distinct from public.workstyle_instrument_for(core_version)
     or manifest is distinct from (case core_version when '8.5a-v1' then '1.0.0' when '8.5a-v2' then '2.0.0' when '8.5a-v3' then '3.0.0' when '8.5a-v4' then '4.0.0' end) then
     return jsonb_build_object('status','not_ready'); end if;
   if first_instrument is not null and (core_instrument<>first_instrument or manifest<>first_manifest) then
     return jsonb_build_object('status','not_ready'); end if;
   first_instrument:=core_instrument; first_manifest:=manifest;
   expected_count:=case when core_version in ('8.5a-v3','8.5a-v4') then 29 when core_version='8.5a-v2' then 30 else 20 end;
   core_via_team:=viewer_member and core_version='8.5a-v4' and public.team_share_active(p_team_id,member.user_id);
   venture_via_team:=public.venture_visible_in_team(venture_id,auth.uid());
   if member.user_id<>auth.uid() and (not (core_via_team or public.alignment_share_is_effective(core_id,auth.uid()))
     or not (venture_via_team or public.alignment_share_is_effective(venture_id,auth.uid()))) then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'item_version',a.item_version,'value',a.value,'missing_reason',a.missing_code) || case when core_version in ('8.5a-v3','8.5a-v4') then jsonb_build_object('response_format',i.definition->>'response_format','rendered_order',a.workstyle_rendered_order) else '{}'::jsonb end order by i.position),'[]') into core_data
   from public.alignment_answers a join public.workstyle_item_versions i on i.item_key=a.block_id and i.item_version=a.item_version
   and i.instrument_id=core_instrument and i.definition->>'usage'='core' and not (i.definition->>'research_only')::boolean
   and (core_version not in ('8.5a-v3','8.5a-v4') or i.definition->>'scientific_status'='core')
   where a.assessment_id=core_id and (member.user_id=auth.uid() or core_via_team or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=core_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(core_data)<>expected_count then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'value',a.value,'missing_reason',a.missing_code)),'[]') into venture_data
   from public.alignment_answers a where a.assessment_id=venture_id and (member.user_id=auth.uid() or venture_via_team or not exists(
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

commit;
