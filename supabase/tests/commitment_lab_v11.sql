\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_v11(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'commitment lab v1.1 assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'v11-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'v11-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'v11-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'v11-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.relationships(id, user_a_id, user_b_id) values
  ('da111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111', 'd2222222-2222-4222-8222-222222222222');

select set_config('request.jwt.claims', '{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.save_commitment_lab_founder_entry_v11(
  'da111111-1111-4111-8111-111111111111', 24::smallint, 8::smallint,
  array['employment'], 'A possible change', 'partly',
  'I communicate changes early', 'Priority answer', 'Reliability answer',
  'Transparency answer', 'Responsibility answer', 'Renegotiation answer',
  '{"motivation_progress":{"action":"Talk","expectation":"Honesty"},"time_circumstances":{"action":"Replan","expectation":"Notice"},"attractive_alternative":{"action":"Discuss","expectation":"No surprise"},"team_responsibility":{"action":"Address","expectation":"Repair"}}'::jsonb,
  'Silence about reduced capacity', 'An early conversation',
  array['commitment_meaning','scenario:attractive_alternative','difficulty_wish']
);
select pg_temp.assert_v11(
  (select difficult_situation = 'Silence about reduced capacity'
      and desired_alternative = 'An early conversation'
      and cardinality(discussion_markers) = 3
   from public.commitment_lab_founder_entries
   where user_id = 'd1111111-1111-4111-8111-111111111111'),
  'founder A V1.1 fields or three markers were not saved'
);
do $$ begin
  begin
    perform public.save_commitment_lab_founder_entry_v11(
      'da111111-1111-4111-8111-111111111111', 24::smallint, 8::smallint,
      '{}'::text[], '', 'partly', 'Meaning', 'Priority', 'Reliability', 'Transparency',
      'Responsibility', 'Renegotiation',
      '{"motivation_progress":{"action":"A","expectation":"B"},"time_circumstances":{"action":"A","expectation":"B"},"attractive_alternative":{"action":"A","expectation":"B"},"team_responsibility":{"action":"A","expectation":"B"}}'::jsonb,
      'Difficult', 'Desired',
      array['commitment_meaning','aspect:priority','aspect:reliability','difficulty_wish']
    );
    raise exception 'fourth marker unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
end $$;
do $$ begin
  begin
    perform public.save_commitment_lab_founder_entry_v11(
      'da111111-1111-4111-8111-111111111111', 24::smallint, 8::smallint,
      '{}'::text[], '', 'partly', '', 'Priority', 'Reliability', 'Transparency',
      'Responsibility', 'Renegotiation', '{}'::jsonb, '', '', array['commitment_meaning']
    );
    raise exception 'marker without answer unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select public.save_commitment_lab_founder_entry_v11(
  'da111111-1111-4111-8111-111111111111', 30::smallint, 12::smallint,
  array['self_employment'], '', 'realistic',
  'My own meaning', 'My priority', 'My reliability', 'My transparency',
  'My responsibility', 'My renegotiation',
  '{"motivation_progress":{"action":"Review","expectation":"Honesty"},"time_circumstances":{"action":"Reduce scope","expectation":"Notice"},"attractive_alternative":{"action":"Compare","expectation":"Conversation"},"team_responsibility":{"action":"Ask","expectation":"Repair"}}'::jsonb,
  'Unclear expectations', 'Clear expectations', array['difficulty_wish']
);
select pg_temp.assert_v11(
  (select discussion_markers = array['commitment_meaning','scenario:attractive_alternative','difficulty_wish']
   from public.commitment_lab_founder_entries
   where user_id = 'd1111111-1111-4111-8111-111111111111')
  and
  (select discussion_markers = array['difficulty_wish']
   from public.commitment_lab_founder_entries
   where user_id = 'd2222222-2222-4222-8222-222222222222'),
  'founder B overwrote founder A markers'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.save_commitment_lab_founder_entry_v11(
  'da111111-1111-4111-8111-111111111111', 24::smallint, 8::smallint,
  array['employment'], 'A possible change', 'partly',
  'I communicate changes early', 'Priority answer', 'Reliability answer',
  'Transparency answer', 'Responsibility answer', 'Renegotiation answer',
  '{"motivation_progress":{"action":"Talk","expectation":"Honesty"},"time_circumstances":{"action":"Replan","expectation":"Notice"},"attractive_alternative":{"action":"Discuss","expectation":"No surprise"},"team_responsibility":{"action":"Address","expectation":"Repair"}}'::jsonb,
  'Silence about reduced capacity', '',
  array['commitment_meaning','difficulty_wish']
);
select pg_temp.assert_v11(
  (select discussion_markers = array['commitment_meaning','difficulty_wish']
      and difficult_situation = 'Silence about reduced capacity'
      and desired_alternative = ''
   from public.commitment_lab_founder_entries
   where user_id = 'd1111111-1111-4111-8111-111111111111'),
  'founder A could not remove a marker'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"d3333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_v11(
  (select count(*) = 0 from public.commitment_lab_founder_entries),
  'stranger can read V1.1 personal content or markers'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"d4444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_v11(
  (select count(*) = 0 from public.commitment_lab_founder_entries),
  'advisor receives automatic V1.1 access'
);
reset role;

select extensions.pass('V1.1 fields and up to three founder-owned markers are private, answer-bound, removable, and isolated');
select * from extensions.finish();
rollback;
