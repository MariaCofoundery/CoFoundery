\set ON_ERROR_STOP on
-- Phase 12C.1C: Erklaerende Zugangszustaende statt 404.
-- Statusauskunft ist kein Datenzugriff, und wer nie Zugang hatte, bekommt
-- 'none' - genau wie fuer eine Kennung, die es nicht gibt (kein Orakel).
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'access_state_recovery: %',label; end if; end $$;
-- 1-3 Founder, 4 persoenlicher Advisor, 5 Org-Inhaberin, 6 Org-Advisor,
-- 7 Aussenstehende, 8 Paar-Advisor, 9 Founder fuer Kontoloeschung.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e87d0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','state-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,9)n;
create function pg_temp.p(n integer) returns uuid language sql as $$ select ('e87d0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
insert into public.profiles(user_id,display_name,roles) select pg_temp.p(n),'State '||n,case when n in (1,2,3,7,9) then array['founder'] else array['advisor'] end from generate_series(1,9)n
 on conflict(user_id) do update set roles=excluded.roles;
insert into public.person_core(user_id,display_name) select pg_temp.p(n),'State '||n from generate_series(1,9)n on conflict(user_id) do update set display_name=excluded.display_name;
create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.p(n),'role','authenticated')::text,true); end $$;
create function pg_temp.team_state(viewer integer,team uuid) returns text language plpgsql as $$
declare r text; begin perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 r:=public.get_team_access_state(team); execute 'reset role'; return r; end $$;
create function pg_temp.review_state(viewer integer,review uuid) returns jsonb language plpgsql as $$
declare r jsonb; begin perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 r:=public.get_advisor_team_review_state(review); execute 'reset role'; return r; end $$;
create function pg_temp.person_state(viewer integer,subject integer) returns text language plpgsql as $$
declare r text; begin perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 r:=public.get_advisor_person_access_state(pg_temp.p(subject)); execute 'reset role'; return r; end $$;
create function pg_temp.try(n integer,stmt text) returns text language plpgsql as $$
begin perform pg_temp.as_user(n); execute 'set local role authenticated'; execute stmt; execute 'reset role'; return 'ok';
exception when others then execute 'reset role'; return sqlerrm; end $$;

-- ===========================================================================
-- Grundlagen: Rechte und kein Orakel
-- ===========================================================================
select pg_temp.check(
  has_function_privilege('authenticated','public.get_team_access_state(uuid)','execute')
  and not has_function_privilege('anon','public.get_team_access_state(uuid)','execute')
  and has_function_privilege('authenticated','public.get_advisor_team_review_state(uuid)','execute')
  and not has_function_privilege('anon','public.get_advisor_team_review_state(uuid)','execute')
  and has_function_privilege('authenticated','public.get_advisor_person_access_state(uuid)','execute')
  and not has_function_privilege('anon','public.get_advisor_person_access_state(uuid)','execute')
  and has_function_privilege('authenticated','public.get_advisor_org_member_list(uuid)','execute')
  and not has_function_privilege('anon','public.get_advisor_org_member_list(uuid)','execute'),
  'grants: authenticated only');
select pg_temp.check(not has_table_privilege('authenticated','public.founder_team_member_exits','select'),'exits are not client-readable');

insert into public.founder_teams(id,name,team_context) values
 ('e87d1000-0000-4000-8000-000000000001','State team','existing_team'),
 ('e87d1000-0000-4000-8000-000000000002','Org team','existing_team'),
 ('e87d1000-0000-4000-8000-000000000003','Pair team','existing_team');
insert into public.founder_team_members(team_id,user_id) values
 ('e87d1000-0000-4000-8000-000000000001',pg_temp.p(1)),('e87d1000-0000-4000-8000-000000000001',pg_temp.p(2)),
 ('e87d1000-0000-4000-8000-000000000002',pg_temp.p(2)),('e87d1000-0000-4000-8000-000000000002',pg_temp.p(3)),
 ('e87d1000-0000-4000-8000-000000000003',pg_temp.p(2)),('e87d1000-0000-4000-8000-000000000003',pg_temp.p(3));

select pg_temp.check(pg_temp.team_state(1,'e87d1000-0000-4000-8000-000000000001')='member','member');
-- B = A: nie Zugang und nicht existent sehen gleich aus.
select pg_temp.check(pg_temp.team_state(7,'e87d1000-0000-4000-8000-000000000001')='none','B: stranger gets none for an existing team');
select pg_temp.check(pg_temp.team_state(7,'e87d1000-0000-4000-8000-0000000000ff')='none','A: unknown team is none');

-- ===========================================================================
-- D/F) Teamreview: gebunden, Rosterwechsel
-- ===========================================================================
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at,team_id,team_bound_at)
 values ('e87d2000-0000-4000-8000-000000000001',pg_temp.p(4),pg_temp.p(4),'active',now(),'e87d1000-0000-4000-8000-000000000001',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) values
 ('e87d2000-0000-4000-8000-000000000001',pg_temp.p(1),'approved',now()),('e87d2000-0000-4000-8000-000000000001',pg_temp.p(2),'approved',now());
select pg_temp.check(pg_temp.team_state(4,'e87d1000-0000-4000-8000-000000000001')='readable','D: bound review reads the team');
select pg_temp.check(pg_temp.review_state(4,'e87d2000-0000-4000-8000-000000000001')=jsonb_build_object('state','active_with_team','team_id','e87d1000-0000-4000-8000-000000000001'),'J: review state names only its own bound team');
select pg_temp.check(pg_temp.review_state(7,'e87d2000-0000-4000-8000-000000000001')=jsonb_build_object('state','none'),'review state: stranger gets none');
select pg_temp.check(pg_temp.review_state(1,'e87d2000-0000-4000-8000-000000000001')=jsonb_build_object('state','none'),'review state: subjects are not the advisor');
insert into public.founder_team_members(team_id,user_id) values ('e87d1000-0000-4000-8000-000000000001',pg_temp.p(3));
select pg_temp.check(pg_temp.team_state(4,'e87d1000-0000-4000-8000-000000000001')='roster_changed','D: roster change explained to the advisor');
select pg_temp.check(pg_temp.review_state(4,'e87d2000-0000-4000-8000-000000000001')->>'state'='active_team_changed','D: review stays active, team link ended');
select pg_temp.check(not (pg_temp.review_state(4,'e87d2000-0000-4000-8000-000000000001') ? 'team_id'),'D: no team id once access ended');

-- H) Gruppenreview ohne Teambezug
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at)
 values ('e87d2000-0000-4000-8000-000000000003',pg_temp.p(4),pg_temp.p(4),'active',now());
select pg_temp.check(pg_temp.review_state(4,'e87d2000-0000-4000-8000-000000000003')->>'state'='active_without_team','H: active review without team context');
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status)
 values ('e87d2000-0000-4000-8000-000000000004',pg_temp.p(4),pg_temp.p(4),'requested');
select pg_temp.check(pg_temp.review_state(4,'e87d2000-0000-4000-8000-000000000004')->>'state'='requested','review still requested');

-- ===========================================================================
-- F/G) Org-Review: Mitgliedschaft beendet, Organisation ausgesetzt, beendet
-- ===========================================================================
insert into public.advisor_orgs(id,name) values ('e87d3000-0000-4000-8000-000000000001','State Org');
insert into public.advisor_org_members(org_id,user_id,role) values
 ('e87d3000-0000-4000-8000-000000000001',pg_temp.p(5),'owner'),('e87d3000-0000-4000-8000-000000000001',pg_temp.p(6),'advisor');
insert into public.advisor_team_reviews(id,org_id,requested_by_user_id,status,activated_at,team_id,team_bound_at)
 values ('e87d2000-0000-4000-8000-000000000002','e87d3000-0000-4000-8000-000000000001',pg_temp.p(6),'active',now(),'e87d1000-0000-4000-8000-000000000002',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) values
 ('e87d2000-0000-4000-8000-000000000002',pg_temp.p(2),'approved',now()),('e87d2000-0000-4000-8000-000000000002',pg_temp.p(3),'approved',now());
select pg_temp.check(pg_temp.team_state(6,'e87d1000-0000-4000-8000-000000000002')='readable','org advisor reads the bound team');
update public.advisor_org_members set status='revoked',revoked_at=now() where user_id=pg_temp.p(6);
select pg_temp.check(pg_temp.team_state(6,'e87d1000-0000-4000-8000-000000000002')='org_membership_ended','F: ended org membership explained');
select pg_temp.check(pg_temp.review_state(6,'e87d2000-0000-4000-8000-000000000002')->>'state'='org_membership_ended','F: review state names the org membership');
update public.advisor_org_members set status='active',revoked_at=null where user_id=pg_temp.p(6);
update public.advisor_orgs set status='suspended' where id='e87d3000-0000-4000-8000-000000000001';
select pg_temp.check(pg_temp.team_state(6,'e87d1000-0000-4000-8000-000000000002')='org_suspended','G: suspended org explained');
select pg_temp.check(pg_temp.review_state(6,'e87d2000-0000-4000-8000-000000000002')->>'state'='org_suspended','G: review state names the suspension');
update public.advisor_orgs set status='active' where id='e87d3000-0000-4000-8000-000000000001';
update public.advisor_team_reviews set status='revoked',closed_at=now() where id='e87d2000-0000-4000-8000-000000000002';
select pg_temp.check(pg_temp.team_state(6,'e87d1000-0000-4000-8000-000000000002')='review_ended','review ended explained');
select pg_temp.check(pg_temp.review_state(6,'e87d2000-0000-4000-8000-000000000002')=jsonb_build_object('state','ended'),'ended without naming who');

-- ===========================================================================
-- Paar-Advisor
-- ===========================================================================
insert into public.relationships(id,user_a_id,user_b_id,founder_team_id) values ('e87d4000-0000-4000-8000-000000000003',pg_temp.p(2),pg_temp.p(3),'e87d1000-0000-4000-8000-000000000003');
insert into public.relationship_advisors(relationship_id,advisor_user_id,status,founder_a_approved,founder_b_approved,linked_at)
 values ('e87d4000-0000-4000-8000-000000000003',pg_temp.p(8),'linked',true,true,now());
select pg_temp.check(pg_temp.team_state(8,'e87d1000-0000-4000-8000-000000000003')='readable','pair advisor reads the pair team');
update public.relationship_advisors set revoked_at=now() where advisor_user_id=pg_temp.p(8);
select pg_temp.check(pg_temp.team_state(8,'e87d1000-0000-4000-8000-000000000003')='access_ended','E: ended pair advisor access explained');

-- ===========================================================================
-- E) Personenzugang
-- ===========================================================================
select pg_temp.check(pg_temp.person_state(4,1)='none','person: never had access is none');
insert into public.advisor_person_grants(id,subject_user_id,advisor_user_id,scope,status,requested_by_user_id,approved_at)
 values ('e87d5000-0000-4000-8000-000000000001',pg_temp.p(1),pg_temp.p(4),'base','active',pg_temp.p(4),now());
select pg_temp.check(pg_temp.person_state(4,1)='active','person: active');
update public.advisor_person_grants set status='revoked',revoked_at=now(),approved_at=null where id='e87d5000-0000-4000-8000-000000000001';
select pg_temp.check(pg_temp.person_state(4,1)='ended','E: revoked person access explained');
insert into public.advisor_person_grants(subject_user_id,advisor_user_id,scope,status,requested_by_user_id)
 values (pg_temp.p(1),pg_temp.p(4),'capability','requested',pg_temp.p(4));
select pg_temp.check(pg_temp.person_state(4,1)='pending','person: open request');
select pg_temp.check(pg_temp.person_state(7,1)='none','person: stranger is none');
select pg_temp.check(pg_temp.person_state(1,1)='none','person: self is none');
insert into public.advisor_person_grants(subject_user_id,org_id,scope,status,requested_by_user_id,approved_at)
 values (pg_temp.p(2),'e87d3000-0000-4000-8000-000000000001','base','active',pg_temp.p(6),now());
select pg_temp.check(pg_temp.person_state(6,2)='active','person: org grant active');
update public.advisor_org_members set status='revoked',revoked_at=now() where user_id=pg_temp.p(6);
select pg_temp.check(pg_temp.person_state(6,2)='org_membership_ended','F: org membership ended for person access');
update public.advisor_org_members set status='active',revoked_at=null where user_id=pg_temp.p(6);
update public.advisor_orgs set status='suspended' where id='e87d3000-0000-4000-8000-000000000001';
select pg_temp.check(pg_temp.person_state(6,2)='org_suspended','G: suspended org for person access');
update public.advisor_orgs set status='active' where id='e87d3000-0000-4000-8000-000000000001';

-- ===========================================================================
-- N) Org-Mitgliederliste mit Namen
-- ===========================================================================
update public.advisor_org_members set status='revoked',revoked_at=now() where user_id=pg_temp.p(6);
insert into public.advisor_org_members(org_id,user_id,role) values ('e87d3000-0000-4000-8000-000000000001',pg_temp.p(4),'advisor');
create temp table org_list(viewer integer,user_id uuid,role text,status text,display_name text,is_self boolean); grant all on org_list to authenticated;
do $$ declare n integer; begin
 foreach n in array array[5,4,6,7] loop
  perform pg_temp.as_user(n); execute 'set local role authenticated';
  insert into org_list select n,* from public.get_advisor_org_member_list('e87d3000-0000-4000-8000-000000000001');
  execute 'reset role';
 end loop; end $$;
select pg_temp.check((select count(*) from org_list where viewer=5)=3,'N: owner sees active and ended memberships');
select pg_temp.check((select display_name from org_list where viewer=5 and user_id=pg_temp.p(6))='State 6' and (select status from org_list where viewer=5 and user_id=pg_temp.p(6))='revoked','N: owner sees the ended member by name');
select pg_temp.check((select is_self from org_list where viewer=5 and user_id=pg_temp.p(5)),'N: own row is marked');
select pg_temp.check((select count(*) from org_list where viewer=4)=2 and not exists(select 1 from org_list where viewer=4 and status='revoked'),'N: advisor sees active members only');
select pg_temp.check((select role from org_list where viewer=4 and user_id=pg_temp.p(5))='owner','N: roles come along');
select pg_temp.check(not exists(select 1 from org_list where viewer in (6,7)),'N: ex-members and strangers see nobody');

-- ===========================================================================
-- B/C) Austritt, Archivierung, Hinweise
-- ===========================================================================
insert into public.in_app_notices(recipient_user_id,actor_user_id,kind,subject_id,path) values
 (pg_temp.p(1),pg_temp.p(2),'read_my_mind_handoff','e87d6000-0000-4000-8000-000000000001','/teams/e87d1000-0000-4000-8000-000000000001/collaboration-lab/read-my-mind'),
 (pg_temp.p(1),pg_temp.p(2),'discovery_intro_request','e87d6000-0000-4000-8000-000000000002','/discovery/intros');
select pg_temp.check(pg_temp.try(1,'select public.leave_founder_team(''e87d1000-0000-4000-8000-000000000001'')')='ok','member leaves');
select pg_temp.check(pg_temp.team_state(1,'e87d1000-0000-4000-8000-000000000001')='left','B: former member sees "left"');
select pg_temp.check((select read_at is not null from public.in_app_notices where subject_id='e87d6000-0000-4000-8000-000000000001'),'notice into the left team is resolved');
select pg_temp.check((select read_at is null from public.in_app_notices where subject_id='e87d6000-0000-4000-8000-000000000002'),'other notices stay');
select pg_temp.check(pg_temp.team_state(7,'e87d1000-0000-4000-8000-000000000001')='none','stranger still none after a departure');
select pg_temp.check(pg_temp.try(2,'select public.leave_founder_team(''e87d1000-0000-4000-8000-000000000001'')')='ok' and pg_temp.try(3,'select public.leave_founder_team(''e87d1000-0000-4000-8000-000000000001'')')='ok','last members leave');
select pg_temp.check((select archived_at is not null from public.founder_teams where id='e87d1000-0000-4000-8000-000000000001'),'C: team archived');
select pg_temp.check(pg_temp.team_state(1,'e87d1000-0000-4000-8000-000000000001')='archived','C: former member sees "archived"');
select pg_temp.check(pg_temp.team_state(4,'e87d1000-0000-4000-8000-000000000001')='team_inactive','C: former advisor sees the team inactive');
select pg_temp.check(pg_temp.review_state(4,'e87d2000-0000-4000-8000-000000000001')->>'state'='active_team_inactive','C: review names the inactive team');
-- Statusinformation ist kein Datenzugriff.
do $$ begin perform pg_temp.as_user(1); execute 'set local role authenticated';
 if public.can_read_workstyle_team('e87d1000-0000-4000-8000-000000000001') then raise exception 'archived team readable'; end if;
 if exists(select 1 from public.founder_teams where id='e87d1000-0000-4000-8000-000000000001') then raise exception 'archived team row visible'; end if;
 execute 'reset role'; end $$;
-- Wiederbeitritt: wieder Mitglied, der Austritt bleibt Historie.
insert into public.founder_team_members(team_id,user_id) values ('e87d1000-0000-4000-8000-000000000002',pg_temp.p(1));
select pg_temp.check(pg_temp.team_state(1,'e87d1000-0000-4000-8000-000000000002')='member','rejoin elsewhere is membership');

-- Kontoloeschung: kein Austrittseintrag fuer ein geloeschtes Konto, kein Fehler.
insert into public.founder_teams(id,name,team_context) values ('e87d1000-0000-4000-8000-000000000009','Deletion team','existing_team');
insert into public.founder_team_members(team_id,user_id) values ('e87d1000-0000-4000-8000-000000000009',pg_temp.p(9)),('e87d1000-0000-4000-8000-000000000009',pg_temp.p(2));
delete from auth.users where id=pg_temp.p(9);
select pg_temp.check(not exists(select 1 from public.founder_team_member_exits where user_id=pg_temp.p(9)),'account deletion leaves no exit row');
select pg_temp.check(exists(select 1 from public.founder_team_member_exits where user_id=pg_temp.p(1) and team_id='e87d1000-0000-4000-8000-000000000001'),'leave leaves an exit row');

select extensions.pass('access_state_recovery');
select * from extensions.finish();
rollback;
