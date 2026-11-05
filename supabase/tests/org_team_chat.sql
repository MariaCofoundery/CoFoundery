\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

-- ---------------------------------------------------------------------------
-- Teamraum-Chat (20270318120000)
-- 1 Inhaberin, 2 Advisor, 3 Advisor (hat den Teamchat stummgeschaltet), 4 Founder im Programm, 5 von aussen.
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e8000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'chat' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values ('e8000000-0000-4000-8000-0000000000a0', 'Chat Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000001','owner','active'),
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000002','advisor','active'),
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000003','advisor','active');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('team', public.open_org_chat('e8000000-0000-4000-8000-0000000000a0'));
select extensions.is(public.open_org_chat('e8000000-0000-4000-8000-0000000000a0'), (select id from ids where key = 'team'), 'there is one team chat');
insert into ids values ('dm', public.open_org_chat('e8000000-0000-4000-8000-0000000000a0', 'e8000000-0000-4000-8000-000000000002'));
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(public.open_org_chat('e8000000-0000-4000-8000-0000000000a0', 'e8000000-0000-4000-8000-000000000001'), (select id from ids where key = 'dm'), 'a direct chat is the same from both sides');
select extensions.throws_ok($$select public.open_org_chat('e8000000-0000-4000-8000-0000000000a0', 'e8000000-0000-4000-8000-000000000004')$$, '22023', 'org_chat_not_member', 'no direct chat with somebody outside the team');

set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.set_org_chat_muted((select id from ids where key = 'team'), true);

set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('m1', public.send_org_chat_message((select id from ids where key = 'team'), '  Wer übernimmt den Raum?  '));
select public.send_org_chat_message((select id from ids where key = 'dm'), 'Unter uns: Budget passt.');
select extensions.is((select body from public.advisor_org_chat_messages where id = (select id from ids where key = 'm1')), 'Wer übernimmt den Raum?', 'messages are trimmed');
select extensions.is((select count(*)::int from public.org_chat_push_recipients((select id from ids where key = 'm1'))), 1, 'a team message notifies the others, not the muted one');
select extensions.throws_ok($$select public.send_org_chat_message((select id from ids where key = 'team'), '   ')$$, '22023', 'org_chat_invalid', 'an empty message is refused');

-- Lesen: Teamchat alle Mitglieder, Direktchat nur die beiden.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_chat_messages), 1, 'a third member reads the team chat but not the direct chat');
select extensions.is((select unread from public.list_my_org_chats('e8000000-0000-4000-8000-0000000000a0') where kind = 'team'), 1, 'one unread message');
select public.mark_org_chat_read((select id from ids where key = 'team'));
select extensions.is((select unread from public.list_my_org_chats('e8000000-0000-4000-8000-0000000000a0') where kind = 'team'), 0, 'read is read');
select extensions.is(public.retract_org_chat_message((select id from ids where key = 'm1')), false, 'nobody withdraws a message of someone else');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_chat_messages) + (select count(*)::int from public.advisor_org_chats), 0, 'a founder in the program sees no chat');
select extensions.throws_ok($$select public.send_org_chat_message((select id from ids where key = 'team'), 'Hallo')$$, '42501', 'org_chat_not_yours', 'and cannot write into it');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.throws_ok($$insert into public.advisor_org_chat_messages(chat_id, org_id, author_user_id, body) values ((select id from ids where key = 'team'), 'e8000000-0000-4000-8000-0000000000a0', 'e8000000-0000-4000-8000-000000000005', 'x')$$, '42501', null, 'the table cannot be written directly');

-- Zuruecknehmen: der Text ist weg.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.retract_org_chat_message((select id from ids where key = 'm1')), true, 'the writer withdraws a message');
select extensions.is((select body from public.advisor_org_chat_messages where id = (select id from ids where key = 'm1')), '', 'and its text is gone');

-- Mitgliedschaft endet: kein Lesen mehr, kein Schreiben in den Direktchat.
reset role;
update public.advisor_org_members set status = 'revoked', revoked_at = now() where user_id = 'e8000000-0000-4000-8000-000000000002';
set local role authenticated;
select extensions.throws_ok($$select public.send_org_chat_message((select id from ids where key = 'dm'), 'Noch da?')$$, '22023', 'org_chat_not_member', 'no messages to somebody who left');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_chat_messages), 0, 'somebody who left reads nothing any more');

select * from extensions.finish();
rollback;
