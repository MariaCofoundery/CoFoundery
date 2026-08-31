\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'c1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'slice2-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'slice2-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'slice2-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles(user_id, display_name, roles)
values
  ('c1111111-1111-4111-8111-111111111111', 'Founder A', array['founder']),
  ('c2222222-2222-4222-8222-222222222222', 'Founder B', array['founder']),
  ('c3333333-3333-4333-8333-333333333333', 'Advisor', array['advisor']);

insert into public.founder_discovery_profiles (
  user_id, status, display_name, headline, own_roles, seeking_roles,
  expertise, location_region, remote_mode, availability_hours_per_week,
  commitment_level, venture_stage, venture_goal, search_intent, start_horizon, published_at
)
values
  ('c1111111-1111-4111-8111-111111111111', 'active', 'Founder A', 'Product founder', array['product'], array['tech'], array['Product'], 'Berlin', 'remote', 20, 'part_time', 'idea_validating', 'venture_scale', 'ready_now', 'now', now() - interval '1 day'),
  ('c2222222-2222-4222-8222-222222222222', 'active', 'Founder B', 'Tech founder', array['tech'], array['product'], array['AI'], 'Berlin', 'remote', 25, 'full_time', 'already_building', 'venture_scale', null, null, now());

insert into public.founder_search_preferences(user_id)
values
  ('c1111111-1111-4111-8111-111111111111'),
  ('c2222222-2222-4222-8222-222222222222');

select set_config(
  'request.jwt.claims',
  '{"sub":"c1111111-1111-4111-8111-111111111111","email":"slice2-a@example.com","role":"authenticated"}', true
);
set local role authenticated;

select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles where user_id = 'c2222222-2222-4222-8222-222222222222'), 1,
  'existing active profile with null intent remains visible'
);
select extensions.is(
  (select count(*)::integer from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0)), 1,
  'search RPC keeps active profiles with unknown intent and horizon'
);
select extensions.is(
  (select search_intent from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0)), null,
  'search RPC does not infer intent for an existing profile'
);
select extensions.is(
  (select start_horizon from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0)), null,
  'search RPC does not infer a start horizon for an existing profile'
);
select extensions.lives_ok(
  $$update public.founder_discovery_profiles
    set search_intent = 'actively_exploring', start_horizon = 'next_3_months'
    where user_id = 'c1111111-1111-4111-8111-111111111111'$$,
  'founder can update own explicit intent and horizon'
);
select extensions.is(
  (select search_intent || ':' || start_horizon from public.founder_discovery_profiles where user_id = 'c1111111-1111-4111-8111-111111111111'),
  'actively_exploring:next_3_months',
  'explicit intent and horizon persist without derivation'
);
select extensions.lives_ok(
  $$update public.founder_search_preferences
    set discovery_v2_alignment_enabled = true,
        discovery_v2_alignment_dimensions = array['company_logic','risk_orientation','commitment'],
        discovery_v2_alignment_preferences = '{
          "company_logic":{"importance":"very_important","relationPreference":"prefer_similar"},
          "risk_orientation":{"importance":"important","relationPreference":"different_perspective_welcome"},
          "commitment":{"importance":"important","relationPreference":"no_direction_preference"}
        }'::jsonb,
        discovery_v2_alignment_consented_at = now()
    where user_id = 'c1111111-1111-4111-8111-111111111111'$$,
  'owner can store three valid private Alignment preferences'
);
select extensions.is(
  (select discovery_v2_alignment_preferences->'risk_orientation'->>'relationPreference' from public.founder_search_preferences where user_id = 'c1111111-1111-4111-8111-111111111111'),
  'different_perspective_welcome',
  'different perspective preference is preserved exactly'
);
select extensions.throws_ok(
  $$update public.founder_search_preferences
    set discovery_v2_alignment_dimensions = array['company_logic','decision_logic','work_structure','commitment'],
        discovery_v2_alignment_preferences = '{
          "company_logic":{"importance":"important","relationPreference":"prefer_similar"},
          "decision_logic":{"importance":"important","relationPreference":"prefer_similar"},
          "work_structure":{"importance":"important","relationPreference":"prefer_similar"},
          "commitment":{"importance":"important","relationPreference":"prefer_similar"}
        }'::jsonb
    where user_id = 'c1111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'database rejects more than three prioritized Alignment dimensions'
);
select extensions.throws_ok(
  $$update public.founder_search_preferences
    set discovery_v2_alignment_preferences = '{
      "company_logic":{"importance":"important","relationPreference":"opposite_is_better"},
      "risk_orientation":{"importance":"important","relationPreference":"different_perspective_welcome"},
      "commitment":{"importance":"important","relationPreference":"no_direction_preference"}
    }'::jsonb
    where user_id = 'c1111111-1111-4111-8111-111111111111'$$,
  '23514', null,
  'database rejects an unsupported directional or opposite-score preference'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c2222222-2222-4222-8222-222222222222","email":"slice2-b@example.com","role":"authenticated"}', true
);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.founder_search_preferences where user_id = 'c1111111-1111-4111-8111-111111111111'), 0,
  'Alignment preference remains owner-only'
);
select extensions.is(
  (select search_intent from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0) where candidate_user_id = 'c1111111-1111-4111-8111-111111111111'),
  'actively_exploring',
  'other founder receives only the explicit public intent projection'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c3333333-3333-4333-8333-333333333333","email":"slice2-advisor@example.com","role":"authenticated"}', true
);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.founder_discovery_profiles), 0,
  'advisor-only account remains denied from Discovery profiles'
);
select extensions.is(
  (select count(*)::integer from public.search_founder_discovery_profiles_v2('{}', '{}', null, '{}', null, 12, 0)), 0,
  'advisor-only account receives no Search RPC results'
);

reset role;
select * from extensions.finish();
rollback;
