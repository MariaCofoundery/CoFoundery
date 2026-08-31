\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'discovery v2 assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'search-owner@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'matching-founder@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'other-founder@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles(user_id, display_name, roles)
values
  ('a1111111-1111-4111-8111-111111111111', 'Owner', array['founder']),
  ('a2222222-2222-4222-8222-222222222222', 'Match', array['founder']),
  ('a3333333-3333-4333-8333-333333333333', 'Other', array['founder']);

insert into public.founder_discovery_profiles (
  user_id, status, display_name, headline, bio, own_roles, seeking_roles,
  expertise, industries, location_label, location_region, remote_mode,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal, published_at
)
values
  ('a1111111-1111-4111-8111-111111111111', 'active', 'Owner', 'Product founder', '', array['product'], array['tech'], array['Product'], array['SaaS'], 'Legacy Berlin', 'Berlin', 'remote', 20, 'part_time', 'idea_validating', 'venture_scale', now()),
  ('a2222222-2222-4222-8222-222222222222', 'active', 'Match', 'AI engineer', '', array['tech'], array['product'], array['AI', 'React'], array['Health'], 'Legacy value', 'Berlin', 'remote', 25, 'part_time', 'already_building', 'venture_scale', now() - interval '30 days'),
  ('a3333333-3333-4333-8333-333333333333', 'active', 'Other', 'Sales founder', '', array['sales'], array['product'], array['Sales'], array['SaaS'], 'Berlin', 'Hamburg', 'onsite', 10, 'full_time', 'already_building', 'profitable_business', now());

insert into public.founder_search_preferences (
  user_id, discovery_v2_alignment_enabled, discovery_v2_alignment_dimensions,
  discovery_v2_alignment_consented_at
)
values (
  'a1111111-1111-4111-8111-111111111111', true,
  array['commitment', 'decision_logic'], now()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","email":"search-owner@example.com","role":"authenticated"}',
  true
);
set local role authenticated;

select pg_temp.assert_true(
  (
    select count(*) = 1
      and min(display_name) = 'Match'
      and min(total_count) = 1
    from public.search_founder_discovery_profiles_v2(
      array['tech'], array['AI'], 'berlin', array['remote'], 20::smallint, 12, 0
    )
  ),
  'combined practical filters did not run before pagination or excluded an older matching profile'
);

select pg_temp.assert_true(
  (
    select bool_and(
      to_jsonb(result) ?& array[
        'id', 'display_name', 'headline', 'own_roles', 'expertise',
        'location_region', 'remote_mode', 'availability_hours_per_week', 'total_count'
      ]
      and not (to_jsonb(result) ?| array[
        'email', 'assessment_id', 'assessment_scores', 'priority_weights',
        'bio', 'industries', 'location_label'
      ])
    )
    from public.search_founder_discovery_profiles_v2(
      array['tech'], array['AI'], 'Berlin', array['remote'], 20::smallint, 12, 0
    ) result
  ),
  'search projection exposes fields outside the V2 presentation contract'
);

select pg_temp.assert_true(
  (
    select count(*) = 2 and max(total_count) = 2
    from public.search_founder_discovery_profiles_v2(
      '{}'::text[], '{}'::text[], null, '{}'::text[], null::smallint, 2, 0
    )
  ),
  'unfiltered authenticated pagination or total count is incorrect'
);

reset role;

do $$
begin
  begin
    update public.founder_search_preferences
    set discovery_v2_alignment_enabled = true,
        discovery_v2_alignment_dimensions = array[
          'company_logic', 'decision_logic', 'commitment', 'execution_strength'
        ],
        discovery_v2_alignment_consented_at = now()
    where user_id = 'a1111111-1111-4111-8111-111111111111';
    raise exception 'invalid alignment dimensions unexpectedly accepted';
  exception when check_violation then
    null;
  end;
end;
$$;

select pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'public.search_founder_discovery_profiles_v2(text[],text[],text,text[],smallint,integer,integer)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.search_founder_discovery_profiles_v2(text[],text[],text,text[],smallint,integer,integer)',
    'EXECUTE'
  ),
  'search function grants are not authenticated-only'
);

select extensions.pass('Discovery V2 practical search, pagination, privacy and alignment constraints hold');
select * from extensions.finish();

rollback;
