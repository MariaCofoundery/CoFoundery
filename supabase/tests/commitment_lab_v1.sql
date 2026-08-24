\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_commitment(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'commitment lab assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'lab-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'lab-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'lab-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'lab-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values
  ('cb111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('cb111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111'),
  ('cb111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222');
insert into public.relationships(id, user_a_id, user_b_id, founder_team_id) values
  ('ca111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222', 'cb111111-1111-4111-8111-111111111111');

select set_config('request.jwt.claims', '{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.save_commitment_lab_founder_entry(
  'ca111111-1111-4111-8111-111111111111', 24::smallint, 8::smallint,
  array['employment','family_care'], 'Project milestone', 'partly',
  'I communicate changes early', 'One of two priorities', 'Keep ownership visible',
  'Raise changes early', 'Hand over tasks', 'Discuss a new commitment',
  '{"motivation_progress":{"action":"Talk","expectation":"Transparency"},"time_circumstances":{"action":"Replan","expectation":"Early notice"},"attractive_alternative":{"action":"Discuss","expectation":"No surprise"},"team_responsibility":{"action":"Address it","expectation":"Shared plan"}}'::jsonb
);
select public.save_commitment_lab_shared_reflection(
  'ca111111-1111-4111-8111-111111111111', 'We discuss changing capacity early.'
);
select pg_temp.assert_commitment(
  public.handoff_commitment_lab_reflection_if_empty(
    'ca111111-1111-4111-8111-111111111111',
    'cb111111-1111-4111-8111-111111111111',
    'time_commitment'
  ),
  'explicit two-founder handoff did not write the empty working note'
);
select pg_temp.assert_commitment(
  (select working_note = 'We discuss changing capacity early.'
   from public.founder_team_setup_items
   where team_id = 'cb111111-1111-4111-8111-111111111111'
     and item_key = 'time_commitment')
  and (select count(*) = 0 from public.founder_team_setup_revisions)
  and (select count(*) = 0 from public.founder_team_setup_confirmations),
  'handoff changed confirmed Founder Setup semantics'
);
select pg_temp.assert_commitment(
  not public.handoff_commitment_lab_reflection_if_empty(
    'ca111111-1111-4111-8111-111111111111',
    'cb111111-1111-4111-8111-111111111111',
    'time_commitment'
  ),
  'handoff overwrote an existing working note'
);
do $$ begin
  begin
    perform public.save_commitment_lab_founder_entry(
      'ca111111-1111-4111-8111-111111111111', 10::smallint, 5::smallint,
      '{}'::text[], '', 'realistic', '', '', '', '', '', '',
      '{"fabricated_score":{"action":"No","expectation":"No"}}'::jsonb
    );
    raise exception 'unknown scenario unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
end $$;
select public.create_commitment_lab_discussion_entry(
  'ca111111-1111-4111-8111-111111111111', 'What does our commitment mean?', null
);
select pg_temp.assert_commitment(
  (select current_hours = 24 and difficult_week_hours = 8 and user_id = 'c1111111-1111-4111-8111-111111111111'
   from public.commitment_lab_founder_entries),
  'founder A personal reality data was not stored under founder A'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select public.save_commitment_lab_founder_entry(
  'ca111111-1111-4111-8111-111111111111', 32::smallint, 12::smallint,
  array['self_employment'], '', 'realistic',
  'I remain accountable during slower phases', 'Primary priority', 'Renegotiate explicitly',
  'Share likely changes', 'Finish or hand over', 'Legitimate after an open conversation',
  '{"motivation_progress":{"action":"Review","expectation":"Honesty"},"time_circumstances":{"action":"Reduce scope","expectation":"Notice"},"attractive_alternative":{"action":"Compare options","expectation":"Conversation"},"team_responsibility":{"action":"Ask directly","expectation":"Repair"}}'::jsonb
);
select pg_temp.assert_commitment(
  (select count(*) = 2 and count(distinct user_id) = 2 from public.commitment_lab_founder_entries),
  'founder B overwrote founder A instead of creating a separate perspective'
);
select pg_temp.assert_commitment(
  (select count(*) = 1 from public.commitment_lab_discussion_entries),
  'relationship participant cannot read the shared discussion'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_commitment(
  (select count(*) = 0 from public.commitment_labs)
  and (select count(*) = 0 from public.commitment_lab_founder_entries)
  and (select count(*) = 0 from public.commitment_lab_discussion_entries),
  'stranger can read Commitment Lab content'
);
do $$ begin
  begin
    perform public.save_commitment_lab_shared_reflection(
      'ca111111-1111-4111-8111-111111111111', 'Foreign write'
    );
    raise exception 'stranger unexpectedly wrote shared reflection';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

insert into public.founder_team_members(team_id, user_id) values
  ('cb111111-1111-4111-8111-111111111111', 'c3333333-3333-4333-8333-333333333333');
select set_config('request.jwt.claims', '{"sub":"c1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.handoff_commitment_lab_reflection_if_empty(
      'ca111111-1111-4111-8111-111111111111',
      'cb111111-1111-4111-8111-111111111111',
      'changing_commitment'
    );
    raise exception 'pairwise reflection unexpectedly changed a three-founder team note';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.assert_commitment(
  not exists (
    select 1 from public.founder_team_setup_items
    where team_id = 'cb111111-1111-4111-8111-111111111111'
      and item_key = 'changing_commitment'
  ),
  'three-founder handoff created a team-wide working note'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"c4444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_commitment(
  (select count(*) = 0 from public.commitment_labs)
  and (select count(*) = 0 from public.commitment_lab_founder_entries),
  'advisor receives automatic Commitment Lab access'
);
do $$ begin
  begin
    insert into public.commitment_lab_founder_entries(relationship_id, user_id)
    values ('ca111111-1111-4111-8111-111111111111', 'c4444444-4444-4444-8444-444444444444');
    raise exception 'direct table mutation unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select extensions.pass('Commitment Lab is pairwise, founder-owned, score-free, and closed to strangers and advisors');
select * from extensions.finish();
rollback;
