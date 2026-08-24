\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'founder team presentation assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '91111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'avatar-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '92222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'avatar-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '93333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'avatar-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'avatar-outsider@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (
  user_id, display_name, focus_skill, intention, avatar_id, avatar_url
)
values
  ('91111111-1111-4111-8111-111111111111', 'Alex', 'Product', 'Private A', 'avatar-1', null),
  ('92222222-2222-4222-8222-222222222222', 'Sam', 'Engineering', 'Private B', null, 'avatars/92222222-2222-4222-8222-222222222222/profile.webp'),
  ('93333333-3333-4333-8333-333333333333', 'Jo', 'Sales', 'Private C', null, null),
  ('94444444-4444-4444-8444-444444444444', 'Outsider', 'Finance', 'Private D', 'avatar-2', null);

insert into public.founder_teams (id, team_context)
values
  ('9a111111-1111-4111-8111-111111111111', 'existing_team'),
  ('9a222222-2222-4222-8222-222222222222', 'pre_founder');

insert into public.founder_team_members (team_id, user_id, created_at)
values
  ('9a111111-1111-4111-8111-111111111111', '91111111-1111-4111-8111-111111111111', now()),
  ('9a111111-1111-4111-8111-111111111111', '92222222-2222-4222-8222-222222222222', now() + interval '1 second'),
  ('9a111111-1111-4111-8111-111111111111', '93333333-3333-4333-8333-333333333333', now() + interval '2 seconds'),
  ('9a222222-2222-4222-8222-222222222222', '94444444-4444-4444-8444-444444444444', now());

select set_config(
  'request.jwt.claims',
  '{"sub":"91111111-1111-4111-8111-111111111111","email":"avatar-a@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 3 from public.get_founder_team_member_presentations('9a111111-1111-4111-8111-111111111111')),
  'member A cannot read all three current team presentations'
);
select pg_temp.assert_true(
  (
    select avatar_url = 'avatars/92222222-2222-4222-8222-222222222222/profile.webp'
    from public.get_founder_team_member_presentations('9a111111-1111-4111-8111-111111111111')
    where user_id = '92222222-2222-4222-8222-222222222222'
  ),
  'member A cannot read member B avatar presentation'
);
select pg_temp.assert_true(
  (
    select bool_and(
      to_jsonb(presentation) ?& array['user_id', 'display_name', 'avatar_id', 'avatar_url']
      and not (to_jsonb(presentation) ?| array['email', 'focus_skill', 'intention', 'phone', 'bio'])
    )
    from public.get_founder_team_member_presentations('9a111111-1111-4111-8111-111111111111') presentation
  ),
  'projection exposes fields beyond team member presentation data'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.get_founder_team_member_presentations('9a222222-2222-4222-8222-222222222222')),
  'member A can read team Y'
);
select pg_temp.assert_true(
  (select count(*) = 1 from public.profiles),
  'narrow function changed direct profiles self-only RLS'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"92222222-2222-4222-8222-222222222222","email":"avatar-b@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 3 from public.get_founder_team_member_presentations('9a111111-1111-4111-8111-111111111111')),
  'member B cannot read member A presentation'
);
select pg_temp.assert_true(
  (
    select avatar_id = 'avatar-1'
    from public.get_founder_team_member_presentations('9a111111-1111-4111-8111-111111111111')
    where user_id = '91111111-1111-4111-8111-111111111111'
  ),
  'member B cannot read member A avatar presentation'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"94444444-4444-4444-8444-444444444444","email":"avatar-outsider@example.com","role":"authenticated"}',
  true
);
set local role authenticated;
select pg_temp.assert_true(
  (select count(*) = 0 from public.get_founder_team_member_presentations('9a111111-1111-4111-8111-111111111111')),
  'nonmember can read team X presentations'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.get_founder_team_member_presentations('9affffff-ffff-4fff-8fff-ffffffffffff')),
  'unknown team id exposes presentation data'
);
reset role;

select pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'public.get_founder_team_member_presentations(uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.get_founder_team_member_presentations(uuid)',
    'EXECUTE'
  ),
  'function grants are broader or narrower than intended'
);

select extensions.pass('founder team member presentation projection enforces privacy and membership');
select * from extensions.finish();

rollback;
