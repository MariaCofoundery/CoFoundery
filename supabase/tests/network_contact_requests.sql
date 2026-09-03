\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(41);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','bd000000-0000-4000-8000-000000000001','authenticated','authenticated','contact-founder-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','bd000000-0000-4000-8000-000000000002','authenticated','authenticated','contact-founder-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','bd000000-0000-4000-8000-000000000003','authenticated','authenticated','contact-network@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','bd000000-0000-4000-8000-000000000004','authenticated','authenticated','contact-advisor@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','bd000000-0000-4000-8000-000000000005','authenticated','authenticated','contact-unrelated@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id,display_name,roles) values
('bd000000-0000-4000-8000-000000000001','Founder A',array['founder']),
('bd000000-0000-4000-8000-000000000002','Founder B',array['founder']),
('bd000000-0000-4000-8000-000000000004','Advisor D',array['advisor']),
('bd000000-0000-4000-8000-000000000005','Unrelated E',array['founder']);
insert into public.network_memberships(user_id) values ('bd000000-0000-4000-8000-000000000003');
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at) values
('bd000000-0000-4000-8000-000000000001','Founder A','Builds useful products','A sufficiently complete Network contact biography.',array['founder'],'active',now()),
('bd000000-0000-4000-8000-000000000002','Founder B','HealthTech operator','A sufficiently complete recipient biography.',array['founder'],'active',now()),
('bd000000-0000-4000-8000-000000000003','Network Expert','Independent expert','A sufficiently complete Network-only biography.',array['expert'],'active',now()),
('bd000000-0000-4000-8000-000000000004','Advisor D','Go-to-market advisor','A sufficiently complete advisor biography.',array['advisor_mentor'],'active',now()),
('bd000000-0000-4000-8000-000000000005','Unrelated E','Ecosystem member','A sufficiently complete unrelated biography.',array['expert'],'active',now());

insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at) values
('be000000-0000-4000-8000-000000000001','bd000000-0000-4000-8000-000000000002','seeking','expertise','B2B Sales for HealthTech','A sufficiently complete listing summary for contact tests.','active',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000002','bd000000-0000-4000-8000-000000000002','offering','sparring','Product strategy sparring','A sufficiently complete listing summary for contact tests.','active',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000003','bd000000-0000-4000-8000-000000000002','seeking','cooperation','Research cooperation','A sufficiently complete listing summary for contact tests.','active',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000004','bd000000-0000-4000-8000-000000000002','seeking','investment','Investment opportunity','A sufficiently complete listing summary for contact tests.','active',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000005','bd000000-0000-4000-8000-000000000002','offering','expertise','Marketing expertise','A sufficiently complete listing summary for contact tests.','active',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000006','bd000000-0000-4000-8000-000000000002','seeking','expertise','Paused listing','A sufficiently complete listing summary for contact tests.','paused',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000007','bd000000-0000-4000-8000-000000000002','seeking','expertise','Expired listing','A sufficiently complete listing summary for contact tests.','active',now()-interval '70 days',now()-interval '10 days'),
('be000000-0000-4000-8000-000000000008','bd000000-0000-4000-8000-000000000002','seeking','expertise','Completed listing','A sufficiently complete listing summary for contact tests.','completed',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000009','bd000000-0000-4000-8000-000000000002','seeking','expertise','Draft listing','A sufficiently complete listing summary for contact tests.','draft',null,null),
('be000000-0000-4000-8000-000000000010','bd000000-0000-4000-8000-000000000001','offering','expertise','Founder A own listing','A sufficiently complete listing summary for contact tests.','active',now(),now()+interval '60 days'),
('be000000-0000-4000-8000-000000000011','bd000000-0000-4000-8000-000000000003','offering','expertise','Network expert support','A sufficiently complete Network-only recipient listing.','active',now(),now()+interval '60 days');

select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
create temporary table contact_ids(key text primary key,id uuid);
insert into contact_ids values ('accepted',public.request_network_contact('be000000-0000-4000-8000-000000000001','I can help with the B2B sales setup.'));
select extensions.is((select count(*)::int from public.network_contact_requests),1,'Founder A creates one listing-scoped request');
select extensions.is((select message from public.network_contact_requests),(select 'I can help with the B2B sales setup.'),'sender sees own private outgoing message');
select extensions.is(public.request_network_contact('be000000-0000-4000-8000-000000000001','A duplicate message is ignored.'),(select id from contact_ids where key='accepted'),'duplicate send is idempotent');
select extensions.is((select count(*)::int from public.network_contact_requests),1,'duplicate send creates no second request');
select extensions.throws_ok($$select public.request_network_contact('be000000-0000-4000-8000-000000000010','Trying to contact my own listing.')$$,'23514','network_contact_self_request_forbidden','self request is denied');
select extensions.throws_ok($$select public.request_network_contact('be000000-0000-4000-8000-000000000006','Trying a paused listing request.')$$,'42501','network_contact_listing_unavailable','paused listing is denied');
select extensions.throws_ok($$select public.request_network_contact('be000000-0000-4000-8000-000000000007','Trying an expired listing request.')$$,'42501','network_contact_listing_unavailable','expired listing is denied');
select extensions.throws_ok($$select public.request_network_contact('be000000-0000-4000-8000-000000000008','Trying a completed listing request.')$$,'42501','network_contact_listing_unavailable','completed listing is denied');
select extensions.throws_ok($$select public.request_network_contact('be000000-0000-4000-8000-000000000009','Trying a private draft request.')$$,'42501','network_contact_listing_unavailable','draft listing is denied');
select extensions.throws_ok($$select public.request_network_contact('be000000-0000-4000-8000-000000000001','Too short')$$,'23514','network_contact_message_invalid','short messages are rejected without silent truncation');
select extensions.throws_ok($$insert into public.network_contact_requests(listing_id,sender_user_id,recipient_user_id,message,listing_title_snapshot,sender_display_name_snapshot,recipient_display_name_snapshot) values('be000000-0000-4000-8000-000000000002',auth.uid(),'bd000000-0000-4000-8000-000000000002','Bypass attempt','x','x','x')$$,'42501',null,'direct client insert is denied');
insert into contact_ids values ('network_only_recipient',public.request_network_contact('be000000-0000-4000-8000-000000000011','I would like to discuss your independent expertise.'));

reset role; select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000002","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.network_contact_requests where status='pending'),1,'recipient sees incoming pending request');
select extensions.is((select sender_display_name_snapshot from public.network_contact_requests),'Founder A','recipient sees published sender identity snapshot');
select extensions.lives_ok($$select public.respond_network_contact((select id from contact_ids where key='accepted'),'accepted')$$,'recipient accepts pending request');
select extensions.is((select status from public.network_contact_requests where id=(select id from contact_ids where key='accepted')),'accepted','accept persists contact established state');
select extensions.ok((select responded_at is not null from public.network_contact_requests where id=(select id from contact_ids where key='accepted')),'accept records response time');

reset role; select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.throws_ok($$select public.cancel_network_contact((select id from contact_ids where key='accepted'))$$,'23514','network_contact_not_pending','accepted request cannot be canceled');
insert into contact_ids values ('declined',public.request_network_contact('be000000-0000-4000-8000-000000000002','I would value a short product strategy exchange.'));
insert into contact_ids values ('canceled',public.request_network_contact('be000000-0000-4000-8000-000000000003','I am interested in the research cooperation.'));
select extensions.is((select count(*)::int from public.network_contact_requests where sender_user_id=auth.uid()),4,'same sender may contact different contextual listings without duplicate requests');

reset role; select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000002","role":"authenticated"}',true); set local role authenticated;
select extensions.lives_ok($$select public.respond_network_contact((select id from contact_ids where key='declined'),'declined')$$,'recipient declines without a reason');
select extensions.is((select status from public.network_contact_requests where id=(select id from contact_ids where key='declined')),'declined','decline persists neutral terminal state');

reset role; select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.lives_ok($$select public.cancel_network_contact((select id from contact_ids where key='canceled'))$$,'sender cancels pending request');
select extensions.is((select status from public.network_contact_requests where id=(select id from contact_ids where key='canceled')),'canceled','cancel persists terminal state');

reset role; select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000003","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.network_contact_requests where recipient_user_id=auth.uid()),1,'Network-only member receives and reads an incoming request');
select extensions.lives_ok($$select public.respond_network_contact((select id from contact_ids where key='network_only_recipient'),'accepted')$$,'Network-only recipient accepts a request');
select extensions.is((select status from public.network_contact_requests where id=(select id from contact_ids where key='network_only_recipient')),'accepted','Network-only acceptance persists without product-role escalation');
insert into contact_ids values ('network_only',public.request_network_contact('be000000-0000-4000-8000-000000000004','I can contribute as an independent Network expert.'));
select extensions.is((select count(*)::int from public.network_contact_requests where sender_user_id=auth.uid()),1,'Network-only member sends and reads own request');
select extensions.ok(not public.is_current_user_discovery_founder(),'Network-only contact sender gains no Founder rights');

reset role; select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000004","role":"authenticated"}',true); set local role authenticated;
insert into contact_ids values ('advisor',public.request_network_contact('be000000-0000-4000-8000-000000000005','I would like to discuss the marketing expertise.'));
select extensions.is((select count(*)::int from public.network_contact_requests where sender_user_id=auth.uid()),1,'Advisor-only member sends and reads own request');
select extensions.ok(not public.is_current_user_discovery_founder(),'Advisor-only contact sender gains no Founder rights');

reset role; select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000005","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.network_contact_requests),0,'unrelated member cannot read messages');
select extensions.throws_ok($$select public.respond_network_contact((select id from contact_ids where key='accepted'),'accepted')$$,'42501','network_contact_response_forbidden','unrelated member cannot respond even with a known request id');

reset role; update public.network_memberships set status='suspended' where user_id='bd000000-0000-4000-8000-000000000004';
select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000004","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.network_contact_requests),0,'suspended sender loses request read access');
select extensions.throws_ok($$select public.request_network_contact('be000000-0000-4000-8000-000000000001','Suspended members cannot send requests.')$$,'42501','network_membership_required','suspended sender cannot create requests');

reset role; update public.network_listings set status='paused' where id='be000000-0000-4000-8000-000000000004';
select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000003","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select listing_title_snapshot from public.network_contact_requests where id=(select id from contact_ids where key='network_only')),'Investment opportunity','historical request context survives listing pause');

reset role; update public.network_memberships set status='suspended' where user_id='bd000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims','{"sub":"bd000000-0000-4000-8000-000000000002","role":"authenticated"}',true); set local role authenticated;
select extensions.is((select count(*)::int from public.network_contact_requests),0,'suspended recipient loses incoming request read access');
select extensions.throws_ok($$select public.respond_network_contact((select id from contact_ids where key='advisor'),'accepted')$$,'42501','network_membership_required','suspended recipient cannot respond');

reset role;
select extensions.ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='network_contact_requests' and column_name in ('email','private_email','response_message')),'contact projection contains no private email or extra conversation fields');
select extensions.is((select count(*)::int from public.relationships where user_a_id::text like 'bd000000-%' or user_b_id::text like 'bd000000-%'),0,'acceptance creates no Founder relationship');
select extensions.ok(
  not exists(select 1 from public.discovery_intro_requests where requester_user_id::text like 'bd000000-%' or recipient_user_id::text like 'bd000000-%')
  and not exists(select 1 from public.founder_team_members where user_id::text like 'bd000000-%'),
  'Network contact acceptance creates neither Discovery intro nor Founder team membership'
);
delete from auth.users where id='bd000000-0000-4000-8000-000000000003';
select extensions.ok(not exists(select 1 from public.network_contact_requests where sender_user_id='bd000000-0000-4000-8000-000000000003'),'sender account deletion cascades contact requests without orphans');
delete from auth.users where id='bd000000-0000-4000-8000-000000000002';
select extensions.ok(not exists(select 1 from public.network_contact_requests where recipient_user_id='bd000000-0000-4000-8000-000000000002'),'recipient account deletion cascades contact requests without orphans');

select * from extensions.finish();
rollback;
