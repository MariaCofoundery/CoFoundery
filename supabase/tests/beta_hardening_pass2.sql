\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_pass2(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'beta hardening pass 2 assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'b2111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'pass2-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'pass2-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'pass2-stranger@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'pass2-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.relationships(id, user_a_id, user_b_id) values
  ('b2a11111-1111-4111-8111-111111111111', 'b2111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');

select set_config('request.jwt.claims', '{"sub":"b2111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select pg_temp.assert_pass2(
  not public.is_commitment_lab_complete('b2a11111-1111-4111-8111-111111111111'),
  'an unstarted lab is complete'
);

select public.save_commitment_lab_founder_entry_v11(
  'b2a11111-1111-4111-8111-111111111111', 24::smallint, 8::smallint,
  '{}'::text[], '', 'realistic', 'Meaning A', 'Priority A', 'Reliability A',
  'Transparency A', 'Responsibility A', 'Renegotiation A',
  '{"motivation_progress":{"action":"A","expectation":"A"},"time_circumstances":{"action":"A","expectation":"A"},"attractive_alternative":{"action":"A","expectation":"A"},"team_responsibility":{"action":"A","expectation":"A"}}'::jsonb,
  '', '', '{}'::text[]
);
select public.save_commitment_lab_shared_reflection(
  'b2a11111-1111-4111-8111-111111111111', 'Shared reflection'
);
select pg_temp.assert_pass2(
  not public.is_commitment_lab_complete('b2a11111-1111-4111-8111-111111111111'),
  'one founder plus a shared reflection is complete'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select public.save_commitment_lab_founder_entry_v11(
  'b2a11111-1111-4111-8111-111111111111', 32::smallint, 12::smallint,
  '{}'::text[], '', 'partly', 'Meaning B', 'Priority B', 'Reliability B',
  'Transparency B', 'Responsibility B', 'Renegotiation B',
  '{"motivation_progress":{"action":"B","expectation":"B"},"time_circumstances":{"action":"B","expectation":"B"},"attractive_alternative":{"action":"B","expectation":"B"},"team_responsibility":{"action":"B","expectation":"B"}}'::jsonb,
  '', '', '{}'::text[]
);
select pg_temp.assert_pass2(
  public.is_commitment_lab_complete('b2a11111-1111-4111-8111-111111111111'),
  'two complete founder entries plus shared reflection are not complete'
);
select public.save_commitment_lab_shared_reflection(
  'b2a11111-1111-4111-8111-111111111111', ''
);
select pg_temp.assert_pass2(
  not public.is_commitment_lab_complete('b2a11111-1111-4111-8111-111111111111'),
  'clearing the shared reflection leaves the lab complete'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"b2333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.is_commitment_lab_complete('b2a11111-1111-4111-8111-111111111111');
    raise exception 'stranger read completion state';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"b2444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.is_commitment_lab_complete('b2a11111-1111-4111-8111-111111111111');
    raise exception 'advisor read completion state';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select extensions.pass('Commitment completion is derived from both required founder entries plus shared reflection and remains founder-only');
select * from extensions.finish();

rollback;
