\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_discussion(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'setup discussion assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'discussion-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'discussion-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'discussion-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values
  ('ea111111-1111-4111-8111-111111111111', 'existing_team'),
  ('ea222222-2222-4222-8222-222222222222', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('ea111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111'),
  ('ea111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222'),
  ('ea222222-2222-4222-8222-222222222222', 'e3333333-3333-4333-8333-333333333333');

select set_config('request.jwt.claims', '{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.create_founder_team_setup_discussion_entry(
  'ea111111-1111-4111-8111-111111111111', 'decision_rights', 'Erster Beitrag', null
);
select public.create_founder_team_setup_discussion_entry(
  'ea111111-1111-4111-8111-111111111111',
  'decision_rights',
  'Eine Antwort',
  (select id from public.founder_team_setup_discussion_entries where body = 'Erster Beitrag')
);
select pg_temp.assert_discussion(
  (select count(*) = 2 from public.founder_team_setup_discussion_entries),
  'member post and reply were not stored'
);
do $$ begin
  begin
    perform public.create_founder_team_setup_discussion_entry(
      'ea111111-1111-4111-8111-111111111111', 'invalid_key', 'No', null
    );
    raise exception 'invalid key unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
end $$;
do $$ begin
  begin
    perform public.create_founder_team_setup_discussion_entry(
      'ea111111-1111-4111-8111-111111111111',
      'decision_rights',
      'Nested',
      (select id from public.founder_team_setup_discussion_entries where body = 'Eine Antwort')
    );
    raise exception 'nested reply unexpectedly accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_discussion(
  (select count(*) = 2 from public.founder_team_setup_discussion_entries),
  'other current member cannot read the discussion'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"e3333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_discussion(
  (select count(*) = 0 from public.founder_team_setup_discussion_entries),
  'nonmember can read another team discussion'
);
do $$ begin
  begin
    perform public.create_founder_team_setup_discussion_entry(
      'ea111111-1111-4111-8111-111111111111', 'decision_rights', 'Foreign', null
    );
    raise exception 'nonmember unexpectedly wrote discussion';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select extensions.pass('setup discussion is member-only, item-bound, and one reply level deep');
select * from extensions.finish();
rollback;
