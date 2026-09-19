\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Zwei Menschen in Find, ohne Connect-Mitgliedschaft. Genau das war vorher
-- der Ausschlussgrund: Der Nachrichtenbereich verlangte eine.
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ga000000-0000-4000-8000-000000000001','authenticated','authenticated','find-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ga000000-0000-4000-8000-000000000002','authenticated','authenticated','find-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ga000000-0000-4000-8000-000000000003','authenticated','authenticated','find-c@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_discovery_profiles(user_id,status,display_name,headline,bio)
values
('ga000000-0000-4000-8000-000000000001','active','Ada Findlay','Technische Gründerin','Eine ausreichend lange Beschreibung für die Tests.'),
('ga000000-0000-4000-8000-000000000002','active','Bo Marek','Vertrieb und Aufbau','Eine ausreichend lange Beschreibung für die Tests.');

select extensions.ok(
  not public.is_network_member('ga000000-0000-4000-8000-000000000001'),
  'the find-only user is deliberately not a connect member'
);

insert into public.discovery_intro_requests(id,requester_user_id,recipient_user_id,status,message)
values ('gb000000-0000-4000-8000-000000000001','ga000000-0000-4000-8000-000000000001','ga000000-0000-4000-8000-000000000002','pending','Lass uns reden.');

-- ---------------------------------------------------------------------------
-- Solange das Intro offen ist, gibt es kein Gespraech
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"ga000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.ensure_discovery_intro_conversation('gb000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'a pending intro opens no conversation'
);

-- ---------------------------------------------------------------------------
-- Angenommen: beide Seiten duerfen eroeffnen, und es bleibt EINES
-- ---------------------------------------------------------------------------
reset role;
update public.discovery_intro_requests
set status = 'accepted', responded_at = now()
where id = 'gb000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"ga000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.isnt(
  (select public.ensure_discovery_intro_conversation('gb000000-0000-4000-8000-000000000001')),
  null,
  'the recipient can open the conversation too'
);

set local request.jwt.claims = '{"sub":"ga000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.network_conversations
   where discovery_intro_request_id = 'gb000000-0000-4000-8000-000000000001'),
  1,
  'opening it twice does not create a second conversation'
);

-- Eine unbeteiligte Person nicht.
set local request.jwt.claims = '{"sub":"ga000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.ensure_discovery_intro_conversation('gb000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'a stranger cannot open somebody else''s conversation'
);

-- ---------------------------------------------------------------------------
-- Schreiben und lesen - OHNE Connect-Mitgliedschaft
-- ---------------------------------------------------------------------------
-- Das war die eigentliche Sperre: Fuenf Funktionen begannen mit
-- `not is_network_member(...) -> raise`. Ein Find-Nutzer kam an sein eigenes
-- Gespraech nicht heran.
set local request.jwt.claims = '{"sub":"ga000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.lives_ok(
  $$select public.send_network_message(
      (select id from public.network_conversations
       where discovery_intro_request_id = 'gb000000-0000-4000-8000-000000000001'),
      'Hallo, ich habe dein Profil gesehen.')$$,
  'a find-only user can write in their own conversation'
);

select extensions.is(
  (select count(*)::int from public.list_network_conversations()),
  1,
  'and sees it in the shared inbox'
);

select extensions.is(
  (select origin from public.list_network_conversations()),
  'discovery_intro',
  'the inbox says where the conversation came from'
);

-- Der Name kommt aus dem Discovery-Profil. Vorher stand dort nur das
-- Connect-Profil - ein Find-Nutzer haette als "Ehemaliges Mitglied" gegolten.
select extensions.is(
  (select counterpart_display_name from public.list_network_conversations()),
  'Bo Marek',
  'the counterpart name comes from the discovery profile, not the connect one'
);

-- Die Gegenseite sieht es ebenfalls, und zwar ungelesen.
set local request.jwt.claims = '{"sub":"ga000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select unread_count::int from public.list_network_conversations()),
  1,
  'the other side sees it as unread'
);

-- ---------------------------------------------------------------------------
-- Wird die Zusage zurueckgenommen, endet der Zugriff
-- ---------------------------------------------------------------------------
reset role;
update public.discovery_intro_requests
set status = 'declined'
where id = 'gb000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"ga000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is_empty(
  $$select conversation_id from public.list_network_conversations()$$,
  'withdrawing the intro ends access without deleting anything'
);

-- Und es laesst sich auch nichts mehr hineinschreiben.
select extensions.throws_ok(
  $$select public.send_network_message(
      (select id from public.network_conversations
       where discovery_intro_request_id = 'gb000000-0000-4000-8000-000000000001'),
      'Doch noch etwas.')$$,
  '42501',
  null,
  'and no further message can be written'
);

select * from extensions.finish(); rollback;
