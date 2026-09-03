\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(60);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','cd000000-0000-4000-8000-000000000001','authenticated','authenticated','message-founder-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cd000000-0000-4000-8000-000000000002','authenticated','authenticated','message-founder-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cd000000-0000-4000-8000-000000000003','authenticated','authenticated','message-network-only@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cd000000-0000-4000-8000-000000000004','authenticated','authenticated','message-founder-outsider@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cd000000-0000-4000-8000-000000000005','authenticated','authenticated','message-advisor-outsider@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id,display_name,roles) values
('cd000000-0000-4000-8000-000000000001','Message Founder A',array['founder']),
('cd000000-0000-4000-8000-000000000002','Message Founder B',array['founder']),
('cd000000-0000-4000-8000-000000000004','Unrelated Founder',array['founder']),
('cd000000-0000-4000-8000-000000000005','Unrelated Advisor',array['advisor']);
insert into public.network_memberships(user_id) values ('cd000000-0000-4000-8000-000000000003');
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at) values
('cd000000-0000-4000-8000-000000000001','Message Founder A','Product builder','A sufficiently complete messaging test biography.',array['founder'],'active',now()),
('cd000000-0000-4000-8000-000000000002','Message Founder B','HealthTech founder','A sufficiently complete messaging recipient biography.',array['founder'],'active',now()),
('cd000000-0000-4000-8000-000000000003','Network-only Expert','Independent expert','A sufficiently complete Network-only messaging biography.',array['expert'],'active',now());

insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at) values
('ce000000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-000000000002','seeking','expertise','Accepted chat listing','A sufficiently complete listing summary for messaging tests.','active',now(),now()+interval '60 days'),
('ce000000-0000-4000-8000-000000000002','cd000000-0000-4000-8000-000000000002','offering','sparring','Pending request listing','A sufficiently complete listing summary for messaging tests.','active',now(),now()+interval '60 days'),
('ce000000-0000-4000-8000-000000000003','cd000000-0000-4000-8000-000000000002','seeking','cooperation','Legacy accepted listing','A sufficiently complete listing summary for messaging tests.','active',now(),now()+interval '60 days'),
('ce000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000002','seeking','investment','Declined request listing','A sufficiently complete listing summary for messaging tests.','active',now(),now()+interval '60 days'),
('ce000000-0000-4000-8000-000000000005','cd000000-0000-4000-8000-000000000002','offering','expertise','Canceled request listing','A sufficiently complete listing summary for messaging tests.','active',now(),now()+interval '60 days');

create temporary table messaging_ids(key text primary key, id uuid not null);
grant select, insert, update, delete on messaging_ids to authenticated;

select extensions.ok(to_regclass('public.network_conversations') is not null and to_regclass('public.network_messages') is not null,'messaging tables exist');
select extensions.ok(not has_table_privilege('authenticated','public.network_conversations','select') and not has_table_privilege('authenticated','public.network_messages','select'),'authenticated clients have no broad direct table reads');

select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
insert into messaging_ids values ('accept',public.request_network_contact('ce000000-0000-4000-8000-000000000001','I would like to continue this exchange internally.'));
insert into messaging_ids values ('pending',public.request_network_contact('ce000000-0000-4000-8000-000000000002','I would like to discuss the sparring offer.'));
select extensions.is((select count(*)::int from public.list_network_conversations()),0,'pending contact request creates no conversation');

reset role;
insert into public.network_contact_requests(id,listing_id,sender_user_id,recipient_user_id,message,status,listing_title_snapshot,sender_display_name_snapshot,recipient_display_name_snapshot,responded_at) values
('cf000000-0000-4000-8000-000000000003','ce000000-0000-4000-8000-000000000003','cd000000-0000-4000-8000-000000000003','cd000000-0000-4000-8000-000000000002','An accepted request that existed before messaging.','accepted','Legacy accepted listing','Network-only Expert','Message Founder B',now()),
('cf000000-0000-4000-8000-000000000004','ce000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000002','A declined request must never create a chat.','declined','Declined request listing','Unrelated Founder','Message Founder B',now()),
('cf000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000005','cd000000-0000-4000-8000-000000000005','cd000000-0000-4000-8000-000000000002','A canceled request must never create a chat.','canceled','Canceled request listing','Unrelated Advisor','Message Founder B',null);
insert into messaging_ids values
('legacy','cf000000-0000-4000-8000-000000000003'),
('declined','cf000000-0000-4000-8000-000000000004'),
('canceled','cf000000-0000-4000-8000-000000000005');

select extensions.throws_ok(
  $$insert into public.network_conversations(contact_request_id,participant_a_user_id,participant_b_user_id) values((select id from messaging_ids where key='pending'),'cd000000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-000000000002')$$,
  '23514','network_conversation_requires_accepted_request','pending request cannot create a conversation'
);
select extensions.throws_ok(
  $$insert into public.network_conversations(contact_request_id,participant_a_user_id,participant_b_user_id) values('cf000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000002')$$,
  '23514','network_conversation_requires_accepted_request','declined request cannot create a conversation'
);
select extensions.throws_ok(
  $$insert into public.network_conversations(contact_request_id,participant_a_user_id,participant_b_user_id) values('cf000000-0000-4000-8000-000000000005','cd000000-0000-4000-8000-000000000005','cd000000-0000-4000-8000-000000000002')$$,
  '23514','network_conversation_requires_accepted_request','canceled request cannot create a conversation'
);

insert into public.network_conversations(contact_request_id,participant_a_user_id,participant_b_user_id,created_at)
select request.id,request.sender_user_id,request.recipient_user_id,coalesce(request.responded_at,request.updated_at,request.created_at)
from public.network_contact_requests request where request.status='accepted'
on conflict(contact_request_id) do nothing;
select extensions.is((select count(*)::int from public.network_conversations where contact_request_id='cf000000-0000-4000-8000-000000000003'),1,'existing accepted request backfills exactly one conversation');
select extensions.ok((select participant_a_user_id='cd000000-0000-4000-8000-000000000003' and participant_b_user_id='cd000000-0000-4000-8000-000000000002' from public.network_conversations where contact_request_id='cf000000-0000-4000-8000-000000000003'),'backfill preserves sender and recipient as the two participants');
select extensions.throws_ok(
  $$insert into public.network_conversations(contact_request_id,participant_a_user_id,participant_b_user_id) values('cf000000-0000-4000-8000-000000000003','cd000000-0000-4000-8000-000000000003','cd000000-0000-4000-8000-000000000002')$$,
  '23505',null,'unique contact request prevents duplicate conversations'
);

select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000002","role":"authenticated"}',true); set local role authenticated;
select extensions.lives_ok($$select public.respond_network_contact((select id from messaging_ids where key='accept'),'accepted')$$,'recipient acceptance creates a conversation');
select extensions.is((select count(*)::int from public.list_network_conversations() where contact_request_id=(select id from messaging_ids where key='accept')),1,'accepted request has exactly one participant-visible conversation');
select extensions.lives_ok($$select public.respond_network_contact((select id from messaging_ids where key='accept'),'accepted')$$,'repeated acceptance is idempotent');
select extensions.is((select count(*)::int from public.list_network_conversations() where contact_request_id=(select id from messaging_ids where key='accept')),1,'repeated acceptance creates no duplicate');

reset role;
select extensions.is((select count(*)::int from public.network_conversations where contact_request_id in ('cf000000-0000-4000-8000-000000000004','cf000000-0000-4000-8000-000000000005')),0,'declined and canceled requests remain without conversations');
insert into messaging_ids select 'conversation',id from public.network_conversations where contact_request_id=(select id from messaging_ids where key='accept');
insert into messaging_ids select 'legacy_conversation',id from public.network_conversations where contact_request_id='cf000000-0000-4000-8000-000000000003';

select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.list_network_conversations()),1,'participant A lists only own accepted conversation');
select extensions.is((select count(*)::int from public.list_network_messages((select id from messaging_ids where key='conversation'))),0,'accepted conversation supports a zero-message state');
select extensions.lives_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'  Hello from participant A.  ')$$,'participant A sends a message');
reset role;
select extensions.is((select body from public.network_messages where conversation_id=(select id from messaging_ids where key='conversation')),'Hello from participant A.','message body is trimmed before persistence');
select extensions.ok((select last_message_at is not null from public.network_conversations where id=(select id from messaging_ids where key='conversation')),'sending updates conversation last_message_at');

select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.is(public.get_unread_network_message_count(),0::bigint,'sender own message is never unread for sender');
select extensions.throws_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'   ')$$,'23514','network_message_body_invalid','empty message is denied');
select extensions.throws_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),repeat('x',2001))$$,'23514','network_message_body_invalid','message over 2000 characters is denied');

reset role; select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000002","role":"authenticated"}',true); set local role authenticated;
select extensions.is(public.get_unread_network_message_count(),1::bigint,'incoming unread count includes the new message');
select extensions.is((select count(*)::int from public.list_network_messages((select id from messaging_ids where key='conversation'))),1,'participant B reads conversation messages');
select extensions.ok(not ((select to_jsonb(message) from public.list_network_messages((select id from messaging_ids where key='conversation')) message) ? 'read_at'),'message projection does not expose read_at receipts');
select extensions.lives_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'Reply from participant B.')$$,'participant B sends a reply');
select extensions.is(public.get_unread_network_message_count(),1::bigint,'participant B own reply does not increase own unread count');
select extensions.is(public.mark_network_conversation_read((select id from messaging_ids where key='conversation')),1,'recipient marks incoming unread message read');
select extensions.is(public.get_unread_network_message_count(),0::bigint,'recipient unread count decreases after opening conversation');
select extensions.is(public.mark_network_conversation_read((select id from messaging_ids where key='conversation')),0,'mark read is idempotent');
reset role;
select extensions.ok((select read_at is null from public.network_messages where sender_user_id='cd000000-0000-4000-8000-000000000002'),'mark read never marks the current user own sent message');

select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.is(public.get_unread_network_message_count(),1::bigint,'reply is unread for participant A');
select extensions.is(public.mark_network_conversation_read((select id from messaging_ids where key='conversation')),1,'participant A marks only incoming reply read');

reset role; select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000003","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.list_network_conversations()),1,'Network-only participant can list accepted conversation');
select extensions.lives_ok($$select public.send_network_message((select id from messaging_ids where key='legacy_conversation'),'Network-only participant message.')$$,'Network-only participant can send without Founder or Advisor rights');
select extensions.ok(not public.is_current_user_discovery_founder(),'Network-only messaging grants no Founder rights');

reset role; select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.lives_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'First unread message across conversations.'); select public.send_network_message((select id from messaging_ids where key='conversation'),'Second unread message across conversations.')$$,'participant A adds two incoming unread messages for participant B');
reset role; select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000002","role":"authenticated"}',true); set local role authenticated;
select extensions.is(public.get_unread_network_message_count(),3::bigint,'unread count aggregates two messages in one conversation and one in another');
select extensions.is(public.mark_network_conversation_read((select id from messaging_ids where key='conversation')),2,'opening conversation A marks only its two incoming messages');
select extensions.is(public.get_unread_network_message_count(),1::bigint,'unread count retains the other conversation message');
select extensions.is(public.mark_network_conversation_read((select id from messaging_ids where key='legacy_conversation')),1,'opening conversation B clears its remaining incoming message');

reset role; select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000004","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.list_network_conversations()),0,'unrelated Founder sees no conversations');
select extensions.throws_ok($$select * from public.list_network_messages((select id from messaging_ids where key='conversation'))$$,'42501','network_conversation_access_denied','unrelated Founder cannot read messages');
select extensions.throws_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'Outsider message.')$$,'42501','network_conversation_access_denied','unrelated Founder cannot send messages');

reset role; select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000005","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.list_network_conversations()),0,'unrelated Advisor sees no conversations');
select extensions.throws_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'Advisor outsider message.')$$,'42501','network_conversation_access_denied','Advisor role grants no foreign chat access');

reset role; update public.network_memberships set status='suspended' where user_id='cd000000-0000-4000-8000-000000000003';
select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000003","role":"authenticated"}',true); set local role authenticated;
select extensions.throws_ok($$select * from public.list_network_conversations()$$,'42501','network_membership_required','suspended participant cannot list conversations');
select extensions.throws_ok($$select public.get_unread_network_message_count()$$,'42501','network_membership_required','suspended participant cannot read unread count');
select extensions.throws_ok($$select public.send_network_message((select id from messaging_ids where key='legacy_conversation'),'Suspended message.')$$,'42501','network_membership_required','suspended participant cannot send');
select extensions.throws_ok($$select public.mark_network_conversation_read((select id from messaging_ids where key='legacy_conversation'))$$,'42501','network_membership_required','suspended participant cannot mark messages read');

reset role;
update public.network_listings set status='paused' where id='ce000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.lives_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'Chat survives listing pause.')$$,'listing pause does not destroy accepted chat');
reset role; update public.network_listings set status='active',published_at=now()-interval '70 days',expires_at=now()-interval '10 days' where id='ce000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.lives_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'Chat survives listing expiry.')$$,'listing expiry does not destroy accepted chat');
reset role; update public.network_listings set status='completed' where id='ce000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"cd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.lives_ok($$select public.send_network_message((select id from messaging_ids where key='conversation'),'Chat survives listing completion.')$$,'listing completion does not destroy accepted chat');
select extensions.throws_ok($$insert into public.network_messages(conversation_id,sender_user_id,body) values((select id from messaging_ids where key='conversation'),auth.uid(),'Direct bypass')$$,'42501',null,'authenticated client cannot bypass send RPC');
select extensions.throws_ok($$select * from public.list_network_messages((select id from messaging_ids where key='legacy_conversation'))$$,'42501','network_conversation_access_denied','participant cannot cross into another conversation');

reset role; set local role anon;
select extensions.throws_ok($$select public.get_unread_network_message_count()$$,'42501',null,'unauthenticated unread access is denied');

reset role;
delete from auth.users where id='cd000000-0000-4000-8000-000000000002';
select extensions.is((select count(*)::int from public.network_conversations),0,'participant account deletion removes shared conversations');
select extensions.is((select count(*)::int from public.network_messages),0,'participant account deletion cascades all messages without orphans');
select extensions.is((select count(*)::int from public.network_contact_requests),0,'participant account deletion removes parent contact requests');
select extensions.ok(not exists(select 1 from public.network_messages message left join public.network_conversations conversation on conversation.id=message.conversation_id where conversation.id is null),'no orphan message can remain');

select * from extensions.finish();
rollback;
