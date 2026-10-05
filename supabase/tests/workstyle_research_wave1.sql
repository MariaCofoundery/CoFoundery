\set ON_ERROR_STOP on
-- Phase 11.6C: 29 Core + optional 8 Entwicklungsfragen (Set A oder B), gemischt in
-- einem Fragebogen. Set und Reihenfolge einmalig, serverseitig, stabil.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.ok(c boolean,label text) returns void language plpgsql as $$ begin if c is not true then raise exception 'wave1: %',label; end if; end $$;
create temp table w_people(n integer primary key,person uuid,assessment uuid);
grant all on w_people to authenticated;
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8580000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','wave-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,20)n;
insert into w_people select n,('e8580000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,null from generate_series(1,20)n;
insert into public.profiles(user_id,display_name,roles) select person,'Wave '||n,array['founder'] from w_people on conflict(user_id) do update set roles=excluded.roles;
-- Saubere Ausgangslage fuer den Ausgleich: keine fremden Welle-1-Sitzungen.
select pg_temp.ok(not exists(select 1 from public.workstyle_pretest_sessions where research_set is not null),'no prior wave-1 sessions in the test database');

create function pg_temp.person(n integer) returns uuid language sql as $$ select person from w_people w where w.n=person.n $$;
create function pg_temp.act(n integer) returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.person(n),'role','authenticated')::text,true) $$;
create function pg_temp.is_core(d jsonb) returns boolean language sql as $$ select d->>'usage'='core' and d->>'scientific_status'='core' $$;
create function pg_temp.session(n integer) returns public.workstyle_pretest_sessions language sql as $$
 select s.* from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id
 where a.user_id=pg_temp.person(n) and s.assessment_version='8.5a-v3' order by s.started_at desc limit 1 $$;
create function pg_temp.call(n integer,fn text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
 perform pg_temp.act(n);
 execute 'set local role authenticated';
 if fn='research' then r:=public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}');
 elsif fn='product' then r:=public.start_workstyle_product();
 elsif fn='mine' then r:=public.get_my_workstyle_pretest_version('8.5a-v3');
 elsif fn='withdraw' then perform public.withdraw_workstyle_research();
 end if;
 execute 'reset role';
 update w_people set assessment=(r->>'assessment_id')::uuid where w_people.n=call.n and r ? 'assessment_id';
 return r;
end $$;
-- Beantwortet die naechsten k offenen Items in der Reihenfolge der Sitzung
-- (gespeicherte Reihenfolge, sonst Core nach Position).
create function pg_temp.answer(n integer,k integer default 1000,only_part text default null) returns jsonb language plpgsql as $$
declare s public.workstyle_pretest_sessions; i public.workstyle_item_versions; r jsonb; c integer:=0; v integer; o text;
begin
 s:=pg_temp.session(n);
 for i in select v2.* from public.workstyle_item_versions v2
  left join jsonb_array_elements_text(coalesce(s.item_order,'[]'::jsonb)) with ordinality x(key,idx) on x.key=v2.item_key
  where v2.assessment_version='8.5a-v3'
  and (case when s.item_order is not null then x.key is not null else pg_temp.is_core(v2.definition) end)
  and (only_part is null or pg_temp.is_core(v2.definition)=(only_part='core'))
  and not exists(select 1 from public.alignment_answers a where a.assessment_id=s.assessment_id and a.block_id=v2.item_key)
  and not exists(select 1 from public.workstyle_research_responses q where q.assessment_id=s.assessment_id and q.item_key=v2.item_key)
  order by coalesce(x.idx,v2.position) loop
  c:=c+1; exit when c>k;
  v:=null; o:=null;
  if i.definition->>'response_format' in ('comparative','behavioral') then o:=i.definition->'options'->0->>'option_id'; else v:=3; end if;
  perform pg_temp.act(n);
  execute 'set local role authenticated';
  r:=public.save_workstyle_pretest_v3(s.assessment_id,i.item_key,i.item_version,v,o,null,nullif(i.definition->'rendered_order','null'::jsonb),700,false);
  execute 'reset role';
 end loop;
 return r;
end $$;
create function pg_temp.order_of(n integer) returns text[] language sql as $$
 select array_agg(x order by i) from jsonb_array_elements_text((pg_temp.session(n)).item_order) with ordinality t(x,i) $$;
create function pg_temp.research_flags(n integer) returns boolean[] language sql as $$
 select array_agg(not pg_temp.is_core(v.definition) order by t.i) from jsonb_array_elements_text((pg_temp.session(n)).item_order) with ordinality t(x,i)
 join public.workstyle_item_versions v on v.assessment_version='8.5a-v3' and v.item_key=t.x $$;

-- Sets exakt, nur ORG-06 gemeinsam.
select pg_temp.ok(public.workstyle_research_set_items('research-sets/1.0.0','A')=array['ORG-06','EXP-05','EVI-R1','AMB-06','EL-03r','VOICE-R1','ORG-05','DEC-02'],'set A exact');
select pg_temp.ok(public.workstyle_research_set_items('research-sets/1.0.0','B')=array['ORG-06','EXP-R1','VOICE-06','AMB-03','EVI-04r','EL-06r','AMB-R1','FS-R2'],'set B exact');
select pg_temp.ok((select array_agg(x) from unnest(public.workstyle_research_set_items('research-sets/1.0.0','A')) x where x=any(public.workstyle_research_set_items('research-sets/1.0.0','B')))=array['ORG-06'],'only ORG-06 in both sets');
select pg_temp.ok((select bool_and(exists(select 1 from public.workstyle_item_versions v where v.assessment_version='8.5a-v3' and v.item_key=x and not pg_temp.is_core(v.definition)))
 from unnest(public.workstyle_research_set_items('research-sets/1.0.0','A')||public.workstyle_research_set_items('research-sets/1.0.0','B')) x),'every set item exists and is private research');
select pg_temp.ok(public.workstyle_research_set_items('research-sets/2.0.0','A') is null,'unknown set version yields nothing');
select pg_temp.ok(not has_function_privilege('authenticated','public.workstyle_research_set_items(text,text)','EXECUTE')
 and not has_function_privilege('authenticated','public.workstyle_research_order(text,text,boolean)','EXECUTE'),'set and order helpers are internal');

-- A) Ohne Forschung: 29 Core, keine Zuteilung, keine Forschungsdaten.
select pg_temp.call(1,'product');
select pg_temp.answer(1);
select pg_temp.ok((pg_temp.session(1)).research_set is null and (pg_temp.session(1)).item_order is null and (pg_temp.session(1)).consent_version is null
 and (select submitted_at is not null from public.assessments where id=(select assessment from w_people where n=1))
 and not exists(select 1 from public.workstyle_research_responses where assessment_id=(select assessment from w_people where n=1)),'A: product-only, 29 core, no set, no research data');

-- B/G) Mit Forschung zu Beginn: Teilnahme wird angelegt, Set + Version + 37er-Reihenfolge.
select pg_temp.call(2,'research');
select pg_temp.ok((pg_temp.session(2)).research_set in ('A','B') and (pg_temp.session(2)).research_set_version='research-sets/1.0.0'
 and (pg_temp.session(2)).consent_version='workstyle_research_v3','B/G: set and set version stored at consent');
-- 37er-Reihenfolge
select pg_temp.ok(cardinality(pg_temp.order_of(2))=37 and (select count(distinct x)=37 from unnest(pg_temp.order_of(2)) x),'37 unique items');
select pg_temp.ok((select count(*)=29 from unnest(pg_temp.order_of(2)) x join public.workstyle_item_versions v on v.assessment_version='8.5a-v3' and v.item_key=x where pg_temp.is_core(v.definition)),'exactly 29 core');
select pg_temp.ok((select array_agg(x order by x) from unnest(pg_temp.order_of(2)) x join public.workstyle_item_versions v on v.assessment_version='8.5a-v3' and v.item_key=x where not pg_temp.is_core(v.definition))
 =(select array_agg(x order by x) from unnest(public.workstyle_research_set_items('research-sets/1.0.0',(pg_temp.session(2)).research_set)) x),'exactly the 8 items of the assigned set, none from the other');
select pg_temp.ok((select array_agg(x order by t.i) from unnest(pg_temp.order_of(2)) with ordinality t(x,i) join public.workstyle_item_versions v on v.assessment_version='8.5a-v3' and v.item_key=t.x where pg_temp.is_core(v.definition))
 =(select array_agg(item_key order by position) from public.workstyle_item_versions where assessment_version='8.5a-v3' and pg_temp.is_core(definition)),'core keeps its fixed relative order');

-- Verteilung ueber viele Reihenfolgen: nie zwei Forschungsitems hintereinander, erste Frage Core,
-- frueh und spaet je eines, keine Haeufung am Anfang oder Ende.
do $$ declare f boolean[]; k integer; t integer; first_r integer; last_r integer; head integer; tail integer; begin
 for t in 1..60 loop
  f:=(select array_agg(not pg_temp.is_core(v.definition) order by x.i) from jsonb_array_elements_text(public.workstyle_research_order('research-sets/1.0.0',case when t%2=0 then 'A' else 'B' end,true)) with ordinality x(key,i)
   join public.workstyle_item_versions v on v.assessment_version='8.5a-v3' and v.item_key=x.key);
  perform pg_temp.ok(cardinality(f)=37 and not f[1],'first item is core');
  for k in 2..37 loop perform pg_temp.ok(not (f[k] and f[k-1]),'no two research items in a row'); end loop;
  select min(i),max(i) into first_r,last_r from unnest(f) with ordinality u(r,i) where r;
  select count(*) filter(where r and i<=10),count(*) filter(where r and i>=28) into head,tail from unnest(f) with ordinality u(r,i);
  perform pg_temp.ok(first_r<=5 and last_r>=33 and head between 1 and 3 and tail between 1 and 3,'research spread across the flow');
 end loop;
end $$;

-- D/E/F) Wiederholter Start, Neuladen, anderer Browser: gleiches Set, gleiche Reihenfolge.
create temp table w_first as select (pg_temp.session(2)).research_set s,(pg_temp.session(2)).item_order o;
select pg_temp.call(2,'research'); select pg_temp.call(2,'product');
select pg_temp.ok((pg_temp.call(2,'mine')->>'research_set')=(select s from w_first) and (pg_temp.call(2,'mine')->'item_order')=(select o from w_first)
 and (select count(*)=1 from public.workstyle_pretest_sessions s join public.assessments a on a.id=s.assessment_id where a.user_id=pg_temp.person(2)),'D/E/F: repeated start and reload keep set and order; one participation');

-- C) Ausgleich: aufeinanderfolgende Zusagen wechseln sich ab (|A-B| <= 1).
do $$ declare n integer; a_n integer; b_n integer; begin
 for n in 3..14 loop perform pg_temp.call(n,'research');
  select count(*) filter(where research_set='A'),count(*) filter(where research_set='B') into a_n,b_n from public.workstyle_pretest_sessions where research_set_version='research-sets/1.0.0';
  perform pg_temp.ok(abs(a_n-b_n)<=1,'C: sets stay balanced after each assignment');
 end loop;
end $$;

-- Produktabschluss im 37er-Ablauf: 28 Core + alle 8 Forschung -> nicht fertig.
select pg_temp.answer(3,1000,'research');
select pg_temp.answer(3,28,'core');
select pg_temp.ok((select submitted_at is null from public.assessments where id=(select assessment from w_people where n=3))
 and (pg_temp.session(3)).completed_at is null,'32.A: 28 core + 8 research is not a product profile');
select pg_temp.answer(3,1,'core');
select pg_temp.ok((select submitted_at is not null from public.assessments where id=(select assessment from w_people where n=3))
 and (pg_temp.session(3)).completed_at is not null,'last core completes product and the finished research');

-- 29 Core + 0..7 Forschung -> fertig, Forschung teilweise; Bericht nur aus 29 Core.
select pg_temp.answer(4,30);
select pg_temp.ok((select count(*) from public.alignment_answers where assessment_id=(select assessment from w_people where n=4))<29
 or (select submitted_at is not null from public.assessments where id=(select assessment from w_people where n=4)),'mixed flow progresses in stored order');
select pg_temp.answer(4,1000,'core');
create temp table w4 as select (select count(*) from public.workstyle_research_responses where assessment_id=(select assessment from w_people where n=4)) r;
select pg_temp.ok((select r from w4) between 0 and 7 and (select submitted_at is not null from public.assessments where id=(select assessment from w_people where n=4))
 and (pg_temp.session(4)).completed_at is null,'32.B: 29 core + partial research = product complete, research partial');
select pg_temp.ok((select jsonb_array_length(public.get_workstyle_product_profile(pg_temp.person(4))->'answers') from (select pg_temp.act(4)) x)=29,'32.C: report input has exactly 29 core answers');
insert into public.founder_teams(id,name,team_context) values('e8581000-0000-4000-8000-000000000001','Wave team','existing_team');
insert into public.founder_team_members(team_id,user_id) values('e8581000-0000-4000-8000-000000000001',pg_temp.person(4)),('e8581000-0000-4000-8000-000000000001',pg_temp.person(1));
do $$ begin
 perform pg_temp.act(4); execute 'set local role authenticated';
 perform public.share_workstyle_product(pg_temp.person(1));
 execute 'reset role';
end $$;
select pg_temp.ok(exists(select 1 from public.alignment_shares where assessment_id=(select assessment from w_people where n=4) and recipient_user_id=pg_temp.person(1)),'32.D: partial research does not block sharing');
select pg_temp.ok((select public.get_workstyle_product_profile(pg_temp.person(4))::text from (select pg_temp.act(4)) x) !~ '(DEC-|FS-|EVI-R1|VOICE-R1|AMB-06|EXP-05|ORG-0[56]|EL-03r|EL-06r|EVI-04r|EXP-R1|VOICE-06|AMB-03|AMB-R1)','no research item in the product profile');

-- Forschungsabschluss Welle 1 = 8 Set-Items (nicht 23).
select pg_temp.answer(4);
select pg_temp.ok((pg_temp.session(4)).completed_at is not null
 and (select count(*)=8 from public.workstyle_research_responses where assessment_id=(select assessment from w_people where n=4)),'research completes with the 8 set items');

-- Reihenfolge und Set werden auch beim Speichern durchgesetzt.
select pg_temp.act(5);
set local role authenticated;
do $$ declare me jsonb:=public.get_my_workstyle_pretest_version('8.5a-v3'); keys text[]; other text; second text; v record; begin
 select array_agg(x) into keys from jsonb_array_elements_text(me->'item_order') x;
 select item_key into other from public.workstyle_item_versions where assessment_version='8.5a-v3' and not (definition->>'usage'='core')
  and not (item_key=any(keys)) and definition->>'revision_of' is null order by position limit 1;
 select * into v from public.workstyle_item_versions where assessment_version='8.5a-v3' and item_key=other;
 begin perform public.save_workstyle_pretest_v3((me->>'assessment_id')::uuid,v.item_key,v.item_version,null,null,'cannot_assess',nullif(v.definition->'rendered_order','null'::jsonb)); raise exception 'other set accepted'; exception when invalid_parameter_value then null; end;
 select x into second from jsonb_array_elements_text(me->'item_order') with ordinality t(x,i)
  join public.workstyle_item_versions w on w.assessment_version='8.5a-v3' and w.item_key=t.x where w.definition->>'usage'<>'core' order by t.i offset 1 limit 1;
 select * into v from public.workstyle_item_versions where assessment_version='8.5a-v3' and item_key=second;
 begin perform public.save_workstyle_pretest_v3((me->>'assessment_id')::uuid,v.item_key,v.item_version,null,null,'cannot_assess',nullif(v.definition->'rendered_order','null'::jsonb)); raise exception 'research order skipped'; exception when check_violation then null; end;
end $$;
reset role;

-- 14) Abbruch: Produkt fertig, Forschung offen -> Profil voll nutzbar (oben), Fortsetzen moeglich.
select pg_temp.answer(6,1000,'core');
select pg_temp.answer(6,5,'research');
select pg_temp.ok((select submitted_at is not null from public.assessments where id=(select assessment from w_people where n=6)) and (pg_temp.session(6)).completed_at is null
 and (select count(*)=5 from public.workstyle_research_responses where assessment_id=(select assessment from w_people where n=6)),'14: product done, 3 development questions open');
select pg_temp.answer(6);
select pg_temp.ok((pg_temp.session(6)).completed_at is not null,'14: research resumes in stored order and completes');

-- Mitten im Arbeitsprofil keine Forschung; nach fertigem Profil nur die 8 Set-Items.
select pg_temp.call(15,'product'); select pg_temp.answer(15,3);
select pg_temp.act(15);
set local role authenticated;
do $$ begin
 begin perform public.start_workstyle_research('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}'); raise exception 'mid-profile research'; exception when check_violation then null; end;
end $$;
reset role;
select pg_temp.answer(15);
select pg_temp.call(15,'research');
select pg_temp.ok(jsonb_array_length((pg_temp.session(15)).item_order)=8 and (pg_temp.session(15)).research_set in ('A','B'),'late opt-in: only the 8 set items');

-- E) Widerruf: fertiges Profil bleibt, Forschung inkl. Set und Reihenfolge geloescht.
select pg_temp.call(4,'withdraw');
select pg_temp.ok((pg_temp.session(4)).research_set is null and (pg_temp.session(4)).research_set_version is null and (pg_temp.session(4)).item_order is null
 and (pg_temp.session(4)).withdrawn_at is not null and (pg_temp.session(4)).timings='{}'::jsonb
 and not exists(select 1 from public.workstyle_research_responses where assessment_id=(select assessment from w_people where n=4))
 and (select jsonb_array_length(public.get_workstyle_product_profile(pg_temp.person(4))->'answers') from (select pg_temp.act(4)) x)=29,'32.E: withdrawal keeps the product, erases research incl. set and order');
-- Unfertig mit Einwilligung: wie bisher geloescht (Einwilligungstext v3).
select pg_temp.answer(7,4);
create temp table w7 as select assessment from w_people where n=7;
select pg_temp.call(7,'withdraw');
select pg_temp.ok(not exists(select 1 from public.assessments where id=(select assessment from w7)),'incomplete consented participation erased as before');

-- full-23-Bestand: bisheriger Einstieg ohne Set; Ueberarbeitungen dort nicht erlaubt.
select pg_temp.act(16);
set local role authenticated;
do $$ declare id uuid; v record; begin
 id:=(public.start_workstyle_pretest('workstyle_research_v3','{"founder_experience":"1","team_size":"two"}')->>'assessment_id')::uuid;
 select * into v from public.workstyle_item_versions where assessment_version='8.5a-v3' and item_key='EL-03r';
 begin perform public.save_workstyle_pretest_v3(id,v.item_key,v.item_version,null,null,'cannot_assess',null); raise exception 'revision in full-23'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
select pg_temp.ok((pg_temp.session(16)).research_set is null and (pg_temp.session(16)).consent_version='workstyle_research_v3','full-23 cohort stays without set');

-- Export: Kohorte, Set, Version, Reihenfolge.
insert into public.platform_admins(user_id) values(pg_temp.person(20));
select pg_temp.act(20);
set local role authenticated;
select pg_temp.ok((select count(*) filter(where x->>'research_cohort'='wave-1' and x->>'research_set' in ('A','B') and x->>'research_set_version'='research-sets/1.0.0' and jsonb_typeof(x->'item_order')='array')>=10
 and count(*) filter(where x->>'research_cohort'='full-23' and x->'research_set'='null'::jsonb)=1 from jsonb_array_elements(public.get_workstyle_research_dataset_version('8.5a-v3')) x),'export separates wave-1 and full-23 with set, version and order');
select pg_temp.ok((select bool_and(x->>'session_id' is not null and x::text !~ 'e8580000') from jsonb_array_elements(public.get_workstyle_research_dataset_version('8.5a-v3')) x),'export stays pseudonymous');
reset role;

select extensions.pass('wave 1: optional 8 mixed development items, stable balanced sets, product completion stays 29 core');
select * from extensions.finish();
rollback;
