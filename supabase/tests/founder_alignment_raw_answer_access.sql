\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_raw_answer_access(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'raw answer access assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'fa111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'raw-founder-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'fb222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'raw-founder-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'fc333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'raw-stranger@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'fd444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'raw-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.relationships (id, user_a_id, user_b_id)
values (
  'fe555555-5555-4555-8555-555555555555',
  'fa111111-1111-4111-8111-111111111111',
  'fb222222-2222-4222-8222-222222222222'
);

insert into public.invitations (
  id, inviter_user_id, invitee_email, invitee_user_id, status, token_hash,
  expires_at, accepted_at, team_context
) values (
  'ff666666-6666-4666-8666-666666666666',
  'fa111111-1111-4111-8111-111111111111',
  'raw-founder-b@example.com',
  'fb222222-2222-4222-8222-222222222222',
  'accepted',
  repeat('f', 64),
  now() + interval '1 day',
  now(),
  'pre_founder'
);

insert into public.assessments (id, user_id, module, submitted_at) values
  ('fa777777-7777-4777-8777-777777777771', 'fa111111-1111-4111-8111-111111111111', 'base', now()),
  ('fa777777-7777-4777-8777-777777777772', 'fa111111-1111-4111-8111-111111111111', 'values', now()),
  ('fb888888-8888-4888-8888-888888888881', 'fb222222-2222-4222-8222-222222222222', 'base', now()),
  ('fb888888-8888-4888-8888-888888888882', 'fb222222-2222-4222-8222-222222222222', 'values', now());

insert into public.assessment_answers (assessment_id, question_id, choice_value) values
  ('fa777777-7777-4777-8777-777777777771', 'D1_Q1', '1'),
  ('fa777777-7777-4777-8777-777777777772', 'wv2_1', '1'),
  ('fb888888-8888-4888-8888-888888888881', 'D1_Q1', '4'),
  ('fb888888-8888-4888-8888-888888888882', 'wv2_1', '4');

-- Accepted invitation, active relationship, and submitted assessments do not
-- grant either founder access to the other founder's base or Values choices.
select set_config('request.jwt.claims', '{"sub":"fa111111-1111-4111-8111-111111111111","email":"raw-founder-a@example.com","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_raw_answer_access(
  (select count(*) = 2 from public.assessment_answers),
  'Founder A cannot read both own base and Values answers'
);
select pg_temp.assert_raw_answer_access(
  (select count(*) = 0 from public.assessment_answers where assessment_id in (
    'fb888888-8888-4888-8888-888888888881',
    'fb888888-8888-4888-8888-888888888882'
  )),
  'Founder A can read Founder B raw answers'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"fb222222-2222-4222-8222-222222222222","email":"raw-founder-b@example.com","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_raw_answer_access(
  (select count(*) = 2 from public.assessment_answers),
  'Founder B cannot read both own base and Values answers'
);
select pg_temp.assert_raw_answer_access(
  (select count(*) = 0 from public.assessment_answers where assessment_id in (
    'fa777777-7777-4777-8777-777777777771',
    'fa777777-7777-4777-8777-777777777772'
  )),
  'Founder B can read Founder A raw answers'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"fc333333-3333-4333-8333-333333333333","email":"raw-stranger@example.com","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_raw_answer_access(
  (select count(*) = 0 from public.assessment_answers),
  'stranger can read raw answers'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"fd444444-4444-4444-8444-444444444444","email":"raw-advisor@example.com","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_raw_answer_access(
  (select count(*) = 0 from public.assessment_answers),
  'advisor can read raw answers'
);
reset role;

-- The trusted server path can still compute and persist the derived report.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select pg_temp.assert_raw_answer_access(
  (select count(*) = 4 from public.assessment_answers),
  'trusted report context cannot read the required inputs'
);
select * from public.finalize_invitation_if_ready(
  'ff666666-6666-4666-8666-666666666666',
  '{"reportType":"founder_alignment_v1","report":{"derived":true}}'::jsonb
);
reset role;

select set_config('request.jwt.claims', '{"sub":"fa111111-1111-4111-8111-111111111111","email":"raw-founder-a@example.com","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_raw_answer_access(
  (select count(*) = 1 from public.report_runs where invitation_id = 'ff666666-6666-4666-8666-666666666666'),
  'Founder A cannot read the derived report snapshot'
);
select pg_temp.assert_raw_answer_access(
  (select count(*) = 0 from public.assessment_answers where assessment_id in (
    'fb888888-8888-4888-8888-888888888881',
    'fb888888-8888-4888-8888-888888888882'
  )),
  'derived report creation reopened Founder B raw answers to Founder A'
);
reset role;

select extensions.pass('founder raw-answer access is owner-only while derived reports remain readable');
select * from extensions.finish();

rollback;
