\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check_v2(condition boolean,label text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'workstyle v2: %',label; end if; end $$;
create temp table v2_ids(person uuid primary key,v1 uuid,v2 uuid);
grant all on v2_ids to authenticated;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,'',now(),'{}','{}',now(),now()
from (values ('e8520000-0000-4000-8000-000000000001'::uuid,'v2-a@example.test'),('e8520000-0000-4000-8000-000000000002'::uuid,'v2-b@example.test'),('e8520000-0000-4000-8000-000000000003'::uuid,'v2-advisor@example.test'),('e8520000-0000-4000-8000-000000000004'::uuid,'v2-admin@example.test')) x(id,email);
insert into public.profiles(user_id,roles) values ('e8520000-0000-4000-8000-000000000001',array['founder']),('e8520000-0000-4000-8000-000000000002',array['founder']) on conflict(user_id) do update set roles=excluded.roles;
select pg_temp.check_v2((select count(*)=36 and count(*) filter(where definition->>'usage'='core')=30 and count(*) filter(where definition->>'usage'='research_only')=6 and bool_and(definition->>'form' is null and definition->'missing_reasons'='["cannot_assess"]' and item_version='8.4-v0.3') from public.workstyle_item_versions where assessment_version='8.5a-v2'),'36 frozen items / 30 core / 6 private / missing everywhere');
select pg_temp.check_v2((select string_agg(item_key,' ' order by position)='ORG-01 EXP-01 VOICE-01 AMB-01 EL-01 EVI-01 AMB-02 EVI-02 ORG-R1 EL-02 EXP-02 VOICE-02 VOICE-R1 EXP-03 EVI-03 ORG-02 AMB-03 EL-03 EL-R1 AMB-04 VOICE-03 EVI-04 ORG-03 EXP-04 EXP-R1 ORG-04 EL-04 VOICE-04 EVI-05 AMB-05 EVI-R1 AMB-R1 ORG-05 VOICE-05 EL-05 EXP-05' from public.workstyle_item_versions where assessment_version='8.5a-v2'),'exact server order');
select pg_temp.check_v2(not has_function_privilege('anon','public.finish_workstyle_pretest_v2(uuid,text,integer,text,integer)','EXECUTE') and not has_function_privilege('anon','public.get_my_workstyle_pretest_version(text)','EXECUTE'),'anonymous denied');
select pg_temp.check_v2(not has_table_privilege('authenticated','public.workstyle_research_responses','SELECT') and not has_table_privilege('authenticated','public.workstyle_pretest_sessions','UPDATE'),'private tables still RPC-only');

select set_config('request.jwt.claims','{"sub":"e8520000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_pretest(null,'{"founder_experience":"0","team_size":"solo"}'); raise exception 'no consent accepted'; exception when insufficient_privilege then null; end;
 begin perform public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"0","team_size":"solo"}'); raise exception 'v1 consent used for v2'; exception when invalid_parameter_value then null; end;
 begin perform public.get_workstyle_research_dataset_version('8.5a-v2'); raise exception 'non-admin access'; exception when insufficient_privilege then null; end;
 begin insert into public.assessments(user_id,module,instrument_id) values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v2'); raise exception 'direct v2 assessment bypass'; exception when insufficient_privilege then null; end;
end $$;
insert into v2_ids select auth.uid(),(public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"none","team_size":"solo"}')->>'assessment_id')::uuid,(public.start_workstyle_pretest('workstyle_research_v2','{"founder_experience":"2-3","team_size":"solo"}')->>'assessment_id')::uuid;
select pg_temp.check_v2((public.get_my_workstyle_pretest()->>'assessment_id')::uuid=(select v1 from v2_ids where person=auth.uid()),'historical no-arg v1 remains available alongside v2');
select pg_temp.check_v2(public.get_my_workstyle_pretest()->>'form' in ('A','B','C'),'v1 still assigns ABC');
select pg_temp.check_v2((public.start_workstyle_pretest('workstyle_research_v2','{"founder_experience":"6_plus","team_size":"solo"}',true)->>'assessment_id')::uuid=(select v2 from v2_ids where person=auth.uid()),'v2 repeated start resumes same draft');
select pg_temp.check_v2(public.get_my_workstyle_pretest_version('8.5a-v2')->>'form' is null and public.get_my_workstyle_pretest_version('8.5a-v2')->>'manifest_version'='2.0.0','v2 no artificial form');
do $$ declare id uuid:=(select v2 from v2_ids where person=auth.uid()); begin
 begin perform public.save_workstyle_pretest_answer(id,'ORG-01','8.4-v0.2',3,null); raise exception 'old item version accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_answer(id,'ORG-01','8.4-v0.3',3,'cannot_assess'); raise exception 'numeric missing'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_answer(id,'ORG-01','8.4-v0.3',6,null); raise exception 'sixth value'; exception when invalid_parameter_value then null; end;
 begin perform public.finish_workstyle_pretest_v2(id,'8.4-v0.3',3,null); raise exception 'skipped questions'; exception when check_violation then null; end;
 perform public.save_workstyle_pretest_answer(id,'ORG-01','8.4-v0.3',null,'cannot_assess',1500);
 perform pg_temp.check_v2(public.get_my_workstyle_pretest_version('8.5a-v2')->>'resume_position'='1','save advances cursor');
 perform public.set_workstyle_pretest_position(id,0);
 perform pg_temp.check_v2(public.get_my_workstyle_pretest_version('8.5a-v2')->>'resume_position'='0','back cursor persists on reload');
 begin perform public.set_workstyle_pretest_position(id,5); raise exception 'navigation skips missing'; exception when invalid_parameter_value then null; end;
 begin insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value) values(id,'EXP-01','8.4-v0.3','ordinal_choice','{"scale":3}'); raise exception 'direct answer bypass'; exception when insufficient_privilege then null; end;
 begin insert into public.alignment_shares(assessment_id,recipient_user_id) values(id,'e8520000-0000-4000-8000-000000000003'); raise exception 'draft shared'; exception when check_violation then null; end;
end $$;
reset role;
select pg_temp.check_v2(not exists(select 1 from public.alignment_answers where assessment_id=(select v2 from v2_ids limit 1) and block_id='EXP-05'),'failed finish rolled back final answer');

-- Finish A's v1 and v2; every v2 answer is a true missing value.
set local role authenticated;
do $$ declare id uuid; i record; s jsonb; begin
 s:=public.get_my_workstyle_pretest(); id:=(s->>'assessment_id')::uuid;
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v1' and (definition->>'usage'='core' or definition->>'form'=s->>'form') order by case when definition->>'usage'='core' then 0 else 1 end,position loop
   perform public.save_workstyle_pretest_answer(id,i.item_key,i.item_version,3,null);
 end loop;
 perform public.complete_workstyle_pretest(id);
 id:=(select v2 from v2_ids where person=auth.uid());
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v2' and position<36 order by position loop
   perform public.save_workstyle_pretest_answer(id,i.item_key,i.item_version,null,'cannot_assess',900);
 end loop;
 s:=public.finish_workstyle_pretest_v2(id,'8.4-v0.3',null,'cannot_assess',900);
 perform pg_temp.check_v2(s=public.finish_workstyle_pretest_v2(id,'8.4-v0.3',null,'cannot_assess',1200),'identical retry has same completion timestamp');
 begin perform public.finish_workstyle_pretest_v2(id,'8.4-v0.3',3,null); raise exception 'completed final answer changed'; exception when check_violation then null; end;
 perform pg_temp.check_v2(public.get_my_workstyle_pretest_version('8.5a-v2')->'feedback'='null'::jsonb,'feedback not needed for completion');
 perform public.save_workstyle_feedback(id,'{"clarity":5,"clear_realistic_items":["ORG-01","EL-R1"],"unclear_items":["EXP-01"]}');
 begin perform public.save_workstyle_feedback(id,'{"clear_realistic_items":["FAKE"]}'); raise exception 'unknown feedback item'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
select pg_temp.check_v2((select count(*)=30 and bool_and(value is null and missing_code='cannot_assess' and item_version='8.4-v0.3') from public.alignment_answers where assessment_id=(select v2 from v2_ids limit 1)),'30 core only, NULL missing, exact version');
select pg_temp.check_v2((select count(*)=6 and bool_and(response_value is null and missing_reason='cannot_assess' and instrument_id='founder-workstyle-pretest-8-5a-v2') from public.workstyle_research_responses where assessment_id=(select v2 from v2_ids limit 1)),'six R1 private missing responses');
select pg_temp.check_v2((select a.submitted_at=s.completed_at from public.assessments a join public.workstyle_pretest_sessions s on s.assessment_id=a.id where a.id=(select v2 from v2_ids limit 1)),'atomic matching completion times');
do $$ begin
 begin update public.workstyle_item_versions set definition=jsonb_set(definition,'{prompt}','"changed"') where assessment_version='8.5a-v1'; raise exception 'v0.2 mutated'; exception when check_violation then null; end;
 begin update public.workstyle_item_versions set definition=jsonb_set(definition,'{prompt}','"changed"') where assessment_version='8.5a-v2'; raise exception 'v0.3 mutated'; exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"e8520000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_v2(not exists(select 1 from public.alignment_answers where assessment_id=(select v2 from v2_ids limit 1)),'RLS foreign core denied');
do $$ begin
 begin perform public.finish_workstyle_pretest_v2((select v2 from v2_ids limit 1),'8.4-v0.3',null,'cannot_assess'); raise exception 'foreign finalize'; exception when insufficient_privilege then null; end;
 begin perform public.set_workstyle_pretest_position((select v2 from v2_ids limit 1),0); raise exception 'foreign navigation'; exception when insufficient_privilege then null; end;
end $$;
insert into v2_ids select auth.uid(),(public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"first_venture","team_size":"two"}')->>'assessment_id')::uuid,null;
do $$ declare id uuid; i record; s jsonb; begin
 s:=public.get_my_workstyle_pretest(); id:=(s->>'assessment_id')::uuid;
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v1' and (definition->>'usage'='core' or definition->>'form'=s->>'form') order by case when definition->>'usage'='core' then 0 else 1 end,position loop
   perform public.save_workstyle_pretest_answer(id,i.item_key,i.item_version,3,null);
 end loop;
 perform public.complete_workstyle_pretest(id);
end $$;
reset role;
-- Deterministic latest-profile ordering inside this single test transaction.
update public.assessments set created_at=now()-interval '1 minute' where id in (select v1 from v2_ids);
insert into public.founder_teams(id,name,team_context) values('e8521000-0000-4000-8000-000000000001','V2 Test','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e8521000-0000-4000-8000-000000000001',person from v2_ids;
insert into public.assessments(id,user_id,module,instrument_id,venture_id) values
 ('e8522000-0000-4000-8000-000000000001','e8520000-0000-4000-8000-000000000001','venture_alignment','venture-alignment-v1','e8521000-0000-4000-8000-000000000001'),
 ('e8522000-0000-4000-8000-000000000002','e8520000-0000-4000-8000-000000000002','venture_alignment','venture-alignment-v1','e8521000-0000-4000-8000-000000000001');
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values ('e8522000-0000-4000-8000-000000000001','U01','ordinal_choice','{"optionId":"U01_o1"}'),('e8522000-0000-4000-8000-000000000002','U01','ordinal_choice','{"optionId":"U01_o1"}');
update public.assessments set submitted_at=now() where venture_id='e8521000-0000-4000-8000-000000000001';
insert into public.alignment_shares(assessment_id,recipient_user_id) select id,'e8520000-0000-4000-8000-000000000003' from public.assessments where user_id in (select person from v2_ids);
select set_config('request.jwt.claims','{"sub":"e8520000-0000-4000-8000-000000000003","role":"authenticated"}',true);
reset role;
-- Reporting now requires explicit consent for the exact advisor group, also for historical inputs.
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at) values('e8523000-0000-4000-8000-000000000001','e8520000-0000-4000-8000-000000000003','e8520000-0000-4000-8000-000000000003','active',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) values
 ('e8523000-0000-4000-8000-000000000001','e8520000-0000-4000-8000-000000000001','approved',now()),
 ('e8523000-0000-4000-8000-000000000001','e8520000-0000-4000-8000-000000000002','approved',now());
-- Phase 12C.1B: wie bei der Aktivierung an das Team mit exakt dieser Gruppe binden.
update public.advisor_team_reviews set team_id=public.advisor_team_review_matching_team(id),team_bound_at=now() where team_id is null and status='active';
set local role authenticated;
select pg_temp.check_v2(public.get_workstyle_team_inputs('e8521000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'mixed v1/v2 denied despite all shares; no fallback to old v1');
reset role;
select set_config('request.jwt.claims','{"sub":"e8520000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
update v2_ids set v2=(public.start_workstyle_pretest('workstyle_research_v2','{"founder_experience":"prefer_not_to_say","team_size":"two"}')->>'assessment_id')::uuid where person=auth.uid();
do $$ declare i record; id uuid:=(select v2 from v2_ids where person=auth.uid()); begin
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v2' and position<36 order by position loop perform public.save_workstyle_pretest_answer(id,i.item_key,i.item_version,3,null,100); end loop;
 perform public.finish_workstyle_pretest_v2(id,'8.4-v0.3',3,null,100);
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"e8520000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_v2(public.get_workstyle_team_inputs('e8521000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'new v2 not automatically shared');
reset role;
insert into public.alignment_shares(assessment_id,recipient_user_id) select v2,'e8520000-0000-4000-8000-000000000003' from v2_ids where person='e8520000-0000-4000-8000-000000000002';
-- Phase 11.6: erst die gegenseitige Freigabe der Mitglieder macht Team-Eingaben.
set local role authenticated;
select pg_temp.check_v2(public.get_workstyle_team_inputs('e8521000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'advisor shares without mutual member shares stay not_ready');
reset role;
insert into public.alignment_shares(assessment_id,recipient_user_id) select a.v2,b.person from v2_ids a join v2_ids b on b.person<>a.person;
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.get_workstyle_team_inputs('e8521000-0000-4000-8000-000000000001');
 perform pg_temp.check_v2(r->>'status'='ready' and jsonb_array_length(r->'people')=2 and jsonb_array_length(r->'people'->0->'core')=30,'two same-version explicitly shared core inputs');
 perform pg_temp.check_v2(r::text not like '%-R1%' and r::text not like '%clear_realistic%' and r::text not like '%form%' and r->'people'->0->>'manifest_version'='2.0.0','no research in advisor/team data');
end $$;
reset role;
insert into public.alignment_share_hidden_blocks(share_id,block_id) select id,'ORG-01' from public.alignment_shares where assessment_id=(select v2 from v2_ids where person='e8520000-0000-4000-8000-000000000002');
set local role authenticated;
select pg_temp.check_v2(public.get_workstyle_team_inputs('e8521000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'hidden v2 item prevents report readiness');
reset role;
insert into public.platform_admins(user_id) values('e8520000-0000-4000-8000-000000000004');
select set_config('request.jwt.claims','{"sub":"e8520000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.get_workstyle_research_dataset_version('8.5a-v2');
 perform pg_temp.check_v2(jsonb_array_length(r)>=2 and r::text not like '%8.5a-v1%' and r::text not like '%user_id%' and r::text not like '%assessment_id%','v2 admin is version scoped and pseudonymous');
 perform pg_temp.check_v2(public.get_workstyle_research_dataset()::text not like '%8.5a-v2%','historical noarg admin stays v1 only');
end $$;
reset role;

-- General withdrawal erases research for both versions, retains completed product cores.
select set_config('request.jwt.claims','{"sub":"e8520000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select * from public.set_my_research_consent('declined');
reset role;
select pg_temp.check_v2((select count(*)=2 and bool_and(withdrawn_at is not null and context='{}' and timings='{}' and feedback is null) from public.workstyle_pretest_sessions where assessment_id in (select v1 from v2_ids where person='e8520000-0000-4000-8000-000000000001' union all select v2 from v2_ids where person='e8520000-0000-4000-8000-000000000001')),'both consent versions withdrawn, research metadata erased');
select pg_temp.check_v2((select count(*)=30 from public.alignment_answers where assessment_id=(select v2 from v2_ids where person='e8520000-0000-4000-8000-000000000001')),'v2 completed core survives');
select pg_temp.check_v2((select count(*)=20 from public.alignment_answers where assessment_id=(select v1 from v2_ids where person='e8520000-0000-4000-8000-000000000001')),'v1 history survives');
select pg_temp.check_v2(not exists(select 1 from public.workstyle_research_responses where assessment_id=(select v2 from v2_ids where person='e8520000-0000-4000-8000-000000000001')),'R1 responses erased');
set local role authenticated;
select public.start_workstyle_pretest('workstyle_research_v2','{"founder_experience":"0","team_size":"solo"}',true);
select public.withdraw_workstyle_research();
reset role;
select pg_temp.check_v2((select count(*)=2 from public.assessments where user_id='e8520000-0000-4000-8000-000000000001' and instrument_id like 'founder-workstyle-pretest%'),'withdrawn unfinished v2 retake deleted, two completed histories retained');
select extensions.pass('v2 versions, fixed order, all missing, resume, atomic finish/retry, private research, feedback, access, mixed-version denial, withdrawal');
select * from extensions.finish();
rollback;
