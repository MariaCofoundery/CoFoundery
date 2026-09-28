\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- ---------------------------------------------------------------------------
-- Die Formate, die v2.1 gebracht hat
-- ---------------------------------------------------------------------------
--
-- Zwei dieser Regeln haetten vor dem 28.09.2026 eine gueltige Antwort
-- abgewiesen: G02a passte nicht in die Blockform, und ordinal_choice stand
-- nicht in der Formatliste. Das waere erst beim ersten Menschen aufgefallen,
-- der den Fragebogen ausfuellt. Deshalb steht beides hier zuerst.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a2100001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'v21-owner@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('a2100001-0001-4001-8001-000000000001', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id)
values ('a2100010-0010-4010-8010-000000000010',
        'a2100001-0001-4001-8001-000000000001', 'base', 'founder-compatibility-v1');

-- ---------------------------------------------------------------------------
-- 1. Der geteilte Block
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'G02a', 'single_choice',
            '{"optionId": "G02a_o1"}'::jsonb)$$,
  'G02a wird angenommen - vor v2.1 haette die Blockform das abgewiesen');

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'G02b', 'multi_choice',
            '{"optionIds": ["G02b_o1", "G02b_o3"]}'::jsonb)$$,
  'G02b wird angenommen');

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'G02ab', 'single_choice',
            '{"optionId": "x"}'::jsonb)$$,
  '23514',
  null,
  'zwei Buchstaben sind keine Blockkennung');

-- ---------------------------------------------------------------------------
-- 2. Ordinal ist ein eigenes Format
-- ---------------------------------------------------------------------------
--
-- Getrennt von single_choice, weil der Unterschied spaeter zaehlt: Bei
-- geordneten Stufen darf man von mehr und weniger sprechen, bei einer
-- Handlungswahl nicht.

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'A01', 'ordinal_choice',
            '{"optionId": "A01_o4"}'::jsonb)$$,
  'ordinal_choice wird angenommen');

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'L01', 'free_text_repeatable',
            '{"entries": [{"entryId": "e1", "text": "ohne Absprache Geld ausgeben"}]}'::jsonb)$$,
  'free_text_repeatable wird angenommen');

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'A02', 'likert',
            '{"optionId": "A02_o1"}'::jsonb)$$,
  '23514',
  null,
  'ein erfundenes Format wird abgewiesen');

-- ---------------------------------------------------------------------------
-- 3. Mehrfachwahl
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'B05', 'multi_choice',
            '{"optionIds": []}'::jsonb)$$,
  '23514',
  null,
  'eine leere Auswahl ist keine Antwort - dafuer gibt es den Auslassungsgrund');

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'B05', 'multi_choice',
            '{"optionIds": ["B05_o1", "B05_o1"]}'::jsonb)$$,
  '23514',
  null,
  'zweimal dieselbe Option ist kein staerkeres Ja');

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'B05', 'multi_choice',
            '{"options": ["eine feste Obergrenze"]}'::jsonb)$$,
  '23514',
  null,
  'der Antworttext statt der Kennung wird weiter abgewiesen');

-- ---------------------------------------------------------------------------
-- 4. Der Vorrang aus S01 muss unter dem Gewaehlten stehen
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'S01', 'multi_choice_priority',
            '{"optionIds": ["S01_o1", "S01_o3"], "priorityOptionId": "S01_o3"}'::jsonb)$$,
  'ein Vorrang unter den gewaehlten Zielen wird angenommen');

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'S02', 'multi_choice_priority',
            '{"optionIds": ["S01_o1"], "priorityOptionId": "S01_o5"}'::jsonb)$$,
  '23514',
  null,
  'ein Vorrang ueber eine nicht gewaehlte Option ist keine Praeferenz');

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'S03', 'multi_choice_priority',
            '{"optionIds": ["S01_o1", "S01_o2"]}'::jsonb)$$,
  'ohne Vorrang geht auch - die Rangfolge ist freiwillig');

-- ---------------------------------------------------------------------------
-- 5. Zeitfenster tragen ihre Zeitzone
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'R03', 'time_windows',
            '{"windows": [{"day": "Dienstag", "from": "18:00", "to": "20:00",
                           "timezone": "Europe/Berlin"}]}'::jsonb)$$,
  'ein vollstaendiges Zeitfenster wird angenommen');

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'R04', 'time_windows',
            '{"windows": [{"day": "Dienstag", "from": "18:00", "to": "20:00"}]}'::jsonb)$$,
  '23514',
  null,
  'ohne Zeitzone ist 18 Uhr keine Verabredung');

-- ---------------------------------------------------------------------------
-- 6. Wiederholte Freitexte haengen an einer Kennung, nicht am Text
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'L05', 'free_text_repeatable',
            '{"entries": [{"text": "ohne Absprache Geld ausgeben"}]}'::jsonb)$$,
  '23514',
  null,
  'eine Grenze ohne eigene Kennung wuerde die Anschlussfragen entwurzeln');

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2100010-0010-4010-8010-000000000010', 'L02', 'free_text_per_entry',
            '{"perEntry": {}}'::jsonb)$$,
  '23514',
  null,
  'eine Anschlussfrage ohne einen einzigen Bezug ist keine Antwort');

rollback;
