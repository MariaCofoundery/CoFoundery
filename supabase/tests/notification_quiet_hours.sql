\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- Feierabend (20270317120000). Die Zeiten werden relativ zu "jetzt" in UTC gesetzt, damit der Test
-- zu jeder Uhrzeit dasselbe pruefen kann.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000001','authenticated','authenticated','quiet1@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000002','authenticated','authenticated','quiet2@example.com','',now(),'{}','{}',now(),now());

select extensions.is(public.is_quiet_now('e7000000-0000-4000-8000-000000000001'), false, 'without settings nobody is quiet');

set local role authenticated;
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000001","role":"authenticated"}';
-- Ein Fenster um "jetzt" (UTC): eine Stunde davor bis eine Stunde danach.
select public.save_my_quiet_hours(true, ((now() at time zone 'UTC') - interval '1 hour')::time, ((now() at time zone 'UTC') + interval '1 hour')::time, '{}', 'UTC');
select extensions.is(public.am_i_quiet_now(), true, 'inside the window it is quiet');
select public.save_my_quiet_hours(true, ((now() at time zone 'UTC') + interval '1 hour')::time, ((now() at time zone 'UTC') + interval '2 hours')::time, '{}', 'UTC');
select extensions.is(public.am_i_quiet_now(), false, 'outside the window it is not');
-- Ueber Mitternacht: von zwei Stunden nach jetzt bis eine Stunde nach jetzt (also fast rund um die Uhr).
select public.save_my_quiet_hours(true, ((now() at time zone 'UTC') + interval '2 hours')::time, ((now() at time zone 'UTC') + interval '1 hour')::time, '{}', 'UTC');
select extensions.is(public.am_i_quiet_now(), true, 'a window across midnight works');
-- Ganzer Tag: heute.
select public.save_my_quiet_hours(true, null, null, array[extract(dow from now() at time zone 'UTC')::smallint], 'UTC');
select extensions.is(public.am_i_quiet_now(), true, 'a whole day is quiet');
select public.save_my_quiet_hours(false, null, null, array[extract(dow from now() at time zone 'UTC')::smallint], 'UTC');
select extensions.is(public.am_i_quiet_now(), false, 'switched off, the settings stay but nothing is quiet');

-- Schnellschalter.
select public.pause_my_notifications(now() + interval '8 hours');
select extensions.is(public.am_i_quiet_now(), true, 'quiet until tomorrow morning');
select extensions.throws_ok($$select public.pause_my_notifications(now() + interval '10 days')$$, '22023', 'quiet_hours_invalid', 'at most three days');
select extensions.throws_ok($$select public.save_my_quiet_hours(true, '18:00', '08:00', '{}', 'Mars/Olympus')$$, '22023', 'quiet_hours_invalid', 'an unknown time zone is refused');

-- Nur die eigenen Zeiten.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.notification_quiet_hours), 0, 'nobody reads the quiet hours of others');
select extensions.throws_ok($$select public.is_quiet_now('e7000000-0000-4000-8000-000000000001')$$, '42501', null, 'nor asks whether someone else is quiet');

select * from extensions.finish();
rollback;
