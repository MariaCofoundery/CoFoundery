\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- Chat Stufe 2 (20270321120000). 1 Inhaberin, 2 Advisor, 3 Advisor, 4 Founder.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ea000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'cx' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.advisor_orgs(id, name) values ('ea000000-0000-4000-8000-0000000000a0', 'Gruppen Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-000000000001','owner','active'),
('ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-000000000002','advisor','active'),
('ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-000000000003','advisor','active');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

-- Gruppe: 2 legt an mit 3 (und einem Founder, der nicht hineinkommt).
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('g', public.create_org_chat_group('ea000000-0000-4000-8000-0000000000a0', 'Events', array['ea000000-0000-4000-8000-000000000003', 'ea000000-0000-4000-8000-000000000004']::uuid[]));
select extensions.is((select count(*)::int from public.advisor_org_chat_members where chat_id = (select id from ids where key = 'g')), 2, 'the creator and the named member are in, the founder is not');
insert into ids values ('m', public.send_org_chat_message((select id from ids where key = 'g'), 'Catering steht'));
select extensions.is((select count(*)::int from public.org_chat_push_recipients((select id from ids where key = 'm'))), 1, 'a group message notifies only the group');

set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_chat_messages where chat_id = (select id from ids where key = 'g')), 0, 'the lead does not read a group she is not in');
select extensions.throws_ok($$select public.send_org_chat_message((select id from ids where key = 'g'), 'Hallo')$$, '42501', 'org_chat_not_yours', 'nor writes into it');
-- Die Fuehrung darf die Gruppe aber pflegen? Nur wer drin ist: update braucht can_read.
select extensions.throws_ok($$select public.update_org_chat_group((select id from ids where key = 'g'), 'X', '{}')$$, '42501', 'org_chat_not_yours', 'and cannot change it from outside');

-- Reaktionen.
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(public.toggle_org_chat_reaction((select id from ids where key = 'm'), '🎉'), true, 'a member reacts');
select extensions.is(public.toggle_org_chat_reaction((select id from ids where key = 'm'), '🎉'), false, 'a second tap takes it back');
select extensions.throws_ok($$select public.toggle_org_chat_reaction((select id from ids where key = 'm'), '💩')$$, '22023', 'org_chat_invalid', 'only the fixed set of reactions');

-- Suche: nur, was man lesen darf.
select extensions.is((select count(*)::int from public.search_org_chat_messages('ea000000-0000-4000-8000-0000000000a0', 'catering')), 1, 'search finds the message in my group');
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.search_org_chat_messages('ea000000-0000-4000-8000-0000000000a0', 'catering')), 0, 'but not for somebody outside the group');
select extensions.is((select count(*)::int from public.search_org_chat_messages('ea000000-0000-4000-8000-0000000000a0', '%')), 0, 'wildcards are taken literally');

-- Anhang: nur unter dem eigenen Pfad dieses Chats.
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.send_org_chat_message((select id from ids where key = 'g'), '', 'ea000000-0000-4000-8000-000000000003/ea000000-0000-4000-8000-0000000000a0/' || (select id from ids where key = 'g') || '/plan.pdf', 'plan.pdf', 'application/pdf', 1000)$$,
  '22023', 'org_chat_invalid', 'nobody attaches a file under someone else''s path');
insert into ids values ('f', public.send_org_chat_message((select id from ids where key = 'g'), '', 'ea000000-0000-4000-8000-000000000002/ea000000-0000-4000-8000-0000000000a0/' || (select id from ids where key = 'g') || '/plan.pdf', 'plan.pdf', 'application/pdf', 1000));
select extensions.is(public.retract_org_chat_message((select id from ids where key = 'f')), 'ea000000-0000-4000-8000-000000000002/ea000000-0000-4000-8000-0000000000a0/' || (select id from ids where key = 'g') || '/plan.pdf', 'withdrawing returns the file to remove');

-- Ungelesen im Menue, Austreten.
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(public.count_my_unread_org_chats(), 1, 'one unread message for the menu');
select public.leave_org_chat_group((select id from ids where key = 'g'));
select extensions.is((select count(*)::int from public.advisor_org_chat_messages where chat_id = (select id from ids where key = 'g')), 0, 'after leaving the group nothing is readable');
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.leave_org_chat_group((select id from ids where key = 'g'));
reset role;
select extensions.is((select count(*)::int from public.advisor_org_chats where id = (select id from ids where key = 'g')), 0, 'an empty group goes');

select * from extensions.finish();
rollback;
