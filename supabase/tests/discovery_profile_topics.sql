\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a6000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'dp-a@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'dp-b@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('a6000001-0001-4001-8001-000000000001', array['founder']),
  ('a6000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id) values
  ('a6000100-0100-4100-8100-000000000100', 'a6000001-0001-4001-8001-000000000001',
   'founder_profile', 'founder-profile-v1'),
  ('a6000200-0200-4200-8200-000000000200', 'a6000002-0002-4002-8002-000000000002',
   'founder_profile', 'founder-profile-v1');

-- P01 besteht aus A01 und A02, beide ordinal.
insert into public.discovery_alignment_topics (user_id, instrument_id, topic_key, wish, rank)
values ('a6000001-0001-4001-8001-000000000001', 'founder-profile-v1', 'P01', 'similar', 1);

insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('a6000100-0100-4100-8100-000000000100', 'A01', 'ordinal_choice', '{"optionId":"A01_o3"}'),
  ('a6000100-0100-4100-8100-000000000100', 'A02', 'ordinal_choice', '{"optionId":"A02_o3"}'),
  ('a6000200-0200-4200-8200-000000000200', 'A01', 'ordinal_choice', '{"optionId":"A01_o4"}'),
  ('a6000200-0200-4200-8200-000000000200', 'A02', 'ordinal_choice', '{"optionId":"A02_o3"}');

update public.assessments set submitted_at = now()
 where id in ('a6000100-0100-4100-8100-000000000100', 'a6000200-0200-4200-8200-000000000200');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a6000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_profile(
     'a6000002-0002-4002-8002-000000000002') where topic_key = 'P01'),
  'met',
  'eine Stufe daneben gilt bei geordneten Stufen als aehnlich');

select extensions.is(
  (select basis_comparable from public.discovery_topic_verdicts_profile(
     'a6000002-0002-4002-8002-000000000002') where topic_key = 'P01'),
  2,
  'die Basis wird genannt');

-- ---------------------------------------------------------------------------
-- Eine Handlungswahl kennt kein "daneben"
-- ---------------------------------------------------------------------------

reset role;
insert into public.discovery_alignment_topics (user_id, instrument_id, topic_key, wish, rank)
values ('a6000001-0001-4001-8001-000000000001', 'founder-profile-v1', 'P04', 'similar', 2);

update public.assessments set submitted_at = null
 where id in ('a6000100-0100-4100-8100-000000000100', 'a6000200-0200-4200-8200-000000000200');
insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('a6000100-0100-4100-8100-000000000100', 'T01', 'single_choice', '{"optionId":"T01_o1"}'),
  ('a6000200-0200-4200-8200-000000000200', 'T01', 'single_choice', '{"optionId":"T01_o2"}');
update public.assessments set submitted_at = now()
 where id in ('a6000100-0100-4100-8100-000000000100', 'a6000200-0200-4200-8200-000000000200');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a6000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_profile(
     'a6000002-0002-4002-8002-000000000002') where topic_key = 'P04'),
  'unmet',
  'bei einer Handlungswahl ist die Nachbaroption nicht aehnlich');

-- ---------------------------------------------------------------------------
-- Keine Antwort verlaesst die Funktion
-- ---------------------------------------------------------------------------

select extensions.is(
  (select count(*)::int from public.alignment_answers
    where assessment_id = 'a6000200-0200-4200-8200-000000000200'),
  0,
  'die fremden Antworten bleiben unlesbar - die Funktion gibt nur Urteile heraus');

select extensions.throws_ok(
  $$select * from public.discovery_topic_verdicts_profile(
      'a6000001-0001-4001-8001-000000000001')$$,
  '22023',
  null,
  'sich selbst zu vergleichen wird abgelehnt');

-- ---------------------------------------------------------------------------
-- Das Vorhaben mischt sich nicht ein
-- ---------------------------------------------------------------------------
--
-- Discovery zeigt Menschen, die man noch nicht kennt. Mit ihnen gibt es kein
-- gemeinsames Vorhaben - eine Venture-Antwort darf hier nichts aendern.

reset role;
insert into public.founder_teams (id, name, team_context)
values ('a6000300-0300-4300-8300-000000000300', 'Fremdes Vorhaben', 'pre_founder');
insert into public.assessments (id, user_id, module, instrument_id, venture_id, submitted_at)
values ('a6000400-0400-4400-8400-000000000400', 'a6000002-0002-4002-8002-000000000002',
        'venture_alignment', 'venture-alignment-v1',
        'a6000300-0300-4300-8300-000000000300', now());
insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values ('a6000400-0400-4400-8400-000000000400', 'A01', 'ordinal_choice', '{"optionId":"A01_o1"}');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"a6000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select basis_comparable from public.discovery_topic_verdicts_profile(
     'a6000002-0002-4002-8002-000000000002') where topic_key = 'P01'),
  2,
  'eine Venture-Antwort mischt sich nicht in ein Profil-Urteil');

select extensions.is(
  (select fulfilment from public.discovery_topic_verdicts_profile(
     'a6000002-0002-4002-8002-000000000002') where topic_key = 'P01'),
  'met',
  'und veraendert das Urteil nicht');

rollback;
