\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(39);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','da000000-0000-4000-8000-000000000001','authenticated','authenticated','safety-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','da000000-0000-4000-8000-000000000002','authenticated','authenticated','safety-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-8000-000000000003','da000000-0000-4000-8000-000000000003','authenticated','authenticated','safety-c@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles,avatar_url) values
('da000000-0000-4000-8000-000000000001','Safety A',array['founder'],'avatars/da000000-0000-4000-8000-000000000001/original.jpg'),
('da000000-0000-4000-8000-000000000002','Safety B',array['founder'],null),
('da000000-0000-4000-8000-000000000003','Safety C',array['advisor'],null);
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at) values
('da000000-0000-4000-8000-000000000001','Safety A','Founder A','A sufficiently complete biography for safety tests.',array['founder'],'active',now()),
('da000000-0000-4000-8000-000000000002','Safety B','Founder B','A sufficiently complete biography for safety tests.',array['founder'],'active',now()),
('da000000-0000-4000-8000-000000000003','Safety C','Advisor C','A sufficiently complete biography for safety tests.',array['advisor_mentor'],'active',now());

select extensions.ok((select not public and file_size_limit=2097152 from storage.buckets where id='network-profile-images'),'Network photo bucket is private and bounded');
select extensions.is((select photo_visibility from public.network_profiles where user_id='da000000-0000-4000-8000-000000000001'),'platform_only','platform_only is the default');
select extensions.ok((select photo_source is null and photo_path is null and photo_avatar_id is null from public.network_profiles where user_id='da000000-0000-4000-8000-000000000001'),'existing base avatar is never silently reused');
select extensions.lives_ok($$update public.network_profiles set photo_source='profile_avatar',photo_avatar_id='avatar-03' where user_id='da000000-0000-4000-8000-000000000001'$$,'explicit library avatar reuse is valid');
select extensions.throws_ok($$update public.network_profiles set photo_source='profile_copy',photo_avatar_id=null,photo_path='da000000-0000-4000-8000-000000000001/copied.jpg' where user_id='da000000-0000-4000-8000-000000000001'$$,'23514',null,'public personal Founder upload cannot masquerade as a private Network reuse');
select extensions.lives_ok($$update public.network_profiles set photo_source='network_upload',photo_avatar_id=null,photo_path='da000000-0000-4000-8000-000000000001/replacement.jpg' where user_id='da000000-0000-4000-8000-000000000001'$$,'Network photo replacement is valid');
select extensions.lives_ok($$update public.network_profiles set photo_source=null,photo_path=null where user_id='da000000-0000-4000-8000-000000000001'$$,'Network photo removal returns to fallback');
select extensions.lives_ok($$update public.network_profiles set photo_visibility='public_allowed' where user_id='da000000-0000-4000-8000-000000000001'$$,'public_allowed is stored as a preference');
select extensions.ok((select not public from storage.buckets where id='network-profile-images'),'public_allowed does not make the bucket public');
select extensions.is((select count(*)::int from pg_policies where schemaname='storage' and tablename='objects' and policyname='network_profile_images_member_read' and roles::text like '%authenticated%'),1,'photo read policy is authenticated-only');

set local role anon;
select extensions.throws_ok($$select public.can_read_network_profile_photo('da000000-0000-4000-8000-000000000001/photo.jpg')$$,'42501',null,'anonymous cannot invoke the photo authorization helper');
reset role;

insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at) values
('db000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002','seeking','expertise','B listing one','A sufficiently complete listing summary for safety tests.','active',now(),now()+interval '60 days'),
('db000000-0000-4000-8000-000000000002','da000000-0000-4000-8000-000000000001','offering','sparring','A listing one','A sufficiently complete listing summary for safety tests.','active',now(),now()+interval '60 days'),
('db000000-0000-4000-8000-000000000003','da000000-0000-4000-8000-000000000002','offering','cooperation','B listing two','A sufficiently complete listing summary for safety tests.','active',now(),now()+interval '60 days');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"da000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.ok(public.can_read_network_profile_photo('da000000-0000-4000-8000-000000000001/owner-preview.jpg'),'owner may retrieve an own private photo object for preview');
-- The helper only grants a real referenced path. Add it explicitly for the access proof.
reset role; update public.network_profiles set photo_source='network_upload',photo_path='da000000-0000-4000-8000-000000000002/member.jpg' where user_id='da000000-0000-4000-8000-000000000002';
set local role authenticated; select set_config('request.jwt.claims','{"sub":"da000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.ok(public.can_read_network_profile_photo('da000000-0000-4000-8000-000000000002/member.jpg'),'member can retrieve an explicitly projected active photo');
select extensions.ok(not public.can_read_network_profile_photo('da000000-0000-4000-8000-000000000002/private.jpg'),'member cannot retrieve an unreferenced private object');
create temporary table safety_ids(key text primary key,id uuid not null); grant all on safety_ids to authenticated;
insert into safety_ids values ('pending',public.request_network_contact('db000000-0000-4000-8000-000000000001','A legitimate pending request for the block test.'));
reset role;
insert into public.network_contact_requests(id,listing_id,sender_user_id,recipient_user_id,message,status,listing_title_snapshot,sender_display_name_snapshot,recipient_display_name_snapshot,responded_at) values
('dc000000-0000-4000-8000-000000000001','db000000-0000-4000-8000-000000000002','da000000-0000-4000-8000-000000000002','da000000-0000-4000-8000-000000000001','An accepted request for the chat safety contract.','accepted','A listing one','Safety B','Safety A',now());
insert into public.network_conversations(contact_request_id,participant_a_user_id,participant_b_user_id) values
('dc000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002','da000000-0000-4000-8000-000000000001');
insert into safety_ids select 'conversation',id from public.network_conversations where contact_request_id='dc000000-0000-4000-8000-000000000001';

set local role authenticated; select set_config('request.jwt.claims','{"sub":"da000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.lives_ok($$select public.send_network_message((select id from safety_ids where key='conversation'),'Message before blocking.')$$,'accepted chat works before block');
select extensions.throws_ok($$select public.block_network_user('da000000-0000-4000-8000-000000000002')$$,'23514','network_block_target_invalid','self block is denied');
select extensions.lives_ok($$select public.block_network_user('da000000-0000-4000-8000-000000000001')$$,'recipient can block a known contact');
select extensions.is((select status from public.network_contact_requests where id=(select id from safety_ids where key='pending')),'canceled','block neutralizes pending request');
select extensions.ok((select interaction_blocked from public.get_network_block_state('da000000-0000-4000-8000-000000000001')),'one block stops interaction in both directions');
select extensions.throws_ok($$select public.send_network_message((select id from safety_ids where key='conversation'),'Blocked B to A message.')$$,'42501','network_message_interaction_blocked','blocker cannot send a new message');
select extensions.is(public.get_unread_network_message_count(),0::bigint,'block clears phantom unread attention');
select extensions.is((select count(*)::int from public.list_network_messages((select id from safety_ids where key='conversation'))),1,'existing chat history remains participant-visible after block');

reset role; set local role authenticated; select set_config('request.jwt.claims','{"sub":"da000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.throws_ok($$select public.send_network_message((select id from safety_ids where key='conversation'),'Blocked A to B message.')$$,'42501','network_message_interaction_blocked','blocked person cannot send a new message');
select extensions.throws_ok($$select public.request_network_contact('db000000-0000-4000-8000-000000000003','Another listing cannot bypass the active block.')$$,'42501','network_contact_interaction_blocked','blocked person cannot create another request');

reset role; set local role authenticated; select set_config('request.jwt.claims','{"sub":"da000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.throws_ok($$select public.request_network_contact('db000000-0000-4000-8000-000000000002','Reverse direction cannot bypass the active block.')$$,'42501','network_contact_interaction_blocked','blocker also cannot create a reverse request');
select extensions.is((select count(*)::int from public.list_network_blocks()),1,'only blocker sees own block management row');
select extensions.lives_ok($$select public.unblock_network_user('da000000-0000-4000-8000-000000000001')$$,'blocker can unblock');
select extensions.ok(not (select interaction_blocked from public.get_network_block_state('da000000-0000-4000-8000-000000000001')),'unblock restores interaction permission');
select extensions.lives_ok($$select public.send_network_message((select id from safety_ids where key='conversation'),'Message after unblock.')$$,'accepted chat resumes after unblock');

select extensions.lives_ok($$select public.report_network_interaction('dc000000-0000-4000-8000-000000000001','spam','Short confidential context.')$$,'participant can submit a structured report');
select extensions.throws_ok($$select count(*) from public.network_reports$$,'42501',null,'authenticated reporter cannot directly read confidential reports');
reset role;
select extensions.is((select count(*)::int from public.network_reports),1,'report persists for restricted operations review');
select extensions.ok((select category='spam' and comment='Short confidential context.' from public.network_reports),'report category and optional comment persist without sanction');
select extensions.ok(public.is_network_member('da000000-0000-4000-8000-000000000001') and public.is_network_member('da000000-0000-4000-8000-000000000002'),'a report does not alter product permissions');

set local role authenticated; select set_config('request.jwt.claims','{"sub":"da000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select extensions.throws_ok($$select public.report_network_interaction('dc000000-0000-4000-8000-000000000001','spam',null)$$,'42501','network_report_context_denied','unrelated member cannot report a private interaction');
select extensions.throws_ok($$select count(*) from public.network_reports$$,'42501',null,'unrelated member cannot read report details');
reset role;

delete from auth.users where id='da000000-0000-4000-8000-000000000002';
select extensions.is((select count(*)::int from public.network_blocks),0,'account deletion leaves no block orphan');
select extensions.is((select count(*)::int from public.network_reports),0,'account deletion leaves no report orphan');
select extensions.is((select count(*)::int from public.network_messages),0,'account deletion preserves messaging cascade without orphan');

select * from extensions.finish();
rollback;
