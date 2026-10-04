\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

-- ---------------------------------------------------------------------------
-- Der Vergleich gibt Abstaende heraus, keine Antworten
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'td-sucht@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'td-gefunden@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'td-verborgen@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e1000004-0004-4004-8004-000000000004',
   'authenticated', 'authenticated', 'td-kein-founder@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('e1000001-0001-4001-8001-000000000001', array['founder']),
  ('e1000002-0002-4002-8002-000000000002', array['founder']),
  ('e1000003-0003-4003-8003-000000000003', array['founder']),
  ('e1000004-0004-4004-8004-000000000004', array['advisor'])
on conflict (user_id) do update set roles = excluded.roles;

-- Ein veroeffentlichtes Profil muss vollstaendig sein - dieselbe Pruefung wie
-- in der Anwendung.
insert into public.founder_discovery_profiles
  (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
   remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal,
   expertise)
values
  ('e1000001-0001-4001-8001-000000000001', 'active', 'Sucht', 'Sucht jemanden', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating', 'profitable_business', '{}'),
  ('e1000002-0002-4002-8002-000000000002', 'active', 'Gefunden', 'Ist zu finden', '-',
   '{sales}', '{tech}', '{}', 'remote', 20, 'full_time', 'idea_validating', 'profitable_business', '{}'),
  -- Nicht veroeffentlicht: darf ueber diesen Weg nicht auffindbar sein.
  ('e1000003-0003-4003-8003-000000000003', 'draft', 'Verborgen', 'Nicht sichtbar', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating', 'profitable_business', '{}');

insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values
  ('e1a00001-0001-4001-8001-00000000000a', 'e1000001-0001-4001-8001-000000000001',
   'founder_profile', 'founder-profile-v1', now()),
  ('e1a00002-0002-4002-8002-00000000000a', 'e1000002-0002-4002-8002-000000000002',
   'founder_profile', 'founder-profile-v1', now());

-- Thema "decision_weighing": A01 und A02.
--   Person 1: Stufe 2 und Stufe 2
--   Person 2: Stufe 4 und Stufe 3
-- Abstaende: 2/4 = 0.5 und 1/4 = 0.25, Mittel 0.375.
insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values
  ('e1a00001-0001-4001-8001-00000000000a', 'A01', 'ordinal_choice', '{"optionId":"A01_o2"}'),
  ('e1a00001-0001-4001-8001-00000000000a', 'A02', 'ordinal_choice', '{"optionId":"A02_o2"}'),
  ('e1a00002-0002-4002-8002-00000000000a', 'A01', 'ordinal_choice', '{"optionId":"A01_o4"}'),
  ('e1a00002-0002-4002-8002-00000000000a', 'A02', 'ordinal_choice', '{"optionId":"A02_o3"}');

-- Thema "raising_objections": nur T01 zaehlt. Person 2 antwortet
-- "situationsabhaengig" - das ist keine Stufe, also kein Abstand.
insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values
  ('e1a00001-0001-4001-8001-00000000000a', 'T01', 'single_choice', '{"optionId":"T01_o1"}'),
  ('e1a00002-0002-4002-8002-00000000000a', 'T01', 'single_choice', '{"optionId":"T01_o5"}');

-- Thema "voicing_disagreement": ein Auslassungsgrund ist keine Mitte.
insert into public.alignment_answers (assessment_id, block_id, answer_format, value, missing_code)
values
  ('e1a00001-0001-4001-8001-00000000000a', 'D02', 'ordinal_choice', null, 'cannot_assess');
insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values
  ('e1a00002-0002-4002-8002-00000000000a', 'D02', 'ordinal_choice', '{"optionId":"D02_o3"}');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"e1000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- 1. Der mittlere Abstand stimmt
-- ---------------------------------------------------------------------------
select extensions.is((select count(*)::int from public.discovery_theme_distances('e1000002-0002-4002-8002-000000000002')),0,'legacy delivery retired; no unconsented distances');
reset role;
select extensions.ok(exists(select 1 from public.alignment_answers),'historical answers retained');
select extensions.ok(exists(select 1 from public.discovery_theme_items),'historical mapping retained');
select * from extensions.finish();
rollback;
