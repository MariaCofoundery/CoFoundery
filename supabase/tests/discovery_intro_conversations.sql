\set ON_ERROR_STOP on

-- KORRIGIERT AM 21.09.2026: Diese Suite ist nie gelaufen. Die Kennungen
-- begannen mit 'g', und 'g' ist keine Hexadezimalziffer - Postgres wies
-- schon die erste Einfuegung ab ("invalid input syntax for type uuid"), und
-- pgTAP meldete "planned N tests but ran 0". Weil `npm run ci:check` keine
-- Datenbanktests ausfuehrt, sah es niemand.
--
-- Wer Buchstaben als Praefix durchzaehlt, laeuft nach 'f' aus dem Zeichensatz.
-- Ersetzt durch '2'.

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

-- ---------------------------------------------------------------------------
-- Zwei Menschen in Find, ohne Connect-Mitgliedschaft. Genau das war vorher
-- der Ausschlussgrund: Der Nachrichtenbereich verlangte eine.
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','2a000000-0000-4000-8000-000000000001','authenticated','authenticated','find-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','2a000000-0000-4000-8000-000000000002','authenticated','authenticated','find-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','2a000000-0000-4000-8000-000000000003','authenticated','authenticated','find-c@example.com','',now(),'{}','{}',now(),now());

-- Ein AKTIVES Profil muss vollstaendig sein: Name, Ueberschrift, je eine
-- Rolle auf beiden Seiten, Verfuegbarkeit, und drei Angaben, die nicht auf
-- "noch offen" stehen duerfen (founder_discovery_profiles_active_complete_check).
insert into public.founder_discovery_profiles(
  user_id, status, display_name, headline, bio,
  own_roles, seeking_roles, availability_hours_per_week,
  commitment_level, venture_stage, venture_goal
)
values
('2a000000-0000-4000-8000-000000000001','active','Ada Findlay','Technische Gründerin',
 'Eine ausreichend lange Beschreibung für die Tests.',
 array['tech'], array['sales'], 20, 'full_time', 'idea_validating', 'venture_scale'),
('2a000000-0000-4000-8000-000000000002','active','Bo Marek','Vertrieb und Aufbau',
 'Eine ausreichend lange Beschreibung für die Tests.',
 array['sales'], array['tech'], 20, 'full_time', 'idea_validating', 'venture_scale');

select extensions.ok(
  not public.is_network_member('2a000000-0000-4000-8000-000000000001'),
  'the find-only user is deliberately not a connect member'
);

insert into public.discovery_intro_requests(id,requester_user_id,recipient_user_id,status,message)
values ('2b000000-0000-4000-8000-000000000001','2a000000-0000-4000-8000-000000000001','2a000000-0000-4000-8000-000000000002','pending','Lass uns reden.');

-- ---------------------------------------------------------------------------
-- Solange das Intro offen ist, gibt es kein Gespraech
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"2a000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.ensure_discovery_intro_conversation('2b000000-0000-4000-8000-000000000001')$$,
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
where id = '2b000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"2a000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.isnt(
  (select public.ensure_discovery_intro_conversation('2b000000-0000-4000-8000-000000000001')),
  null,
  'the recipient can open the conversation too'
);

set local request.jwt.claims = '{"sub":"2a000000-0000-4000-8000-000000000001","role":"authenticated"}';
-- ALS postgres GEZAEHLT: `network_conversations` hat fuer Angemeldete keine
-- Leseberechtigung - der Zugriff laeuft ueber die RPCs (das prueft
-- network_messaging_v01 ausdruecklich). Ein direkter Zaehlselect scheitert
-- deshalb an der Testmechanik und nicht an der Sache.
reset role;
select extensions.is(
  (select count(*)::int from public.network_conversations
   where discovery_intro_request_id = '2b000000-0000-4000-8000-000000000001'),
  1,
  'opening it twice does not create a second conversation'
);

-- Die Kennung in eine temporaere Tabelle, damit die folgenden Faelle sie ohne
-- Leserecht auf `network_conversations` benutzen koennen. Dasselbe Muster wie
-- `messaging_ids` in network_messaging_v01.
create temporary table intro_conversation_ids as
select id from public.network_conversations
where discovery_intro_request_id = '2b000000-0000-4000-8000-000000000001';
grant select on intro_conversation_ids to authenticated;

set local role authenticated;

-- Eine unbeteiligte Person nicht.
set local request.jwt.claims = '{"sub":"2a000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.ensure_discovery_intro_conversation('2b000000-0000-4000-8000-000000000001')$$,
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
set local request.jwt.claims = '{"sub":"2a000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.lives_ok(
  $$select public.send_network_message(
      (select id from intro_conversation_ids),
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
set local request.jwt.claims = '{"sub":"2a000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select unread_count::int from public.list_network_conversations()),
  1,
  'the other side sees it as unread'
);

-- ---------------------------------------------------------------------------
-- Eine Zusage laesst sich nicht zurueckdrehen - beendet wird anders
-- ---------------------------------------------------------------------------
--
-- KORRIGIERT AM 21.09.2026. Hier stand bis dahin der Fall "wird die Zusage
-- zurueckgenommen, endet der Zugriff" - mit einem Update von 'accepted' auf
-- 'declined'. Das Produkt verbietet das ausdruecklich: Sobald eine Anfrage
-- 'pending' verlassen hat, ist der Zustand endgueltig
-- (`discovery_intro_request_terminal_status`). Der Fall pruefte also etwas,
-- das es nicht gibt - und weil diese Suite wegen unguelitiger Kennungen nie
-- lief, fiel es nicht auf.
--
-- GEPRUEFT WIRD JETZT DIE ECHTE REGEL. Und der Weg, einen Kontakt zu beenden,
-- ist ein anderer: eine Blockierung. `send_network_message` prueft sie -
-- `can_use_network_conversation` nicht, und das ist konsistent mit dem Rest
-- des Produkts: Der VERLAUF bleibt lesbar, das Schreiben endet.
reset role;
select extensions.throws_ok(
  $$update public.discovery_intro_requests
    set status = 'declined'
    where id = '2b000000-0000-4000-8000-000000000001'$$,
  null,
  'discovery_intro_request_terminal_status',
  'eine angenommene Vorstellungsanfrage laesst sich nicht nachtraeglich absagen'
);

-- Beendet wird ueber eine Blockierung, und sie trifft das Schreiben.
insert into public.network_blocks(blocker_user_id, blocked_user_id)
values ('2a000000-0000-4000-8000-000000000002','2a000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub":"2a000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.send_network_message(
      (select id from intro_conversation_ids),
      'Doch noch etwas.')$$,
  '42501',
  null,
  'nach einer Blockierung wird nichts mehr hineingeschrieben'
);

-- Der Verlauf bleibt dabei lesbar - dieselbe Linie wie bei einer
-- Kontoloeschung: Worte, die geschrieben wurden, verschwinden nicht.
select extensions.is(
  (select count(*)::int from public.list_network_conversations()),
  1,
  'der Verlauf bleibt lesbar'
);

select * from extensions.finish(); rollback;
