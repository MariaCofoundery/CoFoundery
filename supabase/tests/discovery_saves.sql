\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', 'da111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'save-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'db222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'save-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'dc333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'save-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'dd444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'save-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'de555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'save-other@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'df666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'save-draft@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'df777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'save-paused@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles(user_id, display_name, roles)
values
  ('da111111-1111-4111-8111-111111111111', 'Founder A', array['founder']),
  ('db222222-2222-4222-8222-222222222222', 'Founder B', array['founder']),
  ('dc333333-3333-4333-8333-333333333333', 'Founder C', array['founder']),
  ('dd444444-4444-4444-8444-444444444444', 'Advisor', array['advisor']),
  ('de555555-5555-4555-8555-555555555555', 'Authenticated user', '{}'::text[]),
  ('df666666-6666-4666-8666-666666666666', 'Draft Founder', array['founder']),
  ('df777777-7777-4777-8777-777777777777', 'Paused Founder', array['founder']);

insert into public.founder_discovery_profiles (
  id, user_id, status, display_name, headline, own_roles, seeking_roles,
  remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal, published_at
)
values
  ('aa111111-1111-4111-8111-111111111111', 'da111111-1111-4111-8111-111111111111', 'active', 'Founder A', 'Product', array['product'], array['tech'], 'remote', 20, 'part_time', 'idea_validating', 'venture_scale', now()),
  ('ab222222-2222-4222-8222-222222222222', 'db222222-2222-4222-8222-222222222222', 'active', 'Founder B', 'Tech', array['tech'], array['product'], 'remote', 30, 'full_time', 'already_building', 'venture_scale', now()),
  ('ac333333-3333-4333-8333-333333333333', 'dc333333-3333-4333-8333-333333333333', 'active', 'Founder C', 'Sales', array['sales'], array['tech'], 'hybrid', 20, 'part_time', 'exploring_ideas', 'profitable_business', now()),
  ('af666666-6666-4666-8666-666666666666', 'df666666-6666-4666-8666-666666666666', 'draft', 'Draft Founder', 'Draft', array['design'], array['tech'], 'hybrid', 15, 'part_time', 'exploring_ideas', 'explore', null),
  ('af777777-7777-4777-8777-777777777777', 'df777777-7777-4777-8777-777777777777', 'paused', 'Paused Founder', 'Paused', array['operations'], array['tech'], 'onsite', 15, 'part_time', 'exploring_ideas', 'explore', now());

select set_config('request.jwt.claims', '{"sub":"da111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select extensions.lives_ok(
  $$insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
    values ('da111111-1111-4111-8111-111111111111', 'ab222222-2222-4222-8222-222222222222')$$,
  'founder can save another active Discovery profile'
);
select extensions.lives_ok(
  $$insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
    values ('da111111-1111-4111-8111-111111111111', 'ab222222-2222-4222-8222-222222222222')
    on conflict (owner_user_id, saved_profile_id) do nothing$$,
  'duplicate save is idempotent'
);
select extensions.is((select count(*)::integer from public.founder_discovery_saves), 1, 'duplicate save creates no duplicate row');
select extensions.is((select count(*)::integer from public.founder_discovery_saves where owner_user_id = auth.uid()), 1, 'owner can read own save');
select extensions.throws_ok(
  $$insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
    values ('da111111-1111-4111-8111-111111111111', 'aa111111-1111-4111-8111-111111111111')$$,
  '23514', 'discovery_save_self_not_allowed', 'founder cannot save own profile'
);
select extensions.throws_ok(
  $$insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
    values ('da111111-1111-4111-8111-111111111111', 'af666666-6666-4666-8666-666666666666')$$,
  '23514', 'discovery_save_target_not_active', 'draft profile cannot be newly saved'
);
select extensions.throws_ok(
  $$insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
    values ('da111111-1111-4111-8111-111111111111', 'af777777-7777-4777-8777-777777777777')$$,
  '23514', 'discovery_save_target_not_active', 'paused profile cannot be newly saved'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"db222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.founder_discovery_saves), 0, 'saved founder cannot read who saved the profile');

reset role;
select set_config('request.jwt.claims', '{"sub":"dd444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.founder_discovery_saves), 0, 'advisor-only account cannot read saves');
select extensions.throws_ok(
  $$insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
    values ('dd444444-4444-4444-8444-444444444444', 'ab222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'advisor-only account cannot create saves'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"de555555-5555-4555-8555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.founder_discovery_saves), 0, 'authenticated non-founder cannot read saves');
select extensions.throws_ok(
  $$insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
    values ('de555555-5555-4555-8555-555555555555', 'ab222222-2222-4222-8222-222222222222')$$,
  '42501', null, 'authenticated non-founder cannot create saves'
);

reset role;
set local role anon;
select extensions.throws_ok(
  $$select count(*) from public.founder_discovery_saves$$,
  '42501', null, 'unauthenticated client cannot read saves'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"da111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.founder_discovery_saves save_row
    join public.founder_discovery_profiles profile on profile.id = save_row.saved_profile_id
    where profile.status = 'active'),
  1, 'active saved profile is available through the existing active profile projection'
);

reset role;
update public.founder_discovery_profiles set status = 'paused' where id = 'ab222222-2222-4222-8222-222222222222';
select set_config('request.jwt.claims', '{"sub":"da111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.founder_discovery_saves save_row
    join public.founder_discovery_profiles profile on profile.id = save_row.saved_profile_id
    where profile.status = 'active'),
  0, 'paused saved profile is hidden by the active profile projection'
);
select extensions.is((select count(*)::integer from public.founder_discovery_saves), 1, 'save remains private while target profile is paused');

reset role;
update public.founder_discovery_profiles set status = 'active' where id = 'ab222222-2222-4222-8222-222222222222';
select set_config('request.jwt.claims', '{"sub":"da111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.founder_discovery_saves save_row
    join public.founder_discovery_profiles profile on profile.id = save_row.saved_profile_id
    where profile.status = 'active'),
  1, 'reactivated saved profile becomes visible again'
);
select extensions.lives_ok(
  $$delete from public.founder_discovery_saves
    where owner_user_id = 'da111111-1111-4111-8111-111111111111'
      and saved_profile_id = 'ab222222-2222-4222-8222-222222222222'$$,
  'owner can remove save'
);
select extensions.lives_ok(
  $$delete from public.founder_discovery_saves
    where owner_user_id = 'da111111-1111-4111-8111-111111111111'
      and saved_profile_id = 'ab222222-2222-4222-8222-222222222222'$$,
  'repeated remove is idempotent'
);
select extensions.is((select count(*)::integer from public.founder_discovery_saves), 0, 'removed save stays absent');

reset role;
insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
values
  ('da111111-1111-4111-8111-111111111111', 'ab222222-2222-4222-8222-222222222222'),
  ('da111111-1111-4111-8111-111111111111', 'ac333333-3333-4333-8333-333333333333');
delete from public.founder_discovery_profiles where id = 'ac333333-3333-4333-8333-333333333333';
select extensions.is((select count(*)::integer from public.founder_discovery_saves where saved_profile_id = 'ac333333-3333-4333-8333-333333333333'), 0, 'deleted target profile cascades its saves');
delete from public.profiles where user_id = 'da111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::integer from public.founder_discovery_saves where owner_user_id = 'da111111-1111-4111-8111-111111111111'), 0, 'deleted owner profile cascades owned saves');

select * from extensions.finish();
rollback;
