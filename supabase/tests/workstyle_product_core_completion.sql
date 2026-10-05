\set ON_ERROR_STOP on
-- Phase 11.6: Das Arbeitsprofil entsteht aus den 29 Core-Fragen. Forschung ist
-- freiwillig, getrennt und braucht eine eigene Einwilligung. Der gemeinsame
-- Teambericht folgt auch fuer Advisors der gegenseitigen Bereitschaft.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.ok(c boolean,label text) returns void language plpgsql as $$ begin if c is not true then raise exception 'core: %',label; end if; end $$;
create temp table core_people(n integer primary key,person uuid,assessment uuid);
grant all on core_people to authenticated;
-- 1,2,6 Produkt ohne Forschung; 3 bestehende 52/52-Teilnahme; 4 bestehende Teilnahme
-- mit 28 Core + 23 Forschung; 5 Advisor; 7 Forschungsadmin; 8 unvollstaendig mit Einwilligung.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8560000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','core-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,8)n;
insert into core_people select n,('e8560000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,null from generate_series(1,8)n;
insert into public.profiles(user_id,display_name,roles) select person,'Core '||n,case when n=5 then array['advisor'] else array['founder'] end from core_people
on conflict(user_id) do update set roles=excluded.roles,display_name=excluded.display_name;

create function pg_temp.person(n integer) returns uuid language sql as $$ select person from core_people c where c.n=person.n $$;
create function pg_temp.act(n integer) returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(n),'role','authenticated')::text,true)
$$;
create function pg_temp.is_core(d jsonb) returns boolean language sql as $$ select d->>'usage'='core' and d->>'scientific_status'='core' $$;
create function pg_temp.save(n integer,i public.workstyle_item_versions) returns jsonb language plpgsql as $$
declare v integer; o text; r jsonb;
begin
 if i.definition->>'response_format' in ('comparative','behavioral') then o:=i.definition->'options'->0->>'option_id'; else v:=3; end if;
 perform pg_temp.act(n);
 execute 'set local role authenticated';
 r:=public.save_workstyle_pretest_v3((select assessment from core_people c where c.n=save.n),i.item_key,i.item_version,v,o,null,
   nullif(i.definition->'rendered_order','null'::jsonb),100,false);
 execute 'reset role';
 return r;
end $$;
-- Beantwortet den Teil (core/research) in Reihenfolge, optional nur die ersten k.
create function pg_temp.answer(n integer,part text,k integer default null) returns jsonb language plpgsql as $$
declare i public.workstyle_item_versions; r jsonb; c integer:=0; s public.workstyle_pretest_sessions; wave boolean;
begin
 select * into s from public.workstyle_pretest_sessions where assessment_id=(select assessment from core_people x where x.n=answer.n);
 wave:=part='research' and s.research_set is not null;
 -- Welle 1: Forschung in der gespeicherten Set-Reihenfolge; sonst der 52er-Bestand nach Position.
 for i in select v.* from public.workstyle_item_versions v
  left join jsonb_array_elements_text(coalesce(s.item_order,'[]'::jsonb)) with ordinality o(k,idx) on o.k=v.item_key
  where v.assessment_version='8.5a-v3' and pg_temp.is_core(v.definition)=(part='core')
  and (case when wave then o.k is not null else v.definition->>'revision_of' is null end)
  order by case when wave then o.idx else v.position end loop
  c:=c+1; exit when k is not null and c>k;
  r:=pg_temp.save(n,i);
 end loop;
 return r;
end $$;
create function pg_temp.start_product(n integer,p_new boolean default false) returns uuid language plpgsql as $$
declare id uuid;
begin
 perform pg_temp.act(n);
 execute 'set local role authenticated';
 id:=(public.start_workstyle_product(p_new)->>'assessment_id')::uuid;
 execute 'reset role';
 update core_people set assessment=id where core_people.n=start_product.n;
 return id;
end $$;
create function pg_temp.submitted(n integer) returns timestamptz language sql as $$ select submitted_at from public.assessments where id=(select assessment from core_people c where c.n=submitted.n) $$;
create function pg_temp.session(n integer) returns public.workstyle_pretest_sessions language sql as $$ select * from public.workstyle_pretest_sessions where assessment_id=(select assessment from core_people c where c.n=session.n) $$;
create function pg_temp.profile(viewer integer,subject integer) returns jsonb language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(viewer);
 execute 'set local role authenticated';
 r:=public.get_workstyle_product_profile(pg_temp.person(subject));
 execute 'reset role';
 return r;
end $$;
create function pg_temp.team(viewer integer,t uuid) returns jsonb language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(viewer);
 execute 'set local role authenticated';
 r:=public.get_workstyle_product_team(t);
 execute 'reset role';
 return r;
end $$;
create function pg_temp.team_workstyle(viewer integer,t uuid) returns jsonb language sql as $$
 select jsonb_agg(p->'workstyle' order by p->>'person_id') from jsonb_array_elements(pg_temp.team(viewer,t)->'people') p
$$;
create function pg_temp.share_with(owner integer,recipient integer) returns void language plpgsql as $$
begin
 perform pg_temp.act(owner);
 execute 'set local role authenticated';
 perform public.share_workstyle_product(pg_temp.person(recipient));
 execute 'reset role';
end $$;
-- Advisor-Personenfreigabe direkt (die Advisor-Gruppenfreigabe ist kein Empfaengerweg von share_workstyle_product).
create function pg_temp.share_with_advisor(owner integer) returns void language sql as $$
 insert into public.alignment_shares(assessment_id,recipient_user_id)
 values((select assessment from core_people where n=owner),pg_temp.person(5)) on conflict(assessment_id,recipient_user_id) do update set revoked_at=null
$$;

select pg_temp.ok(has_function_privilege('authenticated','public.start_workstyle_product(boolean)','EXECUTE')
 and has_function_privilege('authenticated','public.start_workstyle_research(text,jsonb)','EXECUTE')
 and not has_function_privilege('anon','public.start_workstyle_product(boolean)','EXECUTE')
 and not has_function_privilege('anon','public.start_workstyle_research(text,jsonb)','EXECUTE')
 and not has_function_privilege('authenticated','public.workstyle_v3_sync_completion(uuid)','EXECUTE'),'grants: product/research entry for signed-in users only, helper internal');

-- G) Ohne Forschungseinwilligung startbar; keine Forschungsmetadaten.
select pg_temp.start_product(1);
select pg_temp.ok(pg_temp.start_product(1)=(select assessment from core_people where n=1),'G: repeated start resumes the same participation');
select pg_temp.ok((pg_temp.session(1)).consent_version is null and (pg_temp.session(1)).consent_given_at is null
 and (pg_temp.session(1)).context='{}'::jsonb and (pg_temp.session(1)).timings='{}'::jsonb,'G: product session carries no research consent, context or timings');
select pg_temp.act(1);
set local role authenticated;
do $$ declare id uuid:=(select assessment from core_people where n=1); r public.workstyle_item_versions; c public.workstyle_item_versions; begin
 select * into r from public.workstyle_item_versions where assessment_version='8.5a-v3' and not pg_temp.is_core(definition) order by position limit 1;
 begin perform public.save_workstyle_pretest_v3(id,r.item_key,r.item_version,null,null,'cannot_assess',nullif(r.definition->'rendered_order','null'::jsonb)); raise exception 'research without consent'; exception when insufficient_privilege then null; end;
 select * into c from public.workstyle_item_versions where assessment_version='8.5a-v3' and pg_temp.is_core(definition) order by position offset 1 limit 1;
 begin perform public.save_workstyle_pretest_v3(id,c.item_key,c.item_version,null,null,'cannot_assess',nullif(c.definition->'rendered_order','null'::jsonb)); raise exception 'core skipped'; exception when check_violation then null; end;
 begin perform public.start_workstyle_research(null,'{"founder_experience":"1","team_size":"two"}'); raise exception 'research without consent version'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- C-Variante) 28 von 29 Core-Antworten: noch kein Arbeitsprofil.
select pg_temp.answer(1,'core',28);
select pg_temp.ok(pg_temp.submitted(1) is null and pg_temp.profile(1,1) is null,'C: 28/29 core is not a product profile');
-- Phase 11.6C: Forschung gibt es zu Beginn (gemischt) oder nach dem fertigen Profil, nicht mittendrin.
select pg_temp.act(1);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'research mid-profile'; exception when check_violation then null; end;
end $$;
reset role;
select pg_temp.ok((pg_temp.session(1)).resume_position>0,'resume position persisted for product part');

-- A) 29/29 Core, 0 Forschung: Arbeitsprofil vollstaendig, sichtbar, teilbar.
create temp table core_result as select pg_temp.answer(1,'core') r;
select pg_temp.ok((select r->>'submitted_at' is not null and r->>'completed_at' is null from core_result),'A: 29th core answer completes the product, not research');
select pg_temp.ok(jsonb_array_length(pg_temp.profile(1,1)->'answers')=29,'A: individual report input has the 29 core answers');
select pg_temp.ok((select count(*)=0 from public.workstyle_research_responses where assessment_id=(select assessment from core_people where n=1)),'A: no research answers');
select pg_temp.ok((pg_temp.session(1)).timings='{}'::jsonb,'A: no timings without research consent');
select pg_temp.act(1);
set local role authenticated;
select pg_temp.ok(public.get_my_workstyle_pretest_version('8.5a-v3')->>'submitted_at' is not null,'A: own session reports product completion');
do $$ declare id uuid:=(select assessment from core_people where n=1); c public.workstyle_item_versions; begin
 select * into c from public.workstyle_item_versions where assessment_version='8.5a-v3' and pg_temp.is_core(definition) order by position limit 1;
 begin perform public.save_workstyle_pretest_v3(id,c.item_key,c.item_version,null,null,'cannot_assess',nullif(c.definition->'rendered_order','null'::jsonb)); raise exception 'completed core changed'; exception when check_violation then null; end;
end $$;
reset role;

-- E/F vorbereiten: Produktprofil fuer 2 und 6 ebenfalls ohne Forschung.
select pg_temp.start_product(2);
select pg_temp.answer(2,'core');
select pg_temp.start_product(6);
select pg_temp.answer(6,'core');
insert into public.founder_teams(id,name,team_context) values('e8561000-0000-4000-8000-000000000001','Core pair','existing_team'),('e8561000-0000-4000-8000-000000000002','Core trio','existing_team');
insert into public.founder_team_members(team_id,user_id) values
 ('e8561000-0000-4000-8000-000000000001',pg_temp.person(1)),('e8561000-0000-4000-8000-000000000001',pg_temp.person(2)),
 ('e8561000-0000-4000-8000-000000000002',pg_temp.person(1)),('e8561000-0000-4000-8000-000000000002',pg_temp.person(2)),('e8561000-0000-4000-8000-000000000002',pg_temp.person(6));

-- H) Forschung separat: Einwilligung nachtraeglich, Produktabschluss unveraendert.
create temp table product_time as select pg_temp.submitted(1) t;
select pg_temp.act(1);
set local role authenticated;
select pg_temp.ok(public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}')->>'consent_version'='workstyle_research_v3','H: explicit research opt-in after product completion');
do $$ begin
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"many","team_size":"two"}'); raise exception 'invalid context'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
select pg_temp.ok((pg_temp.session(1)).research_set in ('A','B') and (pg_temp.session(1)).research_set_version='research-sets/1.0.0'
 and jsonb_array_length((pg_temp.session(1)).item_order)=8,'H: late opt-in gets one set and only its 8 items');
select pg_temp.answer(1,'research',3);
select pg_temp.ok(pg_temp.submitted(1)=(select t from product_time) and (pg_temp.session(1)).completed_at is null,'B/H: partial research leaves product completion untouched');
select pg_temp.ok((select count(*)=3 from public.workstyle_research_responses where assessment_id=(select assessment from core_people where n=1)),'B: partial research persisted');
select pg_temp.ok((select bool_and(not pg_temp.is_core(i.definition)) from jsonb_object_keys((pg_temp.session(1)).timings) k join public.workstyle_item_versions i on i.assessment_version='8.5a-v3' and i.item_key=k),'H: timings only for research answers given with consent');
select pg_temp.act(1);
set local role authenticated;
do $$ declare id uuid:=(select assessment from core_people where n=1); r public.workstyle_item_versions; begin
 select v.* into r from public.workstyle_item_versions v where v.assessment_version='8.5a-v3' and v.item_key=(public.get_my_workstyle_pretest_version('8.5a-v3')->'item_order'->>5);
 begin perform public.save_workstyle_pretest_v3(id,r.item_key,r.item_version,null,null,'cannot_assess',nullif(r.definition->'rendered_order','null'::jsonb)); raise exception 'research skipped'; exception when check_violation then null; end;
 select v.* into r from public.workstyle_item_versions v where v.assessment_version='8.5a-v3' and not pg_temp.is_core(v.definition)
  and not exists(select 1 from jsonb_array_elements_text(public.get_my_workstyle_pretest_version('8.5a-v3')->'item_order') o(k) where o.k=v.item_key) order by position limit 1;
 begin perform public.save_workstyle_pretest_v3(id,r.item_key,r.item_version,null,null,'cannot_assess',nullif(r.definition->'rendered_order','null'::jsonb)); raise exception 'item outside set'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
-- Export: nur Sitzungen mit Einwilligung.
insert into public.platform_admins(user_id) values(pg_temp.person(7));
select pg_temp.act(7);
set local role authenticated;
select pg_temp.ok((select count(*)=1 from jsonb_array_elements(public.get_workstyle_research_dataset_version('8.5a-v3')) x where x->>'research_consent_given_at' is not null),'export contains only the consented session');
reset role;
select pg_temp.answer(1,'research');
select pg_temp.ok((pg_temp.session(1)).completed_at>pg_temp.submitted(1),'research completion is separate and later');
select pg_temp.act(1);
set local role authenticated;
select public.save_workstyle_feedback((select assessment from core_people where n=1),'{"clarity":4}');
reset role;

-- D) Bestehende 52/52-Teilnahme ueber den bisherigen Einstieg bleibt vollstaendig.
select pg_temp.act(3);
update core_people set assessment=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"2-3","team_size":"two"}')->>'assessment_id')::uuid where n=3;
do $$ declare i public.workstyle_item_versions; begin
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and definition->>'revision_of' is null order by position loop perform pg_temp.save(3,i); end loop;
end $$;
select pg_temp.ok(pg_temp.submitted(3) is not null and (pg_temp.session(3)).completed_at is not null and jsonb_array_length(pg_temp.profile(3,3)->'answers')=29,'D: 52/52 participation stays complete');

-- C) Bestehende Teilnahme mit Einwilligung: 28 Core + 23 Forschung -> kein Arbeitsprofil.
select pg_temp.act(4);
update core_people set assessment=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"0","team_size":"solo"}')->>'assessment_id')::uuid where n=4;
do $$ declare i public.workstyle_item_versions; last_core text; begin
 select item_key into last_core from public.workstyle_item_versions where assessment_version='8.5a-v3' and pg_temp.is_core(definition) order by position desc limit 1;
 for i in select * from public.workstyle_item_versions where assessment_version='8.5a-v3' and item_key<>last_core and definition->>'revision_of' is null order by position loop perform pg_temp.save(4,i); end loop;
end $$;
select pg_temp.ok(pg_temp.submitted(4) is null and (pg_temp.session(4)).completed_at is null and pg_temp.profile(4,4) is null
 and (select count(*)=23 from public.workstyle_research_responses where assessment_id=(select assessment from core_people where n=4)),'C: 28/29 core with 23/23 research is no product profile');
select pg_temp.answer(4,'core');
select pg_temp.ok(pg_temp.submitted(4) is not null and (pg_temp.session(4)).completed_at=pg_temp.submitted(4),'C: last core answer completes product and the already finished research');

-- Expliziter Abschluss fuer bestehende Staende (gleiche Regel wie die Bestandsuebernahme).
select pg_temp.act(8);
update core_people set assessment=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"0","team_size":"solo"}')->>'assessment_id')::uuid where n=8;
select pg_temp.answer(8,'core',5);
-- I) Widerruf einer unvollstaendigen Teilnahme mit Einwilligung loescht wie bisher.
select pg_temp.act(8);
set local role authenticated;
select public.withdraw_workstyle_research();
reset role;
select pg_temp.ok(not exists(select 1 from public.assessments where id=(select assessment from core_people where n=8)),'I: incomplete consented participation is erased on withdrawal as before');

-- I) Widerruf nach abgeschlossenem Arbeitsprofil: Forschung weg, Arbeitsprofil bleibt.
select pg_temp.act(1);
set local role authenticated;
select public.withdraw_workstyle_research();
do $$ declare id uuid:=(select assessment from core_people where n=1); r public.workstyle_item_versions; begin
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'restart after withdrawal'; exception when insufficient_privilege then null; end;
 select * into r from public.workstyle_item_versions where assessment_version='8.5a-v3' and not pg_temp.is_core(definition) order by position limit 1;
 begin perform public.save_workstyle_pretest_v3(id,r.item_key,r.item_version,null,null,'cannot_assess',nullif(r.definition->'rendered_order','null'::jsonb)); raise exception 'save after withdrawal'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.ok((select count(*)=0 from public.workstyle_research_responses where assessment_id=(select assessment from core_people where n=1))
 and (pg_temp.session(1)).withdrawn_at is not null and (pg_temp.session(1)).timings='{}'::jsonb and (pg_temp.session(1)).feedback is null,'I: research data erased on withdrawal');
select pg_temp.ok(pg_temp.submitted(1)=(select t from product_time) and jsonb_array_length(pg_temp.profile(1,1)->'answers')=29,'I: product profile preserved after withdrawal');
-- Widerruf ohne Forschungsteilnahme laesst ein reines Arbeitsprofil unberuehrt.
select pg_temp.act(2);
set local role authenticated;
select public.withdraw_workstyle_research();
reset role;
select pg_temp.ok(pg_temp.submitted(2) is not null and (pg_temp.session(2)).withdrawn_at is null
 and (select count(*)=29 from public.alignment_answers where assessment_id=(select assessment from core_people where n=2)),'I: research withdrawal never touches a product-only profile');

-- E) Core-Abschluss reicht fuer die Team-Bereitschaft.
select pg_temp.ok(pg_temp.team(1,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready' and pg_temp.team(2,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready','E: no shares, no team report');

-- Advisor fuer das Paar (Gruppenfreigabe beider Mitglieder).
insert into public.advisor_team_reviews(id,advisor_user_id,requested_by_user_id,status,activated_at) values
 ('e8563000-0000-4000-8000-000000000001',pg_temp.person(5),pg_temp.person(5),'active',now()),
 ('e8563000-0000-4000-8000-000000000002',pg_temp.person(5),pg_temp.person(5),'active',now());
insert into public.advisor_team_review_members(review_id,subject_user_id,decision,decided_at) values
 ('e8563000-0000-4000-8000-000000000001',pg_temp.person(1),'approved',now()),('e8563000-0000-4000-8000-000000000001',pg_temp.person(2),'approved',now()),
 ('e8563000-0000-4000-8000-000000000002',pg_temp.person(1),'approved',now()),('e8563000-0000-4000-8000-000000000002',pg_temp.person(2),'approved',now()),('e8563000-0000-4000-8000-000000000002',pg_temp.person(6),'approved',now());

-- Advisor C) Nur Personenfreigabe von 1: Einzelansicht ja, Teambericht nein.
select pg_temp.share_with_advisor(1);
select pg_temp.ok(jsonb_array_length(pg_temp.profile(5,1)->'answers')=29 and pg_temp.profile(5,2) is null,'Advisor C: person share allows only that individual view');
select pg_temp.ok(pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready','Advisor C: no team report from one person share');
-- Advisor A) Beide geben dem Advisor frei, aber nicht einander: niemand sieht den Teambericht.
select pg_temp.share_with_advisor(2);
select pg_temp.ok(pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready'
 and pg_temp.team(1,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready'
 and pg_temp.team(2,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready','Advisor A: not mutual-ready -> no report for A, B or advisor');
select pg_temp.share_with(1,2);
select pg_temp.ok(pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready'
 and pg_temp.team(2,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready','Advisor A: one-sided member share is still not ready, also for the advisor');
select pg_temp.act(5);
set local role authenticated;
select pg_temp.ok(public.get_workstyle_team_share_readiness('e8561000-0000-4000-8000-000000000001') is null,'Advisor: no member-level readiness details');
select pg_temp.ok(public.get_workstyle_team_inputs('e8561000-0000-4000-8000-000000000001')='{"status":"not_ready"}'::jsonb,'Advisor: legacy team adapter follows the same rule');
reset role;
-- Advisor B / E) Gegenseitig bereit: dieselbe Grundlage fuer A, B und den Advisor.
select pg_temp.share_with(2,1);
select pg_temp.ok(pg_temp.team(1,'e8561000-0000-4000-8000-000000000001')->>'status'='ready'
 and pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')->>'status'='ready','Advisor B: mutual-ready -> members and advisor see the report');
select pg_temp.ok(pg_temp.team_workstyle(1,'e8561000-0000-4000-8000-000000000001')=pg_temp.team_workstyle(2,'e8561000-0000-4000-8000-000000000001')
 and pg_temp.team_workstyle(1,'e8561000-0000-4000-8000-000000000001')=pg_temp.team_workstyle(5,'e8561000-0000-4000-8000-000000000001'),'Advisor B / E: identical workstyle input for both founders and the advisor');
select pg_temp.ok((select count(*)=2 from jsonb_array_elements(pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')->'people') p where jsonb_array_length(p->'workstyle'->'answers')=29),'E: product-only and research-withdrawn profiles both count with 29 core answers');
select pg_temp.ok(pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')::text not like '%DEC-%' and pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')::text not like '%FS-%','no research items in the advisor team report');
select pg_temp.act(5);
set local role authenticated;
create temp table advisor_snapshot as select public.create_workstyle_product_snapshot('e8561000-0000-4000-8000-000000000001',null) id;
select pg_temp.ok(public.get_workstyle_product_snapshot((select id from advisor_snapshot)) is not null,'Advisor B: snapshot while ready');
reset role;
-- Advisor E) Widerruf: weder Team noch Advisor haben einen aktuellen Teambericht.
select pg_temp.act(2);
set local role authenticated;
select public.share_workstyle_product(pg_temp.person(1),'{}',true);
reset role;
select pg_temp.ok(pg_temp.team(1,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready'
 and pg_temp.team(2,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready'
 and pg_temp.team(5,'e8561000-0000-4000-8000-000000000001')->>'status'='not_ready','Advisor E: revoke hides the report for team and advisor');
select pg_temp.act(5);
set local role authenticated;
select pg_temp.ok(public.get_workstyle_product_snapshot((select id from advisor_snapshot)) is null,'Advisor E: stored advisor snapshot is no longer served as current');
reset role;
select pg_temp.ok(jsonb_array_length(pg_temp.profile(5,2)->'answers')=29,'Advisor E: the separate person share to the advisor stays untouched');
select pg_temp.share_with(2,1);

-- Advisor D) Drei Founder, die dritte Person fehlt: auch der Advisor sieht nichts.
select pg_temp.share_with_advisor(6);
select pg_temp.ok(pg_temp.team(5,'e8561000-0000-4000-8000-000000000002')->>'status'='not_ready'
 and pg_temp.team(1,'e8561000-0000-4000-8000-000000000002')->>'status'='not_ready','Advisor D: third founder missing -> no report, also for the advisor');
select pg_temp.share_with(6,1); select pg_temp.share_with(6,2);
select pg_temp.ok(pg_temp.team(5,'e8561000-0000-4000-8000-000000000002')->>'status'='not_ready','Advisor D: still missing shares to the third founder');
select pg_temp.share_with(1,6); select pg_temp.share_with(2,6);
select pg_temp.ok(pg_temp.team(5,'e8561000-0000-4000-8000-000000000002')->>'status'='ready'
 and pg_temp.team_workstyle(5,'e8561000-0000-4000-8000-000000000002')=pg_temp.team_workstyle(6,'e8561000-0000-4000-8000-000000000002'),'Advisor D: all three mutual -> advisor and members share one basis');

-- F) FIND-Workstyle mit Core-Abschluss ohne Forschung.
insert into public.founder_discovery_profiles(user_id,status,display_name,headline,bio,own_roles,seeking_roles,industries,remote_mode,availability_hours_per_week,commitment_level,venture_stage,venture_goal,expertise)
select person,'active','Core founder','Working together','-','{tech}','{sales}','{}','remote',20,'full_time','idea_validating','profitable_business','{}' from core_people where n in (2,6);
select pg_temp.act(2);
set local role authenticated;
select public.set_discovery_workstyle_consent(true);
reset role;
select pg_temp.act(6);
set local role authenticated;
select public.set_discovery_workstyle_consent(true);
select pg_temp.ok((select count(*)=6 from public.get_discovery_workstyle_signals(pg_temp.person(2))),'F: FIND workstyle signals work with core-only profiles');
reset role;

-- Neu erheben: nur nach abgeschlossenem Arbeitsprofil, wieder ohne Einwilligung; das
-- bisherige Arbeitsprofil bleibt das aktuelle, bis das neue fertig ist.
create temp table before_retake as select pg_temp.profile(6,6)->>'assessment_id' id;
select pg_temp.ok(pg_temp.start_product(6,true)::text<>(select id from before_retake),'retake creates a new participation');
select pg_temp.ok((pg_temp.session(6)).consent_version is null and pg_temp.profile(6,6)->>'assessment_id'=(select id from before_retake),'retake: no inherited consent, previous profile stays current');

select extensions.pass('product completion uses 29 core items; research optional, separate and consented; team report mutual also for advisors');
select * from extensions.finish();
rollback;
