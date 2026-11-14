\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(18);

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
select extensions.lives_ok($$select public.set_onboarding_reminder(true, 'later')$$, 'a person can turn the reminder on for themselves');
select extensions.is((select wants_email from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000001'), true, 'turning it on records the consent');
select extensions.isnt((select consent_at from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000001'), null, 'and since when');

select extensions.throws_ok(
  $$update public.onboarding_reminders set wants_email = true where user_id = 'd1000000-0000-4000-8000-000000000002'$$,
  '42501',
  null,
  'people cannot write the table directly'
);

select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000003', true);
select extensions.lives_ok($$select public.set_onboarding_reminder(true, 'later')$$, 'C turns it on');
select extensions.lives_ok($$select public.set_onboarding_reminder(false, 'later')$$, 'and off again');
select extensions.is((select wants_email from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000003'), false, 'turning it off again clears it');
select extensions.isnt((select stopped_at from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000003'), null, 'and marks when');

select set_config('request.jwt.claim.sub','d1000000-0000-4000-8000-000000000002', true);
select extensions.is((select count(*)::int from public.onboarding_reminders), 0, 'nobody reads another person''s row');
select extensions.lives_ok($$select public.set_onboarding_reminder(false, 'midway')$$, 'a decline can be recorded too');
select extensions.is((select wants_email from public.onboarding_reminders where user_id = 'd1000000-0000-4000-8000-000000000002'), false, 'a decline is a row without consent, so the question does not come back');
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

-- Profil vollstaendig; Advisor allein hat hier nichts Ablesbares offen: keine Mail (und kein Stempel).
update public.onboarding_reminders set first_sent_at = null, second_sent_at = null, consent_at = now() - interval '2 days'
 where user_id = 'd1000000-0000-4000-8000-000000000001';
update public.person_core set headline = 'Gruenderin', bio = 'Ich baue Vertrieb auf.', expertise = array['Vertrieb'], remote_mode = 'remote',
       interests = array['advise']
 where user_id = 'd1000000-0000-4000-8000-000000000001';
set local role service_role;
select extensions.is(
  (select count(*)::int from public.prepare_onboarding_reminders(50) where recipient_user_id = 'd1000000-0000-4000-8000-000000000001'),
  0,
  'with the profile filled in and only the advisor area chosen, nothing is left to remind about'
);
reset role;

-- Find gewaehlt, noch kein Find-Profil: der Knopf fuehrt dorthin.
update public.person_core set interests = array['find'] where user_id = 'd1000000-0000-4000-8000-000000000001';
set local role service_role;
select extensions.is(
  (select next_step from public.prepare_onboarding_reminders(50) where recipient_user_id = 'd1000000-0000-4000-8000-000000000001'),
  'find',
  'with Find chosen and no Find profile yet, the button leads there'
);
reset role;

-- Align gewaehlt und der Fragebogen offen: die Erinnerung kommt, mit den gewaehlten Bereichen.
update public.onboarding_reminders set first_sent_at = null where user_id = 'd1000000-0000-4000-8000-000000000001';
update public.person_core set interests = array['align', 'find'] where user_id = 'd1000000-0000-4000-8000-000000000001';
set local role service_role;
select extensions.is(
  (select next_step || ':' || array_to_string(areas, ',') from public.prepare_onboarding_reminders(50) where recipient_user_id = 'd1000000-0000-4000-8000-000000000001'),
  'workstyle:align,find',
  'with Align chosen and the questionnaire open, the button leads there, and the mail knows the chosen areas'
);
reset role;

select * from extensions.finish();
rollback;
