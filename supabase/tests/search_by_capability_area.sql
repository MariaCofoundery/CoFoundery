\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

-- ---------------------------------------------------------------------------
-- Nach Faehigkeiten suchen - und nur bei denen, die sie freigegeben haben
-- ---------------------------------------------------------------------------
--
-- Entschieden von Maria am 30.09.2026: "Wer das verstecken moechte, der wird
-- halt nicht gezeigt." Geprueft wird deshalb beides: dass die Suche findet,
-- wer freigegeben hat, UND dass sie uebergeht, wer nicht.
--
-- Und weil die Funktion seit dieser Migration SECURITY DEFINER ist, stehen
-- ihre Huerden nicht mehr in der Zeilensicherheit: angemeldet, Founder-Rolle,
-- veroeffentlichtes Profil, nicht man selbst. Jede davon hat hier einen Fall.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a9000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'ca-sucht@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a9000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'ca-offen@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a9000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'ca-privat@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a9000004-0004-4004-8004-000000000004',
   'authenticated', 'authenticated', 'ca-kein-founder@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('a9000001-0001-4001-8001-000000000001', array['founder']),
  ('a9000002-0002-4002-8002-000000000002', array['founder']),
  ('a9000003-0003-4003-8003-000000000003', array['founder']),
  ('a9000004-0004-4004-8004-000000000004', array['advisor'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.founder_discovery_profiles
  (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
   remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal,
   expertise)
values
  ('a9000002-0002-4002-8002-000000000002', 'active', 'Offen', 'Zeigt die Bereiche', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating',
   'profitable_business', '{}'),
  ('a9000003-0003-4003-8003-000000000003', 'active', 'Privat', 'Haelt sie zurueck', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating',
   'profitable_business', '{}');

-- Beide haben denselben Bereich eingetragen. Der Unterschied ist allein die
-- Freigabe.
insert into public.person_core (user_id, display_name, capability_disclosure) values
  ('a9000002-0002-4002-8002-000000000002', 'Offen', 'areas'),
  ('a9000003-0003-4003-8003-000000000003', 'Privat', 'private')
on conflict (user_id) do update set capability_disclosure = excluded.capability_disclosure;

insert into public.person_capability_entries (user_id, area_id, application_level) values
  ('a9000002-0002-4002-8002-000000000002', 'b2b_sales', 4),
  ('a9000003-0003-4003-8003-000000000003', 'b2b_sales', 4);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a9000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1. Wer freigegeben hat, wird gefunden
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{b2b_sales}')
   where candidate_user_id = 'a9000002-0002-4002-8002-000000000002'),
  1,
  'freigegebene Bereiche werden gefunden');

-- ---------------------------------------------------------------------------
-- 2. Wer sie privat haelt, wird ueber sie NICHT gefunden
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{b2b_sales}')
   where candidate_user_id = 'a9000003-0003-4003-8003-000000000003'),
  0,
  'private Bereiche machen nicht auffindbar');

-- ---------------------------------------------------------------------------
-- 3. Ohne dieses Kriterium erscheinen beide
-- ---------------------------------------------------------------------------
--
-- `private` versteckt niemanden aus FIND - es versteckt nur die Faehigkeiten.
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}')
   where candidate_user_id in (
     'a9000002-0002-4002-8002-000000000002',
     'a9000003-0003-4003-8003-000000000003')),
  2,
  'ohne Faehigkeitssuche erscheinen beide');

-- ---------------------------------------------------------------------------
-- 4. Ein Bereich, den niemand eingetragen hat, findet niemanden
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{fundraising}')
   where candidate_user_id in (
     'a9000002-0002-4002-8002-000000000002',
     'a9000003-0003-4003-8003-000000000003')),
  0,
  'ein nicht eingetragener Bereich findet niemanden');

-- ---------------------------------------------------------------------------
-- 5. Das eigene Profil ist kein Treffer
-- ---------------------------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"a9000002-0002-4002-8002-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{b2b_sales}')
   where candidate_user_id = 'a9000002-0002-4002-8002-000000000002'),
  0,
  'man findet sich nicht selbst');

-- ---------------------------------------------------------------------------
-- 6. Ohne Founder-Rolle findet man nichts
-- ---------------------------------------------------------------------------
--
-- Stand bis zu dieser Migration in der Zeilensicherheit. Seit die Funktion
-- SECURITY DEFINER ist, steht die Bedingung ausdruecklich in ihr - und dieser
-- Fall haelt fest, dass sie wirkt.
set local request.jwt.claims =
  '{"sub":"a9000004-0004-4004-8004-000000000004","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}')),
  0,
  'ohne Founder-Rolle keine Treffer');

-- ---------------------------------------------------------------------------
-- 7. Nicht angemeldet findet man nichts
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '';
select extensions.throws_ok(
  $$select * from public.search_founder_discovery_profiles_v2(
      '{}', '{}', null, '{}', null, 12, 0, '{}')$$,
  '42501',
  null,
  'anonym ist die Suche nicht aufrufbar');

select * from extensions.finish();

rollback;
