\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

-- ---------------------------------------------------------------------------
-- Der Zeitplan, der ohne Zutun senden darf
-- ---------------------------------------------------------------------------
--
-- GEBAUT AM 21.09.2026: "Dann machen wir das mit Push-Nachrichten. Aber
-- E-Mail waere eigentlich auch gut, wenn man das aber ausstellt."
--
-- Hier stehen die Zusagen, die diese Mechanik gibt - und zwar als Faelle, nicht
-- als Prosa:
--
--   Nur der Zeitplan darf fuer fremde Menschen handeln.
--   Die Mail geht nur mit ausdruecklicher Zustimmung hinaus.
--   Wer abbestellt hat, wird nicht gestempelt - sonst waere ein spaeteres
--   Einschalten fuer alles Alte stumm.
--   Derselbe Schwung wird nie zweimal gemeldet.
--
-- ALLE ABFRAGEN FILTERN AUF DIE TESTPERSONEN. Die Funktion arbeitet ueber alle
-- aktiven Profile der Datenbank; in einer Entwicklungsdatenbank liegen da noch
-- andere, und ohne Filter wuerde dieser Test von deren Zahl abhaengen.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','sucht-notify@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','bietet-notify@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','abbestellt@example.com','',now(),'{}','{}',now(),now());

insert into public.network_memberships(user_id, status)
select id, 'active' from auth.users
where id in (
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003'
)
on conflict (user_id) do update set status = 'active';

insert into public.network_profiles(
  user_id, display_name, headline, bio, network_roles, expertise, industries, status, published_at
) values
('d1000000-0000-4000-8000-000000000001','Nina','Baut ein Magazin','Macht ein unabhaengiges Magazin fuer Stadtthemen.',
 array['founder'], array['Layout'], array['Medien'], 'active', now()),
('d1000000-0000-4000-8000-000000000002','Ole','Macht Vertrieb','Hilft kleinen Verlagen beim Vertrieb.',
 array['founder'], array['Vertrieb'], array['Medien'], 'active', now()),
('d1000000-0000-4000-8000-000000000003','Ruth','Will Ruhe','Moechte in Ruhe gelassen werden, bleibt aber auffindbar.',
 array['founder'], array['Layout'], array['Medien'], 'active', now())
on conflict (user_id) do update set status = excluded.status;

-- Nicht vorschlagbar: Sonst wuerden sich die drei gegenseitig als Personen
-- vorschlagen und die Zahlen unten haengen von der Reihenfolge ab.
update public.network_profiles set suggestable = false
where user_id in (
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000002',
  'd1000000-0000-4000-8000-000000000003'
);

-- Oles Angebot passt zu Ninas und Ruths Branche.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'd2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002',
  'offering','expertise','Vertrieb fuer kleine Magazine',
  'Ich bringe kleine Magazine in den Handel und kenne die Grossisten.',
  array['vertrieb'], array['medien'],
  'active', now(), now() + interval '30 days'
);

-- Ruth hat diese Art abbestellt.
insert into public.notification_opt_outs(user_id, kind)
values ('d1000000-0000-4000-8000-000000000003', 'connect_suggestions');

-- ---------------------------------------------------------------------------
-- Wer darf das ueberhaupt?
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$select public.prepare_suggestion_notifications(25)$$,
  '42501',
  null,
  'an authenticated user cannot run the schedule'
);

-- Und niemand kann eine Vorschlagsliste fuer eine FREMDE Person fuellen.
select extensions.throws_ok(
  $$select public.generate_connect_suggestions_for('d1000000-0000-4000-8000-000000000002', 3)$$,
  '42501',
  null,
  'nobody fills the suggestion list of somebody else'
);

-- Die eigene Fassung geht weiter - sie ist jetzt nur eine Weiterleitung.
select extensions.lives_ok(
  $$select public.generate_connect_suggestions(0)$$,
  'the version without a user id still works for the caller'
);

-- ---------------------------------------------------------------------------
-- Der Lauf
-- ---------------------------------------------------------------------------
set local role postgres;
delete from public.connect_suggestions
where recipient_user_id in (
  'd1000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000003'
);

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select extensions.is(
  (select count(*)::int from public.prepare_suggestion_notifications(200) as result
   where result.recipient_user_id = 'd1000000-0000-4000-8000-000000000001'),
  1,
  'the schedule finds something for Nina and reports it once'
);

set local role postgres;
select extensions.is(
  (select count(*)::int from public.connect_suggestions
   where recipient_user_id = 'd1000000-0000-4000-8000-000000000001'
     and notified_at is not null),
  1,
  'and the row is stamped, so a second run cannot take the same batch'
);

-- WER ABBESTELLT HAT, wird nicht gestempelt: Ein spaeteres Einschalten soll
-- nicht an alten Zeilen haengen bleiben.
select extensions.ok(
  exists (
    select 1 from public.connect_suggestions
    where recipient_user_id = 'd1000000-0000-4000-8000-000000000003'
      and notified_at is null
  ),
  'whoever unsubscribed keeps unstamped rows - switching on later still works'
);

-- Gesucht wurde trotzdem fuer beide, sonst waere morgen dieselbe Person die
-- aelteste.
select extensions.is(
  (select count(*)::int from public.network_profiles
   where user_id in (
     'd1000000-0000-4000-8000-000000000001',
     'd1000000-0000-4000-8000-000000000003'
   )
   and suggestions_checked_at is not null),
  2,
  'the schedule notes that it looked - even where it found nothing to announce'
);

-- ---------------------------------------------------------------------------
-- Zweimal ist einmal zu viel
-- ---------------------------------------------------------------------------
set local role service_role;
select extensions.is(
  (select count(*)::int from public.prepare_suggestion_notifications(200) as result
   where result.recipient_user_id = 'd1000000-0000-4000-8000-000000000001'),
  0,
  'the same batch is never announced twice'
);

-- ---------------------------------------------------------------------------
-- Die Mail nur mit Zustimmung
-- ---------------------------------------------------------------------------
set local role postgres;
select extensions.ok(
  not public.wants_email_channel('d1000000-0000-4000-8000-000000000001', 'connect_suggestions'),
  'without consent no mail goes out - the absence of a row means no'
);

-- Die Mitteilung aufs Geraet ist davon unberuehrt: Sie setzt eine Erlaubnis im
-- Browser voraus, die dieser Mensch selbst erteilt hat.
select extensions.ok(
  public.wants_email_notification('d1000000-0000-4000-8000-000000000001', 'connect_suggestions'),
  'the notification on the device is on - a browser permission was given for it'
);

insert into public.notification_opt_ins(user_id, kind)
values ('d1000000-0000-4000-8000-000000000001', 'connect_suggestions_email');

select extensions.ok(
  public.wants_email_channel('d1000000-0000-4000-8000-000000000001', 'connect_suggestions'),
  'with consent it does'
);

-- UND DER ALLGEMEINE SCHALTER STICHT DIE ZUSTIMMUNG. Wer die Art ganz
-- abbestellt, bekommt auch keine Mail - sonst haette das Abbestellen eine
-- Ausnahme, von der niemand weiss.
insert into public.notification_opt_outs(user_id, kind)
values ('d1000000-0000-4000-8000-000000000001', 'connect_suggestions');

select extensions.ok(
  not public.wants_email_channel('d1000000-0000-4000-8000-000000000001', 'connect_suggestions'),
  'unsubscribing the kind beats the consent for the mail'
);

-- Fremde Zustimmungen liest niemand.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.notification_opt_ins),
  0,
  'nobody reads the consents of somebody else'
);

select * from extensions.finish();
rollback;
