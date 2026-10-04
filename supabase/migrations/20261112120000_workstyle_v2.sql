begin;

-- Additive v2: no UPDATE of existing items, sessions or answers.
insert into public.instruments(id,label,status,introduced_at)
values ('founder-workstyle-pretest-8-5a-v2','Founder Workstyle Pretest 8.5a-v2','draft','2026-10-04');

alter table public.workstyle_item_versions drop constraint workstyle_item_versions_definition_check4;
alter table public.workstyle_item_versions add constraint workstyle_item_form_by_version check (
 (assessment_version='8.5a-v1' and ((definition->>'usage'='core' and definition->>'form' is null)
   or (definition->>'usage'='research_only' and coalesce(definition->>'form','') in ('A','B','C'))))
 or (assessment_version='8.5a-v2' and definition->>'form' is null)
);
alter table public.workstyle_pretest_sessions alter column form drop not null;
alter table public.workstyle_pretest_sessions drop constraint workstyle_pretest_sessions_assessment_version_check;
alter table public.workstyle_pretest_sessions drop constraint workstyle_pretest_sessions_consent_version_check;
alter table public.workstyle_pretest_sessions drop constraint workstyle_pretest_sessions_form_check;
-- NULL on historical rows: their immutable v1 manifest resolves as 1.0.0.
alter table public.workstyle_pretest_sessions add column manifest_version text;
alter table public.workstyle_pretest_sessions add column resume_position integer;
alter table public.workstyle_pretest_sessions add constraint workstyle_session_version_contract check (
 (assessment_version='8.5a-v1' and form is not null and form in ('A','B','C')
   and consent_version='workstyle_research_v1' and manifest_version is null and resume_position is null)
 or (assessment_version='8.5a-v2' and form is null and consent_version='workstyle_research_v2'
   and manifest_version is not null and manifest_version='2.0.0'
   and resume_position is not null and resume_position between 0 and 35)
);

create function public.workstyle_instrument_for(p_version text) returns text
language sql immutable set search_path='' as $$
 select case p_version when '8.5a-v1' then 'founder-workstyle-pretest-8-5a-v1'
 when '8.5a-v2' then 'founder-workstyle-pretest-8-5a-v2' end
$$;
revoke all on function public.workstyle_instrument_for(text) from public,anon,authenticated;

create or replace function public.guard_workstyle_assessment() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2')
    or (tg_op='UPDATE' and old.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2')) then
   if current_user not in ('postgres','service_role') then raise exception 'workstyle_rpc_required' using errcode='42501'; end if;
   if new.module<>'founder_profile' or new.venture_id is not null then raise exception 'workstyle_person_scope_required' using errcode='23514'; end if;
   if tg_op='UPDATE' and (new.instrument_id<>old.instrument_id or new.user_id<>old.user_id or new.id<>old.id
      or (old.submitted_at is not null and new.submitted_at is distinct from old.submitted_at)) then
     raise exception 'workstyle_assessment_identity_immutable' using errcode='23514';
   end if;
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
 if instrument in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2') or old_instrument in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2') then
   if current_user not in ('postgres','service_role') then raise exception 'workstyle_rpc_required' using errcode='42501'; end if;
   if tg_op='UPDATE' and (new.assessment_id<>old.assessment_id or new.item_version is distinct from old.item_version) then
     raise exception 'workstyle_answer_identity_immutable' using errcode='23514';
   end if;
   select i.definition into item from public.workstyle_item_versions i
     where i.instrument_id=instrument and i.item_key=new.block_id and i.item_version=new.item_version;
   if item is null or item->>'usage'<>'core' or new.answer_format<>'ordinal_choice'
     or (new.missing_code is not null and not (item->'missing_reasons' ? new.missing_code))
     or (new.value is not null and (jsonb_typeof(new.value->'scale') is distinct from 'number'
       or new.value<>jsonb_build_object('scale',new.value->'scale')
       or (new.value->>'scale')::numeric not in (1,2,3,4,5))) then
     raise exception 'invalid_workstyle_core_answer' using errcode='23514';
   end if;
 elsif new.item_version is not null or new.block_id like '%-%' then
   raise exception 'workstyle_item_requires_workstyle_instrument' using errcode='23514';
 end if;
 return new;
end $$;

create or replace function public.guard_workstyle_share() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.assessments a where a.id=new.assessment_id
   and a.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2') and a.submitted_at is null) then
   raise exception 'workstyle_complete_before_sharing' using errcode='23514';
 end if;
 return new;
end $$;

create function public.get_my_workstyle_pretest_version(p_assessment_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; answer_rows jsonb;
begin
 if public.workstyle_instrument_for(p_assessment_version) is null then raise exception 'unknown_workstyle_version' using errcode='22023'; end if;
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=auth.uid() and r.assessment_version=p_assessment_version order by r.started_at desc,r.assessment_id limit 1;
 if not found then return null; end if;
 select coalesce(jsonb_agg(x),'[]') into answer_rows from (
   select a.block_id item_key,a.item_version,(a.value->>'scale')::integer response_value,a.missing_code missing_reason
   from public.alignment_answers a where a.assessment_id=s.assessment_id
   union all select r.item_key,r.item_version,r.response_value,r.missing_reason
   from public.workstyle_research_responses r where r.assessment_id=s.assessment_id
 ) x;
 return to_jsonb(s)||jsonb_build_object('answers',answer_rows);
end $$;
-- Preserve no-argument v1 clients, even after the same person starts v2.
create or replace function public.get_my_workstyle_pretest() returns jsonb
language sql security definer set search_path='' as $$ select public.get_my_workstyle_pretest_version('8.5a-v1') $$;

create or replace function public.start_workstyle_pretest(p_consent_version text,p_context jsonb,p_new boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; new_id uuid; selected_form text; selected_version text;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 selected_version:=case p_consent_version when 'workstyle_research_v1' then '8.5a-v1' when 'workstyle_research_v2' then '8.5a-v2' end;
 if selected_version is null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if p_context is null or jsonb_typeof(p_context)<>'object'
   or (p_context - array['founder_experience','team_size','venture_phase'])<>'{}'
   or (selected_version='8.5a-v1' and coalesce(p_context->>'founder_experience','') not in ('none','first_venture','multiple_ventures'))
   or (selected_version='8.5a-v2' and coalesce(p_context->>'founder_experience','') not in ('0','1','2-3','4-5','6_plus','prefer_not_to_say'))
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
 if selected_version='8.5a-v1' then
 select f.form into selected_form from (values('A'),('B'),('C')) f(form)
 left join public.workstyle_pretest_sessions s on s.form=f.form and s.assessment_version=selected_version
 group by f.form order by count(s.assessment_id),f.form limit 1;
 end if;
 insert into public.assessments(user_id,module,instrument_id)
 values(auth.uid(),'founder_profile',public.workstyle_instrument_for(selected_version)) returning id into new_id;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,context,manifest_version,resume_position)
 values(new_id,selected_version,selected_form,p_consent_version,p_context,
   case when selected_version='8.5a-v2' then '2.0.0' end,case when selected_version='8.5a-v2' then 0 end);
 return public.get_my_workstyle_pretest_version(selected_version);
end $$;

create or replace function public.save_workstyle_pretest_answer(p_assessment_id uuid,p_item_key text,p_item_version text,p_response_value integer,p_missing_reason text,p_response_time_ms integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; item jsonb; item_position integer;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
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

create or replace function public.complete_workstyle_pretest(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; completed_time timestamptz;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
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

create or replace function public.save_workstyle_feedback(p_assessment_id uuid,p_feedback jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; k text; v jsonb;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.completed_at is null then raise exception 'workstyle_feedback_unavailable' using errcode='42501'; end if;
 if p_feedback is null or jsonb_typeof(p_feedback)<>'object'
 or (p_feedback-array['clarity','unclear_items','unclear_text','unsuitable_items','unsuitable_text','desirable','desirable_items','other','clear_realistic_items'])<>'{}' then
   raise exception 'invalid_workstyle_feedback' using errcode='22023';
 end if;
 if s.assessment_version='8.5a-v1' and p_feedback ? 'clear_realistic_items' then raise exception 'invalid_workstyle_feedback' using errcode='22023'; end if;
 for k,v in select * from jsonb_each(p_feedback) loop
   if k='clarity' then
     if v not in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb) then raise exception 'invalid_workstyle_feedback' using errcode='22023'; end if;
   elsif k='desirable' then
     if jsonb_typeof(v)<>'boolean' then raise exception 'invalid_workstyle_feedback' using errcode='22023'; end if;
   elsif k in ('unclear_items','unsuitable_items','desirable_items','clear_realistic_items') then
     if jsonb_typeof(v)<>'array' then raise exception 'invalid_workstyle_feedback' using errcode='22023'; end if;
     if jsonb_array_length(v)>(case s.assessment_version when '8.5a-v2' then 36 else 26 end) or exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e)<>'string'
       or not exists(select 1 from public.workstyle_item_versions i where i.instrument_id=public.workstyle_instrument_for(s.assessment_version)
       and i.item_key=e#>>'{}' and (i.definition->>'usage'='core' or i.definition->>'form' is not distinct from s.form))) then
       raise exception 'invalid_workstyle_feedback' using errcode='22023';
     end if;
   elsif jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>2000 then
     raise exception 'invalid_workstyle_feedback' using errcode='22023';
   end if;
 end loop;
 update public.workstyle_pretest_sessions set feedback=p_feedback where assessment_id=p_assessment_id;
end $$;

create function public.get_workstyle_research_dataset_version(p_assessment_version text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if public.workstyle_instrument_for(p_assessment_version) is null then raise exception 'unknown_workstyle_version' using errcode='22023'; end if;
 if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'session_id',s.session_id,'form',s.form,'assessment_version',s.assessment_version,'consent_version',s.consent_version,
   'manifest_version',coalesce(s.manifest_version,'1.0.0'),'resume_position',s.resume_position,'started_at',s.started_at,'completed_at',s.completed_at,'context',s.context,'feedback',s.feedback,'timings',s.timings,
   'answers',(select coalesce(jsonb_agg(r),'[]') from (
     select a.block_id item_key,a.item_version,(a.value->>'scale')::integer response_value,a.missing_code missing_reason
     from public.alignment_answers a where a.assessment_id=s.assessment_id
     union all select r.item_key,r.item_version,r.response_value,r.missing_reason from public.workstyle_research_responses r where r.assessment_id=s.assessment_id
   ) r))) from public.workstyle_pretest_sessions s where s.withdrawn_at is null and s.assessment_version=p_assessment_version),'[]');
end $$;
create or replace function public.get_workstyle_research_dataset() returns jsonb
language sql security definer set search_path='' as $$ select public.get_workstyle_research_dataset_version('8.5a-v1') $$;

-- Persist navigation too, so reload after going back resumes the same question.
create function public.set_workstyle_pretest_position(p_assessment_id uuid,p_position integer) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.completed_at is not null or s.assessment_version<>'8.5a-v2' then
   raise exception 'workstyle_navigation_unavailable' using errcode='42501'; end if;
 if p_position is null or p_position not between 0 and 35 or exists (
   select 1 from public.workstyle_item_versions i where i.instrument_id='founder-workstyle-pretest-8-5a-v2'
   and i.position<=p_position and not exists(select 1 from public.alignment_answers a where a.assessment_id=p_assessment_id and a.block_id=i.item_key)
   and not exists(select 1 from public.workstyle_research_responses r where r.assessment_id=p_assessment_id and r.item_key=i.item_key)
 ) then raise exception 'invalid_workstyle_position' using errcode='22023'; end if;
 update public.workstyle_pretest_sessions set resume_position=p_position where assessment_id=p_assessment_id;
end $$;

-- One transaction/row lock for last answer and both completion timestamps.
-- A lost-response retry succeeds only for the identical already-finalized answer.
create function public.finish_workstyle_pretest_v2(p_assessment_id uuid,p_item_version text,p_response_value integer,p_missing_reason text,p_response_time_ms integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; final_answer public.alignment_answers;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.assessment_version<>'8.5a-v2' then
   raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.completed_at is not null then
   select * into final_answer from public.alignment_answers where assessment_id=p_assessment_id and block_id='EXP-05';
   if not found or final_answer.item_version is distinct from p_item_version
     or (final_answer.value->>'scale')::integer is distinct from p_response_value or final_answer.missing_code is distinct from p_missing_reason then
     raise exception 'workstyle_completed_answer_immutable' using errcode='23514'; end if;
 else
   perform public.save_workstyle_pretest_answer(p_assessment_id,'EXP-05',p_item_version,p_response_value,p_missing_reason,p_response_time_ms);
   perform public.complete_workstyle_pretest(p_assessment_id);
 end if;
 -- Explicit assessment result: even a later retake must not change retry identity.
 return jsonb_build_object('assessment_id',p_assessment_id,'completed_at',
   (select completed_at from public.workstyle_pretest_sessions where assessment_id=p_assessment_id));
end $$;

create or replace function public.get_workstyle_team_inputs(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member record; core_id uuid; venture_id uuid; core_instrument text; core_version text; manifest text;
 first_instrument text; first_manifest text; core_data jsonb; venture_data jsonb; people jsonb:='[]'; expected_count integer;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<>2 then return jsonb_build_object('status','not_ready'); end if;
 for member in select user_id from public.founder_team_members where team_id=p_team_id order by user_id loop
   -- Latest completed portable profile, never silently fall back to an older compatible version.
   select a.id,a.instrument_id,s.assessment_version,coalesce(s.manifest_version,case when s.assessment_version='8.5a-v1' then '1.0.0' end)
   into core_id,core_instrument,core_version,manifest
   from public.assessments a join public.workstyle_pretest_sessions s on s.assessment_id=a.id
   where a.user_id=member.user_id and a.instrument_id in ('founder-workstyle-pretest-8-5a-v1','founder-workstyle-pretest-8-5a-v2')
   and a.submitted_at is not null order by a.created_at desc,a.id limit 1;
   select id into venture_id from public.assessments where user_id=member.user_id
     and instrument_id='venture-alignment-v1' and public.assessments.venture_id=p_team_id
     and submitted_at is not null order by created_at desc,id limit 1;
   if core_id is null or venture_id is null or core_instrument is distinct from public.workstyle_instrument_for(core_version)
     or manifest is distinct from (case core_version when '8.5a-v1' then '1.0.0' when '8.5a-v2' then '2.0.0' end) then
     return jsonb_build_object('status','not_ready'); end if;
   if first_instrument is not null and (core_instrument<>first_instrument or manifest<>first_manifest) then
     return jsonb_build_object('status','not_ready'); end if;
   first_instrument:=core_instrument; first_manifest:=manifest;
   expected_count:=case core_version when '8.5a-v2' then 30 else 20 end;
   if member.user_id<>auth.uid() and (not public.alignment_share_is_effective(core_id,auth.uid())
     or not public.alignment_share_is_effective(venture_id,auth.uid())) then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'item_version',a.item_version,'value',a.value,'missing_reason',a.missing_code) order by i.position),'[]') into core_data
   from public.alignment_answers a join public.workstyle_item_versions i on i.item_key=a.block_id and i.item_version=a.item_version
   and i.instrument_id=core_instrument and i.definition->>'usage'='core' and not (i.definition->>'research_only')::boolean
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

revoke all on function public.get_my_workstyle_pretest_version(text),public.get_workstyle_research_dataset_version(text),public.set_workstyle_pretest_position(uuid,integer),public.finish_workstyle_pretest_v2(uuid,text,integer,text,integer) from public,anon,authenticated;
grant execute on function public.get_my_workstyle_pretest_version(text),public.get_workstyle_research_dataset_version(text),public.set_workstyle_pretest_position(uuid,integer),public.finish_workstyle_pretest_v2(uuid,text,integer,text,integer) to authenticated;
commit;
