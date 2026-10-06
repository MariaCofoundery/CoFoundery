\set ON_ERROR_STOP on
-- Phase 12C.1B: Team-, Organisations- und Einwilligungs-Lebenszyklus.
-- A-C Org-gerichtete Freigaben, D-G Review/Roster, H-L Organisation,
-- M-N Orakel/RLS, O Setup-Leser, R Blockierung, S-T Teamarchivierung.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'team_org_lifecycle: %',label; end if; end $$;
-- 1-4 Founder, 5 persoenlicher Advisor, 6 Org-Inhaberin, 7 Org-Advisor,
-- 8 Aussenstehende, 9 Paar-/Setup-Advisor, 10 zweite Inhaberin.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e87c0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','life-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,10)n;
create function pg_temp.p(n integer) returns uuid language sql as $$ select ('e87c0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
insert into public.profiles(user_id,display_name,roles) select pg_temp.p(n),'Life '||n,case when n<=4 or n=8 then array['founder'] else array['advisor'] end from generate_series(1,10)n
 on conflict(user_id) do update set roles=excluded.roles;
insert into public.person_core(user_id,display_name) select pg_temp.p(n),'Life '||n from generate_series(1,4)n on conflict(user_id) do update set display_name=excluded.display_name;
create temp table lc_assessment(n integer,id uuid);
do $$ declare n integer; i record; id uuid; begin
 for n in 1..4 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.p(n),'role','authenticated')::text,true);
  id:=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"larger"}')->>'assessment_id')::uuid;
  insert into lc_assessment values(n,id);
  for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'revision_of' is null order by position loop
   perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,null,null,'cannot_assess',nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
  end loop;
 end loop;
end $$;
create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.p(n),'email','life-'||n||'@example.test','role','authenticated')::text,true); end $$;
create function pg_temp.ws(viewer integer,subject integer) returns boolean language plpgsql as $$
declare r jsonb; begin perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 r:=public.get_workstyle_product_profile(pg_temp.p(subject)); execute 'reset role'; return r is not null; end $$;
create function pg_temp.team_status(viewer integer,team uuid) returns text language plpgsql as $$
declare r jsonb; begin perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 r:=public.get_workstyle_product_team(team); execute 'reset role'; return coalesce(r->>'status','none'); end $$;
create function pg_temp.base(viewer integer,subject integer) returns integer language plpgsql as $$
declare c integer; begin perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 select count(*) into c from public.get_advisor_person_base(pg_temp.p(subject)); execute 'reset role'; return c;
exception when others then execute 'reset role'; if sqlerrm<>'advisor_scope_not_granted' then raise; end if; return 0; end $$;
create function pg_temp.try(n integer,stmt text) returns text language plpgsql as $$
begin perform pg_temp.as_user(n); execute 'set local role authenticated'; execute stmt; execute 'reset role'; return 'ok';
exception when others then execute 'reset role'; return sqlerrm; end $$;

-- ===========================================================================
-- A-C) Gerichtete Freigabe an Org-Advisor
-- ===========================================================================
insert into public.advisor_orgs(id,name) values ('e87c3000-0000-4000-8000-000000000001','Life Org');
insert into public.advisor_org_members(org_id,user_id,role,created_at,activated_at) values
 ('e87c3000-0000-4000-8000-000000000001',pg_temp.p(6),'owner',now()-interval '3 days',now()-interval '3 days'),
 ('e87c3000-0000-4000-8000-000000000001',pg_temp.p(7),'advisor',now()-interval '3 days',now()-interval '3 days');
insert into public.advisor_person_grants(id,subject_user_id,org_id,scope,status,requested_by_user_id,approved_at,created_at)
 values ('e87c5000-0000-4000-8000-000000000001',pg_temp.p(1),'e87c3000-0000-4000-8000-000000000001','base','active',pg_temp.p(7),now()-interval '2 days',now()-interval '2 days');
-- Die Freigabe entstand, waehrend der Org-Weg bestand.
insert into public.alignment_shares(assessment_id,recipient_user_id,created_at) select id,pg_temp.p(7),now()-interval '1 day' from lc_assessment where n=1;
select pg_temp.check(pg_temp.ws(7,1),'A: org advisor reads the directed share while the org path exists');
-- Mitglied entfernt -> Freigabe wirkungslos.
update public.advisor_org_members set status='revoked',revoked_at=now() where user_id=pg_temp.p(7);
select pg_temp.check(not pg_temp.ws(7,1),'A: removed org member loses the directed share');
-- Wieder aufgenommen -> KEIN Aufleben.
update public.advisor_org_members set status='active',revoked_at=null where user_id=pg_temp.p(7);
select pg_temp.check((select activated_at>now()-interval '1 minute' from public.advisor_org_members where user_id=pg_temp.p(7)),'B: re-admission stamps a new activation');
select pg_temp.check(not pg_temp.ws(7,1),'B: re-admission does not revive the old share');
select pg_temp.check(pg_temp.base(7,1)=1,'B: the org grant itself works again for the re-admitted member');
-- Org ausgesetzt / Org-Zugang widerrufen und neu genehmigt -> kein Aufleben.
update public.advisor_org_members set activated_at=now()-interval '3 days' where user_id=pg_temp.p(7);
select pg_temp.check(pg_temp.ws(7,1),'A: precondition - original path restored for the next cases');
update public.advisor_orgs set status='suspended' where id='e87c3000-0000-4000-8000-000000000001';
select pg_temp.check(not pg_temp.ws(7,1),'A: suspended organisation ends the directed share');
update public.advisor_orgs set status='active' where id='e87c3000-0000-4000-8000-000000000001';
update public.advisor_person_grants set status='revoked',revoked_at=now(),approved_at=null where id='e87c5000-0000-4000-8000-000000000001';
select pg_temp.check(not pg_temp.ws(7,1),'A: revoked org grant ends the directed share');
update public.advisor_person_grants set status='active',revoked_at=null,approved_at=now() where id='e87c5000-0000-4000-8000-000000000001';
select pg_temp.check(not pg_temp.ws(7,1),'B: a newly approved org grant does not revive the old share');
-- C) Ein aktiver persoenlicher Zugang haelt eine Freigabe (unveraendert).
insert into public.advisor_person_grants(subject_user_id,advisor_user_id,scope,status,requested_by_user_id,approved_at)
 values (pg_temp.p(1),pg_temp.p(7),'strengths','active',pg_temp.p(7),now());
select pg_temp.check(pg_temp.ws(7,1),'C: an active personal advisor path keeps the share effective');
insert into public.alignment_shares(assessment_id,recipient_user_id) select id,pg_temp.p(5) from lc_assessment where n=2;
insert into public.advisor_person_grants(subject_user_id,advisor_user_id,scope,status,requested_by_user_id,approved_at)
 values (pg_temp.p(2),pg_temp.p(5),'base','active',pg_temp.p(5),now());
select pg_temp.check(pg_temp.ws(5,2),'C: personal advisor share effective');
-- Freigabe ausserhalb des Advisor-Kontexts bleibt unberuehrt, auch wenn spaeter ein Org-Verhaeltnis entsteht.
insert into public.alignment_shares(assessment_id,recipient_user_id,created_at) select id,pg_temp.p(8),now()-interval '5 days' from lc_assessment where n=3;
select pg_temp.check(pg_temp.ws(8,3),'C: share outside any advisor context is effective');
insert into public.advisor_org_members(org_id,user_id,role) values ('e87c3000-0000-4000-8000-000000000001',pg_temp.p(8),'advisor');
insert into public.advisor_person_grants(subject_user_id,org_id,scope,status,requested_by_user_id,approved_at) values (pg_temp.p(3),'e87c3000-0000-4000-8000-000000000001','base','active',pg_temp.p(6),now());
select pg_temp.check(pg_temp.ws(8,3),'C: a later org relationship does not damage an earlier independent share');
delete from public.advisor_org_members where user_id=pg_temp.p(8);

-- ===========================================================================
-- D-G) Teamreview und Roster
-- ===========================================================================
insert into public.founder_teams(id,name,team_context) values ('e87c1000-0000-4000-8000-000000000001','Life team','existing_team'),('e87c1000-0000-4000-8000-000000000002','Other team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e87c1000-0000-4000-8000-000000000001',pg_temp.p(n) from generate_series(1,2)n;
insert into public.team_shares(team_id,owner_user_id) select 'e87c1000-0000-4000-8000-000000000001',pg_temp.p(n) from generate_series(1,4)n;
insert into public.alignment_shares(assessment_id,recipient_user_id) select id,pg_temp.p(5) from lc_assessment where n in (1,3,4);
insert into public.advisor_person_grants(subject_user_id,advisor_user_id,scope,status,requested_by_user_id,approved_at)
 values (pg_temp.p(1),pg_temp.p(5),'base','active',pg_temp.p(5),now());
-- Echter Weg: Advisor fragt an, beide stimmen zu.
create temp table lc_review(id uuid); grant all on lc_review to authenticated;
do $$ begin perform pg_temp.as_user(5); execute 'set local role authenticated';
 insert into lc_review select public.request_advisor_team_review(array[pg_temp.p(1),pg_temp.p(2)]); execute 'reset role'; end $$;
select pg_temp.check(pg_temp.try(1,'select public.decide_advisor_team_review((select id from lc_review),true)')='ok' and pg_temp.try(2,'select public.decide_advisor_team_review((select id from lc_review),true)')='ok','D: both approve');
select pg_temp.check((select team_id='e87c1000-0000-4000-8000-000000000001' and team_access_ended_at is null from public.advisor_team_reviews where id=(select id from lc_review)),'D: activation binds the review to the matching team');
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000001')='ready','D: bound review gives the team report');
-- Gleiche Personen in einem anderen Team: kein Zugriff.
insert into public.founder_team_members(team_id,user_id) select 'e87c1000-0000-4000-8000-000000000002',pg_temp.p(n) from generate_series(1,2)n;
insert into public.team_shares(team_id,owner_user_id) select 'e87c1000-0000-4000-8000-000000000002',pg_temp.p(n) from generate_series(1,2)n;
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000002')='none','D: same people in another team are not covered');
-- E) 2 -> 3
insert into public.founder_team_members(team_id,user_id) values ('e87c1000-0000-4000-8000-000000000001',pg_temp.p(3));
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000001')='none','E: 2 -> 3 ends the team report access');
select pg_temp.check((select team_access_ended_at is not null and status='active' from public.advisor_team_reviews where id=(select id from lc_review)),'E/D: access ended, review itself stays active');
-- 3 -> 4, 4 -> 3, 3 -> 2: nie wieder
insert into public.founder_team_members(team_id,user_id) values ('e87c1000-0000-4000-8000-000000000001',pg_temp.p(4));
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000001')='none','E: 3 -> 4 not readable');
delete from public.founder_team_members where team_id='e87c1000-0000-4000-8000-000000000001' and user_id=pg_temp.p(4);
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000001')='none','E: 4 -> 3 not readable');
delete from public.founder_team_members where team_id='e87c1000-0000-4000-8000-000000000001' and user_id=pg_temp.p(3);
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000001')='none','F: back to the old roster does not revive');
-- Austritt und Wiedereintritt derselben Person
delete from public.founder_team_members where team_id='e87c1000-0000-4000-8000-000000000001' and user_id=pg_temp.p(2);
insert into public.founder_team_members(team_id,user_id) values ('e87c1000-0000-4000-8000-000000000001',pg_temp.p(2));
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000001')='none','F: leave and re-join does not revive');
select pg_temp.check(pg_temp.base(5,1)=1,'D: independent person access stays');
-- G) Neue aktuelle Zustimmung stellt den Zugriff wieder her.
delete from public.founder_team_members where team_id='e87c1000-0000-4000-8000-000000000002';
truncate lc_review;
do $$ begin perform pg_temp.as_user(5); execute 'set local role authenticated';
 insert into lc_review select public.request_advisor_team_review(array[pg_temp.p(1),pg_temp.p(2)]); execute 'reset role'; end $$;
select pg_temp.check(pg_temp.try(1,'select public.decide_advisor_team_review((select id from lc_review),true)')='ok' and pg_temp.try(2,'select public.decide_advisor_team_review((select id from lc_review),true)')='ok','G: new review approved');
select pg_temp.check(pg_temp.team_status(5,'e87c1000-0000-4000-8000-000000000001')='ready','G: a new current review restores access');

-- ===========================================================================
-- R) Blockierung
-- ===========================================================================
insert into public.network_blocks(blocker_user_id,blocked_user_id) values (pg_temp.p(2),pg_temp.p(5));
select pg_temp.check(pg_temp.try(5,'select public.request_advisor_team_review(array[pg_temp.p(1),pg_temp.p(2)])') like '%team_review_subject_not_accompanied%','R: blocked advisor cannot request a new review (same answer as not accompanied)');
delete from public.network_blocks where blocked_user_id=pg_temp.p(5);

-- ===========================================================================
-- H-L) Organisation: Selbst-Austritt, letzte Inhaberin, requested_by
-- ===========================================================================
select pg_temp.check(pg_temp.try(6,'select public.leave_advisor_org(''e87c3000-0000-4000-8000-000000000001'')') like '%advisor_org_needs_an_owner%','L: last owner cannot leave');
select pg_temp.check(pg_temp.try(6,'select public.set_advisor_org_membership(''e87c3000-0000-4000-8000-000000000001'',pg_temp.p(6),''revoked'')') like '%advisor_org_needs_an_owner%','H: last owner cannot be removed');
select pg_temp.check(pg_temp.base(7,1)=1,'K: precondition org advisor reads');
select pg_temp.check(pg_temp.try(7,'select public.leave_advisor_org(''e87c3000-0000-4000-8000-000000000001'')')='ok','K: advisor leaves the organisation herself');
select pg_temp.check(pg_temp.base(7,1)=0,'K: access ends at once');
select pg_temp.check(pg_temp.try(7,'select public.set_advisor_org_membership(''e87c3000-0000-4000-8000-000000000001'',pg_temp.p(7),''active'')')<>'ok','K: no self-readmission');
select pg_temp.check(pg_temp.try(8,'select public.leave_advisor_org(''e87c3000-0000-4000-8000-000000000001'')') like '%advisor_org_not_a_member%','K: non-member cannot leave');
-- Zweite Inhaberin: dann darf eine gehen.
insert into public.advisor_org_members(org_id,user_id,role) values ('e87c3000-0000-4000-8000-000000000001',pg_temp.p(10),'owner');
select pg_temp.check(pg_temp.try(10,'select public.leave_advisor_org(''e87c3000-0000-4000-8000-000000000001'')')='ok','L: an owner may leave when another owner stays');
-- J) requested_by geloescht: der Org-Zugang bleibt.
update public.advisor_person_grants set requested_by_user_id=pg_temp.p(10) where id='e87c5000-0000-4000-8000-000000000001';
delete from auth.users where id=pg_temp.p(10);
select pg_temp.check((select status='active' and requested_by_user_id is null from public.advisor_person_grants where id='e87c5000-0000-4000-8000-000000000001'),'J: org-held consent survives the requester account deletion');
select pg_temp.check(pg_temp.base(6,1)=1,'J: organisation still reads it');
-- I) Letzte Inhaberin loescht ihr Konto: Loeschung klappt, Organisation ausgesetzt.
update public.advisor_org_members set status='active',revoked_at=null where user_id=pg_temp.p(7);
delete from auth.users where id=pg_temp.p(6);
select pg_temp.check((select status from public.advisor_orgs where id='e87c3000-0000-4000-8000-000000000001')='suspended','I: organisation without owner is suspended');
select pg_temp.check(pg_temp.base(7,1)=0,'I: org access ends at once for remaining members');
select pg_temp.check(exists(select 1 from public.advisor_person_grants where id='e87c5000-0000-4000-8000-000000000001'),'I: history is not deleted');

-- ===========================================================================
-- M-N) Existenz-Orakel / RLS
-- ===========================================================================
insert into public.advisor_orgs(id,name) values ('e87c3000-0000-4000-8000-000000000002','Oracle Org');
insert into public.advisor_org_members(org_id,user_id,role) values ('e87c3000-0000-4000-8000-000000000002',pg_temp.p(9),'owner');
insert into public.advisor_person_grants(subject_user_id,org_id,scope,status,requested_by_user_id,approved_at) values (pg_temp.p(4),'e87c3000-0000-4000-8000-000000000002','base','active',pg_temp.p(9),now());
do $$ declare r boolean; begin
 perform pg_temp.as_user(8); execute 'set local role authenticated';
 if public.has_advisor_person_access(pg_temp.p(1),'base',pg_temp.p(5)) then raise exception 'M: person access oracle open'; end if;
 if public.has_advisor_team_review_access((select id from lc_review),pg_temp.p(5)) then raise exception 'M: review oracle open'; end if;
 if public.was_ever_advisor_for_team_review((select id from lc_review),pg_temp.p(5)) then raise exception 'M: was-ever oracle open'; end if;
 if public.is_advisor_org_member('e87c3000-0000-4000-8000-000000000002',pg_temp.p(9)) then raise exception 'M: org member oracle open'; end if;
 if public.is_accompanied_by_advisor_org('e87c3000-0000-4000-8000-000000000002',pg_temp.p(4)) then raise exception 'M: accompanied oracle open'; end if;
 execute 'reset role';
 -- Fuer sich selbst funktionieren sie.
 perform pg_temp.as_user(5); execute 'set local role authenticated';
 if not public.has_advisor_person_access(pg_temp.p(1),'base',pg_temp.p(5)) or not public.has_advisor_team_review_access((select id from lc_review)) then raise exception 'N: own access query broken'; end if;
 execute 'reset role';
 perform pg_temp.as_user(9); execute 'set local role authenticated';
 if not public.is_advisor_org_member('e87c3000-0000-4000-8000-000000000002') then raise exception 'N: own org membership broken'; end if;
 if (select count(*) from public.advisor_person_grants where org_id='e87c3000-0000-4000-8000-000000000002')<>1 then raise exception 'N: org member RLS read broken'; end if;
 execute 'reset role';
 perform pg_temp.as_user(4); execute 'set local role authenticated';
 if (select count(*) from public.advisor_orgs where id='e87c3000-0000-4000-8000-000000000002')<>1 then raise exception 'N: accompanied person no longer sees the organisation'; end if;
 if (select count(*) from public.advisor_org_members where org_id='e87c3000-0000-4000-8000-000000000002')<>1 then raise exception 'N: accompanied person no longer sees the members'; end if;
 execute 'reset role';
 perform pg_temp.as_user(8); execute 'set local role authenticated';
 if (select count(*) from public.advisor_orgs where id='e87c3000-0000-4000-8000-000000000002')<>0 then raise exception 'N: outsider sees the organisation'; end if;
 execute 'reset role';
end $$;
-- Intake mit Org-Reviewern: der interne Pruefweg fuer fremde IDs funktioniert weiter.
select pg_temp.check(public.advisor_org_member_internal('e87c3000-0000-4000-8000-000000000002',pg_temp.p(9)),'N: internal reviewer check works');
select pg_temp.check(not has_function_privilege('authenticated','public.advisor_org_member_internal(uuid,uuid)','execute'),'M: internal check not callable by clients');

-- ===========================================================================
-- O) Setup-Leser respektiert den aktuellen Roster
-- ===========================================================================
insert into public.founder_teams(id,name,team_context) values ('e87c1000-0000-4000-8000-000000000003','Setup team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e87c1000-0000-4000-8000-000000000003',pg_temp.p(n) from generate_series(3,4)n;
insert into public.relationships(id,user_a_id,user_b_id,founder_team_id) values ('e87c4000-0000-4000-8000-000000000003',pg_temp.p(3),pg_temp.p(4),'e87c1000-0000-4000-8000-000000000003');
insert into public.relationship_advisors(id,relationship_id,advisor_user_id,status,founder_a_approved,founder_b_approved,approved_at,linked_at)
 values ('e87c6000-0000-4000-8000-000000000003','e87c4000-0000-4000-8000-000000000003',pg_temp.p(9),'linked',true,true,now(),now());
insert into public.founder_team_setup_items(id,team_id,item_key,work_status,updated_by_user_id) values ('e87c7000-0000-4000-8000-000000000003','e87c1000-0000-4000-8000-000000000003','equity','open',pg_temp.p(3));
insert into public.founder_team_setup_revisions(id,setup_item_id,resolution_status,note,proposed_by_user_id,confirmed_at) values ('e87c8000-0000-4000-8000-000000000003','e87c7000-0000-4000-8000-000000000003','documented','AGREED',pg_temp.p(3),now());
update public.founder_team_setup_items set current_confirmed_revision_id='e87c8000-0000-4000-8000-000000000003' where id='e87c7000-0000-4000-8000-000000000003';
insert into public.founder_team_setup_confirmations(revision_id,user_id) select 'e87c8000-0000-4000-8000-000000000003',pg_temp.p(n) from generate_series(3,4)n;
insert into public.founder_team_advisor_setup_grants(id,team_id,advisor_user_id,source_relationship_advisor_id,status,created_by_user_id,activated_at)
 values ('e87c9000-0000-4000-8000-000000000003','e87c1000-0000-4000-8000-000000000003',pg_temp.p(9),'e87c6000-0000-4000-8000-000000000003','active',pg_temp.p(3),now());
insert into public.founder_team_advisor_setup_consents(grant_id,founder_user_id) select 'e87c9000-0000-4000-8000-000000000003',pg_temp.p(n) from generate_series(3,4)n;
create function pg_temp.setup_rows() returns integer language plpgsql as $$
declare c integer; begin perform pg_temp.as_user(9); execute 'set local role authenticated';
 select count(*) into c from public.get_advisor_confirmed_founder_setup('e87c4000-0000-4000-8000-000000000003'); execute 'reset role'; return c; end $$;
select pg_temp.check(pg_temp.setup_rows()=1,'O: precondition advisor reads the agreement');
insert into public.founder_team_members(team_id,user_id) values ('e87c1000-0000-4000-8000-000000000003',pg_temp.p(1));
select pg_temp.check(pg_temp.setup_rows()=0,'O: new member pauses access');
-- Alle (auch die Neue) stimmen dem Setup-Zugang zu - die alte Vereinbarung hat sie aber nicht bestaetigt.
insert into public.founder_team_advisor_setup_consents(grant_id,founder_user_id) values ('e87c9000-0000-4000-8000-000000000003',pg_temp.p(1)) on conflict do nothing;
update public.founder_team_advisor_setup_grants set status='active',activated_at=now(),revoked_at=null where id='e87c9000-0000-4000-8000-000000000003';
select pg_temp.check(pg_temp.setup_rows()=0,'O: agreement not confirmed by the current roster stays hidden (legacy reader)');
insert into public.founder_team_setup_confirmations(revision_id,user_id) values ('e87c8000-0000-4000-8000-000000000003',pg_temp.p(1));
select pg_temp.check(pg_temp.setup_rows()=1,'O: confirmed by the current roster - visible again');

-- ===========================================================================
-- S-T) Letzter Austritt archiviert, Kontoloeschung loescht weiter
-- ===========================================================================
select pg_temp.check(pg_temp.try(1,'select public.leave_founder_team(''e87c1000-0000-4000-8000-000000000003'')')='ok','S: member leaves');
select pg_temp.check(pg_temp.try(4,'select public.leave_founder_team(''e87c1000-0000-4000-8000-000000000003'')')='ok','S: member leaves');
select pg_temp.check(pg_temp.try(3,'select public.leave_founder_team(''e87c1000-0000-4000-8000-000000000003'')')='ok','S: last member leaves');
select pg_temp.check((select archived_at is not null from public.founder_teams where id='e87c1000-0000-4000-8000-000000000003'),'S: empty team archived, not deleted');
select pg_temp.check(not exists(select 1 from public.team_shares where team_id='e87c1000-0000-4000-8000-000000000003' and revoked_at is null),'S: no active team shares');
select pg_temp.check((select status from public.founder_team_advisor_setup_grants where id='e87c9000-0000-4000-8000-000000000003')='revoked','S: setup advisor access revoked');
select pg_temp.check(pg_temp.setup_rows()=0,'S: advisor reads nothing from the archived team');
select pg_temp.check(exists(select 1 from public.founder_team_setup_revisions where id='e87c8000-0000-4000-8000-000000000003'),'T: setup history kept');
-- Wiederbeitritt desselben Paars (Vertrag 11.7B) hebt die Archivierung auf, ohne alte Zustimmungen.
select public.ensure_founder_team_for_relationship('e87c4000-0000-4000-8000-000000000003','existing_team');
select pg_temp.check((select archived_at is null from public.founder_teams where id='e87c1000-0000-4000-8000-000000000003'),'S: explicit re-join of the same pair reactivates the team');
select pg_temp.check(not exists(select 1 from public.team_shares where team_id='e87c1000-0000-4000-8000-000000000003' and revoked_at is null),'S: re-join revives no team share');
select pg_temp.check((select status from public.founder_team_advisor_setup_grants where id='e87c9000-0000-4000-8000-000000000003')='revoked','S: re-join revives no setup access');
-- Letztes Mitglied loescht sein Konto: bisheriges Verhalten (Loeschung, keine Einladungshistorie).
insert into public.founder_teams(id,name,team_context) values ('e87c1000-0000-4000-8000-000000000004','Deletion team','existing_team');
insert into public.founder_team_members(team_id,user_id) values ('e87c1000-0000-4000-8000-000000000004',pg_temp.p(8));
delete from auth.users where id=pg_temp.p(8);
select pg_temp.check(not exists(select 1 from public.founder_teams where id='e87c1000-0000-4000-8000-000000000004'),'T: account deletion of the last member still deletes the empty team');

select extensions.pass('team, organisation and consent lifecycle');
select * from extensions.finish();
rollback;
