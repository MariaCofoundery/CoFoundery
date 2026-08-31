\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'b1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'slice-founder@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'slice-candidate@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'slice-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'slice-non-founder@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b5555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'slice-draft@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b6666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'slice-paused@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles(user_id, display_name, roles)
values
  ('b1111111-1111-4111-8111-111111111111', 'Founder A', array['founder']),
  ('b2222222-2222-4222-8222-222222222222', 'Founder B', array['founder']),
  ('b3333333-3333-4333-8333-333333333333', 'Advisor', array['advisor']),
  ('b5555555-5555-4555-8555-555555555555', 'Draft Founder', array['founder']),
  ('b6666666-6666-4666-8666-666666666666', 'Paused Founder', array['founder']);

insert into public.founder_discovery_profiles (
  user_id, status, display_name, headline, own_roles, seeking_roles,
  expertise, location_region, remote_mode, availability_hours_per_week,
  commitment_level, venture_stage, venture_goal, published_at
)
values
  ('b1111111-1111-4111-8111-111111111111', 'active', 'Founder A', 'Product founder', array['product'], array['tech'], array['Product'], 'Berlin', 'remote', 20, 'part_time', 'idea_validating', 'venture_scale', now()),
  ('b2222222-2222-4222-8222-222222222222', 'active', 'Founder B', 'Tech founder', array['tech'], array['product'], array['AI'], 'Berlin', 'remote', 25, 'full_time', 'already_building', 'venture_scale', now()),
  ('b5555555-5555-4555-8555-555555555555', 'draft', 'Draft Founder', 'Draft profile', array['design'], array['tech'], array['Design'], 'Hamburg', 'hybrid', 15, 'part_time', 'exploring_ideas', 'profitable_business', null),
  ('b6666666-6666-4666-8666-666666666666', 'paused', 'Paused Founder', 'Paused profile', array['operations'], array['product'], array['Operations'], 'Munich', 'onsite', 30, 'full_time', 'already_building', 'venture_scale', now());

select set_config(
  'request.jwt.claims',
  '{"sub":"b1111111-1111-4111-8111-111111111111","email":"slice-founder@example.com","role":"authenticated"}',
  true
);
set local role authenticated;

select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'b1111111-1111-4111-8111-111111111111' and status = 'active'), 1,
  'founder can read own active Discovery profile'
);
select extensions.lives_ok(
  $$update public.founder_discovery_profiles set headline = 'Edited own profile'
    where user_id = 'b1111111-1111-4111-8111-111111111111'$$,
  'founder can edit own active Discovery profile'
);
select extensions.is(
  (select headline from public.founder_discovery_profiles where user_id = 'b1111111-1111-4111-8111-111111111111'),
  'Edited own profile', 'founder can read own edited Discovery profile'
);
select extensions.lives_ok(
  $$update public.founder_discovery_profiles set status = 'paused'
    where user_id = 'b1111111-1111-4111-8111-111111111111'$$,
  'founder can pause own Discovery profile'
);
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'b1111111-1111-4111-8111-111111111111' and status = 'paused'), 1,
  'founder can read own paused Discovery profile'
);
select extensions.lives_ok(
  $$update public.founder_discovery_profiles set status = 'active'
    where user_id = 'b1111111-1111-4111-8111-111111111111'$$,
  'founder can republish own paused Discovery profile'
);
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'b1111111-1111-4111-8111-111111111111' and status = 'active'), 1,
  'founder can read own republished active Discovery profile'
);
select extensions.lives_ok(
  $$update public.founder_discovery_profiles set status = 'draft'
    where user_id = 'b1111111-1111-4111-8111-111111111111'$$,
  'founder can move own Discovery profile to draft for the RLS fixture'
);
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'b1111111-1111-4111-8111-111111111111' and status = 'draft'), 1,
  'founder can read own draft Discovery profile'
);
select extensions.lives_ok(
  $$update public.founder_discovery_profiles set headline = 'Edited draft profile'
    where user_id = 'b1111111-1111-4111-8111-111111111111'$$,
  'founder can edit own draft Discovery profile'
);
select extensions.is(
  (select headline from public.founder_discovery_profiles where user_id = 'b1111111-1111-4111-8111-111111111111'),
  'Edited draft profile', 'founder can reload own edited draft Discovery profile'
);
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'b2222222-2222-4222-8222-222222222222'), 1,
  'founder can read another active Discovery profile'
);
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'b5555555-5555-4555-8555-555555555555'), 0,
  'founder cannot read another draft Discovery profile'
);
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'b6666666-6666-4666-8666-666666666666'), 0,
  'founder cannot read another paused Discovery profile'
);
select extensions.is(
  (select count(*)::integer from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0)), 1,
  'founder search returns only the other active Discovery candidate'
);
select extensions.is(
  (select candidate_user_id from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0)),
  'b2222222-2222-4222-8222-222222222222'::uuid,
  'founder search returns the permitted active candidate'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b2222222-2222-4222-8222-222222222222","email":"slice-candidate@example.com","role":"authenticated"}', true
);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0) where candidate_user_id = 'b1111111-1111-4111-8111-111111111111'), 0,
  'a draft profile does not appear as a search candidate to another founder'
);

reset role;
update public.founder_discovery_profiles set status = 'paused'
where user_id = 'b1111111-1111-4111-8111-111111111111';
select set_config(
  'request.jwt.claims',
  '{"sub":"b2222222-2222-4222-8222-222222222222","email":"slice-candidate@example.com","role":"authenticated"}', true
);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0) where candidate_user_id = 'b1111111-1111-4111-8111-111111111111'), 0,
  'a paused profile does not appear as a search candidate to another founder'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b3333333-3333-4333-8333-333333333333","email":"slice-advisor@example.com","role":"authenticated"}', true
);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles), 0,
  'advisor-only account cannot read active, draft, or paused Discovery profiles'
);
select extensions.is(
  (select count(*)::integer from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0)), 0,
  'advisor-only account receives no Discovery search results'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b4444444-4444-4444-8444-444444444444","email":"slice-non-founder@example.com","role":"authenticated"}', true
);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles), 0,
  'authenticated account without a founder profile cannot browse Discovery'
);

reset role;
set local role anon;
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles), 0,
  'unauthenticated client cannot browse Discovery profiles'
);

reset role;
select * from extensions.finish();
rollback;
