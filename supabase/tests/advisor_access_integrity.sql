\set ON_ERROR_STOP on
-- Phase 12C.1A: Advisor-Zugriffe ueber alle Wege zusammen - Personenzugang,
-- gerichtete Freigabe, Teamreview, Rosterwechsel, Teamfreigabe, Organisation,
-- Kontoloeschung, Paar-Advisor. Jede Pruefung liest ueber die echten RPCs als
-- die jeweilige Person (set role authenticated), nie ueber Tabellen.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'advisor_access_integrity: %',label; end if; end $$;
-- 1-4 Founder, 5 Advisor (persoenlich), 6 Org-Inhaberin, 7 Org-Advisor,
-- 8 fremder Advisor, 9 Paar-Advisor.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e87a0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','access-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,9)n;
create function pg_temp.p(n integer) returns uuid language sql as $$ select ('e87a0000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
insert into public.profiles(user_id,display_name,roles) select pg_temp.p(n),'Access '||n,case when n<=4 then array['founder'] else array['advisor'] end from generate_series(1,9)n
 on conflict(user_id) do update set roles=excluded.roles,display_name=excluded.display_name;
insert into public.person_core(user_id,display_name,headline) select pg_temp.p(n),'Access '||n,'Founder '||n from generate_series(1,4)n
 on conflict(user_id) do update set display_name=excluded.display_name,headline=excluded.headline;
insert into public.founder_teams(id,name,team_context) values ('e87a1000-0000-4000-8000-000000000001','Access team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e87a1000-0000-4000-8000-000000000001',pg_temp.p(n) from generate_series(1,2)n;
create function pg_temp.t() returns uuid language sql as $$ select 'e87a1000-0000-4000-8000-000000000001'::uuid $$;
-- Aktuelle Arbeitsprofile fuer 1-3 ueber die echte Schreibgrenze.
create temp table aa_assessment(n integer,id uuid);
do $$ declare n integer; i record; id uuid; begin
 for n in 1..3 loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.p(n),'role','authenticated')::text,true);
  id:=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"larger"}')->>'assessment_id')::uuid;
  insert into aa_assessment values(n,id);
  for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'revision_of' is null order by position loop
   perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,null,null,'cannot_assess',nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
  end loop;
 end loop;
end $$;
insert into public.person_capability_entries(user_id,area_id,application_level,ownership_wish) select pg_temp.p(n),'fundraising',4,'own' from generate_series(1,3)n;
-- Teamfreigaben fuer das Team, gerichtete Arbeitsprofil-Freigaben an Advisor 5.
insert into public.team_shares(team_id,owner_user_id) select pg_temp.t(),pg_temp.p(n) from generate_series(1,2)n;
insert into public.alignment_shares(assessment_id,recipient_user_id) select id,pg_temp.p(5) from aa_assessment where n<=2;
-- Personenzugang 1 und 2 -> Advisor 5: base und capability, aktiv.
insert into public.advisor_person_grants(subject_user_id,advisor_user_id,scope,status,requested_by_user_id,approved_at)
select pg_temp.p(n),pg_temp.p(5),s,'active',pg_temp.p(5),now() from generate_series(1,2)n,unnest(array['base','capability'])s;
-- Teamreview fuer genau 1 und 2, beide zugestimmt, aktiv.
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at) values ('e87a2000-0000-4000-8000-000000000001',pg_temp.p(5),pg_temp.p(5),'active',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) select 'e87a2000-0000-4000-8000-000000000001',pg_temp.p(n),'approved',now() from generate_series(1,2)n;
-- Phase 12C.1B: wie bei der Aktivierung an das Team mit exakt dieser Gruppe gebunden.
update public.advisor_team_reviews set team_id=public.advisor_team_review_matching_team(id),team_bound_at=now() where id='e87a2000-0000-4000-8000-000000000001';

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.p(n),'email','access-'||n||'@example.test','role','authenticated')::text,true); end $$;
-- Was sieht Person n ueber Person s? (jeweils ueber die echten Leser)
-- 0 = nichts lesbar (leer oder abgewiesen mit advisor_scope_not_granted).
create function pg_temp.base(n integer,s integer) returns integer language plpgsql as $$
declare c integer; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 select count(*) into c from public.get_advisor_person_base(pg_temp.p(s)); execute 'reset role'; return c;
exception when others then execute 'reset role'; if sqlerrm<>'advisor_scope_not_granted' then raise; end if; return 0; end $$;
-- 0 = nichts lesbar (leer oder abgewiesen mit advisor_scope_not_granted).
create function pg_temp.caps(n integer,s integer) returns integer language plpgsql as $$
declare c integer; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 select count(*) into c from public.get_advisor_person_capability(pg_temp.p(s)); execute 'reset role'; return c;
exception when others then execute 'reset role'; if sqlerrm<>'advisor_scope_not_granted' then raise; end if; return 0; end $$;
create function pg_temp.workstyle(n integer,s integer) returns boolean language plpgsql as $$
declare r jsonb; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 r:=public.get_workstyle_product_profile(pg_temp.p(s)); execute 'reset role'; return r is not null; end $$;
create function pg_temp.team_status(n integer) returns text language plpgsql as $$
declare r jsonb; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 r:=public.get_workstyle_product_team(pg_temp.t()); execute 'reset role'; return coalesce(r->>'status','none'); end $$;
create function pg_temp.reviews(n integer) returns integer language plpgsql as $$
declare c integer; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 select count(*) into c from public.get_advisor_team_reviews() where status='active'; execute 'reset role'; return c; end $$;
create function pg_temp.review_access(n integer) returns boolean language plpgsql as $$
declare r boolean; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 r:=public.has_advisor_team_review_access('e87a2000-0000-4000-8000-000000000001'); execute 'reset role'; return r; end $$;

-- A/M) Fremder Advisor: nichts, auch nicht per direktem RPC.
select pg_temp.check(pg_temp.base(8,1)=0 and pg_temp.caps(8,1)=0 and not pg_temp.workstyle(8,1),'A: foreign advisor reads no person data');
select pg_temp.check(pg_temp.team_status(8)='none' and pg_temp.reviews(8)=0 and not pg_temp.review_access(8),'A: foreign advisor gets no team report or review');

-- B) Advisor mit Personenzugang: genau die freigegebenen Bereiche.
select pg_temp.check(pg_temp.base(5,1)=1 and pg_temp.caps(5,1)=1,'B: granted areas readable');
do $$ declare c integer; begin perform pg_temp.as_user(5); execute 'set local role authenticated';
 begin select count(*) into c from public.get_advisor_person_strengths(pg_temp.p(1)); if c<>0 then raise exception 'B: strengths without grant'; end if;
 exception when others then if sqlerrm<>'advisor_scope_not_granted' then raise; end if; end;
 begin select count(*) into c from public.get_advisor_person_direction(pg_temp.p(1)); if c<>0 then raise exception 'B: direction without grant'; end if;
 exception when others then if sqlerrm<>'advisor_scope_not_granted' then raise; end if; end;
 execute 'reset role'; end $$;
select pg_temp.check(pg_temp.workstyle(5,1) and pg_temp.team_status(5)='ready','B: directed share and review give the team report');
select pg_temp.check(pg_temp.base(5,3)=0 and not pg_temp.workstyle(5,3),'B: outsider person not readable');

-- C/D) P0-Pruefung: Person 1 widerruft ihren Personenzugang.
do $$ declare g record; begin
 perform pg_temp.as_user(1); execute 'set local role authenticated';
 for g in select id from public.advisor_person_grants where subject_user_id=pg_temp.p(1) and advisor_user_id=pg_temp.p(5) loop
  perform public.decide_advisor_person_access(g.id,'revoke');
 end loop;
 execute 'reset role';
end $$;
select pg_temp.check(pg_temp.base(5,1)=0 and pg_temp.caps(5,1)=0,'C: revoked areas end at once');
select pg_temp.check(not pg_temp.workstyle(5,1),'C: directed workstyle share ends with the revoked advisor relationship');
select pg_temp.check(pg_temp.team_status(5)='not_ready','D: team report no longer available to the advisor');
select pg_temp.check(pg_temp.team_status(1)='ready','D: team itself keeps its report');
select pg_temp.check(pg_temp.base(5,2)=1 and pg_temp.workstyle(5,2),'D: other person keeps her own independent consent');
-- Der Review selbst bleibt aktiv (eigene Teamzustimmung) - er gibt aber keine Daten frei.
select pg_temp.check(pg_temp.review_access(5) and pg_temp.reviews(5)=1,'D: review consent stays (independent), releases nothing by itself');

-- Erneute Freigabe nur fuer einen Bereich reaktiviert keinen anderen.
update public.advisor_person_grants set status='active',approved_at=now(),revoked_at=null where subject_user_id=pg_temp.p(1) and advisor_user_id=pg_temp.p(5) and scope='base';
select pg_temp.check(pg_temp.base(5,1)=1 and pg_temp.caps(5,1)=0,'C: re-granting one area does not revive another');

-- G) Teamfreigabe zurueckgenommen: Teambericht fuer alle weg, keine Umwege.
update public.advisor_person_grants set status='active',approved_at=now(),revoked_at=null where subject_user_id=pg_temp.p(1) and advisor_user_id=pg_temp.p(5);
select pg_temp.check(pg_temp.team_status(5)='ready','G: precondition report ready again');
do $$ begin perform pg_temp.as_user(2); execute 'set local role authenticated'; perform public.set_team_share(pg_temp.t(),false); execute 'reset role'; end $$;
select pg_temp.check(pg_temp.team_status(5)='not_ready' and pg_temp.team_status(1)='not_ready','G: withdrawn team share ends the report for advisor and team');
do $$ begin perform pg_temp.as_user(2); execute 'set local role authenticated'; perform public.set_team_share(pg_temp.t(),true); execute 'reset role'; end $$;

-- E) Roster 2 -> 3: die neue Person wird nicht Teil der bestehenden Freigabe.
insert into public.founder_team_members(team_id,user_id) values (pg_temp.t(),pg_temp.p(3));
insert into public.team_shares(team_id,owner_user_id) values (pg_temp.t(),pg_temp.p(3));
insert into public.alignment_shares(assessment_id,recipient_user_id) select id,pg_temp.p(5) from aa_assessment where n=3;
select pg_temp.check(pg_temp.team_status(5)='none','E: grown team is not readable through the old review');
select pg_temp.check(pg_temp.team_status(3)='ready','E: the team itself has its report');
select pg_temp.check(pg_temp.caps(5,3)=0 and pg_temp.base(5,3)=0,'E: newcomer data not readable without own consent');
select pg_temp.check((select count(*) from public.advisor_team_review_members where review_id='e87a2000-0000-4000-8000-000000000001')=2,'E: review membership unchanged');
-- Roster 3 -> 4 ebenso.
insert into public.founder_team_members(team_id,user_id) values (pg_temp.t(),pg_temp.p(4));
select pg_temp.check(pg_temp.team_status(5)='none','E: four-person team not readable either');
delete from public.founder_team_members where team_id=pg_temp.t() and user_id=pg_temp.p(4);

-- F) Roster 3 -> 2 (eine Person der Review-Gruppe geht): kein Zugriff, das
-- Team besteht nicht mehr aus der zustimmenden Gruppe.
delete from public.founder_team_members where team_id=pg_temp.t() and user_id=pg_temp.p(2);
select pg_temp.check(pg_temp.team_status(5)='none','F: team {1,3} not readable through review {1,2}');
-- Wieder genau die zustimmende Gruppe {1,2}: seit 12C.1B KEIN Wiederaufleben -
-- der Teamberichts-Zugriff endete beim ersten Rosterwechsel endgueltig.
delete from public.founder_team_members where team_id=pg_temp.t() and user_id=pg_temp.p(3);
insert into public.founder_team_members(team_id,user_id) values (pg_temp.t(),pg_temp.p(2));
select pg_temp.check(pg_temp.team_status(5)='none','F: returning to the old roster does not revive the team report');
select pg_temp.check(pg_temp.review_access(5),'F: the group review itself stays');

-- I/J/K) Organisation: Grants der Organisation enden mit der Mitgliedschaft.
insert into public.advisor_orgs(id,name) values ('e87a3000-0000-4000-8000-000000000001','Access Org');
insert into public.advisor_org_members(org_id,user_id,role) values ('e87a3000-0000-4000-8000-000000000001',pg_temp.p(6),'owner'),('e87a3000-0000-4000-8000-000000000001',pg_temp.p(7),'advisor');
insert into public.advisor_person_grants(subject_user_id,org_id,scope,status,requested_by_user_id,approved_at)
 values (pg_temp.p(2),'e87a3000-0000-4000-8000-000000000001','base','active',pg_temp.p(7),now());
select pg_temp.check(pg_temp.base(7,2)=1 and pg_temp.base(6,2)=1,'I: org members read the org grant');
do $$ begin perform pg_temp.as_user(6); execute 'set local role authenticated';
 perform public.set_advisor_org_membership('e87a3000-0000-4000-8000-000000000001',pg_temp.p(7),'revoked'); execute 'reset role'; end $$;
select pg_temp.check(pg_temp.base(7,2)=0,'I: removed org advisor loses org access at once');
select pg_temp.check(pg_temp.base(6,2)=1,'I: org access itself stays with the organisation');
do $$ begin perform pg_temp.as_user(6); execute 'set local role authenticated';
 begin perform public.set_advisor_org_membership('e87a3000-0000-4000-8000-000000000001',pg_temp.p(6),'revoked'); raise exception 'last owner removed';
 exception when insufficient_privilege then if sqlerrm<>'advisor_org_needs_an_owner' then raise; end if; end;
 execute 'reset role'; end $$;
do $$ begin perform pg_temp.as_user(7); execute 'set local role authenticated';
 begin perform public.set_advisor_org_membership('e87a3000-0000-4000-8000-000000000001',pg_temp.p(7),'active'); raise exception 'removed advisor reactivated herself';
 exception when insufficient_privilege then null; end;
 execute 'reset role'; end $$;
select pg_temp.check(pg_temp.base(7,2)=0,'K: removed advisor cannot readmit herself');
update public.advisor_orgs set status='suspended' where id='e87a3000-0000-4000-8000-000000000001';
select pg_temp.check(pg_temp.base(6,2)=0,'I: suspended organisation releases nothing');
-- Ein Org-Grant gibt dem persoenlichen Advisor 5 nichts.
update public.advisor_orgs set status='active' where id='e87a3000-0000-4000-8000-000000000001';
select pg_temp.check(pg_temp.caps(5,2)=1 and (select count(*) from public.advisor_person_grants where org_id is not null and advisor_user_id is not null)=0,'I: personal and org grants stay separate');

-- Gap 1) Org-Zugang widerrufen: nur Person, Org-Mitglied - nicht jede Person.
insert into public.advisor_person_grants(id,subject_user_id,org_id,scope,status,requested_by_user_id,approved_at)
 values ('e87a5000-0000-4000-8000-000000000001',pg_temp.p(1),'e87a3000-0000-4000-8000-000000000001','strengths','active',pg_temp.p(6),now());
do $$ begin perform pg_temp.as_user(8); execute 'set local role authenticated';
 begin perform public.decide_advisor_person_access('e87a5000-0000-4000-8000-000000000001','revoke'); raise exception 'stranger revoked an org grant';
 exception when insufficient_privilege then if sqlerrm<>'advisor_grant_not_yours' then raise; end if; end;
 execute 'reset role'; end $$;
select pg_temp.check((select status from public.advisor_person_grants where id='e87a5000-0000-4000-8000-000000000001')='active','Gap1: stranger cannot revoke an org-held grant');
do $$ begin perform pg_temp.as_user(7); execute 'set local role authenticated';
 begin perform public.decide_advisor_person_access('e87a5000-0000-4000-8000-000000000001','revoke'); raise exception 'removed org member revoked';
 exception when insufficient_privilege then null; end;
 execute 'reset role'; end $$;
do $$ begin perform pg_temp.as_user(6); execute 'set local role authenticated';
 perform public.decide_advisor_person_access('e87a5000-0000-4000-8000-000000000001','revoke'); execute 'reset role'; end $$;
select pg_temp.check((select status from public.advisor_person_grants where id='e87a5000-0000-4000-8000-000000000001')='revoked','Gap1: active org member can end the org grant');
update public.advisor_person_grants set status='active',approved_at=now(),revoked_at=null where id='e87a5000-0000-4000-8000-000000000001';
do $$ begin perform pg_temp.as_user(1); execute 'set local role authenticated';
 perform public.decide_advisor_person_access('e87a5000-0000-4000-8000-000000000001','revoke'); execute 'reset role'; end $$;
select pg_temp.check((select status from public.advisor_person_grants where id='e87a5000-0000-4000-8000-000000000001')='revoked','Gap1: subject can revoke the org grant');

-- Gap 5) Ausgesetzte Organisation: auch ihre Review-Liste ist leer.
insert into public.advisor_team_reviews(id,org_id,requested_by_user_id,status,activated_at) values ('e87a2000-0000-4000-8000-000000000002','e87a3000-0000-4000-8000-000000000001',pg_temp.p(6),'active',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) select 'e87a2000-0000-4000-8000-000000000002',pg_temp.p(n),'approved',now() from generate_series(1,2)n;
select pg_temp.check(pg_temp.reviews(6)=1,'Gap5: org owner lists the org review');
update public.advisor_orgs set status='suspended' where id='e87a3000-0000-4000-8000-000000000001';
select pg_temp.check(pg_temp.reviews(6)=0,'Gap5: suspended organisation lists no reviews');
update public.advisor_orgs set status='active' where id='e87a3000-0000-4000-8000-000000000001';

-- Gap 7) Legacy-Advisor-Bindung: Zustimmungen setzt nur der Server.
insert into public.invitations(id,inviter_user_id,invitee_user_id,invitee_email,status,token_hash,expires_at,team_context,accepted_at)
 values ('e87a6000-0000-4000-8000-000000000001',pg_temp.p(1),pg_temp.p(2),'access-2@example.test','accepted',encode(extensions.digest('legacy','sha256'),'hex'),now()+interval '1 day','pre_founder',now());
insert into public.founder_alignment_workbook_advisors(invitation_id,advisor_user_id,advisor_name,founder_a_approved,founder_b_approved,requested_by)
 values ('e87a6000-0000-4000-8000-000000000001',pg_temp.p(9),'Legacy',false,false,pg_temp.p(1));
do $$ begin
 perform pg_temp.as_user(9); execute 'set local role authenticated';
 begin update public.founder_alignment_workbook_advisors set founder_a_approved=true,founder_b_approved=true where invitation_id='e87a6000-0000-4000-8000-000000000001';
  raise exception 'advisor approved herself';
 exception when insufficient_privilege then if sqlerrm<>'legacy_advisor_consent_is_server_managed' then raise; end if; end;
 execute 'reset role';
 perform pg_temp.as_user(1); execute 'set local role authenticated';
 begin update public.founder_alignment_workbook_advisors set founder_b_approved=true where invitation_id='e87a6000-0000-4000-8000-000000000001';
  raise exception 'founder approved for the other founder';
 exception when insufficient_privilege then null; end;
 update public.founder_alignment_workbook_advisors set advisor_name='Legacy renamed' where invitation_id='e87a6000-0000-4000-8000-000000000001';
 execute 'reset role';
end $$;
delete from public.founder_alignment_workbook_advisors where invitation_id='e87a6000-0000-4000-8000-000000000001';
do $$ begin
 perform pg_temp.as_user(1); execute 'set local role authenticated';
 begin insert into public.founder_alignment_workbook_advisors(invitation_id,advisor_user_id,advisor_name,founder_a_approved,founder_b_approved,requested_by)
  values ('e87a6000-0000-4000-8000-000000000001',pg_temp.p(9),'Self',true,true,pg_temp.p(1));
  raise exception 'founder inserted an approved binding';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
end $$;
select pg_temp.check(not exists(select 1 from public.founder_alignment_workbook_advisors where invitation_id='e87a6000-0000-4000-8000-000000000001'),'Gap7: no self-approved legacy binding');

-- N) Paar-Advisor (Legacy-Bruecke): nur mit verknuepfter, beidseitig
-- genehmigter, nicht widerrufener Beziehung - und auch dann nur mit den
-- eigenen gerichteten Freigaben der Personen.
insert into public.relationships(id,user_a_id,user_b_id,founder_team_id) values ('e87a4000-0000-4000-8000-000000000001',pg_temp.p(1),pg_temp.p(2),pg_temp.t());
insert into public.relationship_advisors(relationship_id,advisor_user_id,status,founder_a_approved,founder_b_approved,approved_at,linked_at)
 values ('e87a4000-0000-4000-8000-000000000001',pg_temp.p(9),'linked',true,true,now(),now());
select pg_temp.check(pg_temp.team_status(9)='not_ready','N: pair advisor without own shares gets no report data');
update public.relationship_advisors set status='revoked',revoked_at=now() where advisor_user_id=pg_temp.p(9);
select pg_temp.check(pg_temp.team_status(9)='none','N: revoked pair advisor loses the team reader');

-- O) Advisor-Team-Einladung: Slot nur mit bestaetigter Adresse (12C.1A).
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 ('00000000-0000-0000-0000-000000000000','e87a0000-0000-4000-8000-000000000010','authenticated','authenticated','access-10@example.test','',null,'{}','{}',now(),now());
insert into public.advisor_team_invites(advisor_user_id,founder_a_email,founder_b_email,founder_a_token_hash,founder_b_token_hash,status)
 values (pg_temp.p(6),'access-10@example.test','access-4@example.test',encode(extensions.digest('o-a','sha256'),'hex'),encode(extensions.digest('o-b','sha256'),'hex'),'pending');
do $$ begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub','e87a0000-0000-4000-8000-000000000010','email','access-10@example.test','role','authenticated')::text,true);
 execute 'set local role authenticated';
 begin perform public.claim_advisor_team_invite_founder(encode(extensions.digest('o-a','sha256'),'hex')); raise exception 'O: unverified claimed a slot';
 exception when insufficient_privilege then if sqlerrm<>'email_not_verified' then raise; end if; end;
 execute 'reset role';
 perform pg_temp.as_user(4); execute 'set local role authenticated';
 if public.claim_advisor_team_invite_founder(encode(extensions.digest('o-b','sha256'),'hex')) is null then raise exception 'O: verified founder cannot claim'; end if;
 execute 'reset role';
end $$;
select pg_temp.check((select founder_a_user_id is null and founder_b_user_id=pg_temp.p(4) from public.advisor_team_invites where founder_a_email='access-10@example.test'),'O: only the verified founder holds a slot');

-- Gap 4) Konto einer zustimmenden Person geloescht: Der Review faellt samt
-- Notizen weg (bestehender Trigger advisor_team_review_members_member_gone).
delete from auth.users where id=pg_temp.p(2);
select pg_temp.check(not exists(select 1 from public.advisor_team_reviews where id='e87a2000-0000-4000-8000-000000000002'),'Gap4: review ends when a consenting person deletes the account');

-- L) Advisor geloescht: kein verwaister aktiver Review, keine Grants.
delete from auth.users where id=pg_temp.p(5);
select pg_temp.check(not exists(select 1 from public.advisor_team_reviews where id='e87a2000-0000-4000-8000-000000000001'),'L: personal review ends with the advisor account');
select pg_temp.check(not exists(select 1 from public.advisor_person_grants where advisor_user_id is null and org_id is null),'L: no holderless grants');
select pg_temp.check(not exists(select 1 from public.advisor_team_reviews where advisor_user_id is null and org_id is null),'L: no holderless reviews');

select extensions.pass('advisor access integrity across grants, reviews, rosters, organisations and deletion');
select * from extensions.finish();
rollback;
