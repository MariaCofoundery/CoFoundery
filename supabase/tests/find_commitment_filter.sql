\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

-- ---------------------------------------------------------------------------
-- Nach Einsatz suchen
-- ---------------------------------------------------------------------------
--
-- Der Einsatz stand am Profil und auf der Karte, aber man konnte nicht danach
-- suchen. Gleiche Regeln wie bei Suchstatus und Startzeitpunkt (search_by_frame):
-- mehrere Werte sind ein ODER, leer heisst kein Kriterium. Der Einsatz ist bei
-- jedem Profil gesetzt (not null, Standard "exploring"), es gibt also keinen
-- "ohne Angabe"-Fall.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'ae000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'einsatz-sucht@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'ae000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'einsatz-voll@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'ae000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'einsatz-allin@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'ae000004-0004-4004-8004-000000000004',
   'authenticated', 'authenticated', 'einsatz-neben@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('ae000001-0001-4001-8001-000000000001', array['founder']),
  ('ae000002-0002-4002-8002-000000000002', array['founder']),
  ('ae000003-0003-4003-8003-000000000003', array['founder']),
  ('ae000004-0004-4004-8004-000000000004', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.founder_discovery_profiles
  (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
   remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal,
   expertise)
values
  ('ae000002-0002-4002-8002-000000000002', 'active', 'Voll', 'Vollzeit', '-',
   '{tech}', '{sales}', '{}', 'remote', 40, 'full_time', 'idea_validating', 'profitable_business', '{}'),
  ('ae000003-0003-4003-8003-000000000003', 'active', 'AllIn', 'All-in', '-',
   '{tech}', '{sales}', '{}', 'remote', 50, 'all_in', 'idea_validating', 'profitable_business', '{}'),
  ('ae000004-0004-4004-8004-000000000004', 'active', 'Neben', 'Nebenbei', '-',
   '{tech}', '{sales}', '{}', 'remote', 10, 'side_project', 'idea_validating', 'profitable_business', '{}');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"ae000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}', '{}')
   where candidate_user_id in (
     'ae000002-0002-4002-8002-000000000002',
     'ae000003-0003-4003-8003-000000000003',
     'ae000004-0004-4004-8004-000000000004')),
  3,
  'ohne Einsatzkriterium erscheinen alle');

select extensions.is(
  (select array_agg(candidate_user_id::text)
   from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}', '{side_project}')
   where candidate_user_id in (
     'ae000002-0002-4002-8002-000000000002',
     'ae000003-0003-4003-8003-000000000003',
     'ae000004-0004-4004-8004-000000000004')),
  array['ae000004-0004-4004-8004-000000000004'],
  'ein Einsatz findet genau die mit diesem Einsatz');

select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}', '{full_time,all_in}')
   where candidate_user_id in (
     'ae000002-0002-4002-8002-000000000002',
     'ae000003-0003-4003-8003-000000000003',
     'ae000004-0004-4004-8004-000000000004')),
  2,
  'mehrere Einsatzstufen sind ein ODER (Vollzeit = full_time oder all_in)');

-- Die bisherigen zehn Argumente gehen weiter: das elfte hat einen Standard.
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}')
   where candidate_user_id in (
     'ae000002-0002-4002-8002-000000000002',
     'ae000003-0003-4003-8003-000000000003',
     'ae000004-0004-4004-8004-000000000004')),
  3,
  'ein Aufruf mit den bisherigen zehn Argumenten filtert nicht nach Einsatz');

select * from extensions.finish();
rollback;
