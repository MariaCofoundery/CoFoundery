\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

-- 1 Geholfene, 2 Dankende, 3 Fremde, 4 Dritte mit offener (nicht angenommener) Anfrage.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f4200000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'thanks' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.network_memberships(user_id, status) select ('f4200000-0000-4000-8000-00000000000' || n)::uuid, 'active' from generate_series(1, 4) n;
insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at)
select ('f4200000-0000-4000-8000-00000000000' || n)::uuid, 'Person' || n || ' Nachname', 'Zeile ' || n, 'Ein Text mit genug Zeichen drin.', array['founder'], 'active', now() from generate_series(1, 4) n;
insert into public.network_contact_requests(id, listing_id, sender_user_id, recipient_user_id, message, status, listing_title_snapshot, sender_display_name_snapshot, sender_headline_snapshot, recipient_display_name_snapshot, responded_at) values
('f4200000-0000-4000-8000-0000000000c1', null, 'f4200000-0000-4000-8000-000000000002', 'f4200000-0000-4000-8000-000000000001', 'Eine Frage zu deinem Gebiet bitte.', 'accepted', null, 'Person2', 'Zeile 2', 'Person1', now()),
('f4200000-0000-4000-8000-0000000000c2', null, 'f4200000-0000-4000-8000-000000000004', 'f4200000-0000-4000-8000-000000000001', 'Noch eine Frage an dich bitte.', 'pending', null, 'Person4', 'Zeile 4', 'Person1', null);

insert into public.network_conversations(id, contact_request_id, participant_a_user_id, participant_b_user_id)
values ('f4200000-0000-4000-8000-0000000000e1', 'f4200000-0000-4000-8000-0000000000c1', 'f4200000-0000-4000-8000-000000000002', 'f4200000-0000-4000-8000-000000000001');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"f4200000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(public.has_network_heart('f4200000-0000-4000-8000-000000000001'), false, 'no heart before any thanks');
select extensions.throws_ok($$select public.send_network_thanks('f4200000-0000-4000-8000-0000000000e2', array['knowledge'], null, null, false)$$, '42501', 'thanks_not_allowed', 'no thanks without a conversation');
select extensions.throws_ok($$select public.send_network_thanks('f4200000-0000-4000-8000-0000000000e1', array['nonsense'], null, null, false)$$, '23514', null, 'only the six kinds of help');
insert into ids values ('t1', public.send_network_thanks('f4200000-0000-4000-8000-0000000000e1', array['knowledge','contact'], 'meeting', 'Danke, das hat mir den Pitch gerettet.', true));
select extensions.throws_ok($$select public.send_network_thanks('f4200000-0000-4000-8000-0000000000e1', array['time'], null, null, false)$$, '23505', 'thanks_exists', 'one thanks per request and person');

set local request.jwt.claims = '{"sub":"f4200000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.send_network_thanks('f4200000-0000-4000-8000-0000000000e1', array['time'], null, null, false)$$, '42501', 'thanks_not_allowed', 'strangers cannot thank on someone else''s request');
select extensions.is((select count(*)::int from public.network_thanks), 0, 'strangers read no thanks');
select extensions.is(public.has_network_heart('f4200000-0000-4000-8000-000000000001'), true, 'but any member sees the heart');

set local request.jwt.claims = '{"sub":"f4200000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select thanker_first_name from public.list_profile_thanks('f4200000-0000-4000-8000-000000000001')), 'Person2', 'shared words appear with the first name only');
select extensions.throws_ok($$update public.network_thanks set helper_hidden = true$$, '42501', null, 'no direct writes');
select extensions.ok(public.set_network_thanks_hidden((select id from ids where key = 't1'), true), 'the helped person can hide a shared thanks');
select extensions.is((select count(*)::int from public.list_profile_thanks('f4200000-0000-4000-8000-000000000001')), 0, 'hidden words disappear from the profile');
select extensions.is(public.has_network_heart('f4200000-0000-4000-8000-000000000001'), true, 'the heart stays');

-- Direkter Dank (ohne Gespraech) - Person 3 an Person 1, vom Profil aus.
set local request.jwt.claims = '{"sub":"f4200000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.lives_ok($$select public.send_network_thanks_direct('f4200000-0000-4000-8000-000000000001', 'person', null, array['knowledge'], null, 'Dein Beitrag hat mir geholfen.', true)$$, 'a member can thank someone without a conversation');
select extensions.throws_ok($$select public.send_network_thanks_direct('f4200000-0000-4000-8000-000000000001', 'person', null, array['time'], null, null, false)$$, '23505', 'thanks_recent', 'the same person only once every 90 days');
select extensions.throws_ok($$select public.send_network_thanks_direct('f4200000-0000-4000-8000-000000000003', 'person', null, array['time'], null, null, false)$$, '42501', 'thanks_not_allowed', 'no thanks to yourself');
select extensions.throws_ok($$select public.send_network_thanks_direct('f4200000-0000-4000-8000-000000000001', 'venture', 'f4200000-0000-4000-8000-0000000000ff', array['time'], null, null, false)$$, '22023', 'thanks_invalid', 'a venture that is not theirs is rejected');
select extensions.is((select count(*)::int from public.network_thanks), 1, 'the sender reads only their own thanks');

reset role;
select extensions.is((select verified from public.network_thanks where thanker_user_id = 'f4200000-0000-4000-8000-000000000003'), false, 'a direct thanks is internally marked as not verified');
insert into public.network_blocks(blocker_user_id, blocked_user_id) values ('f4200000-0000-4000-8000-000000000001', 'f4200000-0000-4000-8000-000000000004');
set local role authenticated;
set local request.jwt.claims = '{"sub":"f4200000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok($$select public.send_network_thanks_direct('f4200000-0000-4000-8000-000000000001', 'person', null, array['time'], null, null, false)$$, '42501', 'thanks_not_allowed', 'blocked people cannot send thanks');
set local request.jwt.claims = '{"sub":"f4200000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.has_network_heart('f4200000-0000-4000-8000-000000000001'), true, 'the heart shows for direct thanks too');

reset role;
select extensions.is((select count(*)::int from public.in_app_notices where recipient_user_id = 'f4200000-0000-4000-8000-000000000001' and kind = 'connect_thanks' and path = '/connect/contacts'), 2, 'the helped person gets one notice per thanks');
delete from public.network_contact_requests where id = 'f4200000-0000-4000-8000-0000000000c1';
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'connect_thanks'), 1, 'deleting the request removes the notice of its thanks, the direct one stays');

select * from extensions.finish();
rollback;
