begin;
create extension if not exists pgtap with schema extensions;
select plan(19);
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at) values
 ('da5b0000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dash-admin@example.invalid',now(),now(),now()),
 ('da5b0000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dash-admin2@example.invalid',now(),now(),now()),
 ('da5b0000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dash-member@example.invalid',now(),now(),now());
insert into public.platform_admins(user_id) values('da5b0000-0000-4000-8000-000000000001'),('da5b0000-0000-4000-8000-000000000002');
insert into public.person_core(user_id,display_name) values('da5b0000-0000-4000-8000-000000000003','Absender') on conflict(user_id) do update set display_name='Absender';
insert into public.product_feedback(id,user_id,source,q1_value,q2_value,q3_value) values
 ('da5b0000-0000-4000-8000-0000000000f1','da5b0000-0000-4000-8000-000000000003','nav','a1','a2','a3'),
 ('da5b0000-0000-4000-8000-0000000000f2','da5b0000-0000-4000-8000-000000000003','workbook','b1','b2','b3');

-- Nicht-Admins
reset role; select set_config('request.jwt.claim.sub','da5b0000-0000-4000-8000-000000000003',true); set local role authenticated;
select throws_ok($$select * from public.admin_list_feedback('new',0)$$,'42501',null,'a member cannot read feedback');
select throws_ok($$select public.admin_dashboard_stats()$$,'42501',null,'a member cannot read the dashboard numbers');
select is(public.admin_attention_count(),0,'a member gets 0, not an error, from the attention count');
select throws_ok($$select * from public.admin_feedback_reads$$,'42501',null,'no direct access to read marks');

-- Admin eins
reset role; select set_config('request.jwt.claim.sub','da5b0000-0000-4000-8000-000000000001',true); set local role authenticated;
select is((select count(*) from public.admin_list_feedback('new',0)),2::bigint,'new feedback is new for an admin without read marks');
select is((select j->>'sender_name' from public.admin_list_feedback('all',0) j limit 1),'Absender','the sender name comes from the core profile');
select is((public.admin_feedback_counts()->>'new')::int,2,'the counter shows two new');
select lives_ok($$select public.admin_mark_feedback_read('da5b0000-0000-4000-8000-0000000000f1',true)$$,'an admin marks feedback read');
select is((public.admin_feedback_counts()->>'new')::int,1,'one is left new');
select is((select count(*) from public.admin_list_feedback('read',0)),1::bigint,'the read tab shows it');

-- Admin zwei sieht es weiter als neu: gelesen gilt pro Person
reset role; select set_config('request.jwt.claim.sub','da5b0000-0000-4000-8000-000000000002',true); set local role authenticated;
select is((public.admin_feedback_counts()->>'new')::int,2,'read marks are per admin');

-- Zaehler
reset role; select set_config('request.jwt.claim.sub','da5b0000-0000-4000-8000-000000000001',true); set local role authenticated;
select is(public.admin_attention_count(),1,'the attention count is new feedback plus open reports');
select ok(public.admin_dashboard_stats() ? 'accounts_week' and public.admin_dashboard_stats() ? 'cron','the stats carry the expected keys');
select lives_ok($$select public.admin_mark_reminder_done('db_dump',true)$$,'the dump reminder exists');

-- Highlight-Auswahlliste
reset role; select set_config('request.jwt.claim.sub','da5b0000-0000-4000-8000-000000000003',true); set local role authenticated;
select throws_ok($$select * from public.admin_list_highlight_candidates()$$,'42501',null,'only for admins');
reset role; select set_config('request.jwt.claim.sub','da5b0000-0000-4000-8000-000000000001',true); set local role authenticated;
select is((select count(*) from public.admin_list_highlight_candidates()),0::bigint,'without anyone who ticked the highlight box, there is nothing to pick');
reset role;
insert into public.network_memberships(user_id,status) values('da5b0000-0000-4000-8000-000000000003','active') on conflict(user_id) do update set status='active';
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at,expertise,highlightable) values('da5b0000-0000-4000-8000-000000000003','Absender','Headline text','A complete synthetic biography for the picker.',array['founder'],'active',now(),array['software'],true);
select set_config('request.jwt.claim.sub','da5b0000-0000-4000-8000-000000000001',true); set local role authenticated;
select is((select count(*) from public.admin_list_highlight_candidates() j where j->>'kind'='person'),1::bigint,'a person who agreed appears');

-- Herzschlag
reset role; set local role service_role;
select lives_ok($$select public.record_cron_heartbeat('privacy-retention',true)$$,'the service role records a cron heartbeat');
reset role; set local role authenticated;
select throws_ok($$select public.record_cron_heartbeat('privacy-retention',true)$$,'42501',null,'members cannot forge a heartbeat');
select * from finish(); rollback;
