\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'disc-me@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'disc-near@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'disc-far@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000004-0004-4004-8004-000000000004',
   'authenticated', 'authenticated', 'disc-quiet@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles)
select id, array['founder'] from auth.users where email like 'disc-%@example.com'
on conflict (user_id) do update set roles = array['founder'];

-- Vier abgegebene Fragebogen derselben Fassung.
insert into public.assessments (id, user_id, module, instrument_id, submitted_at) values
  ('e1000010-0010-4010-8010-000000000010','e1000001-0001-4001-8001-000000000001','base','founder-alignment-v2', now()),
  ('e1000020-0020-4020-8020-000000000020','e1000002-0002-4002-8002-000000000002','base','founder-alignment-v2', now()),
  ('e1000030-0030-4030-8030-000000000030','e1000003-0003-4003-8003-000000000003','base','founder-alignment-v2', now()),
  ('e1000040-0040-4040-8040-000000000040','e1000004-0004-4004-8004-000000000004','base','founder-alignment-v2', now());

insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('e1000010-0010-4010-8010-000000000010','A01','F','{"scale":3}'),
  ('e1000010-0010-4010-8010-000000000010','A02','F','{"scale":3}'),
  -- eine Stufe daneben: gilt als aehnlich
  ('e1000020-0020-4020-8020-000000000020','A01','F','{"scale":4}'),
  ('e1000020-0020-4020-8020-000000000020','A02','F','{"scale":2}'),
  -- zwei Stufen daneben bei EINER Frage: das ganze Thema ist verschieden
  ('e1000030-0030-4030-8030-000000000030','A01','F','{"scale":3}'),
  ('e1000030-0030-4030-8030-000000000030','A02','F','{"scale":5}');

-- Der Stille hat ausdruecklich nicht geantwortet.
insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code) values
  ('e1000040-0040-4040-8040-000000000040','A01','F','withheld'),
  ('e1000040-0040-4040-8040-000000000040','A02','F','cannot_assess');

set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1. Ohne gewaehltes Thema passiert nichts
-- ---------------------------------------------------------------------------

select extensions.is(
  (select count(*)::int from public.discovery_topic_verdicts('e1000002-0002-4002-8002-000000000002')),
  0,
  'wer kein Thema gewaehlt hat, bekommt kein Urteil'
);

insert into public.discovery_alignment_topics (user_id, topic_key)
values ('e1000001-0001-4001-8001-000000000001', 'P_A');

-- ---------------------------------------------------------------------------
-- 2. Die drei Zustaende
-- ---------------------------------------------------------------------------

select extensions.is(
  (select state from public.discovery_topic_verdicts('e1000002-0002-4002-8002-000000000002')
   where topic_key = 'P_A'),
  'similar',
  'eine Stufe Unterschied gilt als aehnlich'
);

-- ALLE FRAGEN MUESSEN PASSEN, NICHT DIE MEHRHEIT. Bei A01 sind beide gleich,
-- bei A02 zwei Stufen auseinander - das Thema passt nicht.
select extensions.is(
  (select state from public.discovery_topic_verdicts('e1000003-0003-4003-8003-000000000003')
   where topic_key = 'P_A'),
  'different',
  'eine abweichende Frage genuegt fuer "unterschiedlich"'
);

-- WER NICHTS GESAGT HAT, WIRD NICHT AUSSORTIERT. Er ist nicht beurteilbar -
-- das ist etwas anderes als "passt nicht".
select extensions.is(
  (select state from public.discovery_topic_verdicts('e1000004-0004-4004-8004-000000000004')
   where topic_key = 'P_A'),
  'not_assessable',
  'wer ausgelassen hat, gilt nicht als unterschiedlich'
);

-- ---------------------------------------------------------------------------
-- 3. Die Basis wird genannt
-- ---------------------------------------------------------------------------

select extensions.is(
  (select basis_comparable from public.discovery_topic_verdicts('e1000002-0002-4002-8002-000000000002')
   where topic_key = 'P_A'),
  2,
  'die Basis nennt die gemeinsam beantworteten Fragen'
);

select extensions.is(
  (select basis_comparable from public.discovery_topic_verdicts('e1000004-0004-4004-8004-000000000004')
   where topic_key = 'P_A'),
  0,
  'und ist null, wenn nichts gemeinsam beantwortet wurde'
);

-- ---------------------------------------------------------------------------
-- 4. Was die Funktion NICHT herausgibt
-- ---------------------------------------------------------------------------
--
-- Vier Spalten, und keine davon traegt eine Antwort. Das ist die eigentliche
-- Zusage: Der Vergleich findet statt, ohne dass jemand fremde Antworten sieht.

-- Die Rueckgabespalten einer Funktion stehen NICHT in
-- information_schema.columns - die erste Fassung dieses Tests fragte dort und
-- verglich eine leere Liste. Sie waere gruen geworden, sobald man die
-- Erwartung mit angepasst haette.
select extensions.is(
  pg_get_function_result('public.discovery_topic_verdicts(uuid)'::regprocedure),
  'TABLE(topic_key text, rank integer, wish text, state text, fulfilment text, basis_comparable integer, basis_total integer)',
  'die Funktion gibt nur Urteil und Basis heraus, keine Antworten'
);

-- Und der Aufrufer sieht die Antworten des anderen weiterhin nicht.
select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'e1000030-0030-4030-8030-000000000030'),
  0,
  'die Antworten des anderen bleiben unsichtbar'
);

-- ---------------------------------------------------------------------------
-- 5. Grenzen
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$select * from public.discovery_topic_verdicts('e1000001-0001-4001-8001-000000000001')$$,
  '22023', null,
  'man vergleicht sich nicht mit sich selbst'
);

-- ---------------------------------------------------------------------------
-- 6. Alle Themen regelbar, mit Wunsch und eigener Reihenfolge
-- ---------------------------------------------------------------------------
--
-- Seit dem 28.09.2026 gibt es keine Obergrenze mehr. Was es auch nicht gibt,
-- ist eine Zahl ueber die Themen hinweg - sortiert wird lexikografisch nach
-- der Reihenfolge, die die Person selbst gesetzt hat.

insert into public.discovery_alignment_topics (user_id, topic_key, wish, rank) values
  ('e1000001-0001-4001-8001-000000000001', 'P_I', 'different', 2),
  ('e1000001-0001-4001-8001-000000000001', 'P_E', 'similar', 3),
  ('e1000001-0001-4001-8001-000000000001', 'P_U', 'similar', 4),
  ('e1000001-0001-4001-8001-000000000001', 'P_K', 'similar', 5);

select extensions.cmp_ok(
  (select count(*)::int from public.discovery_alignment_topics
   where user_id = 'e1000001-0001-4001-8001-000000000001'),
  '>', 3,
  'mehr als drei Themen sind erlaubt'
);

-- DER WUNSCH KANN AUCH UNTERSCHIED SEIN - und ist dann erfuellt, wenn sich die
-- beiden unterscheiden. Das ist eine Suchvorgabe, keine These darueber, was
-- guenstiger waere.
select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts('e1000002-0002-4002-8002-000000000002')
   where topic_key = 'P_A'),
  'met',
  'ein erfuellter Aehnlichkeitswunsch heisst met'
);

select extensions.throws_ok(
  $$insert into public.discovery_alignment_topics (user_id, topic_key, wish)
    values ('e1000001-0001-4001-8001-000000000001', 'P_T', 'egal')$$,
  '23514', null,
  'ein erfundener Wunsch wird abgelehnt'
);

reset role;

select * from extensions.finish();

rollback;
