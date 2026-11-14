\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- ---------------------------------------------------------------------------
-- Erinnerung nach dem Einstieg: Zustimmung, Auswahl, Stempel, Abmelden
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','erinnerung-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','erinnerung-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','erinnerung-c@example.com','',now(),'{}','{}',now(),now());

update public.person_core set onboarding_completed_at = now() - interval '10 days'
 where user_id in ('d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000003');

-- A: stimmt zu, Profil hat noch Luecken. B: stimmt nicht zu. C: stimmt zu, stimmt dann wieder ab.
set local role authenticated;
select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000001', true);
select extensions.lives_ok($$select public.set_onboarding_reminder(true)$$, 'a person can turn the reminder on for themselves');
select extensions.is((select wants_email from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000001'), true, 'turning it on records the consent');
select extensions.isnt((select consent_at from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000001'), null, 'and since when');

select extensions.throws_ok(
  $$update public.onboarding_reminders set wants_email = true where user_id = 'd1000000-0000-4000-8000-000000000002'$$,
  '42501',
  null,
  'people cannot write the table directly'
);

select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000003', true);
select extensions.lives_ok($$select public.set_onboarding_reminder(true)$$, 'C turns it on');
select extensions.lives_ok($$select public.set_onboarding_reminder(false)$$, 'and off again');
select extensions.is((select wants_email from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000003'), false, 'turning it off again clears it');
select extensions.isnt((select stopped_at from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000003'), null, 'and marks when');

select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000002', true);
select extensions.is((select count(*)::int from public.onboarding_reminders), 0, 'nobody reads another person''s row');
reset role;

-- Zustimmung vor zwei Tagen (A): Runde 1 faellig, Runde 2 noch nicht.
update public.onboarding_reminders set consent_at = now() - interval '2 days' where user_id = 'd1000000-0000-4000-8000-000000000001';

set local role service_role;
select extensions.is(
  (select count(*)::int from public.prepare_onboarding_reminders(50) where recipient_user_id = 'd1000000-0000-4000-8000-000000000001' and reminder_round = 1),
  1,
  'round 1 is due after a day, and only for the person who agreed'
);
select extensions.is(
  (select count(*)::int from public.prepare_onboarding_reminders(50)),
  0,
  'the stamp is set first: a second run the same day finds nothing'
);
reset role;

-- Runde 2 erst nach drei Tagen.
update public.onboarding_reminders set consent_at = now() - interval '4 days' where user_id = 'd1000000-0000-4000-8000-000000000001';
set local role service_role;
select extensions.is(
  (select count(*)::int from public.prepare_onboarding_reminders(50) where reminder_round = 2),
  1,
  'round 2 comes after three days'
);
select extensions.is(
  (select count(*)::int from public.prepare_onboarding_reminders(50)),
  0,
  'and then there is nothing left to send'
);
reset role;

-- Wer alles erledigt hat, bekommt keine Mail (und wird nicht gestempelt).
update public.onboarding_reminders set first_sent_at = null, second_sent_at = null, consent_at = now() - interval '2 days'
 where user_id = 'd1000000-0000-4000-8000-000000000001';
update public.person_core set headline = 'Gruenderin', bio = 'Ich baue Vertrieb auf.', expertise = array['Vertrieb'], remote_mode = 'remote'
 where user_id = 'd1000000-0000-4000-8000-000000000001';
set local role service_role;
select extensions.is(
  (select count(*)::int from public.prepare_onboarding_reminders(50) where recipient_user_id = 'd1000000-0000-4000-8000-000000000001'),
  case when exists (select 1 from public.profiles p where p.user_id = 'd1000000-0000-4000-8000-000000000001' and 'founder' = any (p.roles)) then 1 else 0 end,
  'with the profile filled in, a reminder only remains for an open workstyle questionnaire'
);
reset role;

select * from extensions.finish();
rollback;
