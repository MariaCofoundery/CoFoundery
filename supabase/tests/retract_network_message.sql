\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','retract-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','retract-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','retract-c@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values
('d1000000-0000-4000-8000-000000000001','Retract A',array['founder']),
('d1000000-0000-4000-8000-000000000002','Retract B',array['founder']),
('d1000000-0000-4000-8000-000000000003','Retract C',array['founder']);
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at) values
('d1000000-0000-4000-8000-000000000001','Retract A','Builder','A sufficiently complete biography for the retract test.',array['founder'],'active',now()),
('d1000000-0000-4000-8000-000000000002','Retract B','Founder','A sufficiently complete biography for the retract test.',array['founder'],'active',now());
insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','seeking','expertise','Retract listing','A sufficiently complete listing summary for the retract test.','active',now(),now()+interval '60 days');
insert into public.network_contact_requests(id,listing_id,sender_user_id,recipient_user_id,message,status,listing_title_snapshot,sender_display_name_snapshot,recipient_display_name_snapshot,responded_at) values
('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','An accepted request for the retract test.','accepted','Retract listing','Retract A','Retract B',now());
insert into public.network_conversations(id,contact_request_id,participant_a_user_id,participant_b_user_id) values
('d4000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002');
insert into public.network_messages(id,conversation_id,sender_user_id,body) values
('d5000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Hello from A, this will be retracted.'),
('d5000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','Hello from B, this stays.');

-- Fremde oder unbekannte Nachricht: dieselbe Antwort.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.retract_network_message('d5000000-0000-4000-8000-000000000001')$$,'P0002','message_not_found','B cannot retract the message of A');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.retract_network_message('d5000000-0000-4000-8000-000000000001')$$,'P0002','message_not_found','an outsider cannot retract it either');
select extensions.throws_ok($$select public.retract_network_message('d5000000-0000-4000-8000-0000000000ff')$$,'P0002','message_not_found','an unknown message gives the same answer');
set local request.jwt.claims = '{"role":"authenticated"}';
select extensions.throws_ok($$select public.retract_network_message('d5000000-0000-4000-8000-000000000001')$$,'42501',null,'without sign-in nothing happens');

-- A nimmt die eigene Nachricht zurueck.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.retract_network_message('d5000000-0000-4000-8000-000000000001'), true, 'A retracts the own message');
select extensions.is((select body from public.list_network_messages('d4000000-0000-4000-8000-000000000001') where id = 'd5000000-0000-4000-8000-000000000001'), '', 'the text is gone for A');
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select body from public.list_network_messages('d4000000-0000-4000-8000-000000000001') where id = 'd5000000-0000-4000-8000-000000000001'), '', 'and gone for B');
select extensions.is((select body from public.list_network_messages('d4000000-0000-4000-8000-000000000001') where id = 'd5000000-0000-4000-8000-000000000002'), 'Hello from B, this stays.', 'other messages are untouched');
reset role;
select extensions.is((select retracted_at is not null from public.network_messages where id = 'd5000000-0000-4000-8000-000000000001'), true, 'the shell stays with retracted_at');
select extensions.is((select count(*)::int from public.network_messages where conversation_id = 'd4000000-0000-4000-8000-000000000001'), 2, 'the history keeps both rows');

select * from extensions.finish();
rollback;
