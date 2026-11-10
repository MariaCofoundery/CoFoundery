\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

-- 1 Suchende, 2 Kennerin (Tueren), 3 Kennerin mit pausierten Tueren, 4 Fremde ohne Mitgliedschaft.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f4100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'intro' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.network_memberships(user_id, status) select ('f4100000-0000-4000-8000-00000000000' || n)::uuid, 'active' from generate_series(1, 3) n;
insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at, doors_open)
select ('f4100000-0000-4000-8000-00000000000' || n)::uuid, 'Person ' || n, 'Zeile ' || n, 'Ein Text mit genug Zeichen drin.', array['founder'], 'active', now(), n <> 3 from generate_series(1, 3) n;
insert into public.network_doors(id, user_id, type_key, sector_key, region, closeness) values
('f4100000-0000-4000-8000-0000000000d1', 'f4100000-0000-4000-8000-000000000002', 'purchasing_midsize', 'health', 'Leipzig', 'introduce'),
('f4100000-0000-4000-8000-0000000000d2', 'f4100000-0000-4000-8000-000000000002', 'angel', null, null, 'via'),
('f4100000-0000-4000-8000-0000000000d3', 'f4100000-0000-4000-8000-000000000003', 'angel', null, null, 'via');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"f4100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.request_network_introduction('f4100000-0000-4000-8000-0000000000d3', 'Ich suche Zugang zu Business Angels.')$$, '23514', 'introduction_paused', 'paused doors take no introductions');
insert into ids values ('r1', public.request_network_introduction('f4100000-0000-4000-8000-0000000000d1', 'Ich suche Zugang zu Einkauf im Mittelstand, Gesundheit.'));
select extensions.is((select type_key from public.network_introductions where request_id = (select id from ids where key = 'r1')), 'purchasing_midsize', 'the introduction is a contact request with a door snapshot');
select extensions.is((select status from public.network_contact_requests where id = (select id from ids where key = 'r1')), 'pending', 'it uses the existing contact request');
select extensions.throws_ok($$select public.request_network_introduction('f4100000-0000-4000-8000-0000000000d1', 'x')$$, '23514', 'network_contact_message_invalid', 'the message rules of contact requests apply');

-- zweite offene Vorstellung geht nicht an dieselbe Person (die vorhandene wird zurueckgegeben), eine dritte uebersteigt das Limit.
select extensions.is(public.request_network_introduction('f4100000-0000-4000-8000-0000000000d2', 'Ich suche einen Business Angel für Gesundheit.'), (select id from ids where key = 'r1'), 'a second ask to the same person returns the open request');

reset role;
insert into public.network_contact_requests(id, listing_id, sender_user_id, recipient_user_id, message, status, listing_title_snapshot, sender_display_name_snapshot, sender_headline_snapshot, recipient_display_name_snapshot)
values ('f4100000-0000-4000-8000-0000000000c9', null, 'f4100000-0000-4000-8000-000000000001', 'f4100000-0000-4000-8000-000000000003', 'Eine Vorstellung nummer zwei.', 'pending', null, 'Person 1', 'Zeile 1', 'Person 3');
insert into public.network_introductions(request_id, type_key) values ('f4100000-0000-4000-8000-0000000000c9', 'angel');
update public.network_profiles set doors_open = true where user_id = 'f4100000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"f4100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.request_network_introduction('f4100000-0000-4000-8000-0000000000d3', 'Noch eine Vorstellung bitte.')$$, '23514', 'introduction_limit', 'at most two open introductions');

set local request.jwt.claims = '{"sub":"f4100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(public.count_network_incoming_pending(), 1, 'the tab counts the open ask');
select extensions.ok(public.snooze_network_introduction((select id from ids where key = 'r1')), 'the door owner can say "later"');
select extensions.is(public.count_network_incoming_pending(), 0, 'a snoozed introduction no longer counts');
select extensions.is((select snoozed_at is not null from public.list_network_introductions() where request_id = (select id from ids where key = 'r1')), true, 'and it shows as snoozed in the list');
set local request.jwt.claims = '{"sub":"f4100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select snoozed_at is not null from public.network_introductions where request_id = (select id from ids where key = 'r1')), true, 'the sender sees the snoozed state too (participants read)');

-- Nach 14 Tagen schliesst sich die Anfrage still, danach geht eine neue.
reset role;
update public.network_introductions set created_at = now() - interval '15 days' where request_id = (select id from ids where key = 'r1');
select extensions.is(public.close_stale_introductions(), 1, 'stale introductions close silently');
select extensions.is((select status from public.network_contact_requests where id = (select id from ids where key = 'r1')), 'canceled', 'with the status canceled');

-- "Hat es geklappt?": nur bei angenommenen, nur Beteiligte, nur die eigene Antwort sichtbar.
update public.network_contact_requests set status = 'accepted', responded_at = now() - interval '15 days' where id = 'f4100000-0000-4000-8000-0000000000c9';
set local role authenticated;
set local request.jwt.claims = '{"sub":"f4100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.ok(public.answer_network_introduction_outcome('f4100000-0000-4000-8000-0000000000c9', 'yes'), 'a participant answers "did it work?"');
set local request.jwt.claims = '{"sub":"f4100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.network_introduction_outcomes), 0, 'the other side does not see that answer');

select * from extensions.finish();
rollback;
