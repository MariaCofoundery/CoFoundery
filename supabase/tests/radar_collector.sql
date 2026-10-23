begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
-- Der Sammler ist eine eigene Rolle ohne Tabellenzugriff. Geprueft wird, was er
-- darf (vier Funktionen), was er nicht darf (alles andere) und dass der Eintrag
-- die Adresse selbst baut.
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('c0110000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collector-admin@example.invalid',now(),now(),now()),
 ('c0110000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','collector-user@example.invalid',now(),now(),now());
insert into public.platform_admins(user_id) values('c0110000-0000-4000-8000-000000000001');
insert into public.radar_sources(id,name,domain,allowed_path,source_type,retrieval_method,is_public,permission_state,status,source_language,region,target_context,source_nature,source_origin,policy_references,review_note,review_due_at,collection_adapter,collection_queries)
values('c0110000-0000-4000-8000-0000000000a1','HN API','news.ycombinator.com','/item','public_api','official_api',true,'approved','active','en','unknown','Software problems','direct','primary','https://example.invalid/policy','checked',now()+interval '30 days','hn_algolia',array['is there a tool']);

-- Der Testlauf darf die Rolle annehmen; in Produktion hat niemand ausser dem Betreiber ihr Login.
grant radar_collector to postgres with set true;
grant usage on schema extensions to radar_collector;

-- Rolle und Rechte
select is((select rolcanlogin from pg_roles where rolname='radar_collector'),false,'role is created without login; Maria enables it outside the repository');
select ok(has_function_privilege('radar_collector','public.radar_collector_due(interval)','execute'),'collector may call due');
select ok(not has_table_privilege('radar_collector','public.radar_signals','select'),'collector cannot read signals');
select ok(not has_table_privilege('radar_collector','public.radar_candidates','select'),'collector cannot read candidates directly');
select ok(not has_table_privilege('radar_collector','auth.users','select'),'collector cannot read users');
select ok(not has_table_privilege('radar_collector','public.network_profiles','select'),'collector cannot read profiles');
select ok(not has_function_privilege('radar_collector','public.list_radar_candidates(text,integer)','execute'),'collector cannot call admin functions');
select ok(not has_function_privilege('radar_collector','public.set_radar_collection_enabled(boolean)','execute'),'collector cannot switch itself on');
select ok(not has_function_privilege('authenticated','public.radar_collector_ingest(uuid,jsonb)','execute'),'members and admins cannot call the collector functions');
select ok(not has_function_privilege('anon','public.radar_collector_due(interval)','execute'),'anon cannot call the collector functions');

-- Aus ist der Standard
reset role; set local role radar_collector;
select is((select count(*) from public.radar_collector_due(interval '6 days')),0::bigint,'nothing is due while the switch is off');
reset role; update public.radar_settings set collection_enabled=true;
set local role radar_collector;
select is((select count(*) from public.radar_collector_due(interval '6 days')),1::bigint,'an approved, active source with a query is due once switched on');
select throws_ok($$select public.radar_collector_start('c0110000-0000-4000-8000-0000000000a1',999)$$,'40001',null,'a changed revision refuses the run');
create temp table run as select public.radar_collector_start('c0110000-0000-4000-8000-0000000000a1',1) id;
grant select on pg_temp.run to radar_collector;
select is(public.radar_collector_ingest((select id from pg_temp.run),'[{"item_id":"123","title":"Ask HN: Is there a tool for X?","source_date":"2026-10-20"},{"item_id":"123","title":"duplicate"}]'::jsonb),1,'a duplicate item is stored once');
select throws_ok($$select public.radar_collector_ingest((select id from pg_temp.run),'[{"item_id":"abc","title":"x"}]'::jsonb)$$,'22023',null,'a non-numeric item id is refused');
select lives_ok($$select public.radar_collector_finish((select id from pg_temp.run),'ok',20,1)$$,'finish records the outcome');
select is((select count(*) from public.radar_collector_due(interval '6 days')),0::bigint,'a source that ran successfully is not due again within the gap');

-- Die Adresse baut die Datenbank
reset role; select is((select url from public.radar_candidates where item_id='123'),'https://news.ycombinator.com/item?id=123','the url is built by the database, not taken from the collector');

-- Quelle gesperrt zwischen Abruf und Eintrag
set local role radar_collector;
create temp table run2 as select public.radar_collector_start('c0110000-0000-4000-8000-0000000000a1',1) id;
reset role; update public.radar_sources set status='paused' where id='c0110000-0000-4000-8000-0000000000a1';
set local role radar_collector;
select throws_ok($$select public.radar_collector_ingest((select id from pg_temp.run2),'[{"item_id":"5","title":"late"}]'::jsonb)$$,'40001',null,'a source paused during the run takes nothing');

-- Verwaltung
reset role; select set_config('request.jwt.claim.sub','c0110000-0000-4000-8000-000000000002',true); set local role authenticated;
select throws_ok($$select * from public.list_radar_candidates('open',0)$$,'42501',null,'a non-admin cannot read candidates');
reset role; select set_config('request.jwt.claim.sub','c0110000-0000-4000-8000-000000000001',true); set local role authenticated;
select lives_ok($$select public.review_radar_candidate((select (j->>'id')::uuid from public.list_radar_candidates('open',0) j limit 1),'dismiss')$$,'an admin dismisses a candidate');
select is((select count(*) from public.list_radar_candidates('open',0)),0::bigint,'a dismissed candidate leaves the open list');
select is((select count(*) from public.list_radar_candidates('dismissed',0) j where j->>'url' is null and j->>'title' is null),1::bigint,'only the identifier is kept after the decision');
select * from finish(); rollback;
