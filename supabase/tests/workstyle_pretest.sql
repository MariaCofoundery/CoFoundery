\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check_workstyle(condition boolean,label text) returns void language plpgsql as $$
begin if condition is not true then raise exception 'workstyle: %',label; end if; end $$;
create temp table workstyle_ids(person uuid primary key,assessment uuid,session uuid,form text);
grant all on workstyle_ids to authenticated;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',id,'authenticated','authenticated',email,'',now(),'{}','{}',now(),now()
from (values
 ('e8510000-0000-4000-8000-000000000001'::uuid,'workstyle-a@example.test'),
 ('e8510000-0000-4000-8000-000000000002'::uuid,'workstyle-b@example.test'),
 ('e8510000-0000-4000-8000-000000000003'::uuid,'workstyle-advisor@example.test'),
 ('e8510000-0000-4000-8000-000000000004'::uuid,'workstyle-admin@example.test')) x(id,email);
insert into public.profiles(user_id,roles) values
 ('e8510000-0000-4000-8000-000000000001',array['founder']),('e8510000-0000-4000-8000-000000000002',array['founder'])
on conflict(user_id) do update set roles=excluded.roles;
select pg_temp.check_workstyle((select count(*)=37 from public.workstyle_item_versions where assessment_version='8.5a-v1'),'37 frozen items');
select pg_temp.check_workstyle((select count(*)=20 from public.workstyle_item_versions where assessment_version='8.5a-v1' and definition->>'usage'='core'),'20 identical core items');
select pg_temp.check_workstyle(not has_function_privilege('anon','public.start_workstyle_pretest(text,jsonb,boolean)','EXECUTE'),'anonymous cannot participate');

select set_config('request.jwt.claims','{"sub":"e8510000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_pretest(null,'{"founder_experience":"none","team_size":"solo"}'); raise exception 'missing consent accepted'; exception when insufficient_privilege then null; end;
 begin perform public.get_workstyle_research_dataset(); raise exception 'non-admin research access'; exception when insufficient_privilege then null; end;
 begin insert into public.assessments(user_id,module,instrument_id) values(auth.uid(),'founder_profile','founder-workstyle-pretest-8-5a-v1'); raise exception 'direct start bypass'; exception when insufficient_privilege then null; end;
end $$;
insert into workstyle_ids select auth.uid(),(s->>'assessment_id')::uuid,(s->>'session_id')::uuid,s->>'form'
from (select public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"none","team_size":"solo"}') s) x;
select pg_temp.check_workstyle((public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"multiple_ventures","team_size":"larger"}',true)->>'session_id')::uuid=(select session from workstyle_ids where person=auth.uid()),'concurrent/replayed start resumes draft even with new requested');
select pg_temp.check_workstyle(public.get_my_workstyle_pretest()->>'form'=(select form from workstyle_ids where person=auth.uid()),'reload keeps assignment');
select pg_temp.check_workstyle(not exists(select 1 from public.research_consent_preferences),'pretest consent does not enable unrelated general research');
do $$ declare id uuid:=(select assessment from workstyle_ids where person=auth.uid()); wrong_key text; begin
 select item_key into wrong_key from public.workstyle_item_versions where definition->>'usage'='research_only' and definition->>'form'<>(select form from workstyle_ids where person=auth.uid()) limit 1;
 begin perform public.save_workstyle_pretest_answer(id,wrong_key,'8.4-v0.2',3,null,200); raise exception 'wrong form accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_answer(id,'EVI-01','wrong-version',3,null); raise exception 'wrong version accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_answer(id,'EVI-01','8.4-v0.2',3,'cannot_assess'); raise exception 'numeric missing accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_answer(id,'EVI-01','8.4-v0.2',6,null); raise exception 'sixth scale point accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.complete_workstyle_pretest(id); raise exception 'incomplete accepted'; exception when check_violation then null; end;
 perform public.save_workstyle_pretest_answer(id,'EVI-01','8.4-v0.2',null,'cannot_assess',750);
 begin insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value) values(id,'EVI-02','8.4-v0.2','ordinal_choice','{"scale":3}'); raise exception 'direct response bypass'; exception when insufficient_privilege then null; end;
end $$;
select pg_temp.check_workstyle((select value is null and missing_code='cannot_assess' and item_version='8.4-v0.2' from public.alignment_answers where assessment_id=(select assessment from workstyle_ids where person=auth.uid()) and block_id='EVI-01'),'missing persisted separately with version');
reset role;

select set_config('request.jwt.claims','{"sub":"e8510000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
insert into workstyle_ids select auth.uid(),(s->>'assessment_id')::uuid,(s->>'session_id')::uuid,s->>'form'
from (select public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"first_venture","team_size":"two"}') s) x;
select pg_temp.check_workstyle((select count(*)=0 from public.alignment_answers where assessment_id=(select assessment from workstyle_ids where person='e8510000-0000-4000-8000-000000000001')),'foreign core raw answers blocked');
do $$ begin
 begin perform public.save_workstyle_pretest_answer((select assessment from workstyle_ids where person='e8510000-0000-4000-8000-000000000001'),'EVI-02','8.4-v0.2',3,null); raise exception 'foreign session mutated'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"e8510000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
insert into workstyle_ids select auth.uid(),(s->>'assessment_id')::uuid,(s->>'session_id')::uuid,s->>'form'
from (select public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"none","team_size":"no_venture"}') s) x;
select pg_temp.check_workstyle((select count(distinct form)=3 from workstyle_ids),'balanced A B C');
select pg_temp.check_workstyle(not has_table_privilege('authenticated','public.workstyle_pretest_sessions','SELECT'),'private sessions have no direct read grant');
select pg_temp.check_workstyle(not has_table_privilege('authenticated','public.workstyle_research_responses','SELECT'),'advisor has no direct research read grant');
reset role;

-- Complete both founders through the real authenticated RPC path.
do $$ declare person_id uuid; row record; id uuid; form_id text; begin
 for person_id in select person from workstyle_ids where person<>'e8510000-0000-4000-8000-000000000003' loop
   perform set_config('request.jwt.claims',jsonb_build_object('sub',person_id,'role','authenticated')::text,true);
   select assessment,form into id,form_id from workstyle_ids where person=person_id;
   for row in select * from public.workstyle_item_versions where assessment_version='8.5a-v1' and definition->>'usage'='core' order by position loop
     perform public.save_workstyle_pretest_answer(id,row.item_key,row.item_version,3,null,1200);
   end loop;
   for row in select * from public.workstyle_item_versions where definition->>'form'=form_id order by position loop
     perform public.save_workstyle_pretest_answer(id,row.item_key,row.item_version,4,null,2000);
   end loop;
   perform public.complete_workstyle_pretest(id);
   perform public.complete_workstyle_pretest(id);
   perform pg_temp.check_workstyle((select completed_at is not null and feedback is null from public.workstyle_pretest_sessions where assessment_id=id),'feedback optional, finish idempotent');
   begin perform public.save_workstyle_pretest_answer(id,'EVI-01','8.4-v0.2',1,null); raise exception 'completed response changed'; exception when check_violation then null; end;
 end loop;
 begin update public.workstyle_item_versions set definition=jsonb_set(definition,'{prompt}','"changed"') where item_key='EVI-01'; raise exception 'item version overwritten'; exception when check_violation then null; end;
end $$;

insert into public.founder_teams(id,name,team_context) values('e8511000-0000-4000-8000-000000000001','Workstyle Test','existing_team');
insert into public.founder_team_members(team_id,user_id) values
 ('e8511000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000001'),
 ('e8511000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000002');
insert into public.assessments(id,user_id,module,instrument_id,venture_id) values
 ('e8512000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000001','venture_alignment','venture-alignment-v1','e8511000-0000-4000-8000-000000000001'),
 ('e8512000-0000-4000-8000-000000000002','e8510000-0000-4000-8000-000000000002','venture_alignment','venture-alignment-v1','e8511000-0000-4000-8000-000000000001');
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values
 ('e8512000-0000-4000-8000-000000000001','U01','ordinal_choice','{"optionId":"U01_o1"}'),
 ('e8512000-0000-4000-8000-000000000002','U01','ordinal_choice','{"optionId":"U01_o2"}');
update public.assessments set submitted_at=now() where id in ('e8512000-0000-4000-8000-000000000001','e8512000-0000-4000-8000-000000000002');
select set_config('request.jwt.claims','{"sub":"e8510000-0000-4000-8000-000000000003","role":"authenticated"}',true);
reset role;
-- Reporting now requires explicit consent for the exact advisor group, also for historical inputs.
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at) values('e8513000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000003','e8510000-0000-4000-8000-000000000003','active',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) values
 ('e8513000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000001','approved',now()),
 ('e8513000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000002','approved',now());
-- Phase 12C.1B: wie bei der Aktivierung an das Team mit exakt dieser Gruppe binden.
update public.advisor_team_reviews set team_id=public.advisor_team_review_matching_team(id),team_bound_at=now() where team_id is null and status='active';
set local role authenticated;
select pg_temp.check_workstyle(public.get_workstyle_team_inputs('e8511000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'advisor without sharing denied');
reset role;
insert into public.alignment_shares(assessment_id,recipient_user_id)
select assessment,'e8510000-0000-4000-8000-000000000003' from workstyle_ids where person<>'e8510000-0000-4000-8000-000000000003';
insert into public.alignment_shares(assessment_id,recipient_user_id) values
 ('e8512000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000003'),
 ('e8512000-0000-4000-8000-000000000002','e8510000-0000-4000-8000-000000000003');
-- Phase 11.6: Advisor-Freigaben allein ergeben keine Team-Eingaben; erst wenn
-- die Mitglieder ihre Arbeitsprofile auch gegenseitig freigegeben haben.
set local role authenticated;
select pg_temp.check_workstyle(public.get_workstyle_team_inputs('e8511000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'advisor shares without mutual member shares stay not_ready');
reset role;
insert into public.alignment_shares(assessment_id,recipient_user_id)
select a.assessment,b.person from workstyle_ids a join workstyle_ids b on b.person<>a.person
where a.person in ('e8510000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000002')
 and b.person in ('e8510000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000002');
set local role authenticated;
do $$ declare result jsonb; begin
 result:=public.get_workstyle_team_inputs('e8511000-0000-4000-8000-000000000001');
 perform pg_temp.check_workstyle(result->>'status'='ready','explicitly shared two-founder context ready');
 perform pg_temp.check_workstyle(jsonb_array_length(result->'people')=2 and jsonb_array_length(result->'people'->0->'core')=20,'two equal core sets');
 perform pg_temp.check_workstyle(not exists(select 1 from jsonb_array_elements(result->'people') p,jsonb_array_elements(p->'core') a
   join public.workstyle_item_versions i on i.item_key=a->>'item_key' and i.assessment_version='8.5a-v1' where i.definition->>'usage'='research_only'),'no research item in team inputs');
end $$;
reset role;
insert into public.alignment_share_hidden_blocks(share_id,block_id)
select id,'EVI-01' from public.alignment_shares where assessment_id=(select assessment from workstyle_ids where person='e8510000-0000-4000-8000-000000000001') and recipient_user_id='e8510000-0000-4000-8000-000000000003';
set local role authenticated;
select pg_temp.check_workstyle(public.get_workstyle_team_inputs('e8511000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'hidden core prevents complete comparison');
reset role;
delete from public.alignment_share_hidden_blocks where block_id='EVI-01';
insert into public.founder_team_members(team_id,user_id) values('e8511000-0000-4000-8000-000000000001','e8510000-0000-4000-8000-000000000003');
set local role authenticated;
select pg_temp.check_workstyle(public.get_workstyle_team_inputs('e8511000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'three members never yield a partial pair report');
reset role;
delete from public.founder_team_members where team_id='e8511000-0000-4000-8000-000000000001' and user_id='e8510000-0000-4000-8000-000000000003';
update public.alignment_shares set revoked_at=now() where recipient_user_id='e8510000-0000-4000-8000-000000000003';
set local role authenticated;
select pg_temp.check_workstyle(public.get_workstyle_team_inputs('e8511000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'revoked advisor denied');
reset role;

insert into public.platform_admins(user_id) values('e8510000-0000-4000-8000-000000000004');
select set_config('request.jwt.claims','{"sub":"e8510000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
do $$ declare dataset jsonb; begin
 dataset:=public.get_workstyle_research_dataset();
 perform pg_temp.check_workstyle(jsonb_array_length(dataset)>=3,'admin dataset');
 perform pg_temp.check_workstyle(dataset::text not like '%user_id%' and dataset::text not like '%assessment_id%' and dataset::text not like '%example.test%','dataset has no direct identities');
end $$;
reset role;

-- Existing central research withdrawal also removes the new research data.
select set_config('request.jwt.claims','{"sub":"e8510000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_workstyle_feedback((select assessment from workstyle_ids where person=auth.uid()),'{"clarity":4,"unclear_items":["EVI-01"]}');
select pg_temp.check_workstyle((public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"none","team_size":"solo"}',true)->>'assessment_id')::uuid<>(select assessment from workstyle_ids where person=auth.uid()),'reassessment creates a new historical record');
select pg_temp.check_workstyle((select count(*)=20 from public.alignment_answers where assessment_id=(select assessment from workstyle_ids where person=auth.uid())),'reassessment preserves prior responses');
select * from public.set_my_research_consent('declined');
reset role;
select pg_temp.check_workstyle((select withdrawn_at is not null and context='{}' and timings='{}' and feedback is null from public.workstyle_pretest_sessions where assessment_id=(select assessment from workstyle_ids where person='e8510000-0000-4000-8000-000000000001')),'withdrawal clears metadata');
select pg_temp.check_workstyle((select count(*)=0 from public.workstyle_research_responses where assessment_id=(select assessment from workstyle_ids where person='e8510000-0000-4000-8000-000000000001')),'withdrawal deletes extension');
select pg_temp.check_workstyle((select count(*)=20 from public.alignment_answers where assessment_id=(select assessment from workstyle_ids where person='e8510000-0000-4000-8000-000000000001')),'completed portable product core survives research withdrawal');
select set_config('request.jwt.claims','{"sub":"e8510000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select public.withdraw_workstyle_research();
select pg_temp.check_workstyle(public.get_my_workstyle_pretest() is null,'incomplete research withdrawal removes draft');
reset role;
select extensions.pass('Workstyle versions, consent, balanced resume, missing, RLS, private research, team sharing and withdrawal');
select * from extensions.finish();
rollback;
