-- ---------------------------------------------------------------------------
-- Arbeitsweise Fassung 5 (Entwurf vom 13.11.2026)
-- ---------------------------------------------------------------------------
--
-- WAS SICH AENDERT: Die 13 Wahrscheinlichkeitsfragen sind Zweierwahlen, AMB fragt nach Unruhe statt nach
-- Unbehagen, ORG hat zwei Facetten. Die Datenbank bleibt dieselbe Mechanik wie bei v4: 29 Fragen, kein
-- Forschungsteil, 29 Positionen, dieselben Antwortformen (ordinal 1-5, Zweierwahl mit optionId). Neu ist nur
-- die Fassung selbst; ihre Fragen stehen in der Folgemigration (item_seed).
--
-- AKTUELL ZAEHLT NUR NOCH v5 (`workstyle_current_core_assessment`): Teams, Freigaben, FIND und Advisor sehen
-- nur v5. Ein v4- oder v3-Profil bleibt fuer die Person selbst als fruehere Fassung lesbar; v4 laesst sich
-- nur noch fortsetzen, nicht neu beginnen. Ein Team vergleicht nur identische Fassungen - es gibt keinen
-- stillen Rueckfall und keine Uebernahme alter Antworten.
--
-- Keine bestehende Zeile wird veraendert.
-- ---------------------------------------------------------------------------
begin;

insert into public.instruments(id,label,status,introduced_at)
values ('founder-workstyle-pretest-8-5a-v5','Founder Workstyle v5 (29 Fragen, Zweierwahl-Fassung)','draft','2026-11-13');

alter table public.workstyle_item_versions drop constraint workstyle_item_form_by_version;
alter table public.workstyle_item_versions add constraint workstyle_item_form_by_version check (
 (assessment_version='8.5a-v1' and ((definition->>'usage'='core' and definition->>'form' is null)
   or (definition->>'usage'='research_only' and coalesce(definition->>'form','') in ('A','B','C'))))
 or (assessment_version in ('8.5a-v2','8.5a-v3') and definition->>'form' is null)
 or (assessment_version='8.5a-v4' and instrument_id='founder-workstyle-pretest-8-5a-v4' and definition->>'form' is null
   and definition->>'usage'='core' and definition->>'scientific_status'='core')
 or (assessment_version='8.5a-v5' and instrument_id='founder-workstyle-pretest-8-5a-v5' and definition->>'form' is null
   and definition->>'usage'='core' and definition->>'scientific_status'='core')
);

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
 or (assessment_version='8.5a-v5' and form is null and consent_version is null
   and manifest_version is not null and manifest_version='5.0.0' and resume_position is not null and resume_position between 0 and 28)
);
alter table public.workstyle_research_responses add constraint workstyle_research_none_for_v5
 check(instrument_id<>'founder-workstyle-pretest-8-5a-v5');

create or replace function public.workstyle_instrument_for(p_version text) returns text
language sql immutable set search_path='' as $$
 select case p_version when '8.5a-v1' then 'founder-workstyle-pretest-8-5a-v1'
 when '8.5a-v2' then 'founder-workstyle-pretest-8-5a-v2'
 when '8.5a-v3' then 'founder-workstyle-pretest-8-5a-v3'
 when '8.5a-v4' then 'founder-workstyle-pretest-8-5a-v4'
 when '8.5a-v5' then 'founder-workstyle-pretest-8-5a-v5' end
$$;

create or replace function public.guard_workstyle_assessment() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4','founder-workstyle-pretest-8-5a-v5')
    or (tg_op='UPDATE' and old.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4','founder-workstyle-pretest-8-5a-v5')) then
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
   and a.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2','founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4','founder-workstyle-pretest-8-5a-v5') and a.submitted_at is null) then
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
 if instrument in ('founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4','founder-workstyle-pretest-8-5a-v5')
    or old_instrument in ('founder-workstyle-pretest-8-5a-v3','founder-workstyle-pretest-8-5a-v4','founder-workstyle-pretest-8-5a-v5') then
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
 if s.assessment_version='8.5a-v5' then raise exception 'workstyle_v5_answer_rpc_required' using errcode='22023'; end if;
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
create function public.workstyle_v5_sync_completion(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public.alignment_answers r join public.workstyle_item_versions i
   on i.instrument_id='founder-workstyle-pretest-8-5a-v5' and i.item_key=r.block_id and i.item_version=r.item_version
   where r.assessment_id=p_assessment_id)
  =(select count(*) from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5') then
  update public.assessments set submitted_at=clock_timestamp()
  where id=p_assessment_id and instrument_id='founder-workstyle-pretest-8-5a-v5' and submitted_at is null;
 end if;
end $$;
revoke all on function public.workstyle_v5_sync_completion(uuid) from public,anon,authenticated;

revoke all on function public.workstyle_v5_sync_completion(uuid) from public,anon,authenticated;

create or replace function public.complete_workstyle_pretest(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; completed_time timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.assessment_version in ('8.5a-v3','8.5a-v4','8.5a-v5') then
   if s.assessment_version='8.5a-v3' then perform public.workstyle_v3_sync_completion(p_assessment_id);
   elsif s.assessment_version='8.5a-v4' then perform public.workstyle_v4_sync_completion(p_assessment_id);
   else perform public.workstyle_v5_sync_completion(p_assessment_id); end if;
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
 if not found or s.withdrawn_at is not null or s.completed_at is not null or s.assessment_version not in ('8.5a-v2','8.5a-v3','8.5a-v4','8.5a-v5') then
   raise exception 'workstyle_navigation_unavailable' using errcode='42501'; end if;
 if p_position is null or p_position not between 0 and (case s.assessment_version when '8.5a-v5' then 28 when '8.5a-v4' then 28 when '8.5a-v3' then 51 else 35 end) or exists (
   select 1 from public.workstyle_item_versions i where i.instrument_id=public.workstyle_instrument_for(s.assessment_version)
   and i.position<=p_position and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)
   and not exists(select 1 from public.workstyle_research_responses r where r.assessment_id=p_assessment_id and r.item_key=i.item_key)
 ) then raise exception 'invalid_workstyle_position' using errcode='22023'; end if;
 update public.workstyle_pretest_sessions set resume_position=p_position where assessment_id=p_assessment_id;
end $$;

-- 6. Start: setzt eine laufende v4-Teilnahme fort; p_new beginnt nur nach einem
-- abgeschlossenen v4-Arbeitsprofil neu. Ein v3-Profil wird nie uebernommen.
create function public.start_workstyle_v5(p_new boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; product_done timestamptz; new_id uuid;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if p_new is null then raise exception 'invalid_workstyle_start' using errcode='22023'; end if;
 -- Serialisiert doppelte Starts derselben Person.
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-8.5a-v5-'||auth.uid(),0));
 select s.* into current_session from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id
 where a.user_id=auth.uid() and s.assessment_version='8.5a-v5' order by s.started_at desc,s.assessment_id limit 1 for update of s;
 if found then
  select submitted_at into product_done from public.assessments where id=current_session.assessment_id;
  if product_done is null or not p_new then return public.get_my_workstyle_pretest_version('8.5a-v5'); end if;
 end if;
 insert into public.assessments(user_id,module,instrument_id)
 values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v5') returning id into new_id;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,consent_given_at,context,manifest_version,resume_position)
 values(new_id,'8.5a-v5',null,null,null,'{}','5.0.0',0);
 return public.get_my_workstyle_pretest_version('8.5a-v5');
end $$;

-- 7. Speichern: Rohwert, Kategorie oder "kann ich noch nicht einschaetzen"; feste
-- Reihenfolge (zurueckgehen ja, ueberspringen nein); abgeschlossene Profile sind
-- unveraenderlich, eine identische Wiederholung ist erlaubt.
create function public.save_workstyle_v5(
 p_assessment_id uuid,p_item_key text,p_item_version text,p_response_value integer,
 p_response_option text,p_missing_reason text,p_rendered_order jsonb
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; item jsonb; item_position integer; previous jsonb; product_done timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.assessment_version<>'8.5a-v5' then
   raise exception 'workstyle_session_unavailable' using errcode='42501'; end if;
 select i.definition,i.position into item,item_position from public.workstyle_item_versions i
 where i.instrument_id='founder-workstyle-pretest-8-5a-v5' and i.item_key=p_item_key and i.item_version=p_item_version;
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
   if exists(select 1 from public.workstyle_item_versions i where i.instrument_id='founder-workstyle-pretest-8-5a-v5'
     and i.position<item_position and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)) then
     raise exception 'workstyle_previous_answer_required' using errcode='23514'; end if;
   insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,missing_code,workstyle_rendered_order,answered_at)
   values(p_assessment_id,p_item_key,p_item_version,case when item->>'response_format'='comparative' then 'single_choice' else 'ordinal_choice' end,
     case when p_response_value is not null then jsonb_build_object('scale',p_response_value)
          when p_response_option is not null then jsonb_build_object('optionId',p_response_option) end,p_missing_reason,p_rendered_order,clock_timestamp())
   on conflict(assessment_id,block_id) do update set value=excluded.value,missing_code=excluded.missing_code,answered_at=excluded.answered_at;
   update public.workstyle_pretest_sessions set resume_position=least(item_position,28) where assessment_id=p_assessment_id;
   perform public.workstyle_v5_sync_completion(p_assessment_id);
 end if;
 return jsonb_build_object('assessment_id',p_assessment_id,
   'submitted_at',(select submitted_at from public.assessments where id=p_assessment_id),
   'answer',(select a from jsonb_array_elements(public.workstyle_answer_rows(p_assessment_id)) a where a->>'item_key'=p_item_key));
end $$;
revoke all on function public.start_workstyle_v5(boolean),public.save_workstyle_v5(uuid,text,text,integer,text,text,jsonb) from public,anon;
grant execute on function public.start_workstyle_v5(boolean),public.save_workstyle_v5(uuid,text,text,integer,text,text,jsonb) to authenticated;

-- v4 wird nur noch fortgesetzt.
create or replace function public.start_workstyle_v4(p_new boolean default false) returns jsonb
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
 -- Seit Fassung 5 wird v4 nur noch fortgesetzt, nicht neu begonnen.
 raise exception 'workstyle_version_closed' using errcode='55000';
end $$;

-- 7. Speichern: Rohwert, Kategorie oder "kann ich noch nicht einschaetzen"; feste
-- Reihenfolge (zurueckgehen ja, ueberspringen nein); abgeschlossene Profile sind
-- unveraenderlich, eine identische Wiederholung ist erlaubt.

create or replace function public.workstyle_current_core_assessment(p_owner uuid) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments;
begin
 if p_owner is null then return null; end if;
 select * into a from public.assessments where user_id=p_owner and instrument_id='founder-workstyle-pretest-8-5a-v5'
  and submitted_at is not null order by created_at desc,id limit 1;
 if a.id is null then return null; end if;
 if not exists(select 1 from public.workstyle_pretest_sessions where assessment_id=a.id and manifest_version='5.0.0') then return null; end if;
 return a.id;
end $$;

create or replace function public.get_workstyle_product_profile(p_person_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.assessments; rows jsonb; manifest text; via_team boolean:=false; items_version text;
begin
 if auth.uid() is null then return null; end if;
 select * into a from public.assessments where id=public.workstyle_current_core_assessment(p_person_id);
 -- Aeltere Fassung: das eigene v4- oder v3-Profil nur fuer die Person selbst, solange es kein v5 gibt.
 if a.id is null and p_person_id=auth.uid() then
  select * into a from public.assessments where user_id=p_person_id
  and instrument_id in ('founder-workstyle-pretest-8-5a-v4','founder-workstyle-pretest-8-5a-v3')
  and submitted_at is not null order by created_at desc,id limit 1;
 end if;
 if a.id is null then return null; end if;
 if p_person_id<>auth.uid() then
  via_team:=public.team_share_visible(p_person_id,auth.uid());
  if not via_team and not public.alignment_share_is_effective(a.id,auth.uid()) then return null; end if;
 end if;
 select manifest_version into manifest from public.workstyle_pretest_sessions where assessment_id=a.id;
 if manifest is distinct from (case a.instrument_id when 'founder-workstyle-pretest-8-5a-v5' then '5.0.0' when 'founder-workstyle-pretest-8-5a-v4' then '4.0.0' when 'founder-workstyle-pretest-8-5a-v3' then '3.0.0' end) then return null; end if;
 items_version:=case a.instrument_id when 'founder-workstyle-pretest-8-5a-v5' then 'v5.0' when 'founder-workstyle-pretest-8-5a-v4' then 'v4.0' else '8.4-v0.4' end;
 select coalesce(jsonb_agg(jsonb_build_object('item_key',r.block_id,'item_version',r.item_version,'value',r.value,'missing_reason',r.missing_code) order by i.position),'[]') into rows
 from public.alignment_answers r join public.workstyle_item_versions i on i.instrument_id=a.instrument_id and i.item_key=r.block_id and i.item_version=r.item_version
 where r.assessment_id=a.id and i.item_version=items_version and i.definition->>'scientific_status'='core'
 and i.definition->>'usage'='core' and i.definition->>'research_only'='false'
 and (p_person_id=auth.uid() or via_team or not exists(select 1 from public.alignment_shares s join public.alignment_share_hidden_blocks h on h.share_id=s.id where s.assessment_id=a.id and s.recipient_user_id=auth.uid() and h.block_id=r.block_id));
 if jsonb_array_length(rows)=0 then return null; end if;
 return jsonb_build_object('person_id',p_person_id,'assessment_id',a.id,'instrument_id',a.instrument_id,
  'assessment_version',case a.instrument_id when 'founder-workstyle-pretest-8-5a-v5' then '8.5a-v5' when 'founder-workstyle-pretest-8-5a-v4' then '8.5a-v4' else '8.5a-v3' end,
  'manifest_version',manifest,'item_version',items_version,'completed_at',a.submitted_at,'answers',rows);
end $$;

create or replace function public.share_workstyle_product(p_recipient uuid,p_hidden text[] default '{}',p_revoke boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare a uuid; s uuid;
begin
 if auth.uid() is null or p_recipient=auth.uid() or p_recipient is null then raise exception 'not_authorized' using errcode='42501'; end if;
 a:=public.workstyle_current_core_assessment(auth.uid());
 if a is null then raise exception 'not_ready' using errcode='23514'; end if;
 if p_revoke then update public.alignment_shares set revoked_at=now() where assessment_id=a and recipient_user_id=p_recipient; return; end if;
 if not exists(select 1 from public.get_workstyle_share_recipients() where user_id=p_recipient) then raise exception 'recipient_not_connected' using errcode='42501'; end if;
 if p_hidden is null or exists(select 1 from unnest(p_hidden) k where not exists(select 1 from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5' and item_key=k and definition->>'scientific_status'='core')) then raise exception 'invalid_item' using errcode='22023'; end if;
 insert into public.alignment_shares(assessment_id,recipient_user_id,revoked_at) values(a,p_recipient,null) on conflict(assessment_id,recipient_user_id) do update set revoked_at=null returning id into s;
 delete from public.alignment_share_hidden_blocks where share_id=s;
 insert into public.alignment_share_hidden_blocks(share_id,block_id) select s,k from (select distinct unnest(p_hidden) k) x;
end $$;

-- FIND-Signale: nur zwei aktuelle v5-Profile, nie v5 mit einer fruehen Fassung. Das Band einer Zweierwahl ist
-- die gewaehlte Seite (A oder B) derselben Frage; verglichen wird nur dieselbe Frage mit derselben Frage.
create or replace function public.discovery_workstyle_band(v jsonb, missing text, definition jsonb) returns text
language sql immutable set search_path='' as $$
 select case when missing is not null then null
 when definition->>'response_format'='comparative' and exists(
  select 1 from jsonb_array_elements(definition->'options') o where o->>'option_id'=v->>'optionId')
 then case when v->>'optionId' in ('strong_a','lean_a') then 'A' when v->>'optionId' in ('strong_b','lean_b') then 'B' end
 when definition->>'response_format' in ('likelihood','seriousness','influence','ambiguity_discomfort','ambiguity_unrest')
 and jsonb_typeof(v->'scale')='number' then case v->>'scale' when '1' then 'lower' when '2' then 'lower' when '3' then 'middle' when '4' then 'upper' when '5' then 'upper' end
 end
$$;

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
 if mine.instrument_id is distinct from 'founder-workstyle-pretest-8-5a-v5' or theirs.instrument_id is distinct from mine.instrument_id then return; end if;
 if (select count(*) from public.workstyle_pretest_sessions where assessment_id in(mine.id,theirs.id) and manifest_version='5.0.0' and assessment_version='8.5a-v5')<>2 then return; end if;
 if (select count(*) from public.alignment_answers r join public.workstyle_item_versions i
  on i.instrument_id=mine.instrument_id and i.item_key=r.block_id and i.item_version=r.item_version
  where r.assessment_id in(mine.id,theirs.id) and i.item_version='v5.0' and i.definition->>'usage'='core'
  and i.definition->>'scientific_status'='core' and i.definition->>'research_only'='false' and i.definition->>'area_status'='development_area')<>58 then return; end if;
 return query with pairs as (
  select i.definition->>'area_key' area,
   public.discovery_workstyle_band(a.value,a.missing_code,i.definition) a,
   public.discovery_workstyle_band(b.value,b.missing_code,i.definition) b
  from public.workstyle_item_versions i
  join public.alignment_answers a on a.assessment_id=mine.id and a.block_id=i.item_key and a.item_version=i.item_version
  join public.alignment_answers b on b.assessment_id=theirs.id and b.block_id=i.item_key and b.item_version=i.item_version
  where i.instrument_id=mine.instrument_id and i.item_version='v5.0' and i.definition->>'scientific_status'='core'
  and i.definition->>'usage'='core' and i.definition->>'research_only'='false' and i.definition->>'area_status'='development_area'
  and i.definition->>'response_format' in ('likelihood','influence','ambiguity_discomfort','ambiguity_unrest','comparative')
 ) select area,case when count(*) filter(where a is not null and b is not null)<greatest(2,ceil(count(*)/2.0)) then 'INSUFFICIENT_DATA'
 when bool_and(a=b) filter(where a is not null and b is not null) then 'SIMILAR_PATTERN' else 'DISCUSSION_POINT' end
 from pairs group by area order by area;
end $$;

-- 11. Teamstatus: "unavailable", solange ein Mitglied kein aktuelles v4-Profil hat.

commit;
