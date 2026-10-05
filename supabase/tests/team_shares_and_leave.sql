\set ON_ERROR_STOP on
-- Phase 11.7B: eine Teamfreigabe je Person und Team, Team verlassen,
-- Vorhaben ohne eigene Freigabe, Advisor-Fehler (nicht aktive Grants).
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check_team(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'team_shares: %',label; end if; end $$;
create temp table ts_people(n integer,person uuid,assessment uuid);
grant all on ts_people to authenticated;
-- 1-4 Founder im Team, 5 Advisor, 6 Aussenstehende, 7-8 Bestandsteam mit gerichteten Freigaben.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8770000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','teamshare-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,8)n;
insert into ts_people select n,('e8770000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,null from generate_series(1,8)n;
insert into public.profiles(user_id,display_name,roles) select person,'Teamshare '||n,case when n=5 then array['advisor'] else array['founder'] end from ts_people on conflict(user_id) do update set roles=excluded.roles,display_name=excluded.display_name;
insert into public.founder_teams(id,name,team_context) values
 ('e8771000-0000-4000-8000-000000000001','Share team','existing_team'),
 ('e8771000-0000-4000-8000-000000000002','Other team','existing_team'),
 ('e8771000-0000-4000-8000-000000000003','Legacy team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e8771000-0000-4000-8000-000000000001',person from ts_people where n<=2;
insert into public.founder_team_members(team_id,user_id) select 'e8771000-0000-4000-8000-000000000002',person from ts_people where n in(1,6);
insert into public.founder_team_members(team_id,user_id) select 'e8771000-0000-4000-8000-000000000003',person from ts_people where n in(7,8);
-- Aktuelle v0.4-Profile fuer 1-4 und 7-8 ueber die echte Schreibgrenze, mit
-- Forschungseinwilligung (Forschungsantworten existieren, duerfen aber nie
-- im Teamkontext erscheinen).
do $$ declare p record;i record;id uuid;begin
 for p in select * from ts_people where n in(1,2,3,4,7,8) loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',p.person,'role','authenticated')::text,true);
  id:=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"larger"}')->>'assessment_id')::uuid;
  update ts_people set assessment=id where person=p.person;
  for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'revision_of' is null order by position loop
   perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,null,null,'cannot_assess',nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
  end loop;
 end loop;
end $$;
-- Faehigkeiten: Person 2 hat "private" eingestellt.
update public.person_core set capability_disclosure='private' where user_id=(select person from ts_people where n=2);
insert into public.person_capability_entries(user_id,area_id,application_level,ownership_wish) select person,'fundraising',5,'own' from ts_people where n=2;

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person from ts_people where ts_people.n=as_user.n),'role','authenticated')::text,true); end $$;
create function pg_temp.status_for(n integer,team uuid default 'e8771000-0000-4000-8000-000000000001') returns text language plpgsql as $$
declare result text;
begin
 perform pg_temp.as_user(n); execute 'set local role authenticated';
 result:=public.get_workstyle_product_team(team)->>'status';
 execute 'reset role'; return result;
end $$;
create function pg_temp.team_for(n integer) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform pg_temp.as_user(n); execute 'set local role authenticated';
 result:=public.get_workstyle_product_team('e8771000-0000-4000-8000-000000000001');
 execute 'reset role'; return result;
end $$;
create function pg_temp.team_for_id(n integer,team uuid) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform pg_temp.as_user(n); execute 'set local role authenticated';
 result:=public.get_workstyle_product_team(team);
 execute 'reset role'; return result;
end $$;
create function pg_temp.readiness_for(n integer,team uuid default 'e8771000-0000-4000-8000-000000000001') returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform pg_temp.as_user(n); execute 'set local role authenticated';
 result:=public.get_workstyle_team_share_readiness(team);
 execute 'reset role'; return result;
end $$;
create function pg_temp.profile_for(viewer integer,owner integer) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 result:=public.get_workstyle_product_profile((select person from ts_people where n=owner));
 execute 'reset role'; return result;
end $$;
create function pg_temp.share_team(n integer,enabled boolean,team uuid default 'e8771000-0000-4000-8000-000000000001') returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform pg_temp.as_user(n); execute 'set local role authenticated';
 result:=public.set_team_share(team,enabled);
 execute 'reset role'; return result;
end $$;
create function pg_temp.member_flag(result jsonb,n integer,flag text) returns boolean language sql as $$
 select (m->>flag)::boolean from jsonb_array_elements(result->'members') m where m->>'person_id'=(select person::text from ts_people where ts_people.n=member_flag.n)
$$;
-- Phase 11.7B.1: Faehigkeiten im Team immer mit explizitem Teamkontext.
create function pg_temp.caps_for(viewer integer,owner integer,team uuid default 'e8771000-0000-4000-8000-000000000001') returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 select coalesce(jsonb_agg(to_jsonb(c)),'[]') into result from public.get_team_capability(team,(select person from ts_people where n=owner)) c;
 execute 'reset role'; return result;
end $$;
create function pg_temp.disclosed_for(viewer integer,owner integer,context text) returns jsonb language plpgsql as $$
declare result jsonb;
begin
 perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 select coalesce(jsonb_agg(to_jsonb(c)),'[]') into result from public.get_disclosed_capability((select person from ts_people where n=owner),context) c;
 execute 'reset role'; return result;
end $$;
create function pg_temp.visible_answers(viewer integer,assessment uuid) returns integer language plpgsql as $$
declare result integer;
begin
 perform pg_temp.as_user(viewer); execute 'set local role authenticated';
 select count(*) into result from public.alignment_answers where assessment_id=assessment;
 execute 'reset role'; return result;
end $$;

-- A) Mitgliedschaft allein teilt nichts.
select pg_temp.check_team(not exists(select 1 from public.team_shares where team_id::text like 'e8771000-%' or owner_user_id in(select person from ts_people)),'A: membership creates no team share');
select pg_temp.check_team(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(2)='not_ready','A: no share, no report');
select pg_temp.check_team(not pg_temp.member_flag(pg_temp.readiness_for(1),1,'shared_with_team') and not pg_temp.member_flag(pg_temp.readiness_for(1),2,'shared_with_team'),'A: readiness shows nobody shared');
select pg_temp.check_team(pg_temp.profile_for(2,1) is null,'A: teammate cannot read profile without share');
select pg_temp.check_team(jsonb_array_length(pg_temp.caps_for(1,2))=0,'A: private capability stays private without team share');

-- Direkte Schreibzugriffe und Fremd-Teams sind gesperrt.
do $$ begin
 perform pg_temp.as_user(1); execute 'set local role authenticated';
 begin insert into public.team_shares(team_id,owner_user_id) values('e8771000-0000-4000-8000-000000000001',auth.uid());
  raise exception 'direct insert allowed'; exception when insufficient_privilege then null; end;
 begin perform public.set_team_share('e8771000-0000-4000-8000-000000000003',true);
  raise exception 'foreign team share allowed'; exception when insufficient_privilege then null; end;
 execute 'reset role';
end $$;

-- B) Eine Person teilt -> noch kein Bericht; die andere sieht ihr Profil.
select pg_temp.check_team((pg_temp.share_team(1,true)->>'enabled')::boolean,'B: share enabled');
select pg_temp.check_team(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(2)='not_ready','B: one share is not enough');
select pg_temp.check_team(pg_temp.member_flag(pg_temp.readiness_for(2),1,'shared_with_team') and pg_temp.member_flag(pg_temp.readiness_for(2),1,'team_share_active') and not pg_temp.member_flag(pg_temp.readiness_for(2),2,'shared_with_team'),'B: readiness per person');
select pg_temp.check_team(jsonb_array_length(pg_temp.profile_for(2,1)->'answers')=29,'B: teammate sees full core profile via team share');
select pg_temp.check_team(pg_temp.profile_for(6,1) is null,'B: outsider does not');
select pg_temp.check_team(pg_temp.profile_for(5,1) is null,'B: advisor does not');
select pg_temp.check_team(pg_temp.status_for(6,'e8771000-0000-4000-8000-000000000002')='not_ready','B: share for team 1 does not make team 2 ready');

-- C) Beide teilen -> gleicher Bericht; Faehigkeiten mit Tiefe trotz "private".
select pg_temp.share_team(2,true);
select pg_temp.check_team(pg_temp.status_for(1)='ready' and pg_temp.status_for(2)='ready','C: both shared -> report for both');
select pg_temp.check_team((select jsonb_agg(p->'workstyle' order by p->>'person_id') from jsonb_array_elements(pg_temp.team_for(1)->'people') p)
 =(select jsonb_agg(p->'workstyle' order by p->>'person_id') from jsonb_array_elements(pg_temp.team_for(2)->'people') p),'C: identical input');
select pg_temp.check_team(pg_temp.caps_for(1,2) @> '[{"area_id":"fundraising","application_level":5,"ownership_wish":"own"}]','C: capability depth with team share');
select pg_temp.check_team(jsonb_array_length(pg_temp.disclosed_for(1,2,'discovery'))=0 and jsonb_array_length(pg_temp.disclosed_for(1,2,'connect'))=0 and jsonb_array_length(pg_temp.disclosed_for(1,2,'team'))=0,'C: FIND/CONNECT (and the context-free team ladder) still follow capability_disclosure');
select pg_temp.check_team(exists(select 1 from jsonb_array_elements(pg_temp.team_for(1)->'people') p, jsonb_array_elements(p->'capabilities') c
 where p->>'person_id'=(select person::text from ts_people where n=2) and c->>'ownership_wish'='own'),'C: team report carries capability depth');
-- Forschung nie: nur 29 Core-Antworten, keine Forschungs-Items, Forschungstabelle fuer Mitglieder unsichtbar.
select pg_temp.check_team(not exists(select 1 from jsonb_array_elements(pg_temp.team_for(1)->'people') p where jsonb_array_length(p->'workstyle'->'answers')<>29),'C: only 29 core answers');
select pg_temp.check_team(not exists(select 1 from jsonb_array_elements(pg_temp.team_for(1)->'people') p, jsonb_array_elements(p->'workstyle'->'answers') a
 join public.workstyle_item_versions i on i.item_key=a->>'item_key' and i.assessment_version='8.5a-v3' where i.definition->>'usage'<>'core'),'C: no research item in team report');
select pg_temp.check_team(exists(select 1 from public.workstyle_research_responses r where r.assessment_id=(select assessment from ts_people where n=1)),'C: research answers exist for the fixture');
select pg_temp.check_team(not has_table_privilege('authenticated','public.workstyle_research_responses','select'),'C: research table not readable by clients at all');
-- FIND bleibt unberuehrt.
select pg_temp.check_team(not exists(select 1 from public.founder_search_preferences where user_id in(select person from ts_people where n<=2) and workstyle_discovery_enabled),'C: no FIND opt-in from team share');
select pg_temp.as_user(1);
set local role authenticated;
select set_config('ts.pair_snapshot',public.create_workstyle_product_snapshot('e8771000-0000-4000-8000-000000000001')::text,true);
reset role;

-- D) Neues Mitglied: bestehende Teamfreigaben gelten automatisch fuer es.
insert into public.founder_team_members(team_id,user_id) select 'e8771000-0000-4000-8000-000000000001',person from ts_people where n=3;
select pg_temp.check_team(jsonb_array_length(pg_temp.profile_for(3,1)->'answers')=29 and jsonb_array_length(pg_temp.profile_for(3,2)->'answers')=29,'D: new member sees existing team shares');
select pg_temp.check_team(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(3)='not_ready','D: unshared new member blocks report for all');
select pg_temp.as_user(1);
set local role authenticated;
select pg_temp.check_team(public.get_workstyle_product_snapshot(current_setting('ts.pair_snapshot')::uuid) is null,'D: 2-person snapshot not served as current 3-person report');
reset role;
select pg_temp.share_team(3,true);
select pg_temp.check_team(pg_temp.status_for(1)='ready' and pg_temp.status_for(2)='ready' and pg_temp.status_for(3)='ready','D: three shares -> report for three');
-- 4 Personen
insert into public.founder_team_members(team_id,user_id) select 'e8771000-0000-4000-8000-000000000001',person from ts_people where n=4;
select pg_temp.check_team(pg_temp.status_for(4)='not_ready','D: fourth member not yet shared');
select pg_temp.share_team(4,true);
select pg_temp.check_team(pg_temp.status_for(1)='ready' and pg_temp.status_for(4)='ready' and jsonb_array_length(pg_temp.team_for(4)->'people')=4,'D: four shares -> report for four');
select pg_temp.as_user(4);
set local role authenticated;
select set_config('ts.four_snapshot',public.create_workstyle_product_snapshot('e8771000-0000-4000-8000-000000000001')::text,true);
reset role;

-- E) Vorhaben: Abgeben = mit dem Team teilen.
insert into public.assessments(id,user_id,module,instrument_id,venture_id,submitted_at) values
 ('e8772000-0000-4000-8000-000000000001',(select person from ts_people where n=1),'venture_alignment','venture-alignment-v1','e8771000-0000-4000-8000-000000000001',now()),
 ('e8772000-0000-4000-8000-000000000002',(select person from ts_people where n=2),'venture_alignment','venture-alignment-v1','e8771000-0000-4000-8000-000000000001',null),
 ('e8772000-0000-4000-8000-000000000003',(select person from ts_people where n=1),'venture_alignment','venture-alignment-v1','e8771000-0000-4000-8000-000000000002',now());
insert into public.alignment_answers(assessment_id,block_id,answer_format,value) values
 ('e8772000-0000-4000-8000-000000000001','B01','money_range','{"amount":5000,"currency":"EUR"}'),
 ('e8772000-0000-4000-8000-000000000002','B01','money_range','{"amount":1000,"currency":"EUR"}'),
 ('e8772000-0000-4000-8000-000000000003','B01','money_range','{"amount":9000,"currency":"EUR"}');
select pg_temp.check_team(pg_temp.visible_answers(2,'e8772000-0000-4000-8000-000000000001')=1,'E: same-team member sees submitted venture answers');
select pg_temp.check_team(pg_temp.visible_answers(1,'e8772000-0000-4000-8000-000000000002')=0,'E: unsubmitted venture answers stay private');
select pg_temp.check_team(pg_temp.visible_answers(2,'e8772000-0000-4000-8000-000000000003')=0,'E: venture of another team not visible');
select pg_temp.check_team(pg_temp.visible_answers(6,'e8772000-0000-4000-8000-000000000003')=1,'E: member of that other team sees it');
select pg_temp.check_team(pg_temp.visible_answers(6,'e8772000-0000-4000-8000-000000000001')=0,'E: outsider sees nothing');
select pg_temp.check_team(pg_temp.visible_answers(5,'e8772000-0000-4000-8000-000000000001')=0,'E: advisor sees nothing from team membership rules');
select pg_temp.check_team(exists(select 1 from jsonb_array_elements(pg_temp.team_for(3)->'people') p where p->>'person_id'=(select person::text from ts_people where n=1) and jsonb_array_length(p->'alignment')=1),'E: venture answers in team report without share');

-- F) Widerruf: Bericht fuer alle weg, Snapshot nicht mehr abrufbar.
select pg_temp.check_team(not (pg_temp.share_team(3,false)->>'enabled')::boolean,'F: revoke returns disabled');
select pg_temp.check_team(pg_temp.status_for(1)='not_ready' and pg_temp.status_for(3)='not_ready','F: revoke hides report from all');
select pg_temp.check_team(not pg_temp.member_flag(pg_temp.readiness_for(1),3,'team_share_active'),'F: readiness shows revoked share');
select pg_temp.check_team(pg_temp.profile_for(1,3) is null,'F: revoked share hides profile');
select pg_temp.as_user(4);
set local role authenticated;
select pg_temp.check_team(public.get_workstyle_product_snapshot(current_setting('ts.four_snapshot')::uuid) is null,'F: snapshot not served after revoke');
reset role;
select pg_temp.share_team(3,true);
select pg_temp.check_team(pg_temp.status_for(1)='ready','F: re-sharing restores the report');

-- G) Team verlassen.
insert into public.relationships(id,user_a_id,user_b_id,founder_team_id) values
 ('e8773000-0000-4000-8000-000000000001',(select person from ts_people where n=1),(select person from ts_people where n=3),'e8771000-0000-4000-8000-000000000001');
select pg_temp.as_user(3);
set local role authenticated;
select pg_temp.check_team((public.leave_founder_team('e8771000-0000-4000-8000-000000000001')->>'remaining_members')::integer=3,'G: leave returns remaining members');
reset role;
select pg_temp.check_team(not exists(select 1 from public.founder_team_members where team_id='e8771000-0000-4000-8000-000000000001' and user_id=(select person from ts_people where n=3)),'G: membership ended');
select pg_temp.check_team(exists(select 1 from public.team_shares where team_id='e8771000-0000-4000-8000-000000000001' and owner_user_id=(select person from ts_people where n=3) and revoked_at is not null),'G: team share revoked, row kept');
select pg_temp.check_team(pg_temp.status_for(3) is null,'G: leaver cannot read team report');
select pg_temp.check_team(pg_temp.profile_for(3,1) is null,'G: leaver loses team visibility');
select pg_temp.check_team(pg_temp.profile_for(1,3) is null,'G: team no longer sees leaver profile');
select pg_temp.check_team(pg_temp.visible_answers(2,'e8772000-0000-4000-8000-000000000001')=1 and pg_temp.visible_answers(3,'e8772000-0000-4000-8000-000000000001')=0,'G: leaver loses venture visibility');
select pg_temp.check_team(jsonb_array_length(pg_temp.caps_for(3,2))=0,'G: team context for capability ends');
select pg_temp.check_team(pg_temp.status_for(1)='ready' and jsonb_array_length(pg_temp.team_for(1)->'people')=3,'G: remaining three keep their report');
select pg_temp.check_team(exists(select 1 from public.relationships where id='e8773000-0000-4000-8000-000000000001' and founder_team_id='e8771000-0000-4000-8000-000000000001'),'G: pair relationship kept unchanged');
do $$ begin
 perform pg_temp.as_user(3); execute 'set local role authenticated';
 begin perform public.leave_founder_team('e8771000-0000-4000-8000-000000000001'); raise exception 'second leave allowed';
 exception when insufficient_privilege then null; end;
 execute 'reset role';
end $$;
-- Wiederbeitritt ueber die bestehende Paarbeziehung (neue Einladung / FIND-Start).
select public.ensure_founder_team_for_relationship('e8773000-0000-4000-8000-000000000001','existing_team');
select pg_temp.check_team(exists(select 1 from public.founder_team_members where team_id='e8771000-0000-4000-8000-000000000001' and user_id=(select person from ts_people where n=3)),'G: rejoin via bound relationship re-adds member');
select pg_temp.check_team(pg_temp.status_for(1)='not_ready','G: rejoined member must share again');
-- 2er-Team: Austritt hinterlaesst ein konsistentes Solo-Team.
select pg_temp.as_user(6);
set local role authenticated;
select pg_temp.check_team((public.leave_founder_team('e8771000-0000-4000-8000-000000000002')->>'remaining_members')::integer=1,'G: leaving a pair leaves one member');
reset role;
select pg_temp.check_team(exists(select 1 from public.founder_teams where id='e8771000-0000-4000-8000-000000000002'),'G: team object kept, nothing deleted');
select pg_temp.check_team(pg_temp.status_for(1,'e8771000-0000-4000-8000-000000000002')='not_ready','G: solo team has no report');
select pg_temp.check_team(pg_temp.readiness_for(1,'e8771000-0000-4000-8000-000000000002')->>'status'='unavailable','G: solo team readiness unavailable');

-- H) Bestand: vollstaendige gerichtete Freigaben gelten weiter.
insert into public.alignment_shares(assessment_id,recipient_user_id)
select o.assessment,r.person from ts_people o,ts_people r where o.n in(7,8) and r.n in(7,8) and o.n<>r.n;
select pg_temp.check_team(pg_temp.status_for(7,'e8771000-0000-4000-8000-000000000003')='ready','H: historical directional shares keep the report');
select pg_temp.check_team(pg_temp.member_flag(pg_temp.readiness_for(7,'e8771000-0000-4000-8000-000000000003'),8,'shared_with_team')
 and not pg_temp.member_flag(pg_temp.readiness_for(7,'e8771000-0000-4000-8000-000000000003'),8,'team_share_active'),'H: legacy counts as shared, not as team share');
insert into public.alignment_share_hidden_blocks(share_id,block_id)
select s.id,'EVI-01' from public.alignment_shares s where s.assessment_id=(select assessment from ts_people where n=8);
select pg_temp.check_team(pg_temp.status_for(7,'e8771000-0000-4000-8000-000000000003')='not_ready','H: hidden block in legacy share is not a full share');
select pg_temp.share_team(8,true,'e8771000-0000-4000-8000-000000000003');
select pg_temp.check_team(pg_temp.status_for(7,'e8771000-0000-4000-8000-000000000003')='ready','H: team share replaces the hidden-block limitation');

-- I) Advisor-Fehler: nicht aktive Grants entwerten keine Founder-Freigabe.
insert into public.alignment_shares(assessment_id,recipient_user_id)
select (select assessment from ts_people where n=1),person from ts_people where n in(2,5);
create function pg_temp.effective(owner integer,recipient integer) returns boolean language sql as $$
 select public.alignment_share_is_effective((select assessment from ts_people where n=owner),(select person from ts_people where n=recipient))
$$;
create function pg_temp.set_grant(subject integer,advisor integer,new_status text) returns void language plpgsql as $$
begin
 delete from public.advisor_person_grants where subject_user_id=(select person from ts_people where n=subject) and advisor_user_id=(select person from ts_people where n=advisor);
 if new_status is null then return; end if;
 insert into public.advisor_person_grants(subject_user_id,advisor_user_id,scope,status,requested_by_user_id,approved_at,revoked_at)
 values((select person from ts_people where n=subject),(select person from ts_people where n=advisor),'alignment_report',new_status,(select person from ts_people where n=subject),
  case when new_status='active' then now() end,case when new_status='revoked' then now() end);
end $$;
-- Founder -> Founder
select pg_temp.set_grant(1,2,null);       select pg_temp.check_team(pg_temp.effective(1,2),'I: founder share, no grant');
select pg_temp.set_grant(1,2,'requested'); select pg_temp.check_team(pg_temp.effective(1,2),'I: founder share survives requested grant');
select pg_temp.set_grant(1,2,'declined');  select pg_temp.check_team(pg_temp.effective(1,2),'I: founder share survives declined grant');
select pg_temp.set_grant(1,2,'revoked');   select pg_temp.check_team(pg_temp.effective(1,2),'I: founder share survives revoked grant');
select pg_temp.set_grant(1,2,'active');    select pg_temp.check_team(pg_temp.effective(1,2),'I: founder share with active grant');
-- Founder -> Advisor (kein Peer): unveraenderte Advisor-Regel
select pg_temp.set_grant(1,5,null);       select pg_temp.check_team(pg_temp.effective(1,5),'I: advisor share without grant');
select pg_temp.set_grant(1,5,'active');    select pg_temp.check_team(pg_temp.effective(1,5),'I: advisor share with active grant');
select pg_temp.set_grant(1,5,'revoked');   select pg_temp.check_team(not pg_temp.effective(1,5),'I: ended advisor relationship ends the share');
select pg_temp.set_grant(1,5,'active');
select pg_temp.check_team(jsonb_array_length(pg_temp.profile_for(5,1)->'answers')=29,'I: actual advisor share still works');
select pg_temp.check_team(pg_temp.status_for(5) is null,'I: advisor gets no team report from team shares');

-- J) Beitritt: zwei ausdrueckliche Optionen, keine Vorauswahl.
insert into public.invitations(id,inviter_user_id,invitee_email,status,token_hash,expires_at,team_context) values
 ('e8774000-0000-4000-8000-000000000001',(select person from ts_people where n=7),'teamshare-8@example.test','sent',encode(extensions.digest('ts-join-share','sha256'),'hex'),now()+interval '1 day','pre_founder'),
 ('e8774000-0000-4000-8000-000000000002',(select person from ts_people where n=2),'teamshare-4@example.test','sent',encode(extensions.digest('ts-join-later','sha256'),'hex'),now()+interval '1 day','pre_founder');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select person from ts_people where n=8),'email','teamshare-8@example.test','role','authenticated')::text,true);
set local role authenticated;
select set_config('ts.join_team',(select team_id::text from public.accept_invitation_with_team_share('ts-join-share',true)),true);
reset role;
select pg_temp.check_team(current_setting('ts.join_team') <> '' and exists(select 1 from public.founder_team_members where team_id=current_setting('ts.join_team')::uuid and user_id=(select person from ts_people where n=8)),'J: join and share joins the team');
select pg_temp.check_team(exists(select 1 from public.team_shares where team_id=current_setting('ts.join_team')::uuid and owner_user_id=(select person from ts_people where n=8) and revoked_at is null),'J: join and share sets the team share');
select pg_temp.check_team(not exists(select 1 from public.team_shares where team_id=current_setting('ts.join_team')::uuid and owner_user_id=(select person from ts_people where n=7)),'J: inviter share is not implied');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select person from ts_people where n=4),'email','teamshare-4@example.test','role','authenticated')::text,true);
set local role authenticated;
select set_config('ts.later_team',(select team_id::text from public.accept_invitation_with_team_share('ts-join-later',false)),true);
reset role;
select pg_temp.check_team(exists(select 1 from public.founder_team_members where team_id=current_setting('ts.later_team')::uuid and user_id=(select person from ts_people where n=4))
 and not exists(select 1 from public.team_shares where team_id=current_setting('ts.later_team')::uuid),'J: join later joins without sharing');
do $$ begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person from ts_people where n=4),'role','authenticated')::text,true);
 execute 'set local role authenticated';
 begin perform public.accept_invitation_with_team_share('ts-join-later',null); raise exception 'missing choice accepted';
 exception when invalid_parameter_value then null; end;
 execute 'reset role';
end $$;

-- K) Phase 11.7B.1: Faehigkeiten teamgenau bei zwei gemeinsamen Teams.
-- Person 4 (private) hat fuer Team A (Share team) geteilt; Team B mit 2 und 4 ohne Freigabe.
update public.person_core set capability_disclosure='private' where user_id=(select person from ts_people where n=4);
insert into public.person_capability_entries(user_id,area_id,application_level,ownership_wish) select person,'b2b_sales',4,'own' from ts_people where n=4;
insert into public.founder_teams(id,name,team_context) values('e8771000-0000-4000-8000-000000000004','Team B','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e8771000-0000-4000-8000-000000000004',person from ts_people where n in(2,4);
select pg_temp.check_team(pg_temp.caps_for(2,4) @> '[{"area_id":"b2b_sales","application_level":4,"ownership_wish":"own"}]','K: team A with share shows depth');
select pg_temp.check_team(jsonb_array_length(pg_temp.caps_for(2,4,'e8771000-0000-4000-8000-000000000004'))=0,'K: team B without share shows nothing (private)');
select pg_temp.check_team(jsonb_array_length(pg_temp.disclosed_for(2,4,'team'))=0,'K: context-free team ladder ignores team shares');
select pg_temp.check_team(jsonb_array_length(pg_temp.caps_for(6,4))=0,'K: non-member gets nothing in team A');
select pg_temp.share_team(4,true,'e8771000-0000-4000-8000-000000000004');
select pg_temp.check_team(pg_temp.caps_for(2,4,'e8771000-0000-4000-8000-000000000004') @> '[{"area_id":"b2b_sales","application_level":4}]','K: sharing B later shows depth in B');
select pg_temp.share_team(4,false);
select pg_temp.check_team(jsonb_array_length(pg_temp.caps_for(2,4))=0,'K: revoking A hides depth in A');
select pg_temp.check_team(pg_temp.caps_for(2,4,'e8771000-0000-4000-8000-000000000004') @> '[{"area_id":"b2b_sales","ownership_wish":"own"}]','K: B stays visible after revoking A');
select pg_temp.share_team(2,true,'e8771000-0000-4000-8000-000000000004');
select pg_temp.check_team(exists(select 1 from jsonb_array_elements(pg_temp.team_for_id(2,'e8771000-0000-4000-8000-000000000004')->'people') p, jsonb_array_elements(p->'capabilities') c
 where p->>'person_id'=(select person::text from ts_people where n=4) and c->>'ownership_wish'='own'),'K: team B report carries B-scoped depth');
select pg_temp.check_team(jsonb_array_length(pg_temp.disclosed_for(2,4,'discovery'))=0 and jsonb_array_length(pg_temp.disclosed_for(2,4,'connect'))=0,'K: FIND/CONNECT unchanged');

-- L) Phase 11.7B.1: eine getroffene Teamentscheidung schlaegt den Bestand.
delete from public.alignment_share_hidden_blocks where share_id in(select id from public.alignment_shares where assessment_id=(select assessment from ts_people where n=8));
select pg_temp.check_team(pg_temp.status_for(7,'e8771000-0000-4000-8000-000000000003')='ready','L: active team share -> ready');
select pg_temp.share_team(8,false,'e8771000-0000-4000-8000-000000000003');
select pg_temp.check_team(pg_temp.status_for(7,'e8771000-0000-4000-8000-000000000003')='not_ready','L: revoked team share beats complete legacy directed shares');
select pg_temp.check_team(not pg_temp.member_flag(pg_temp.readiness_for(7,'e8771000-0000-4000-8000-000000000003'),8,'shared_with_team'),'L: readiness shows not shared');
select pg_temp.check_team((select count(*) from public.alignment_shares where assessment_id=(select assessment from ts_people where n=8) and revoked_at is null)=1,'L: directed shares untouched');
select pg_temp.check_team(jsonb_array_length(pg_temp.profile_for(7,8)->'answers')=29,'L: direct individual view from directed share still works');
select pg_temp.share_team(8,true,'e8771000-0000-4000-8000-000000000003');
select pg_temp.check_team(pg_temp.status_for(7,'e8771000-0000-4000-8000-000000000003')='ready','L: re-sharing restores the report');

-- Hilfsfunktionen sind nicht direkt aufrufbar.
select pg_temp.check_team(not has_function_privilege('authenticated','public.team_share_active(uuid,uuid)','execute')
 and not has_function_privilege('authenticated','public.team_share_visible(uuid,uuid)','execute')
 and not has_function_privilege('authenticated','public.team_member_shares_with_team(uuid,uuid)','execute')
 and not has_function_privilege('anon','public.set_team_share(uuid,boolean)','execute')
 and not has_function_privilege('anon','public.leave_founder_team(uuid)','execute'),'helpers not callable by clients');

select extensions.pass('team shares, leave, venture visibility and advisor fix');
select * from extensions.finish();
rollback;
