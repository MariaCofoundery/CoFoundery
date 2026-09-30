\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

-- ---------------------------------------------------------------------------
-- Die eigene Suche ist privat
-- ---------------------------------------------------------------------------
--
-- Spec, Abschnitt 22: "Private Matching-Praeferenzen werden nicht oeffentlich
-- angezeigt." Geprueft wird deshalb nicht nur, dass die eigenen Zeilen lesbar
-- sind, sondern vor allem, dass fremde es NICHT sind.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'dp-eine@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'dp-andere@example.com', '', now(), '{}', '{}', now(), now());

insert into public.discovery_preference_sets (id, user_id, founder_profile_instrument_id)
values
  ('d1500001-0001-4001-8001-00000000000f', 'd1000001-0001-4001-8001-000000000001',
   'founder-profile-v1'),
  ('d1500002-0002-4002-8002-00000000000f', 'd1000002-0002-4002-8002-000000000002',
   'founder-profile-v1');

insert into public.discovery_theme_preferences (preference_set_id, theme_id, direction, importance)
values
  ('d1500001-0001-4001-8001-00000000000f', 'decision_weighing', 'similar', 3),
  ('d1500002-0002-4002-8002-00000000000f', 'experimentation', 'complementary', 2);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"d1000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1./2. Die eigene Auswahl ist lesbar, die fremde nicht
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.discovery_preference_sets),
  1,
  'nur die eigene Suche ist sichtbar');

select extensions.is(
  (select count(*)::int from public.discovery_theme_preferences),
  1,
  'nur die eigenen Themen sind sichtbar');

-- ---------------------------------------------------------------------------
-- 3. In eine fremde Suche laesst sich nichts schreiben
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$insert into public.discovery_theme_preferences
      (preference_set_id, theme_id, direction, importance)
    values ('d1500002-0002-4002-8002-00000000000f', 'open_questions', 'similar', 1)$$,
  '42501',
  null,
  'fremde Suchen bleiben zu');

-- ---------------------------------------------------------------------------
-- 4. "egal" und ein Gewicht schliessen sich aus
-- ---------------------------------------------------------------------------
--
-- Zwei Angaben, die sich widersprechen, koennen aus einer halb ausgefuellten
-- Maske entstehen. Wer sie speichern koennte, muesste spaeter raten, welche
-- gilt.
select extensions.throws_ok(
  $$insert into public.discovery_theme_preferences
      (preference_set_id, theme_id, direction, importance)
    values ('d1500001-0001-4001-8001-00000000000f', 'open_questions', 'neutral', 2)$$,
  '23514',
  null,
  'neutral mit Gewicht wird abgewiesen');

select extensions.throws_ok(
  $$insert into public.discovery_theme_preferences
      (preference_set_id, theme_id, direction, importance)
    values ('d1500001-0001-4001-8001-00000000000f', 'open_questions', 'similar', 0)$$,
  '23514',
  null,
  'eine Richtung ohne Gewicht wird abgewiesen');

-- ---------------------------------------------------------------------------
-- 5. Das Gewicht bleibt zwischen 0 und 3
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$insert into public.discovery_theme_preferences
      (preference_set_id, theme_id, direction, importance)
    values ('d1500001-0001-4001-8001-00000000000f', 'open_questions', 'similar', 4)$$,
  '23514',
  null,
  'ein viertes Gewicht gibt es nicht');

-- ---------------------------------------------------------------------------
-- 6. Ein Satz je Person und Fassung
-- ---------------------------------------------------------------------------
--
-- Zwei Saetze zu derselben Fassung waeren zwei Suchen, und keine Regel sagt,
-- welche gilt. Eine NEUE Fassung bekommt dagegen einen eigenen Satz - die
-- alte Auswahl bleibt lesbar (Spec, Abschnitt 28).
select extensions.throws_ok(
  $$insert into public.discovery_preference_sets (user_id, founder_profile_instrument_id)
    values ('d1000001-0001-4001-8001-000000000001', 'founder-profile-v1')$$,
  '23505',
  null,
  'eine zweite Suche zur selben Fassung wird abgewiesen');

select * from extensions.finish();

rollback;
