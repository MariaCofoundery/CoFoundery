begin;

-- Reuse canonical people, assessments, core answers and explicit product shares.
-- Only the rotating extension and participation metadata are research-private.
insert into public.instruments(id,label,status,introduced_at)
values ('founder-workstyle-pretest-8-5a-v1','Founder Workstyle Pretest 8.5a-v1','draft','2026-10-04');

create table public.workstyle_item_versions (
 instrument_id text not null references public.instruments(id) on delete restrict,
 assessment_version text not null,
 item_key text not null,
 item_version text not null,
 position integer not null check(position>0),
 definition jsonb not null check(jsonb_typeof(definition)='object'),
 primary key(instrument_id,item_key,item_version),
 unique(instrument_id,item_key),
 unique(instrument_id,position),
 check(definition->>'item_key'=item_key and definition->>'item_version'=item_version
   and definition->>'assessment_version'=assessment_version),
 check(definition->>'source_type' in ('live_reference','adapted','new')),
 check(definition->>'usage' in ('core','research_only')),
 check((definition->>'research_only')::boolean = (definition->>'usage'='research_only')),
 check((definition->>'usage'='core' and definition->>'form' is null)
   or (definition->>'usage'='research_only' and definition->>'form' in ('A','B','C')))
);
alter table public.workstyle_item_versions enable row level security;
revoke all on public.workstyle_item_versions from public,anon,authenticated;
grant select on public.workstyle_item_versions to authenticated;
create policy workstyle_item_versions_read on public.workstyle_item_versions for select to authenticated using(true);
create function public.workstyle_item_version_immutable() returns trigger
language plpgsql set search_path='' as $$ begin raise exception 'workstyle_item_version_immutable' using errcode='23514'; end $$;
create trigger workstyle_item_versions_immutable before update or delete on public.workstyle_item_versions
for each row execute function public.workstyle_item_version_immutable();

alter table public.alignment_answers add column item_version text;
alter table public.alignment_answers drop constraint alignment_answers_block_shape;
alter table public.alignment_answers add constraint alignment_answers_block_shape
check(block_id ~ '^[A-Z][0-9]{2}([a-z]|_[a-z]+)?$' or block_id ~ '^(EVI|EXP|EL|VOICE|AMB|ORG)-[0-9]{2}$');

create table public.workstyle_pretest_sessions (
 assessment_id uuid primary key references public.assessments(id) on delete cascade,
 session_id uuid not null default gen_random_uuid() unique,
 assessment_version text not null check(assessment_version='8.5a-v1'),
 form text not null check(form in ('A','B','C')),
 consent_version text not null check(consent_version='workstyle_research_v1'),
 consent_given_at timestamptz not null default now(),
 withdrawn_at timestamptz,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 context jsonb not null default '{}',
 timings jsonb not null default '{}',
 feedback jsonb,
 check(jsonb_typeof(context)='object' and jsonb_typeof(timings)='object'),
 check(feedback is null or jsonb_typeof(feedback)='object')
);
create table public.workstyle_research_responses (
 assessment_id uuid not null references public.workstyle_pretest_sessions(assessment_id) on delete cascade,
 instrument_id text not null default 'founder-workstyle-pretest-8-5a-v1',
 item_key text not null,
 item_version text not null,
 response_value smallint check(response_value between 1 and 5),
 missing_reason text check(missing_reason='cannot_assess'),
 answered_at timestamptz not null default now(),
 primary key(assessment_id,item_key),
 foreign key(instrument_id,item_key,item_version) references public.workstyle_item_versions(instrument_id,item_key,item_version),
 check(num_nonnulls(response_value,missing_reason)=1)
);
alter table public.workstyle_pretest_sessions enable row level security;
alter table public.workstyle_research_responses enable row level security;
revoke all on public.workstyle_pretest_sessions,public.workstyle_research_responses from public,anon,authenticated;
-- RPC-only, including owners and admins. No advisor/share policy on either table.

create function public.guard_workstyle_assessment() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.instrument_id='founder-workstyle-pretest-8-5a-v1'
    or (tg_op='UPDATE' and old.instrument_id='founder-workstyle-pretest-8-5a-v1') then
   if current_user not in ('postgres','service_role') then raise exception 'workstyle_rpc_required' using errcode='42501'; end if;
   if new.module<>'founder_profile' or new.venture_id is not null then raise exception 'workstyle_person_scope_required' using errcode='23514'; end if;
   if tg_op='UPDATE' and (new.instrument_id<>old.instrument_id or new.user_id<>old.user_id or new.id<>old.id
      or (old.submitted_at is not null and new.submitted_at is distinct from old.submitted_at)) then
     raise exception 'workstyle_assessment_identity_immutable' using errcode='23514';
   end if;
 end if;
 return new;
end $$;
create trigger guard_workstyle_assessment before insert or update on public.assessments
for each row execute function public.guard_workstyle_assessment();

create function public.guard_workstyle_core_answer() returns trigger
language plpgsql set search_path='' as $$
declare instrument text; old_instrument text; item jsonb;
begin
 select a.instrument_id into instrument from public.assessments a where a.id=new.assessment_id;
 if tg_op='UPDATE' then
   select a.instrument_id into old_instrument from public.assessments a where a.id=old.assessment_id;
 end if;
 if instrument='founder-workstyle-pretest-8-5a-v1' or old_instrument='founder-workstyle-pretest-8-5a-v1' then
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
create trigger guard_workstyle_core_answer before insert or update on public.alignment_answers
for each row execute function public.guard_workstyle_core_answer();

create function public.get_my_workstyle_pretest() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; answer_rows jsonb;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=auth.uid() order by r.started_at desc,r.assessment_id limit 1;
 if not found then return null; end if;
 select coalesce(jsonb_agg(x),'[]') into answer_rows from (
   select a.block_id item_key,a.item_version,(a.value->>'scale')::integer response_value,a.missing_code missing_reason
   from public.alignment_answers a where a.assessment_id=s.assessment_id
   union all select r.item_key,r.item_version,r.response_value,r.missing_reason
   from public.workstyle_research_responses r where r.assessment_id=s.assessment_id
 ) x;
 return to_jsonb(s)||jsonb_build_object('answers',answer_rows);
end $$;

create function public.start_workstyle_pretest(p_consent_version text,p_context jsonb,p_new boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_session public.workstyle_pretest_sessions; new_id uuid; selected_form text;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if p_consent_version is distinct from 'workstyle_research_v1' then raise exception 'research_consent_required' using errcode='42501'; end if;
 if p_context is null or jsonb_typeof(p_context)<>'object'
   or (p_context - array['founder_experience','team_size','venture_phase'])<>'{}'
   or coalesce(p_context->>'founder_experience','') not in ('none','first_venture','multiple_ventures')
   or coalesce(p_context->>'team_size','') not in ('solo','two','larger','no_venture')
   or (p_context ? 'venture_phase' and coalesce(p_context->>'venture_phase','') not in ('idea','building','operating','')) then
   raise exception 'invalid_workstyle_context' using errcode='22023';
 end if;
 -- Serialize allocation, duplicate starts and the per-user resumption decision.
 perform pg_advisory_xact_lock(hashtextextended('workstyle-pretest-8.5a-v1',0));
 select s.* into current_session from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id
 where a.user_id=auth.uid() order by s.started_at desc,s.assessment_id limit 1 for update of s;
 if found and current_session.withdrawn_at is null and (current_session.completed_at is null or not p_new) then
   return public.get_my_workstyle_pretest();
 end if;
 select f.form into selected_form from (values('A'),('B'),('C')) f(form)
 left join public.workstyle_pretest_sessions s on s.form=f.form
 group by f.form order by count(s.assessment_id),f.form limit 1;
 insert into public.assessments(user_id,module,instrument_id)
 values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v1') returning id into new_id;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,context)
 values(new_id,'8.5a-v1',selected_form,p_consent_version,p_context);
 return public.get_my_workstyle_pretest();
end $$;

create function public.save_workstyle_pretest_answer(p_assessment_id uuid,p_item_key text,p_item_version text,p_response_value integer,p_missing_reason text,p_response_time_ms integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; item jsonb;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.completed_at is not null then raise exception 'workstyle_already_completed' using errcode='23514'; end if;
 select i.definition into item from public.workstyle_item_versions i
 where i.instrument_id='founder-workstyle-pretest-8-5a-v1' and i.item_key=p_item_key and i.item_version=p_item_version;
 if item is null or (item->>'usage'='research_only' and item->>'form'<>s.form)
   or num_nonnulls(p_response_value,p_missing_reason)<>1
   or (p_response_value is not null and p_response_value not between 1 and 5)
   or (p_missing_reason is not null and not (item->'missing_reasons' ? p_missing_reason))
   or (p_response_time_ms is not null and p_response_time_ms not between 0 and 86400000) then
   raise exception 'invalid_workstyle_answer' using errcode='22023';
 end if;
 if item->>'usage'='core' then
   insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value,missing_code)
   values(p_assessment_id,p_item_key,p_item_version,'ordinal_choice',case when p_response_value is null then null else jsonb_build_object('scale',p_response_value) end,p_missing_reason)
   on conflict(assessment_id,block_id) do update set value=excluded.value,missing_code=excluded.missing_code,answered_at=now();
 else
   if (select count(*) from public.alignment_answers where assessment_id=p_assessment_id)<>20 then
     raise exception 'workstyle_core_required' using errcode='23514';
   end if;
   insert into public.workstyle_research_responses(assessment_id,item_key,item_version,response_value,missing_reason)
   values(p_assessment_id,p_item_key,p_item_version,p_response_value,p_missing_reason)
   on conflict(assessment_id,item_key) do update set response_value=excluded.response_value,missing_reason=excluded.missing_reason,answered_at=now();
 end if;
 update public.workstyle_pretest_sessions set timings=case when p_response_time_ms is null then timings
   else timings||jsonb_build_object(p_item_key,p_response_time_ms) end where assessment_id=p_assessment_id;
end $$;

create function public.complete_workstyle_pretest(p_assessment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null then raise exception 'research_consent_required' using errcode='42501'; end if;
 if s.completed_at is not null then return; end if;
 if (select count(*) from public.alignment_answers where assessment_id=p_assessment_id)<>20
   or (select count(*) from public.workstyle_research_responses where assessment_id=p_assessment_id)<>
     (select count(*) from public.workstyle_item_versions where definition->>'form'=s.form and instrument_id='founder-workstyle-pretest-8-5a-v1') then
   raise exception 'workstyle_incomplete' using errcode='23514';
 end if;
 update public.assessments set submitted_at=now() where id=p_assessment_id;
 update public.workstyle_pretest_sessions set completed_at=now() where assessment_id=p_assessment_id;
end $$;

create function public.save_workstyle_feedback(p_assessment_id uuid,p_feedback jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare s public.workstyle_pretest_sessions; k text; v jsonb;
begin
 select r.* into s from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where r.assessment_id=p_assessment_id and a.user_id=auth.uid() for update of r;
 if not found or s.withdrawn_at is not null or s.completed_at is null then raise exception 'workstyle_feedback_unavailable' using errcode='42501'; end if;
 if p_feedback is null or jsonb_typeof(p_feedback)<>'object'
 or (p_feedback-array['clarity','unclear_items','unclear_text','unsuitable_items','unsuitable_text','desirable','desirable_items','other'])<>'{}' then
   raise exception 'invalid_workstyle_feedback' using errcode='22023';
 end if;
 for k,v in select * from jsonb_each(p_feedback) loop
   if k='clarity' then
     if v not in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb) then raise exception 'invalid_workstyle_feedback' using errcode='22023'; end if;
   elsif k='desirable' then
     if jsonb_typeof(v)<>'boolean' then raise exception 'invalid_workstyle_feedback' using errcode='22023'; end if;
   elsif k in ('unclear_items','unsuitable_items','desirable_items') then
     if jsonb_typeof(v)<>'array' then raise exception 'invalid_workstyle_feedback' using errcode='22023'; end if;
     if jsonb_array_length(v)>26 or exists(select 1 from jsonb_array_elements(v) e where jsonb_typeof(e)<>'string'
       or not exists(select 1 from public.workstyle_item_versions i where i.instrument_id='founder-workstyle-pretest-8-5a-v1'
       and i.item_key=e#>>'{}' and (i.definition->>'usage'='core' or i.definition->>'form'=s.form))) then
       raise exception 'invalid_workstyle_feedback' using errcode='22023';
     end if;
   elsif jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>2000 then
     raise exception 'invalid_workstyle_feedback' using errcode='22023';
   end if;
 end loop;
 update public.workstyle_pretest_sessions set feedback=p_feedback where assessment_id=p_assessment_id;
end $$;

create function public.erase_workstyle_research(p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare s record;
begin
 for s in select r.assessment_id,r.completed_at from public.workstyle_pretest_sessions r join public.assessments a on a.id=r.assessment_id
 where a.user_id=p_user_id and r.withdrawn_at is null for update of r loop
   delete from public.workstyle_research_responses where assessment_id=s.assessment_id;
   if s.completed_at is null then
     delete from public.alignment_answers where assessment_id=s.assessment_id;
     delete from public.assessments where id=s.assessment_id;
   else
     -- Completed portable core survives as product data; no longer eligible for research.
     update public.workstyle_pretest_sessions set withdrawn_at=now(),context='{}',timings='{}',feedback=null where assessment_id=s.assessment_id;
   end if;
 end loop;
end $$;
revoke all on function public.erase_workstyle_research(uuid) from public,anon,authenticated,service_role;
create function public.withdraw_workstyle_research() returns void
language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 perform public.erase_workstyle_research(auth.uid());
end $$;
-- Extend the existing central withdrawal. General acceptance never opts into this pretest.
create function public.withdraw_workstyle_with_research_preferences() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 if tg_op='DELETE' then perform public.erase_workstyle_research(old.user_id); return old; end if;
 if new.state='declined' then perform public.erase_workstyle_research(new.user_id); end if;
 return new;
end $$;
create trigger research_preferences_withdraw_workstyle after insert or update or delete on public.research_consent_preferences
for each row execute function public.withdraw_workstyle_with_research_preferences();

create function public.get_workstyle_research_dataset() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'session_id',s.session_id,'form',s.form,'assessment_version',s.assessment_version,'consent_version',s.consent_version,
   'started_at',s.started_at,'completed_at',s.completed_at,'context',s.context,'feedback',s.feedback,'timings',s.timings,
   'answers',(select coalesce(jsonb_agg(r),'[]') from (
     select a.block_id item_key,a.item_version,(a.value->>'scale')::integer response_value,a.missing_code missing_reason
     from public.alignment_answers a where a.assessment_id=s.assessment_id
     union all select r.item_key,r.item_version,r.response_value,r.missing_reason from public.workstyle_research_responses r where r.assessment_id=s.assessment_id
   ) r))) from public.workstyle_pretest_sessions s where s.withdrawn_at is null),'[]');
end $$;

-- A data adapter only. No report, scoring, automatic sharing or 3+-report logic.
create function public.get_workstyle_team_inputs(p_team_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member record; core_id uuid; venture_id uuid; core_data jsonb; venture_data jsonb; people jsonb:='[]';
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 if (select count(*) from public.founder_team_members where team_id=p_team_id)<>2 then
   return jsonb_build_object('status','not_ready');
 end if;
 for member in select user_id from public.founder_team_members where team_id=p_team_id order by user_id loop
   select id into core_id from public.assessments where user_id=member.user_id
     and instrument_id='founder-workstyle-pretest-8-5a-v1' and submitted_at is not null order by created_at desc,id limit 1;
   select id into venture_id from public.assessments where user_id=member.user_id
     and instrument_id='venture-alignment-v1' and public.assessments.venture_id=p_team_id
     and submitted_at is not null order by created_at desc,id limit 1;
   if core_id is null or venture_id is null then return jsonb_build_object('status','not_ready'); end if;
   if member.user_id<>auth.uid() and (not public.alignment_share_is_effective(core_id,auth.uid())
     or not public.alignment_share_is_effective(venture_id,auth.uid())) then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'item_version',a.item_version,'value',a.value,'missing_reason',a.missing_code) order by i.position),'[]') into core_data
   from public.alignment_answers a join public.workstyle_item_versions i on i.item_key=a.block_id and i.item_version=a.item_version
   and i.instrument_id='founder-workstyle-pretest-8-5a-v1' and i.definition->>'usage'='core'
   where a.assessment_id=core_id and (member.user_id=auth.uid() or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=core_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(core_data)<>20 then return jsonb_build_object('status','not_ready'); end if;
   select coalesce(jsonb_agg(jsonb_build_object('item_key',a.block_id,'value',a.value,'missing_reason',a.missing_code)),'[]') into venture_data
   from public.alignment_answers a where a.assessment_id=venture_id and (member.user_id=auth.uid() or not exists(
     select 1 from public.alignment_shares sh join public.alignment_share_hidden_blocks h on h.share_id=sh.id
     where sh.assessment_id=venture_id and sh.recipient_user_id=auth.uid() and h.block_id=a.block_id));
   if jsonb_array_length(venture_data)=0 then return jsonb_build_object('status','not_ready'); end if;
   people:=people||jsonb_build_array(jsonb_build_object('person_id',member.user_id,'workstyle_assessment_id',core_id,
     'assessment_version','8.5a-v1','core',core_data,'venture_assessment_id',venture_id,'venture_instrument','venture-alignment-v1',
     'venture_alignment',venture_data,'access_status','explicit_share_or_owner'));
 end loop;
 return jsonb_build_object('status','ready','team_id',p_team_id,'team_context',
   (select team_context from public.founder_teams where id=p_team_id),'people',people);
end $$;

-- Explicitly revoke the default PUBLIC execution privilege on every entry point.
revoke all on function public.workstyle_item_version_immutable(),public.guard_workstyle_assessment(),public.guard_workstyle_core_answer(),public.withdraw_workstyle_with_research_preferences() from public,anon,authenticated;
revoke all on function public.get_my_workstyle_pretest(),public.start_workstyle_pretest(text,jsonb,boolean),public.save_workstyle_pretest_answer(uuid,text,text,integer,text,integer),public.complete_workstyle_pretest(uuid),public.save_workstyle_feedback(uuid,jsonb),public.withdraw_workstyle_research(),public.get_workstyle_research_dataset(),public.get_workstyle_team_inputs(uuid) from public,anon,authenticated;
grant execute on function public.get_my_workstyle_pretest(),public.start_workstyle_pretest(text,jsonb,boolean),public.save_workstyle_pretest_answer(uuid,text,text,integer,text,integer),public.complete_workstyle_pretest(uuid),public.save_workstyle_feedback(uuid,jsonb),public.withdraw_workstyle_research(),public.get_workstyle_research_dataset(),public.get_workstyle_team_inputs(uuid) to authenticated;

commit;
