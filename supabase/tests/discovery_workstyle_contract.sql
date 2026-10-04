\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check_discovery(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'report: %',label; end if; end $$;
create temp table discovery_people(n integer,person uuid,assessment uuid);
grant all on discovery_people to authenticated;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e9510000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','discovery-contract-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,6)n;
insert into discovery_people select n,('e9510000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,null from generate_series(1,6)n;
insert into public.profiles(user_id,display_name,roles) select person,'Report '||n,array['founder'] from discovery_people on conflict(user_id) do update set roles=excluded.roles;
insert into public.founder_teams(id,name,team_context) values('e9511000-0000-4000-8000-000000000001','Report team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e9511000-0000-4000-8000-000000000001',person from discovery_people where n<=2;
-- Complete current profiles through the actual private-write boundary.
do $$ declare p record;i record;id uuid;begin
 for p in select * from discovery_people where n<=4 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p.person,'role','authenticated')::text,true);
  id:=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"larger"}')->>'assessment_id')::uuid;
  update discovery_people set assessment=id where person=p.person;
  for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' order by position loop
   perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,case when i.definition->>'response_format' not in ('comparative','behavioral') then case when p.n=2 then 5 else 1 end end,case when i.definition->>'response_format' in ('comparative','behavioral') then i.definition->'options'->0->>'option_id' end,null,nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
  end loop;
 end loop;
end $$;

insert into public.founder_discovery_profiles(user_id,status,display_name,headline,bio,own_roles,seeking_roles,industries,remote_mode,availability_hours_per_week,commitment_level,venture_stage,venture_goal,expertise)
select person,'active','Contract founder','Working together','-','{tech}','{sales}','{}','remote',20,'full_time','idea_validating','profitable_business','{}' from discovery_people where n<=4;
-- Team shares and research consent alone never grant discovery delivery.
insert into public.alignment_shares(assessment_id,recipient_user_id) select p.assessment,v.person from discovery_people p cross join discovery_people v where p.n<=4 and p.person<>v.person;
select set_config('request.jwt.claims','{"sub":"e9510000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.check_discovery((select count(*)=0 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002')),'research consent and team shares do not grant FIND');
select public.set_discovery_workstyle_consent(true);
select pg_temp.check_discovery((select count(*)=0 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002')),'one opt-in insufficient');
select set_config('request.jwt.claims','{"sub":"e9510000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.set_discovery_workstyle_consent(true);
select set_config('request.jwt.claims','{"sub":"e9510000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.set_discovery_workstyle_consent(true);
select set_config('request.jwt.claims','{"sub":"e9510000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select pg_temp.check_discovery((select count(*)=6 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002')),'six product areas');
select pg_temp.check_discovery((select count(*)=6 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000003') where pattern='SIMILAR_PATTERN'),'identical patterns');
select pg_temp.check_discovery((select count(*)>0 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002') where pattern='DISCUSSION_POINT'),'different patterns');
select pg_temp.check_discovery((select bool_and((select count(*)=2 from jsonb_object_keys(to_jsonb(s)))) from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002') s),'allowlisted payload: only area and pattern');
select pg_temp.check_discovery((select count(*)=1 from public.founder_search_preferences),'RLS only own preferences');
select pg_temp.check_discovery((select count(*)=0 from public.discovery_theme_distances('e9510000-0000-4000-8000-000000000002')),'legacy endpoint no longer delivers numeric distances');
select public.set_discovery_workstyle_consent(false);
select pg_temp.check_discovery((select count(*)=0 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002')),'revocation immediate');
select public.set_discovery_workstyle_consent(true);
reset role;
-- Research values, private candidates and their feedback cannot affect the projection.
create temp table before_signals as select * from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002');
delete from public.workstyle_research_responses where assessment_id in(select assessment from discovery_people);
select pg_temp.check_discovery(not exists((select * from before_signals except select * from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002')) union all (select * from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002') except select * from before_signals)),'research responses have no influence');
-- The pure band helper never coerces missing, FC or behavioral values into numbers.
select pg_temp.check_discovery(public.discovery_workstyle_band('{"scale":3}','cannot_assess','{"response_format":"likelihood"}') is null,'missing stays missing');
select pg_temp.check_discovery(public.discovery_workstyle_band('{"optionId":"x"}',null,'{"response_format":"behavioral"}') is null,'behavioral excluded from FIND projection');
select pg_temp.check_discovery(public.discovery_workstyle_band('{"scale":"5"}',null,'{"response_format":"likelihood"}') is null,'malformed numeric string excluded');
-- Explicit confirmed-start handoff is idempotent and creates no report, answers or agreements.
insert into public.discovery_intro_requests(id,requester_user_id,recipient_user_id,status,message,responded_at)
 values('e9513000-0000-4000-8000-000000000001','e9510000-0000-4000-8000-000000000003','e9510000-0000-4000-8000-000000000004','accepted','Talk',now());
insert into public.discovery_matching_starts(id,intro_request_id,initiator_user_id,requester_user_id,recipient_user_id,status)
 values('e9514000-0000-4000-8000-000000000001','e9513000-0000-4000-8000-000000000001','e9510000-0000-4000-8000-000000000003','e9510000-0000-4000-8000-000000000003','e9510000-0000-4000-8000-000000000004','preparing');
select set_config('request.jwt.claims','{"sub":"e9510000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 begin perform public.open_discovery_workstyle_team('e9514000-0000-4000-8000-000000000001');raise exception 'unconfirmed start accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.discovery_matching_starts set status='awaiting_other_confirmation',requested_by_user_id=requester_user_id,requested_at=now() where id='e9514000-0000-4000-8000-000000000001';
update public.discovery_matching_starts set status='ready_for_matching',requested_by_user_id=requester_user_id,requested_at=now(),confirmed_by_user_id=recipient_user_id,confirmed_at=now() where id='e9514000-0000-4000-8000-000000000001';
set local role authenticated;
do $$declare t uuid;begin
 t:=public.open_discovery_workstyle_team('e9514000-0000-4000-8000-000000000001');
 perform pg_temp.check_discovery(t=public.open_discovery_workstyle_team('e9514000-0000-4000-8000-000000000001'),'idempotent same existing team');
 perform pg_temp.check_discovery((select count(*)=2 from public.founder_team_members where team_id=t),'existing pair membership');
 perform pg_temp.check_discovery(not exists(select 1 from public.founder_team_setup_items where team_id=t and (pending_revision_id is not null or current_confirmed_revision_id is not null)),'no automatic setup agreement');
end $$;
select set_config('request.jwt.claims','{"sub":"e9510000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$begin
 begin perform public.open_discovery_workstyle_team('e9514000-0000-4000-8000-000000000001');raise exception 'foreign start accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- A newer incompatible completion blocks an older v0.4 profile; never fall back.
insert into public.assessments(user_id,module,instrument_id,submitted_at,created_at) values('e9510000-0000-4000-8000-000000000002','founder_profile','founder-workstyle-pretest-8-5a-v2',now(),now()+interval '1 day');
set local role authenticated;
select pg_temp.check_discovery((select count(*)=0 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000002')),'no fallback across versions');
select set_config('request.jwt.claims','{"sub":"e9510000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select pg_temp.check_discovery((select count(*)=0 from public.get_discovery_workstyle_signals('e9510000-0000-4000-8000-000000000001')),'outsider without own consent denied');
reset role;
select extensions.pass('Phase 9.1 discovery consent, projection and revocation contracts');
select * from extensions.finish();
rollback;
