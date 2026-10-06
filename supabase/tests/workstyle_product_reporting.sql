\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check_report(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'report: %',label; end if; end $$;
create temp table report_people(n integer,person uuid,assessment uuid);
grant all on report_people to authenticated;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8540000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','report-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,6)n;
insert into report_people select n,('e8540000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,null from generate_series(1,6)n;
insert into public.profiles(user_id,display_name,roles) select person,'Report '||n,array['founder'] from report_people on conflict(user_id) do update set roles=excluded.roles;
insert into public.founder_teams(id,name,team_context) values('e8541000-0000-4000-8000-000000000001','Report team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e8541000-0000-4000-8000-000000000001',person from report_people where n<=2;
-- Complete current profiles through the actual private-write boundary.
do $$ declare p record;i record;id uuid;begin
 for p in select * from report_people where n<=4 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p.person,'role','authenticated')::text,true);
  id:=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"larger"}')->>'assessment_id')::uuid;
  update report_people set assessment=id where person=p.person;
  for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'revision_of' is null order by position loop
   perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,null,null,'cannot_assess',nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
  end loop;
 end loop;
end $$;
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_report(jsonb_array_length(public.get_workstyle_product_profile(auth.uid())->'answers')=29,'own core only');
select pg_temp.check_report(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->>'status'='not_ready','membership grants no workstyle access');
reset role;
insert into public.alignment_shares(assessment_id,recipient_user_id) select p.assessment,v.person from report_people p cross join report_people v where p.n<=4 and p.person<>v.person;
set local role authenticated;
select pg_temp.check_report(jsonb_array_length(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'people')=2,'2 founders ready');
select * from public.propose_founder_team_setup_revision('e8541000-0000-4000-8000-000000000001','time_commitment','clarified','Our pair agreement',null);
reset role;
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision((select pending_revision_id from public.founder_team_setup_items where team_id='e8541000-0000-4000-8000-000000000001' and item_key='time_commitment'));
reset role;
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_report(jsonb_array_length(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'setup')=1,'Pair agreement initially current');
select set_config('report.pair_snapshot',public.create_workstyle_product_snapshot('e8541000-0000-4000-8000-000000000001')::text,true);
reset role;
insert into public.founder_team_members(team_id,user_id) select 'e8541000-0000-4000-8000-000000000001',person from report_people where n=3;
set local role authenticated;
select pg_temp.check_report(jsonb_array_length(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'people')=3,'3 founders ready');
select pg_temp.check_report(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'setup'='[]'::jsonb,'C does not inherit pair agreement');
select pg_temp.check_report(public.get_workstyle_product_snapshot(current_setting('report.pair_snapshot')::uuid) is null,'Adding C invalidates pair snapshot');
select set_config('report.three_snapshot',public.create_workstyle_product_snapshot('e8541000-0000-4000-8000-000000000001')::text,true);
reset role;
insert into public.founder_team_members(team_id,user_id) select 'e8541000-0000-4000-8000-000000000001',person from report_people where n=4;
do $$begin
 begin insert into public.founder_team_members values('e8541000-0000-4000-8000-000000000001','e8540000-0000-4000-8000-000000000006',now());raise exception 'fifth member accepted';exception when check_violation then null;end;
end $$;
set local role authenticated;
select pg_temp.check_report(public.get_workstyle_product_snapshot(current_setting('report.three_snapshot')::uuid) is null,'Adding D invalidates three-person snapshot');
do $$declare result jsonb;s uuid;begin
 result:=public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001');
 perform pg_temp.check_report(jsonb_array_length(result->'people')=4,'4 founders ready');
 perform pg_temp.check_report(result::text not like '%DEC-%' and result::text not like '%FS-%' and result::text not like '%EVI-04%' and result::text not like '%research_consent%' and result::text not like '%feedback%','no research/candidate leakage');
 s:=public.create_workstyle_product_snapshot('e8541000-0000-4000-8000-000000000001');
 perform pg_temp.check_report(public.get_workstyle_product_snapshot(s)->>'schema_version'='workstyle-report/1.0.0','snapshot version');
 perform pg_temp.check_report(public.create_workstyle_product_snapshot('e8541000-0000-4000-8000-000000000001')=s,'unchanged snapshot reused');
 perform set_config('report.snapshot',s::text,true);
end $$;
reset role;
-- Removal must also invalidate the exact current input snapshot.
delete from public.founder_team_members where team_id='e8541000-0000-4000-8000-000000000001' and user_id='e8540000-0000-4000-8000-000000000004';
set local role authenticated;
select pg_temp.check_report(public.get_workstyle_product_snapshot(current_setting('report.snapshot')::uuid) is null,'Removing D blocks old four-person snapshot');
reset role;
insert into public.founder_team_members(team_id,user_id) values('e8541000-0000-4000-8000-000000000001','e8540000-0000-4000-8000-000000000004');
-- Product components reuse disclosure and never infer ownership from a visible area.
insert into public.person_capability_entries(user_id,area_id,application_level,ownership_wish) values('e8540000-0000-4000-8000-000000000002','customer_discovery',5,'prefer_other');
update public.person_core set capability_disclosure='private' where user_id='e8540000-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.check_report((select p->'capabilities'='[]'::jsonb from jsonb_array_elements(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'people')p where p->>'person_id'='e8540000-0000-4000-8000-000000000002'),'private capability remains private in team');
reset role;
update public.person_core set capability_disclosure='areas' where user_id='e8540000-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.check_report((select p->'capabilities'->0->>'application_level' is null and p->'capabilities'->0->>'ownership_wish' is null from jsonb_array_elements(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'people')p where p->>'person_id'='e8540000-0000-4000-8000-000000000002'),'areas alone grant neither experience depth nor ownership');
-- An unconfirmed working note is never a report agreement.
select public.save_founder_team_setup_working_state('e8541000-0000-4000-8000-000000000001','decision_rights','discussing','PRIVATE_DRAFT');
select pg_temp.check_report(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'setup'='[]'::jsonb,'working state excluded');
select * from public.propose_founder_team_setup_revision('e8541000-0000-4000-8000-000000000001','decision_rights','clarified','Gemeinsam besprechen und alle Stimmen festhalten',null);
reset role;
do $$declare p record;r uuid;begin
 select pending_revision_id into r from public.founder_team_setup_items where team_id='e8541000-0000-4000-8000-000000000001' and item_key='decision_rights';
 for p in select * from report_people where n between 2 and 4 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p.person,'role','authenticated')::text,true);
  perform public.confirm_founder_team_setup_revision(r);
 end loop;
end $$;
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_report(jsonb_array_length(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'setup')=1,'unanimous four-person setup included');
reset role;
-- A response share alone must not become a team/advisor grant.
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000005","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_report(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001') is null,'advisor shares without group grant denied');
select pg_temp.check_report(public.get_workstyle_product_snapshot(current_setting('report.snapshot')::uuid) is null,'foreign snapshot denied');
reset role;
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at) values('e8542000-0000-4000-8000-000000000001','e8540000-0000-4000-8000-000000000005','e8540000-0000-4000-8000-000000000005','active',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) select 'e8542000-0000-4000-8000-000000000001',person,'approved',now() from report_people where n<=4;
-- Phase 12C.1B: wie bei der Aktivierung an das Team mit exakt dieser Gruppe binden.
update public.advisor_team_reviews set team_id=public.advisor_team_review_matching_team(id),team_bound_at=now() where team_id is null and status='active';
set local role authenticated;
select pg_temp.check_report(jsonb_array_length(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'people')=4,'exact approved advisor group plus response shares permits report');
select pg_temp.check_report(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'setup'='[]'::jsonb,'team review does not grant setup');
reset role;
-- Group workstyle consent is not capability consent; an area grant still excludes depth.
set local role authenticated;
select pg_temp.check_report((select p->'capabilities'='[]'::jsonb from jsonb_array_elements(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'people')p where p->>'person_id'='e8540000-0000-4000-8000-000000000002'),'advisor has no automatic capability access');
reset role;
insert into public.advisor_person_grants(subject_user_id,advisor_user_id,scope,status,requested_by_user_id,approved_at) values('e8540000-0000-4000-8000-000000000002','e8540000-0000-4000-8000-000000000005','capability','active','e8540000-0000-4000-8000-000000000002',now());
set local role authenticated;
select pg_temp.check_report((select p->'capabilities'->0->>'area_id'='customer_discovery' and p->'capabilities'->0->>'ownership_wish' is null from jsonb_array_elements(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->'people')p where p->>'person_id'='e8540000-0000-4000-8000-000000000002'),'advisor capability is scoped separately from depth');
reset role;
-- Owners can explicitly share/limit/revoke using the same atomic product endpoint as the UI.
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_report(exists(select 1 from public.get_workstyle_share_recipients() where user_id='e8540000-0000-4000-8000-000000000002'),'team recipient selectable');
select pg_temp.check_report(not exists(select 1 from public.get_workstyle_share_recipients() where user_id='e8540000-0000-4000-8000-000000000006'),'outsider not discoverable');
select public.share_workstyle_product('e8540000-0000-4000-8000-000000000002',array['EVI-01'],false);
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.check_report(jsonb_array_length(public.get_workstyle_product_profile('e8540000-0000-4000-8000-000000000001')->'answers')=28,'individual respects excluded answers');
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.share_workstyle_product('e8540000-0000-4000-8000-000000000002','{}',true);
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.check_report(public.get_workstyle_product_profile('e8540000-0000-4000-8000-000000000001') is null,'revoked product share hides profile');
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.share_workstyle_product('e8540000-0000-4000-8000-000000000002','{}',false);
reset role;
-- Hidden core prevents complete team report and invalidates an old snapshot.
insert into public.alignment_share_hidden_blocks(share_id,block_id) select s.id,'EVI-01' from public.alignment_shares s join report_people p on p.assessment=s.assessment_id where p.n=2 and s.recipient_user_id='e8540000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_report(public.get_workstyle_product_team('e8541000-0000-4000-8000-000000000001')->>'status'='not_ready','hidden core not ready');
select pg_temp.check_report(public.get_workstyle_product_snapshot(current_setting('report.snapshot')::uuid) is null,'snapshot cannot bypass new exclusions');
reset role;
-- Newest completed historical instrument is not silently replaced by older v3.
select set_config('request.jwt.claims','{"sub":"e8540000-0000-4000-8000-000000000004","role":"authenticated"}',true);
do $$declare aid uuid;i record;begin
 aid:=(public.start_workstyle_pretest('workstyle_research_v2','{"founder_experience":"1","team_size":"larger"}')->>'assessment_id')::uuid;
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v2' order by position loop perform public.save_workstyle_pretest_answer(aid,i.item_key,i.item_version,3,null);end loop;
 perform public.finish_workstyle_pretest_v2(aid,'8.4-v0.3',3,null,100);
 update public.assessments set created_at=clock_timestamp()+interval '1 minute' where public.assessments.id=aid;
end $$;
set local role authenticated;
select pg_temp.check_report(public.get_workstyle_product_profile(auth.uid()) is null,'no older version fallback');
select pg_temp.check_report(not has_table_privilege('authenticated','public.workstyle_product_snapshots','SELECT'),'snapshots RPC only');
reset role;
select extensions.pass('workstyle product reporting: 2/3/4, grants, snapshots, exclusions and version isolation');
select * from extensions.finish();
rollback;
