\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

-- ---------------------------------------------------------------------------
-- Discovery fuer v2.1: Themen statt Passungswert
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'disc21-me@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'disc21-other@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('e1000001-0001-4001-8001-000000000001', array['founder']),
       ('e1000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

-- NOCH NICHT ABGEGEBEN. Nach der Abgabe friert ein Trigger die Antworten ein -
-- zu Recht. Die Testdaten entstehen deshalb vorher, und abgegeben wird erst,
-- wenn der jeweilige Stand steht.
insert into public.assessments (id, user_id, module, instrument_id) values
  ('e1000010-0010-4010-8010-000000000010', 'e1000001-0001-4001-8001-000000000001',
   'base', 'founder-alignment-v2-1'),
  ('e1000020-0020-4020-8020-000000000020', 'e1000002-0002-4002-8002-000000000002',
   'base', 'founder-alignment-v2-1');

create or replace function pg_temp.abgeben() returns void language sql as $$
  update public.assessments set submitted_at = now()
   where id in ('e1000010-0010-4010-8010-000000000010',
                'e1000020-0020-4020-8020-000000000020');
$$;

create or replace function pg_temp.oeffnen() returns void language sql as $$
  update public.assessments set submitted_at = null
   where id in ('e1000010-0010-4010-8010-000000000010',
                'e1000020-0020-4020-8020-000000000020');
$$;

-- T01 besteht aus A01 und A02, beide ordinal.
insert into public.discovery_alignment_topics (user_id, instrument_id, topic_key, wish, rank)
values ('e1000001-0001-4001-8001-000000000001', 'founder-alignment-v2-1', 'T01', 'similar', 1);

-- ---------------------------------------------------------------------------
-- 1. Eine Stufe daneben zaehlt als aehnlich, drei nicht
-- ---------------------------------------------------------------------------

insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('e1000010-0010-4010-8010-000000000010', 'A01', 'ordinal_choice', '{"optionId":"A01_o3"}'),
  ('e1000010-0010-4010-8010-000000000010', 'A02', 'ordinal_choice', '{"optionId":"A02_o3"}'),
  ('e1000020-0020-4020-8020-000000000020', 'A01', 'ordinal_choice', '{"optionId":"A01_o4"}'),
  ('e1000020-0020-4020-8020-000000000020', 'A02', 'ordinal_choice', '{"optionId":"A02_o3"}');

select pg_temp.abgeben();

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T01'),
  'met',
  'eine Stufe daneben gilt bei geordneten Stufen als aehnlich');

select extensions.is(
  (select basis_comparable from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T01'),
  2,
  'die Basis wird genannt: zwei gemeinsam beantwortete Fragen');

reset role;
select pg_temp.oeffnen();
update public.alignment_answers set value = '{"optionId":"A01_o1"}'
 where assessment_id = 'e1000020-0020-4020-8020-000000000020' and block_id = 'A01';
select pg_temp.abgeben();

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T01'),
  'unmet',
  'zwei Stufen daneben gelten nicht mehr als aehnlich');

-- ---------------------------------------------------------------------------
-- 2. Unbekannt ist kein Fehltreffer
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.oeffnen();
delete from public.alignment_answers
 where assessment_id = 'e1000020-0020-4020-8020-000000000020';
insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code)
values ('e1000020-0020-4020-8020-000000000020', 'A01', 'ordinal_choice', 'cannot_assess');
select pg_temp.abgeben();

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T01'),
  'unknown',
  'wer ausgelassen hat, hat den Wunsch nicht verfehlt - es ist nur nichts bekannt');

select extensions.is(
  (select basis_comparable from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T01'),
  0,
  'und die Basis sagt, dass es null vergleichbare Fragen waren');

-- ---------------------------------------------------------------------------
-- 3. Eine Handlungswahl kennt kein "daneben"
-- ---------------------------------------------------------------------------

reset role;
insert into public.discovery_alignment_topics (user_id, instrument_id, topic_key, wish, rank)
values ('e1000001-0001-4001-8001-000000000001', 'founder-alignment-v2-1', 'T05', 'similar', 2);

select pg_temp.oeffnen();
delete from public.alignment_answers
 where assessment_id in ('e1000010-0010-4010-8010-000000000010',
                         'e1000020-0020-4020-8020-000000000020');
insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('e1000010-0010-4010-8010-000000000010', 'K01', 'single_choice', '{"optionId":"K01_o1"}'),
  ('e1000010-0010-4010-8010-000000000010', 'K02', 'single_choice', '{"optionId":"K02_o1"}'),
  ('e1000020-0020-4020-8020-000000000020', 'K01', 'single_choice', '{"optionId":"K01_o2"}'),
  ('e1000020-0020-4020-8020-000000000020', 'K02', 'single_choice', '{"optionId":"K02_o1"}');

select pg_temp.abgeben();

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T05'),
  'unmet',
  'bei einer Handlungswahl ist die Nachbaroption nicht aehnlich');

-- ---------------------------------------------------------------------------
-- 4. Wer Unterschiede sucht, bekommt bei Gleichheit kein 'met'
-- ---------------------------------------------------------------------------

reset role;
update public.discovery_alignment_topics set wish = 'different'
 where user_id = 'e1000001-0001-4001-8001-000000000001' and topic_key = 'T05';
select pg_temp.oeffnen();
update public.alignment_answers set value = '{"optionId":"K01_o1"}'
 where assessment_id = 'e1000020-0020-4020-8020-000000000020' and block_id = 'K01';
select pg_temp.abgeben();

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T05'),
  'unmet',
  'wer Unterschiede sucht und lauter Gleiches findet, hat seinen Wunsch nicht erfuellt');

-- ---------------------------------------------------------------------------
-- 5. Keine Antwort verlaesst die Funktion
-- ---------------------------------------------------------------------------

select extensions.is(
  (select count(*)::int from public.alignment_answers
    where assessment_id = 'e1000020-0020-4020-8020-000000000020'),
  0,
  'die fremden Antworten bleiben unlesbar - die Funktion gibt nur Urteile heraus');

-- ---------------------------------------------------------------------------
-- 6. Sich selbst vergleichen gibt es nicht
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$select * from public.discovery_topic_verdicts_v21(
      'e1000001-0001-4001-8001-000000000001')$$,
  '22023',
  null,
  'sich selbst zu vergleichen wird abgelehnt');

-- ---------------------------------------------------------------------------
-- 7. Die Fassungen werden nicht gemischt
-- ---------------------------------------------------------------------------

reset role;
insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('e1000030-0030-4030-8030-000000000030', 'e1000002-0002-4002-8002-000000000002',
        'values', 'founder-alignment-v2', now());
insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values ('e1000030-0030-4030-8030-000000000030', 'K01', 'single_choice', '{"optionId":"K01_o1"}');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- K01 der anderen Person steht jetzt zweimal da: einmal unter v2.1 (gleich)
-- und einmal unter v2. Wuerde gemischt, kaeme die v2-Zeile mit hinein.
select extensions.is(
  (select basis_comparable from public.discovery_topic_verdicts_v21(
     'e1000002-0002-4002-8002-000000000002') where topic_key = 'T05'),
  2,
  'eine v2-Antwort mischt sich nicht in ein v2.1-Urteil');

rollback;
