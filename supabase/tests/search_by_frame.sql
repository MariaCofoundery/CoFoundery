\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

-- ---------------------------------------------------------------------------
-- Nach Suchstatus und Startzeitpunkt suchen
-- ---------------------------------------------------------------------------
--
-- Abschnitt 5.1 der FIND-Spec zaehlt beide zum praktischen Rahmen. Bis zum
-- 30.09.2026 standen sie nur AM PROFIL: Man konnte sagen, ab wann man
-- loslegen will, aber nicht danach suchen.
--
-- Drei Dinge haelt diese Datei fest:
--
--   Mehrere Werte sind ein ODER. "jetzt oder in den naechsten drei Monaten"
--   ist eine sinnvolle Suche.
--
--   Leer heisst kein Kriterium - auch die ohne Angabe erscheinen dann.
--
--   Wer nichts angegeben hat, faellt bei einer Suche danach heraus. Ein
--   leeres Feld ist keine Antwort, und "vielleicht passt es ja doch" waere
--   geraten.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'af000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'rahmen-sucht@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'af000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'rahmen-jetzt@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'af000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'rahmen-spaeter@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'af000004-0004-4004-8004-000000000004',
   'authenticated', 'authenticated', 'rahmen-ohne@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('af000001-0001-4001-8001-000000000001', array['founder']),
  ('af000002-0002-4002-8002-000000000002', array['founder']),
  ('af000003-0003-4003-8003-000000000003', array['founder']),
  ('af000004-0004-4004-8004-000000000004', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

-- Drei Profile, die sich nur im Rahmen unterscheiden: einer sucht jetzt und
-- will jetzt starten, einer ist offen fuer spaeter, und einer hat dazu nichts
-- gesagt.
insert into public.founder_discovery_profiles
  (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
   remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal,
   expertise, search_intent, start_horizon)
values
  ('af000002-0002-4002-8002-000000000002', 'active', 'Jetzt', 'Will jetzt los', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating',
   'profitable_business', '{}', 'ready_now', 'now'),
  ('af000003-0003-4003-8003-000000000003', 'active', 'Spaeter', 'Offen fuer spaeter', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating',
   'profitable_business', '{}', 'open_later', 'later_or_flexible'),
  ('af000004-0004-4004-8004-000000000004', 'active', 'Ohne', 'Sagt dazu nichts', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating',
   'profitable_business', '{}', null, null);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"af000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1. Ohne Kriterium erscheinen alle drei - auch der ohne Angabe
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}')
   where candidate_user_id in (
     'af000002-0002-4002-8002-000000000002',
     'af000003-0003-4003-8003-000000000003',
     'af000004-0004-4004-8004-000000000004')),
  3,
  'ohne Rahmenkriterium erscheinen alle');

-- ---------------------------------------------------------------------------
-- 2. Ein Suchstatus grenzt auf genau die ein, die ihn angegeben haben
-- ---------------------------------------------------------------------------
select extensions.is(
  (select array_agg(candidate_user_id::text order by candidate_user_id::text)
   from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{ready_now}', '{}')
   where candidate_user_id in (
     'af000002-0002-4002-8002-000000000002',
     'af000003-0003-4003-8003-000000000003',
     'af000004-0004-4004-8004-000000000004')),
  array['af000002-0002-4002-8002-000000000002'],
  'ein Suchstatus findet genau die, die ihn angegeben haben');

-- ---------------------------------------------------------------------------
-- 3. Mehrere Werte sind ein ODER
-- ---------------------------------------------------------------------------
--
-- "jetzt oder offen fuer spaeter" - beide, aber nicht der ohne Angabe.
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{ready_now,open_later}', '{}')
   where candidate_user_id in (
     'af000002-0002-4002-8002-000000000002',
     'af000003-0003-4003-8003-000000000003',
     'af000004-0004-4004-8004-000000000004')),
  2,
  'mehrere Suchstatus sind ein ODER');

-- ---------------------------------------------------------------------------
-- 4. Wer nichts angegeben hat, faellt bei einer Suche danach heraus
-- ---------------------------------------------------------------------------
--
-- Ein leeres Feld ist keine Antwort. Waere es eine, stuende in jeder
-- Rahmensuche jemand, der zum Rahmen nichts gesagt hat.
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}',
     '{ready_now,actively_exploring,open_later}', '{}')
   where candidate_user_id = 'af000004-0004-4004-8004-000000000004'),
  0,
  'ohne Angabe kein Treffer bei einer Rahmensuche');

-- ---------------------------------------------------------------------------
-- 5. Der Startzeitpunkt filtert eigenstaendig
-- ---------------------------------------------------------------------------
select extensions.is(
  (select array_agg(candidate_user_id::text order by candidate_user_id::text)
   from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{later_or_flexible}')
   where candidate_user_id in (
     'af000002-0002-4002-8002-000000000002',
     'af000003-0003-4003-8003-000000000003',
     'af000004-0004-4004-8004-000000000004')),
  array['af000003-0003-4003-8003-000000000003'],
  'der Startzeitpunkt filtert eigenstaendig');

-- ---------------------------------------------------------------------------
-- 6. Beide zusammen sind ein UND
-- ---------------------------------------------------------------------------
--
-- "sucht jetzt" UND "will erst spaeter starten" trifft auf niemanden zu -
-- zwei Kriterien schraenken einander ein und ergaenzen sich nicht.
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{ready_now}', '{later_or_flexible}')
   where candidate_user_id in (
     'af000002-0002-4002-8002-000000000002',
     'af000003-0003-4003-8003-000000000003',
     'af000004-0004-4004-8004-000000000004')),
  0,
  'Suchstatus und Startzeitpunkt sind ein UND');

select * from extensions.finish();

rollback;
