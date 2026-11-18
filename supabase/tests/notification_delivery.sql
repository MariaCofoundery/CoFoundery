\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

-- Rhythmus der Benachrichtigungen (20270510120000).
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000001','authenticated','authenticated','deliv1@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000002','authenticated','authenticated','deliv2@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000003','authenticated','authenticated','deliv3@example.com','',now(),'{}','{}',now(),now());

-- Ohne Einstellung: gebuendelt. Die erste Mitteilung geht raus, die naechsten ersetzen sie.
select extensions.is((select action from public.claim_push_slot('e8000000-0000-4000-8000-000000000001')), 'send', 'first push of a window is sent');
select extensions.is((select action from public.claim_push_slot('e8000000-0000-4000-8000-000000000001')), 'join', 'second one joins the window');
select extensions.is((select bundled_count from public.claim_push_slot('e8000000-0000-4000-8000-000000000001')), 3, 'third one is counted');

-- Ein abgelaufenes Fenster beginnt neu.
update public.push_bundle_windows set window_started_at = now() - interval '4 hours' where user_id = 'e8000000-0000-4000-8000-000000000001';
select extensions.is((select action from public.claim_push_slot('e8000000-0000-4000-8000-000000000001')), 'send', 'an expired window starts again with a single push');
select extensions.is((select bundled_count from public.claim_push_slot('e8000000-0000-4000-8000-000000000001')), 2, 'and counts from one');

-- Die Zahl am Symbol folgt den ungelesenen Hinweisen.
insert into public.in_app_notices(recipient_user_id, kind, subject_id, path) values
('e8000000-0000-4000-8000-000000000001','contact_request','e8100000-0000-4000-8000-000000000001','/connect'),
('e8000000-0000-4000-8000-000000000001','org_task_assigned','e8100000-0000-4000-8000-000000000002','/advisor/teamraum'),
('e8000000-0000-4000-8000-000000000001','org_task_assigned','e8100000-0000-4000-8000-000000000003','/advisor/teamraum');
select extensions.is((select badge_count from public.claim_push_slot('e8000000-0000-4000-8000-000000000001')), 3, 'badge counts unread notices');

-- Einstellen: nur die eigene Zeile, nur bekannte Werte.
set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.save_my_notification_delivery('quiet', false);
select extensions.is((select mode from public.notification_delivery_prefs), 'quiet', 'the own setting is saved');
select extensions.throws_ok($$select public.save_my_notification_delivery('loud', true)$$, '22023', 'delivery_invalid', 'unknown mode is refused');
select extensions.is((select count(*)::int from public.notification_delivery_prefs), 1, 'only the own row is visible');
select extensions.throws_ok($$select public.claim_push_slot('e8000000-0000-4000-8000-000000000002')$$, '42501', null, 'signed-in users cannot claim slots');
select extensions.throws_ok($$select * from public.prepare_notification_digests(10)$$, '42501', null, 'nor prepare digests');
reset role;

select extensions.is((select action from public.claim_push_slot('e8000000-0000-4000-8000-000000000002')), 'skip', 'quiet means no push');

set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.save_my_notification_delivery('instant', true);
reset role;
select extensions.is((select action from public.claim_push_slot('e8000000-0000-4000-8000-000000000003')), 'send', 'instant sends each one');

-- Morgenuebersicht: gebuendelt nimmt nur Arten, die vorher eine Mail ausgeloest haetten.
update public.in_app_notices set created_at = now() - interval '1 hour' where recipient_user_id = 'e8000000-0000-4000-8000-000000000001';
select extensions.is(
  (select counts from public.prepare_notification_digests(50) where user_id = 'e8000000-0000-4000-8000-000000000001'),
  '{"contact_request": 1}'::jsonb,
  'bundled digest holds only kinds that used to have a mail'
);
select extensions.is(
  (select count(*)::int from public.prepare_notification_digests(50) where user_id = 'e8000000-0000-4000-8000-000000000001'),
  0,
  'a second run finds nothing: the digest is stamped'
);

-- Ruhig: alle ungelesenen Arten, ausser abbestellten.
insert into public.in_app_notices(recipient_user_id, kind, subject_id, path) values
('e8000000-0000-4000-8000-000000000002','contact_request','e8100000-0000-4000-8000-000000000011','/connect'),
('e8000000-0000-4000-8000-000000000002','org_task_assigned','e8100000-0000-4000-8000-000000000012','/advisor/teamraum'),
('e8000000-0000-4000-8000-000000000002','org_task_comment','e8100000-0000-4000-8000-000000000013','/advisor/teamraum');
select extensions.is(
  (select counts from public.prepare_notification_digests(50) where user_id = 'e8000000-0000-4000-8000-000000000002'),
  '{"contact_request": 1, "org_task_assigned": 1, "org_task_comment": 1}'::jsonb,
  'quiet digest holds every unread kind'
);

insert into public.in_app_notices(recipient_user_id, kind, subject_id, path) values
('e8000000-0000-4000-8000-000000000003','contact_request','e8100000-0000-4000-8000-000000000021','/connect');
select extensions.is((select count(*)::int from public.prepare_notification_digests(50) where user_id = 'e8000000-0000-4000-8000-000000000003'), 0, 'instant users get no digest: every mail went out on its own');

select * from extensions.finish();
rollback;
