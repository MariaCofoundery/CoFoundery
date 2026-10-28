begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
-- Die Migration spielt Eintraege aus oeffentlichen Quellen ein. Dieser Test zaehlt
-- eigene Zeilen und geht von einem leeren Brett aus; die Transaktion wird zurueckgerollt.
delete from public.network_problems where origin = 'public_source';
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('ad110000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rem-admin@example.invalid',now(),now(),now()),
 ('ad110000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rem-member@example.invalid',now(),now(),now());
insert into public.platform_admins(user_id) values('ad110000-0000-4000-8000-000000000001');
insert into public.network_memberships(user_id,status) values('ad110000-0000-4000-8000-000000000002','active') on conflict(user_id) do update set status='active';
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at,expertise)
 values('ad110000-0000-4000-8000-000000000002','Autor','Headline text','A complete synthetic biography for the board view.',array['founder'],'active',now(),array['software']);
insert into public.network_problems(id,author_user_id,title,description,author_intent,status,published_at,topics) values
 ('ad110000-0000-4000-8000-0000000000a1','ad110000-0000-4000-8000-000000000002','Teams klaeren Anteile zu spaet','A sufficiently long synthetic description of the problem.','observation','active',now()-interval '1 day',array['Anteile','Recht']),
 ('ad110000-0000-4000-8000-0000000000a2','ad110000-0000-4000-8000-000000000002','Aufgaben bleiben liegen','A sufficiently long synthetic description of the problem.','observation','active',now(),array['Anteile']),
 ('ad110000-0000-4000-8000-0000000000a3','ad110000-0000-4000-8000-000000000002','Ohne Thema','A sufficiently long synthetic description of the problem.','observation','active',now(),array[]::text[]);

reset role; select set_config('request.jwt.claim.sub','ad110000-0000-4000-8000-000000000002',true); set local role authenticated;
select throws_ok($$select public.admin_problem_board_topics()$$,'42501',null,'a member cannot read the admin topic view');
select throws_ok($$select public.admin_mark_reminder_done('problem_research',true)$$,'42501',null,'a member cannot mark a reminder');
select throws_ok($$select * from public.admin_reminders$$,'42501',null,'no direct table access');

reset role; select set_config('request.jwt.claim.sub','ad110000-0000-4000-8000-000000000001',true); set local role authenticated;
select is(public.admin_reminder_status('problem_research'),null::timestamptz,'a reminder starts as never done');
select lives_ok($$select public.admin_mark_reminder_done('problem_research',true)$$,'an admin marks it done');
select isnt(public.admin_reminder_status('problem_research'),null::timestamptz,'the time is stored');
select throws_ok($$select public.admin_mark_reminder_done('unknown_key',true)$$,'22023',null,'unknown reminders are refused');
select is((select jsonb_agg(j->>'topic' order by ord) from jsonb_array_elements(public.admin_problem_board_topics()) with ordinality as t(j,ord)),'["Anteile","Recht",null]'::jsonb,'topics are alphabetical, untagged last - not sorted by how often they occur');
select is((select (j->>'count')::int from jsonb_array_elements(public.admin_problem_board_topics()) j where j->>'topic'='Anteile'),2,'a topic counts its problems');
select * from finish(); rollback;
