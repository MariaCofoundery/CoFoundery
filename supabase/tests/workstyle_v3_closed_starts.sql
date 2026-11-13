\set ON_ERROR_STOP on
-- 20270302120000 / 20270304120000: Workstyle v1, v2 und v3 werden seit v4 nur noch fortgesetzt, nie neu begonnen.
-- Keine neue Teilnahme, keine neue Einwilligung, kein Neu-Erheben; bestehende
-- Teilnahmen laufen weiter (fortsetzen, speichern, widerrufen).
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.ok(c boolean,label text) returns void language plpgsql as $$ begin if c is not true then raise exception 'v3 closed: %',label; end if; end $$;
create temp table cs_people(n integer primary key,person uuid);
grant all on cs_people to authenticated;
-- 1 ohne v3; 2 offene v3-Teilnahme; 3 fertiges v3-Profil ohne Forschung; 4 v3 mit Forschungseinwilligung
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8a50000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','v3closed-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,4)n;
insert into cs_people select n,('e8a50000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,4)n;
insert into public.profiles(user_id,display_name,roles) select person,'Closed '||n,array['founder'] from cs_people on conflict(user_id) do update set roles=excluded.roles;

create function pg_temp.person(n integer) returns uuid language sql as $$ select person from cs_people c where c.n=person.n $$;
create function pg_temp.act(n integer) returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(n),'role','authenticated')::text,true) $$;
create function pg_temp.v3_count(n integer) returns bigint language sql as $$
 select count(*) from public.assessments where user_id=pg_temp.person(n) and instrument_id='founder-workstyle-pretest-8-5a-v3' $$;
-- Bestehende Teilnahmen als Datenzeilen, wie die frueheren Startfunktionen sie geschrieben haben.
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
-- Beantwortet die ersten k Core-Fragen einer v3-Teilnahme ueber die echte RPC.
create function pg_temp.answer_core(n integer,id uuid,k integer) returns void language plpgsql as $$
declare i public.workstyle_item_versions; c integer:=0;
begin
 perform pg_temp.act(n);
 execute 'set local role authenticated';
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'usage'='core' order by position loop
  c:=c+1; exit when c>k;
  perform public.save_workstyle_pretest_v3(id,i.item_key,i.item_version,null,null,'cannot_assess',nullif(i.definition->'rendered_order','null'::jsonb),null,false);
 end loop;
 execute 'reset role';
end $$;
create temp table cs_ids(n integer primary key,assessment uuid);
grant all on cs_ids to authenticated;
insert into cs_ids values(2,pg_temp.seed_v3(pg_temp.person(2))),(3,pg_temp.seed_v3(pg_temp.person(3))),
 (4,pg_temp.seed_v3(pg_temp.person(4),'workstyle_research_v3','{"founder_experience":"1","team_size":"two"}','B',true));
select pg_temp.answer_core(2,(select assessment from cs_ids where n=2),3);
select pg_temp.answer_core(3,(select assessment from cs_ids where n=3),29);
select pg_temp.ok((select submitted_at is not null from public.assessments where id=(select assessment from cs_ids where n=3)),'fixture: person 3 has a finished v3 profile');

select pg_temp.ok(has_function_privilege('authenticated','public.start_workstyle_product(boolean)','EXECUTE')
 and has_function_privilege('authenticated','public.start_workstyle_research(text,jsonb)','EXECUTE')
 and has_function_privilege('authenticated','public.start_workstyle_pretest(text,jsonb,boolean)','EXECUTE')
 and not has_function_privilege('anon','public.start_workstyle_product(boolean)','EXECUTE')
 and not has_function_privilege('anon','public.start_workstyle_research(text,jsonb)','EXECUTE'),'grants unchanged');

-- 1) Ohne v3: kein Weg legt eine neue v3-Teilnahme an.
select pg_temp.act(1);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_product(); raise exception 'new v3 product start'; exception when object_not_in_prerequisite_state then null; end;
 begin perform public.start_workstyle_product(true); raise exception 'new v3 product start with p_new'; exception when object_not_in_prerequisite_state then null; end;
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'new v3 research start'; exception when object_not_in_prerequisite_state then null; end;
 begin perform public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'new v3 pretest start'; exception when object_not_in_prerequisite_state then null; end;
 begin perform public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}',true); raise exception 'new v3 pretest start with p_new'; exception when object_not_in_prerequisite_state then null; end;
 -- Eingaben werden weiter vor der Sperre geprueft.
 begin perform public.start_workstyle_research(null,'{"founder_experience":"1","team_size":"two"}'); raise exception 'missing consent version'; exception when insufficient_privilege then null; end;
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"many","team_size":"two"}'); raise exception 'invalid context'; exception when invalid_parameter_value then null; end;
 begin perform public.start_workstyle_product(null); raise exception 'null p_new'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
select pg_temp.ok(pg_temp.v3_count(1)=0 and not exists(select 1 from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id where a.user_id=pg_temp.person(1)),'1: nothing was created');
-- 20270304120000: v1 und v2 ebenso.
select pg_temp.act(1);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_pretest('workstyle_research_v1','{"founder_experience":"none","team_size":"solo"}'); raise exception 'new v1 start'; exception when object_not_in_prerequisite_state then null; end;
 begin perform public.start_workstyle_pretest('workstyle_research_v2','{"founder_experience":"1","team_size":"solo"}',true); raise exception 'new v2 start'; exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
select pg_temp.ok(not exists(select 1 from public.assessments where user_id=pg_temp.person(1) and instrument_id like 'founder-workstyle-pretest-8-5a-v_' and instrument_id<>'founder-workstyle-pretest-8-5a-v5'),'1: no v1/v2/v3/v4 participation was created');
-- v5 ist der Weg fuer neue Arbeitsprofile; v4 ist seit Fassung 5 ebenfalls zu.
select pg_temp.act(1);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_v4(); raise exception 'new v4 start'; exception when object_not_in_prerequisite_state then null; end;
end $$;
select pg_temp.ok(public.start_workstyle_v5()->>'assessment_version'='8.5a-v5','1: a new start goes to v5');
reset role;
select pg_temp.ok(pg_temp.v3_count(1)=0,'1: still no v3 participation');

-- 2) Offene v3-Teilnahme: fortsetzen und weiter speichern, auch ueber den frueheren Einstieg.
select pg_temp.act(2);
set local role authenticated;
select pg_temp.ok((public.start_workstyle_product()->>'assessment_id')::uuid=(select assessment from cs_ids where n=2),'2: product start resumes the open participation');
select pg_temp.ok((public.start_workstyle_product(true)->>'assessment_id')::uuid=(select assessment from cs_ids where n=2),'2: p_new on an unfinished participation still resumes');
select pg_temp.ok((public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}')->>'assessment_id')::uuid=(select assessment from cs_ids where n=2),'2: earlier entry resumes too');
do $$ begin
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'new consent on open participation'; exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
select pg_temp.answer_core(2,(select assessment from cs_ids where n=2),4);
select pg_temp.ok((select count(*)=4 from public.alignment_answers where assessment_id=(select assessment from cs_ids where n=2)) and pg_temp.v3_count(2)=1,'2: saving continues, still one participation');

-- 3) Fertiges v3-Profil: lesbar, aber kein Neu-Erheben und keine nachtraegliche Einwilligung.
select pg_temp.act(3);
set local role authenticated;
select pg_temp.ok((public.start_workstyle_product()->>'assessment_id')::uuid=(select assessment from cs_ids where n=3),'3: start returns the finished participation');
do $$ begin
 begin perform public.start_workstyle_product(true); raise exception 'v3 retake'; exception when object_not_in_prerequisite_state then null; end;
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'late v3 opt-in'; exception when object_not_in_prerequisite_state then null; end;
end $$;
select pg_temp.ok(public.get_workstyle_product_profile(auth.uid())->>'assessment_version'='8.5a-v3','3: own v3 report stays readable');
reset role;
select pg_temp.ok(pg_temp.v3_count(3)=1 and (select consent_version is null and research_set is null from public.workstyle_pretest_sessions where assessment_id=(select assessment from cs_ids where n=3)),'3: no new participation, no consent');

-- 4) Bestehende Forschungseinwilligung: setzt fort, Widerruf bleibt moeglich. Der Widerruf einer
-- unfertigen Teilnahme loescht sie ganz; danach entsteht auch ueber die Forschung nichts Neues.
-- (Widerruf nach fertigem Profil: research_withdrawn, siehe workstyle_product_core_completion.)
select pg_temp.act(4);
set local role authenticated;
select pg_temp.ok((select (r->>'assessment_id')::uuid=(select assessment from cs_ids where n=4) and r->>'consent_version'='workstyle_research_v3' and r->>'research_set'='B'
 from public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}') r),'4: existing research participation resumes with its set');
select public.withdraw_workstyle_research();
do $$ begin
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'research after withdrawal'; exception when object_not_in_prerequisite_state then null; end;
 begin perform public.start_workstyle_product(); raise exception 'erased participation restarted'; exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
select pg_temp.ok(pg_temp.v3_count(4)=0,'4: withdrawal erases the unfinished consented participation, and nothing new is created');

select extensions.pass('workstyle v3 only resumes: no new participation, no new consent, no retake; existing participations continue');
select * from extensions.finish();
rollback;
