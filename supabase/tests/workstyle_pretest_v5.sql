\set ON_ERROR_STOP on
-- Workstyle v4: 29 Produktfragen ohne Forschungsteil. Nur v4 ist das aktuelle
-- Arbeitsprofil; v3 wird nie mit v4 verglichen und ist nur fuer die Person selbst lesbar.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.ok(c boolean,label text) returns void language plpgsql as $$ begin if c is not true then raise exception 'v5: %',label; end if; end $$;
create temp table v5_people(n integer primary key,person uuid,assessment uuid);
grant all on v5_people to authenticated;
-- 1,2 Team mit v4; 3 nur v3 (FIND und Team gemischt); 4 Aussenstehende.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8a50000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','v5-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,4)n;
insert into v5_people select n,('e8a50000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,null from generate_series(1,4)n;
insert into public.profiles(user_id,display_name,roles) select person,'V4 '||n,array['founder'] from v5_people
on conflict(user_id) do update set roles=excluded.roles,display_name=excluded.display_name;

create function pg_temp.person(n integer) returns uuid language sql as $$ select person from v5_people p where p.n=person.n $$;
create function pg_temp.act(n integer) returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(n),'role','authenticated')::text,true)
$$;
create function pg_temp.item(k text) returns public.workstyle_item_versions language sql as $$
 select * from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5' and item_key=k
$$;
-- Speichert als die Person; liefert die Fehlermeldung oder null.
create function pg_temp.try_save(n integer,k text,version text,v integer,o text,m text,r jsonb) returns text language plpgsql as $$
begin
 perform pg_temp.act(n); execute 'set local role authenticated';
 perform public.save_workstyle_v5((select assessment from v5_people p where p.n=try_save.n),k,version,v,o,m,r);
 execute 'reset role'; return null;
exception when others then execute 'reset role'; return sqlerrm;
end $$;
-- Beantwortet die ersten k (oder alle) v5-Fragen in Reihenfolge.
create function pg_temp.answer_v4(n integer,k integer default null) returns jsonb language plpgsql as $$
declare i public.workstyle_item_versions; c integer:=0; r jsonb;
begin
 perform pg_temp.act(n); execute 'set local role authenticated';
 for i in select * from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5' order by position loop
  c:=c+1; exit when k is not null and c>k;
  r:=public.save_workstyle_v5((select assessment from v5_people p where p.n=answer_v4.n),i.item_key,i.item_version,
   case when i.definition->>'response_format'<>'comparative' then 3 end,case when i.definition->>'response_format'='comparative' then 'lean_a' end,
   null,nullif(i.definition->'rendered_order','null'::jsonb));
 end loop;
 execute 'reset role'; return r;
end $$;
create function pg_temp.start_v4(n integer,p_new boolean default false) returns uuid language plpgsql as $$
declare id uuid;
begin
 perform pg_temp.act(n); execute 'set local role authenticated';
 id:=(public.start_workstyle_v5(p_new)->>'assessment_id')::uuid;
 execute 'reset role';
 update v5_people set assessment=id where v5_people.n=start_v4.n;
 return id;
end $$;
-- Seit 20270302120000 legt keine Funktion mehr eine neue v3-Teilnahme an. Bestehende
-- Teilnahmen entstehen hier als Datenzeilen, genau wie die frueheren Startfunktionen
-- sie geschrieben haben; fortgesetzt, gespeichert und gelesen wird ueber die RPCs.
create function pg_temp.seed_v3(p uuid,consent text default null,ctx jsonb default '{}',research_set text default null,mixed boolean default true) returns uuid language plpgsql as $$
declare id uuid;
begin
 insert into public.assessments(user_id,module,instrument_id) values(p,'founder_profile','founder-workstyle-pretest-8-5a-v3') returning assessments.id into id;
 insert into public.workstyle_pretest_sessions(assessment_id,assessment_version,form,consent_version,consent_given_at,context,manifest_version,resume_position,research_set,research_set_version,item_order)
 values(id,'8.5a-v3',null,consent,case when consent is not null then clock_timestamp() end,coalesce(ctx,'{}'),'3.0.0',0,
  research_set,case when research_set is not null then 'research-sets/1.0.0' end,
  case when research_set is not null then public.workstyle_research_order('research-sets/1.0.0',research_set,mixed) end);
 return id;
end $$;
-- Ein vollstaendiges v3-Profil aus einer bestehenden Teilnahme (52 Screens mit Einwilligung).
create function pg_temp.complete_v3(n integer) returns uuid language plpgsql as $$
declare id uuid; i record;
begin
 perform pg_temp.act(n);
 id:=pg_temp.seed_v3(pg_temp.person(n),'workstyle_research_v3','{"founder_experience":"1","team_size":"two"}');
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'revision_of' is null order by position loop
  perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,null,null,'cannot_assess',nullif(i.definition->'rendered_order','null'::jsonb),100,i.position=52);
 end loop;
 return id;
end $$;
create function pg_temp.profile(viewer integer,subject integer) returns jsonb language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(viewer); execute 'set local role authenticated';
 r:=public.get_workstyle_product_profile(pg_temp.person(subject));
 execute 'reset role'; return r;
end $$;
create function pg_temp.team(viewer integer) returns jsonb language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(viewer); execute 'set local role authenticated';
 r:=public.get_workstyle_product_team('e8a41000-0000-4000-8000-000000000001');
 execute 'reset role'; return r;
end $$;
create function pg_temp.team_status(viewer integer) returns text language plpgsql as $$
declare r text;
begin
 perform pg_temp.act(viewer); execute 'set local role authenticated';
 r:=public.get_workstyle_product_team_status('e8a41000-0000-4000-8000-000000000001');
 execute 'reset role'; return r;
end $$;
create function pg_temp.readiness(viewer integer) returns jsonb language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(viewer); execute 'set local role authenticated';
 r:=public.get_workstyle_team_share_readiness('e8a41000-0000-4000-8000-000000000001');
 execute 'reset role'; return r;
end $$;
create function pg_temp.team_share(n integer,enabled boolean) returns void language plpgsql as $$
begin
 perform pg_temp.act(n); execute 'set local role authenticated';
 perform public.set_team_share('e8a41000-0000-4000-8000-000000000001',enabled);
 execute 'reset role';
end $$;
create function pg_temp.signals(viewer integer,candidate integer) returns integer language plpgsql as $$
declare r integer;
begin
 perform pg_temp.act(viewer); execute 'set local role authenticated';
 select count(*) into r from public.get_discovery_workstyle_signals(pg_temp.person(candidate));
 execute 'reset role'; return r;
end $$;

-- A) Definition: 29 Core-Items, feste Positionen, keine Forschungs-Items, unveraenderlich.
select pg_temp.ok((select count(*)=29 and min(position)=1 and max(position)=29
 and bool_and(definition->>'usage'='core' and definition->>'scientific_status'='core' and not (definition->>'research_only')::boolean and item_version='v5.0' and assessment_version='8.5a-v5')
 and count(*) filter(where definition->>'response_format'='comparative')=20
 and count(*) filter(where definition->>'response_format'='influence')=5
 and count(*) filter(where definition->>'response_format'='ambiguity_unrest')=4
 and count(*) filter(where definition->>'response_format'='likelihood')=0
 and count(*) filter(where definition->>'response_format'='seriousness')=0
 from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5'),'A: 29 core items, 20 A/B, 5 influence, 4 unrest, no likelihood or seriousness scale');
select pg_temp.ok((select count(*)=0 from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5' and item_key !~ '^(EVI|EXP|EL|VOICE|AMB|ORG)-[0-9]{2}$'),'A: no DEC, FS or research keys');
select pg_temp.ok(public.workstyle_instrument_for('8.5a-v5')='founder-workstyle-pretest-8-5a-v5','A: version resolves to its own instrument');
do $$ begin
 begin update public.workstyle_item_versions set definition=definition||'{"prompt":"x"}' where instrument_id='founder-workstyle-pretest-8-5a-v5' and item_key='ORG-01'; raise exception 'item changed'; exception when check_violation then null; end;
 begin insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition)
  select instrument_id,assessment_version,'ORG-05','v5.0',30,definition||'{"item_key":"ORG-05","usage":"research_only","research_only":true,"scientific_status":"research"}'
  from public.workstyle_item_versions where instrument_id='founder-workstyle-pretest-8-5a-v5' and item_key='ORG-01';
  raise exception 'research item added to v4'; exception when check_violation then null; end;
end $$;
select pg_temp.ok(has_function_privilege('authenticated','public.start_workstyle_v5(boolean)','EXECUTE')
 and has_function_privilege('authenticated','public.save_workstyle_v5(uuid,text,text,integer,text,text,jsonb)','EXECUTE')
 and not has_function_privilege('anon','public.start_workstyle_v5(boolean)','EXECUTE')
 and not has_function_privilege('anon','public.save_workstyle_v5(uuid,text,text,integer,text,text,jsonb)','EXECUTE')
 and not has_function_privilege('authenticated','public.workstyle_v5_sync_completion(uuid)','EXECUTE'),'A: entry for signed-in users only, helper internal');

-- B) Start ohne Einwilligung; keine Forschungsmetadaten; Wiederaufnahme statt Doppelstart.
select pg_temp.start_v4(1);
select pg_temp.ok(pg_temp.start_v4(1)=(select assessment from v5_people where n=1) and pg_temp.start_v4(1,true)=(select assessment from v5_people where n=1),'B: repeated start and p_new before completion resume the same participation');
select pg_temp.ok((select consent_version is null and consent_given_at is null and context='{}'::jsonb and timings='{}'::jsonb and feedback is null
 and manifest_version='5.0.0' and resume_position=0 and form is null and research_set is null
 from public.workstyle_pretest_sessions where assessment_id=(select assessment from v5_people where n=1)),'B: no consent, context, timings, feedback or research set');
do $$ begin
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 begin perform public.start_workstyle_v5(); raise exception 'started without account'; exception when insufficient_privilege then null; end;
end $$;

-- C) Speichern: feste Reihenfolge, exakte Item-Version, Formate, Darstellung.
select pg_temp.ok(pg_temp.try_save(1,'EXP-01','v5.0',3,null,null,null)='workstyle_previous_answer_required','C: skipping is rejected');
select pg_temp.ok(pg_temp.try_save(1,'ORG-01','8.4-v0.4',3,null,null,null)='invalid_workstyle_answer','C: v3 item version is rejected');
select pg_temp.ok(pg_temp.try_save(1,'ORG-01','v5.0',null,null,'prefer_not_to_say',null)='invalid_workstyle_answer','C: only cannot_assess as missing reason');
select pg_temp.ok(pg_temp.try_save(1,'ORG-01','v5.0',3,null,'cannot_assess',null)='invalid_workstyle_answer','C: value and missing are exclusive');
-- Fassung 5: ORG-01 ist eine Zweierwahl, EXP-01 die erste Skalenfrage.
select pg_temp.ok(pg_temp.try_save(1,'EXP-01','v5.0',6,null,null,null)='invalid_workstyle_ordinal','C: ordinal scale is 1-5');
select pg_temp.ok(pg_temp.try_save(1,'EXP-01','v5.0',null,'lean_a',null,null)='invalid_workstyle_ordinal','C: ordinal item rejects a category');
select pg_temp.ok(pg_temp.try_save(1,'EXP-01','v5.0',3,null,null,'["A","B"]')='invalid_workstyle_answer','C: ordinal item has no A/B order');
select pg_temp.ok(pg_temp.try_save(1,'ORG-01','v5.0',3,null,null,'["A","B"]')='invalid_workstyle_choice','C: A/B item rejects a number');
select pg_temp.answer_v4(1,7);
-- Position 8 ist ORG-03 (A/B).
select pg_temp.ok((pg_temp.item('ORG-03')).position=8,'C: ORG-03 is the 8th screen');
select pg_temp.ok(pg_temp.try_save(1,'ORG-03','v5.0',3,null,null,'["A","B"]')='invalid_workstyle_choice','C: A/B item rejects a number');
select pg_temp.ok(pg_temp.try_save(1,'ORG-03','v5.0',null,'maybe',null,'["A","B"]')='invalid_workstyle_choice','C: A/B item rejects unknown options');
select pg_temp.ok(pg_temp.try_save(1,'ORG-03','v5.0',null,'lean_a',null,'["B","A"]')='invalid_workstyle_answer','C: A/B order is fixed');
select pg_temp.ok(pg_temp.try_save(1,'ORG-03','v5.0',null,'lean_a',null,null)='invalid_workstyle_answer','C: A/B order is required');
select pg_temp.ok(pg_temp.try_save(1,'EXP-01','v5.0',5,null,null,null) is null,'C: going back and changing an open answer is allowed');
select pg_temp.ok((select value='{"scale":5}'::jsonb from public.alignment_answers where assessment_id=(select assessment from v5_people where n=1) and block_id='EXP-01'),'C: changed answer stored');

-- D) Alte Schreibwege und direkte Schreibzugriffe erreichen v4 nicht.
select pg_temp.act(1);
set local role authenticated;
do $$ declare id uuid:=(select assessment from v5_people where n=1); begin
 begin perform public.save_workstyle_pretest_answer(id,'ORG-03','v5.0',3,null); raise exception 'legacy save accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.save_workstyle_pretest_v3(id,'ORG-03','v5.0',null,'lean_a',null,'["A","B"]'); raise exception 'v3 save accepted'; exception when insufficient_privilege then null; end;
 begin perform public.save_workstyle_feedback(id,'{"clarity":4}'); raise exception 'feedback accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.alignment_answers(assessment_id,block_id,item_version,answer_format,value) values(id,'ORG-03','v5.0','single_choice','{"optionId":"lean_a"}');
  raise exception 'direct answer write accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare id uuid:=(select assessment from v5_people where n=1); begin
 begin insert into public.workstyle_research_responses(assessment_id,instrument_id,item_key,item_version,response_value) values(id,'founder-workstyle-pretest-8-5a-v5','ORG-01','v5.0',3);
  raise exception 'research row for v4'; exception when check_violation then null; end;
 begin update public.workstyle_pretest_sessions set timings='{"ORG-01":1200}' where assessment_id=id; raise exception 'timings for v4'; exception when check_violation then null; end;
 begin update public.workstyle_pretest_sessions set consent_version='workstyle_research_v3',consent_given_at=now() where assessment_id=id; raise exception 'consent for v4'; exception when check_violation then null; end;
 begin update public.workstyle_pretest_sessions set resume_position=29 where assessment_id=id; raise exception 'position past the last screen'; exception when check_violation then null; end;
end $$;

-- E) Abschluss erst mit allen 29 Antworten, danach unveraenderlich.
select pg_temp.answer_v4(1,28);
select pg_temp.ok((select submitted_at is null from public.assessments where id=(select assessment from v5_people where n=1)) and pg_temp.profile(1,1) is null,'E: 28/29 is not a work profile');
select pg_temp.act(1);
set local role authenticated;
do $$ begin
 begin perform public.complete_workstyle_pretest((select assessment from v5_people where n=1)); raise exception 'completed early'; exception when check_violation then null; end;
end $$;
select public.set_workstyle_pretest_position((select assessment from v5_people where n=1),3);
reset role;
select pg_temp.ok((select resume_position=3 from public.workstyle_pretest_sessions where assessment_id=(select assessment from v5_people where n=1)),'E: navigation within answered screens');
create temp table last_save as select pg_temp.answer_v4(1) r;
select pg_temp.ok((select r->>'submitted_at' is not null from last_save),'E: 29th answer completes the work profile');
select pg_temp.ok((select completed_at is null and resume_position=28 from public.workstyle_pretest_sessions where assessment_id=(select assessment from v5_people where n=1)),'E: no research completion, position stays on the last screen');
select pg_temp.ok(pg_temp.try_save(1,'EXP-01','v5.0',2,null,null,null)='workstyle_completed_answer_immutable','E: completed answers are immutable');
select pg_temp.ok(pg_temp.try_save(1,'EXP-01','v5.0',3,null,null,null) is null,'E: identical repeat is allowed');
select pg_temp.act(1);
set local role authenticated;
select public.complete_workstyle_pretest((select assessment from v5_people where n=1));
reset role;
select pg_temp.ok((select p->>'assessment_version'='8.5a-v5' and p->>'item_version'='v5.0' and p->>'manifest_version'='5.0.0' and jsonb_array_length(p->'answers')=29
 from pg_temp.profile(1,1) p),'E: own profile is v4 with 29 answers');
select pg_temp.ok((select count(*)=0 from public.workstyle_research_responses where assessment_id=(select assessment from v5_people where n=1)),'E: no research answers at all');

-- F) Team mit v4 und reinem v3: kein Bericht, kein gemischter Vergleich.
select pg_temp.complete_v3(3);
insert into public.founder_teams(id,name,team_context) values('e8a41000-0000-4000-8000-000000000001','V4 team','existing_team');
insert into public.founder_team_members(team_id,user_id) values('e8a41000-0000-4000-8000-000000000001',pg_temp.person(1)),('e8a41000-0000-4000-8000-000000000001',pg_temp.person(3));
select pg_temp.team_share(1,true); select pg_temp.team_share(3,true);
select pg_temp.ok(pg_temp.team(1)->>'status'='not_ready' and pg_temp.team(3)->>'status'='not_ready','F: v4 next to v3 gives no team report');
select pg_temp.ok(pg_temp.team_status(1)='unavailable','F: team status unavailable while a member has no v4');
select pg_temp.ok((select (m->>'has_current_workstyle')::boolean from jsonb_array_elements(pg_temp.readiness(3)->'members') m where (m->>'is_viewer')::boolean) is false
 and (select (m->>'has_current_workstyle')::boolean from jsonb_array_elements(pg_temp.readiness(1)->'members') m where (m->>'is_viewer')::boolean),'F: own readiness says v3 is not a current work profile, v4 is');
select pg_temp.ok(pg_temp.profile(1,3) is null and pg_temp.profile(3,3)->>'assessment_version'='8.5a-v3','F: v3 profile visible to its owner only, despite the team share');
select pg_temp.act(3);
set local role authenticated;
do $$ begin
 begin perform public.share_workstyle_product(pg_temp.person(1)); raise exception 'v3 shared'; exception when check_violation then null; end;
end $$;
reset role;

-- G) FIND: nur zwei v5-Profile ergeben Signale.
insert into public.founder_discovery_profiles(user_id,status,display_name,headline,bio,own_roles,seeking_roles,industries,remote_mode,availability_hours_per_week,commitment_level,venture_stage,venture_goal,expertise)
select person,'active','V4 founder','Working together','-','{tech}','{sales}','{}','remote',20,'full_time','idea_validating','profitable_business','{}' from v5_people where n in (1,2,3);
do $$ declare n integer; begin
 foreach n in array array[1,2,3] loop
  perform pg_temp.act(n); execute 'set local role authenticated';
  perform public.set_discovery_workstyle_consent(true);
  execute 'reset role';
 end loop;
end $$;
select pg_temp.ok(pg_temp.signals(1,3)=0 and pg_temp.signals(3,1)=0,'G: no FIND signals between v4 and v3');

-- H) Zweite Person mit v4: Teamfreigabe genuegt; v3 bleibt draussen.
select pg_temp.start_v4(2);
select pg_temp.answer_v4(2);
select pg_temp.ok(pg_temp.signals(1,2)=6,'G: two v4 profiles give six area signals');
delete from public.founder_team_members where team_id='e8a41000-0000-4000-8000-000000000001' and user_id=pg_temp.person(3);
insert into public.founder_team_members(team_id,user_id) values('e8a41000-0000-4000-8000-000000000001',pg_temp.person(2));
select pg_temp.ok(pg_temp.team(1)->>'status'='not_ready','H: no team report before the new member shares');
select pg_temp.team_share(1,true); select pg_temp.team_share(2,true);
select pg_temp.ok((select jsonb_array_length(t->'people')=2 and not exists(select 1 from jsonb_array_elements(t->'people') p, jsonb_array_elements(p->'workstyle'->'answers') a where a->>'item_version'<>'v5.0')
 and (select bool_and(jsonb_array_length(p->'workstyle'->'answers')=29 and p->'workstyle'->>'assessment_version'='8.5a-v5') from jsonb_array_elements(t->'people') p)
 from pg_temp.team(1) t),'H: two v4 members give a team report from 29 v4 answers each');
select pg_temp.ok(pg_temp.team_status(2)='available','H: team status available');
select pg_temp.ok(pg_temp.profile(4,1) is null,'H: outsider sees nothing');

-- I) Eine spaeter abgeschlossene v3-Teilnahme ersetzt das aktuelle v5-Profil nicht.
select pg_temp.complete_v3(1);
select pg_temp.ok(pg_temp.profile(1,1)->>'assessment_version'='8.5a-v5' and pg_temp.profile(2,1)->>'assessment_version'='8.5a-v5','I: v4 stays current after a later v3 completion');
select pg_temp.ok(pg_temp.team(2)->>'status'='ready','I: team report unaffected by the later v3 completion');

-- J) Widerruf der Teamfreigabe: sofort kein Bericht mehr.
select pg_temp.team_share(2,false);
select pg_temp.ok(pg_temp.team(1)->>'status'='not_ready' and pg_temp.profile(1,2) is null,'J: revoked team share hides report and profile');
select pg_temp.team_share(2,true);

-- K) Neu erheben: neue Teilnahme erst nach Abschluss; bis sie fertig ist, bleibt das alte Profil aktuell.
create temp table before_retake as select pg_temp.profile(2,2)->>'assessment_id' id;
select pg_temp.ok(pg_temp.start_v4(2,true)::text<>(select id from before_retake),'K: retake creates a new participation');
select pg_temp.answer_v4(2,5);
select pg_temp.ok(pg_temp.profile(2,2)->>'assessment_id'=(select id from before_retake) and pg_temp.team(1)->>'status'='ready','K: previous v4 profile stays current until the retake is complete');

select extensions.pass('workstyle v4: 29 core items, no research, v5-only current profile, no cross-version comparison');
select * from extensions.finish();
rollback;
