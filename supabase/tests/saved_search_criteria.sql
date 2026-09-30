\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

-- ---------------------------------------------------------------------------
-- Eine gespeicherte Suche braucht ein echtes Kriterium
-- ---------------------------------------------------------------------------
--
-- Abschnitt 24 der FIND-Spec: "Kein Abonnement auf alle neuen Profile."
-- `alignment_dimensions` zaehlte bis zum 30.09.2026 als Kriterium und hat nie
-- gefiltert - eine Suche, in der NUR sie standen, war genau so ein Abonnement.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a1000001-0001-4001-8001-00000000000c',
   'authenticated', 'authenticated', 'ss-eine@example.com', '', now(), '{}', '{}', now(), now());

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a1000001-0001-4001-8001-00000000000c","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1. Ohne Kriterium geht nichts
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$insert into public.saved_searches (user_id, context, label, query)
    values ('a1000001-0001-4001-8001-00000000000c', 'discovery', 'Alles', '')$$,
  '23514',
  null,
  'eine Suche ohne Kriterium wird abgewiesen');

-- ---------------------------------------------------------------------------
-- 2. Die Matching-Praeferenzen allein sind kein Kriterium
-- ---------------------------------------------------------------------------
--
-- Sie sagen, WIE jemand passen soll - nicht, wonach gesucht wird. Eine Suche
-- nur mit ihnen traefe jedes neue Profil.
select extensions.throws_ok(
  $$insert into public.saved_searches (user_id, context, label, query, discovery_preferences)
    values ('a1000001-0001-4001-8001-00000000000c', 'discovery', 'Nur Themen', '',
            '[{"themeId":"decision_weighing","direction":"similar","importance":3}]')$$,
  '23514',
  null,
  'Matching-Praeferenzen allein reichen nicht');

-- ---------------------------------------------------------------------------
-- 3. Mit einem echten Kriterium geht es - und die Praeditionen kommen mit
-- ---------------------------------------------------------------------------
select extensions.lives_ok(
  $$insert into public.saved_searches
      (user_id, context, label, query, topics, discovery_preferences)
    values ('a1000001-0001-4001-8001-00000000000c', 'discovery', 'Tech in Berlin', '',
            '{tech}',
            '[{"themeId":"decision_weighing","direction":"similar","importance":3}]')$$,
  'mit einem echten Kriterium wird gespeichert');

select extensions.is(
  (select jsonb_array_length(discovery_preferences) from public.saved_searches
   where label = 'Tech in Berlin'),
  1,
  'die Matching-Praeferenz steht in der gespeicherten Suche');

select * from extensions.finish();

rollback;
