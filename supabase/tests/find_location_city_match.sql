\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

-- Ort: verglichen wird der Teil vor dem ersten Komma, ohne Gross-/Kleinschreibung.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'ae100001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'ort-sucht@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'ae100002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'ort-berlin-de@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'ae100003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'ort-berlin@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'ae100004-0004-4004-8004-000000000004',
   'authenticated', 'authenticated', 'ort-bernau@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('ae100001-0001-4001-8001-000000000001', array['founder']),
  ('ae100002-0002-4002-8002-000000000002', array['founder']),
  ('ae100003-0003-4003-8003-000000000003', array['founder']),
  ('ae100004-0004-4004-8004-000000000004', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.founder_discovery_profiles
  (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
   remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal,
   expertise, location_region)
values
  ('ae100002-0002-4002-8002-000000000002', 'active', 'BerlinDE', 'Ort', '-',
   '{tech}', '{sales}', '{}', 'remote', 40, 'full_time', 'idea_validating', 'profitable_business', '{}', 'Berlin, DE'),
  ('ae100003-0003-4003-8003-000000000003', 'active', 'Berlin', 'Ort', '-',
   '{tech}', '{sales}', '{}', 'remote', 40, 'full_time', 'idea_validating', 'profitable_business', '{}', 'berlin '),
  ('ae100004-0004-4004-8004-000000000004', 'active', 'Bernau', 'Ort', '-',
   '{tech}', '{sales}', '{}', 'remote', 40, 'full_time', 'idea_validating', 'profitable_business', '{}', 'Bernau');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"ae100001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select array_agg(display_name order by display_name)
   from public.search_founder_discovery_profiles_v2(
     '{}', '{}', 'Berlin', '{}', null, 12, 0, '{}', '{}', '{}', '{}')
   where candidate_user_id in (
     'ae100002-0002-4002-8002-000000000002',
     'ae100003-0003-4003-8003-000000000003',
     'ae100004-0004-4004-8004-000000000004')),
  array['Berlin','BerlinDE'],
  '"Berlin" findet "Berlin, DE" und "berlin", nicht "Bernau"');

select extensions.is(
  (select array_agg(display_name order by display_name)
   from public.search_founder_discovery_profiles_v2(
     '{}', '{}', 'Berlin, DE', '{}', null, 12, 0, '{}', '{}', '{}', '{}')
   where candidate_user_id in (
     'ae100002-0002-4002-8002-000000000002',
     'ae100003-0003-4003-8003-000000000003',
     'ae100004-0004-4004-8004-000000000004')),
  array['Berlin','BerlinDE'],
  '"Berlin, DE" findet auch den Eintrag ohne Zusatz');

select extensions.is(
  (select array_agg(display_name order by display_name)
   from public.search_founder_discovery_profiles_v2(
     '{}', '{}', 'Bern', '{}', null, 12, 0, '{}', '{}', '{}', '{}')
   where candidate_user_id in (
     'ae100002-0002-4002-8002-000000000002',
     'ae100003-0003-4003-8003-000000000003',
     'ae100004-0004-4004-8004-000000000004')),
  null::text[],
  '"Bern" findet weder Berlin noch Bernau');

select * from extensions.finish();
rollback;
