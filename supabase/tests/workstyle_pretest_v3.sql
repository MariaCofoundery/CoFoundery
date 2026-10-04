\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check_v3(condition boolean,label text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'workstyle v3: %',label; end if; end $$;
create temp table v3_ids(person uuid primary key,assessment uuid,old_assessment uuid);
grant all on v3_ids to authenticated;
create function pg_temp.fill_v3(id uuid,all_missing boolean) returns jsonb language plpgsql as $$
declare i record; result jsonb; v integer; o text;
begin
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' order by position loop
   v:=null; o:=null;
   if not all_missing then
     if i.definition->>'response_format' in ('comparative','behavioral') then o:=i.definition->'options'->0->>'option_id'; else v:=3; end if;
   end if;
   result:=public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,v,o,case when all_missing then 'cannot_assess' end,
     nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
   perform pg_temp.check_v3(result->'answer'->>'item_key'=i.item_key,'save returns exact persisted answer');
 end loop;
 return result;
end $$;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,'',now(),'{}','{}',now(),now()
from (values ('e8530000-0000-4000-8000-000000000001'::uuid,'v3-a@example.test'),('e8530000-0000-4000-8000-000000000002'::uuid,'v3-b@example.test'),('e8530000-0000-4000-8000-000000000003'::uuid,'v3-advisor@example.test'),('e8530000-0000-4000-8000-000000000004'::uuid,'v3-admin@example.test')) x(id,email);
insert into public.profiles(user_id,roles) values ('e8530000-0000-4000-8000-000000000001',array['founder']),('e8530000-0000-4000-8000-000000000002',array['founder']) on conflict(user_id) do update set roles=excluded.roles;
select pg_temp.check_v3((select count(*)=52 and count(*) filter(where definition->>'usage'='core')=29 and count(*) filter(where definition->>'usage'='research_only')=23 from public.workstyle_item_versions where assessment_version='8.5a-v3'),'52 items / 29 product / 23 private');
select pg_temp.check_v3((select bool_and(item_version='8.4-v0.4' and definition->'missing_reasons'='["cannot_assess"]' and definition->>'form' is null) from public.workstyle_item_versions where assessment_version='8.5a-v3'),'exact item version, missing everywhere, no form');
select pg_temp.check_v3((select count(*)=4 from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'scientific_status'='candidate_core' and definition->>'usage'='research_only'),'candidate DEC stays private');
select pg_temp.check_v3(not has_function_privilege('authenticated','public.workstyle_answer_rows(uuid)','EXECUTE') and not has_function_privilege('anon','public.save_workstyle_pretest_v3(uuid,text,text,integer,text,text,jsonb,integer,boolean)','EXECUTE'),'helper and anonymous entry denied');
select pg_temp.check_v3(not has_table_privilege('authenticated','public.workstyle_research_responses','SELECT'),'research still not directly readable');

select set_config('request.jwt.claims','{"sub":"e8530000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_pretest(null,'{"founder_experience":"0","team_size":"solo"}'); raise exception 'missing consent accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.assessments(user_id,module,instrument_id) values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v3'); raise exception 'direct assessment bypass'; exception when insufficient_privilege then null; end;
 begin perform public.get_workstyle_research_dataset_version('8.5a-v3'); raise exception 'non-admin access'; exception when insufficient_privilege then null; end;
end $$;
insert into v3_ids select auth.uid(),(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}')->>'assessment_id')::uuid,null;
select pg_temp.check_v3((public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}',true)->>'assessment_id')::uuid=(select assessment from v3_ids where person=auth.uid()),'duplicate start resumes');
select pg_temp.check_v3(public.get_my_workstyle_pretest_version('8.5a-v3')->>'manifest_version'='3.0.0' and public.get_my_workstyle_pretest_version('8.5a-v3')->>'form' is null,'manifest and null form');
do $$ declare id uuid:=(select assessment from v3_ids where person=auth.uid()); begin
 begin perform public.save_workstyle_pretest_v3(id,'ORG-01','8.4-v0.3',3,null,null,null); raise exception 'old item accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_v3(id,'ORG-01','8.4-v0.4',3,null,'cannot_assess',null); raise exception 'numeric missing'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_v3(id,'EVI-04','8.4-v0.4',3,null,null,null); raise exception 'behavioral numeric'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_v3(id,'ORG-03','8.4-v0.4',3,null,null,'["A","B"]'); raise exception 'FC numeric'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_v3(id,'ORG-03','8.4-v0.4',null,'lean_a',null,'["B","A"]'); raise exception 'unassigned order'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_v3(id,'EVI-04','8.4-v0.4',null,'Z',null,null); raise exception 'unknown option'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_v3(id,'DEC-R2','8.4-v0.4',3,null,null,null,100,true); raise exception 'incomplete finalize'; exception when check_violation then null; end;
 begin perform public.save_workstyle_pretest_answer(id,'ORG-01','8.4-v0.4',3,null); raise exception 'legacy write bypass'; exception when invalid_parameter_value then null; end;
 perform public.save_workstyle_pretest_v3(id,'ORG-01','8.4-v0.4',null,null,'cannot_assess',null,100);
 perform pg_temp.check_v3(public.get_my_workstyle_pretest_version('8.5a-v3')->>'resume_position'='1','advance persisted');
 perform public.set_workstyle_pretest_position(id,0);
 perform pg_temp.check_v3(public.get_my_workstyle_pretest_version('8.5a-v3')->>'resume_position'='0','back and reload position');
 begin insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value) values(id,'EVI-01','8.4-v0.4','ordinal_choice','{"scale":3}'); raise exception 'direct answer bypass'; exception when insufficient_privilege then null; end;
 begin insert into public.alignment_shares(assessment_id,recipient_user_id) values(id,'e8530000-0000-4000-8000-000000000003'); raise exception 'draft shared'; exception when check_violation then null; end;
end $$;
select pg_temp.fill_v3((select assessment from v3_ids where person=auth.uid()),false);
do $$ declare id uuid:=(select assessment from v3_ids where person=auth.uid()); t text; r jsonb; begin
 t:=public.get_my_workstyle_pretest_version('8.5a-v3')->>'completed_at';
 r:=public.save_workstyle_pretest_v3(id,'DEC-R2','8.4-v0.4',3,null,null,null,999,true);
 perform pg_temp.check_v3(r->>'completed_at'=t,'identical retry keeps one timestamp');
 begin perform public.save_workstyle_pretest_v3(id,'DEC-R2','8.4-v0.4',4,null,null,null,999,true); raise exception 'different retry'; exception when check_violation then null; end;
 perform pg_temp.check_v3(public.get_my_workstyle_pretest_version('8.5a-v3')->'feedback'='null'::jsonb,'feedback optional');
 perform public.save_workstyle_feedback(id,'{"clear_realistic_items":["DEC-01","EVI-04"],"other":"PRIVATE_TEXT"}');
end $$;
reset role;
select pg_temp.check_v3((select count(*)=29 from public.alignment_answers where assessment_id=(select assessment from v3_ids limit 1)),'product core count');
select pg_temp.check_v3((select value='{"optionId":"strong_a"}'::jsonb and answer_format='single_choice' and workstyle_rendered_order='["A","B"]' from public.alignment_answers where assessment_id=(select assessment from v3_ids limit 1) and block_id='ORG-03'),'FC product raw option, no numeric score');
select pg_temp.check_v3((select response_option='A' and response_value is null from public.workstyle_research_responses where assessment_id=(select assessment from v3_ids limit 1) and item_key='EL-03'),'behavioral raw pattern, not ordinal');
select pg_temp.check_v3((select count(*)=23 from public.workstyle_research_responses where assessment_id=(select assessment from v3_ids limit 1)),'all research/candidate data private');
select pg_temp.check_v3((select a.submitted_at=s.completed_at from public.assessments a join public.workstyle_pretest_sessions s on s.assessment_id=a.id where a.id=(select assessment from v3_ids limit 1)),'atomic completion');
do $$ begin
 begin update public.workstyle_item_versions set definition=jsonb_set(definition,'{prompt}','"changed"') where assessment_version='8.5a-v2'; raise exception 'old v2 overwritten'; exception when check_violation then null; end;
 begin update public.workstyle_item_versions set definition=jsonb_set(definition,'{prompt}','"changed"') where assessment_version='8.5a-v3'; raise exception 'v3 overwritten'; exception when check_violation then null; end;
end $$;

-- A completed v2 belonging to B must not be mixed with A's new v3.
select set_config('request.jwt.claims','{"sub":"e8530000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_v3(not exists(select 1 from public.alignment_answers where assessment_id=(select assessment from v3_ids limit 1)),'foreign core protected by RLS');
do $$ begin
 begin perform public.save_workstyle_pretest_v3((select assessment from v3_ids limit 1),'DEC-R2','8.4-v0.4',3,null,null,null,100,true); raise exception 'foreign finalization'; exception when insufficient_privilege then null; end;
end $$;
insert into v3_ids select auth.uid(),null,(public.start_workstyle_pretest('workstyle_research_v2','{"founder_experience":"0","team_size":"two"}')->>'assessment_id')::uuid;
do $$ declare i record; id uuid:=(select old_assessment from v3_ids where person=auth.uid()); begin
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v2' order by position loop perform public.save_workstyle_pretest_answer(id,i.item_key,i.item_version,3,null); end loop;
 perform public.finish_workstyle_pretest_v2(id,'8.4-v0.3',3,null,100);
end $$;
reset role;
update public.assessments set created_at=now()-interval '1 minute' where id in (select old_assessment from v3_ids);
insert into public.founder_teams(id,name,team_context) values('e8531000-0000-4000-8000-000000000001','V3 Test','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e8531000-0000-4000-8000-000000000001',person from v3_ids;
insert into public.assessments(id,user_id,module,instrument_id,venture_id) values
 ('e8532000-0000-4000-8000-000000000001','e8530000-0000-4000-8000-000000000001','venture_alignment','venture-alignment-v1','e8531000-0000-4000-8000-000000000001'),
 ('e8532000-0000-4000-8000-000000000002','e8530000-0000-4000-8000-000000000002','venture_alignment','venture-alignment-v1','e8531000-0000-4000-8000-000000000001');
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values ('e8532000-0000-4000-8000-000000000001','U01','ordinal_choice','{"optionId":"U01_o1"}'),('e8532000-0000-4000-8000-000000000002','U01','ordinal_choice','{"optionId":"U01_o1"}');
update public.assessments set submitted_at=now() where venture_id='e8531000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"e8530000-0000-4000-8000-000000000003","role":"authenticated"}',true);
reset role;
-- Reporting now requires explicit consent for the exact advisor group, also for historical inputs.
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at) values('e8533000-0000-4000-8000-000000000001','e8530000-0000-4000-8000-000000000003','e8530000-0000-4000-8000-000000000003','active',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) values
 ('e8533000-0000-4000-8000-000000000001','e8530000-0000-4000-8000-000000000001','approved',now()),
 ('e8533000-0000-4000-8000-000000000001','e8530000-0000-4000-8000-000000000002','approved',now());
set local role authenticated;
select pg_temp.check_v3(public.get_workstyle_team_inputs('e8531000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'advisor without shares denied');
reset role;
insert into public.alignment_shares(assessment_id,recipient_user_id) select id,'e8530000-0000-4000-8000-000000000003' from public.assessments where user_id in (select person from v3_ids);
set local role authenticated;
select pg_temp.check_v3(public.get_workstyle_team_inputs('e8531000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'v0.3/v0.4 comparison denied');
reset role;
select set_config('request.jwt.claims','{"sub":"e8530000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
update v3_ids set assessment=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"2-3","team_size":"two"}')->>'assessment_id')::uuid where person=auth.uid();
select pg_temp.fill_v3((select assessment from v3_ids where person=auth.uid()),true);
reset role;
select pg_temp.check_v3((select count(*)=29 and bool_and(value is null and missing_code='cannot_assess') from public.alignment_answers where assessment_id=(select assessment from v3_ids where person='e8530000-0000-4000-8000-000000000002')),'all core missing responses are NULL');
select pg_temp.check_v3((select count(*)=23 and bool_and(response_value is null and response_option is null and missing_reason='cannot_assess') from public.workstyle_research_responses where assessment_id=(select assessment from v3_ids where person='e8530000-0000-4000-8000-000000000002')),'all private missing responses are NULL');
select pg_temp.check_v3((select rendered_order='["A","B"]' from public.workstyle_research_responses where assessment_id=(select assessment from v3_ids where person='e8530000-0000-4000-8000-000000000002') and item_key='DEC-01'),'missing still retains presented A/B order');
select set_config('request.jwt.claims','{"sub":"e8530000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_v3(public.get_workstyle_team_inputs('e8531000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'new instrument not auto-shared');
reset role;
insert into public.alignment_shares(assessment_id,recipient_user_id) select assessment,'e8530000-0000-4000-8000-000000000003' from v3_ids where person='e8530000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.get_workstyle_team_inputs('e8531000-0000-4000-8000-000000000001');
 perform pg_temp.check_v3(r->>'status'='ready' and jsonb_array_length(r->'people'->0->'core')=29,'two matching v3 cores ready');
 perform pg_temp.check_v3(r::text not like '%DEC-%' and r::text not like '%FS-%' and r::text not like '%EL-03%' and r::text not like '%EVI-04%' and r::text not like '%PRIVATE_TEXT%','no research/candidate data in shared team input');
end $$;
reset role;
insert into public.alignment_share_hidden_blocks(share_id,block_id) select id,'ORG-03' from public.alignment_shares where assessment_id=(select assessment from v3_ids where person='e8530000-0000-4000-8000-000000000002');
set local role authenticated;
select pg_temp.check_v3(public.get_workstyle_team_inputs('e8531000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'hidden FC core prevents ready');
reset role;
insert into public.platform_admins(user_id) values('e8530000-0000-4000-8000-000000000004');
select set_config('request.jwt.claims','{"sub":"e8530000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r jsonb; begin
 r:=public.get_workstyle_research_dataset_version('8.5a-v3');
 perform pg_temp.check_v3(r::text not like '%8.5a-v2%' and r::text not like '%user_id%' and r::text not like '%assessment_id%' and r::text like '%response_option%' and r::text like '%answered_at%','versioned pseudonymous dataset has raw options and timestamps');
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"e8530000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.withdraw_workstyle_research();
reset role;
select pg_temp.check_v3((select count(*)=29 from public.alignment_answers where assessment_id=(select assessment from v3_ids where person='e8530000-0000-4000-8000-000000000001')),'withdrawal preserves completed product core');
select pg_temp.check_v3(not exists(select 1 from public.workstyle_research_responses where assessment_id=(select assessment from v3_ids where person='e8530000-0000-4000-8000-000000000001')),'withdrawal erases all 23 research/candidate answers');
select extensions.pass('v3 52 screens, categorical/raw/missing, ordering, resume, atomic finish, privacy, history, shares and same-version readiness');
select * from extensions.finish();
rollback;
