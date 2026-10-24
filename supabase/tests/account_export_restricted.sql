\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

-- Der Export liefert die vier Bereiche - und nur die der aufrufenden Person.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-000000000000','a1000001-0001-4001-8001-00000000000a','authenticated','authenticated','exp-a@example.com','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','a1000002-0002-4002-8002-00000000000b','authenticated','authenticated','exp-b@example.com','',now(),'{}','{}',now(),now());
insert into public.network_blocks (blocker_user_id, blocked_user_id) values
 ('a1000001-0001-4001-8001-00000000000a','a1000002-0002-4002-8002-00000000000b'),
 ('a1000002-0002-4002-8002-00000000000b','a1000001-0001-4001-8001-00000000000a');

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.is(jsonb_typeof(public.export_my_restricted_data()->'network_messages'), 'array', 'messages come as a list');
select extensions.is(jsonb_typeof(public.export_my_restricted_data()->'workstyle_pretest_sessions'), 'array', 'sessions come as a list');
select extensions.is(jsonb_typeof(public.export_my_restricted_data()->'workstyle_research_responses'), 'array', 'research answers come as a list');
select extensions.is(jsonb_array_length(public.export_my_restricted_data()->'network_blocks'), 1, 'A sees only the own block');
select extensions.is(public.export_my_restricted_data()->'network_blocks'->0->>'blocked_user_id', 'a1000002-0002-4002-8002-00000000000b', 'it is the block A set');
set local request.jwt.claims = '{"sub":"a1000002-0002-4002-8002-00000000000b","role":"authenticated"}';
select extensions.is(public.export_my_restricted_data()->'network_blocks'->0->>'blocked_user_id', 'a1000001-0001-4001-8001-00000000000a', 'B sees the own block, not that of A');

-- Ohne Anmeldung gibt es nichts, und direkt gelesen werden die Tabellen weiter nicht.
set local request.jwt.claims = '{"role":"authenticated"}';
select extensions.throws_ok($$select public.export_my_restricted_data()$$, '42501', null, 'no export without a signed-in user');
set local request.jwt.claims = '{"sub":"a1000001-0001-4001-8001-00000000000a","role":"authenticated"}';
select extensions.throws_ok($$select * from public.network_blocks$$, '42501', null, 'the table itself stays closed');

select * from extensions.finish();
rollback;
