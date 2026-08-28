\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_rmm_lifecycle(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'read my mind lifecycle assertion failed: %', message;
  end if;
end;
$$;

create temporary table rmm_round_refs (
  label text primary key,
  round_id uuid not null
) on commit drop;

create temporary table rmm_lifecycle_times (
  label text primary key,
  value timestamptz not null
) on commit drop;

grant select on pg_temp.rmm_round_refs to authenticated, anon;

create or replace function pg_temp.rmm_ref(p_label text)
returns uuid language sql stable as $$
  select round_id from pg_temp.rmm_round_refs where label = p_label
$$;

create or replace function pg_temp.fill_rmm_lifecycle_answers(p_round_id uuid)
returns void language sql as $$
  insert into public.collaboration_experience_responses (
    round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys
  )
  select assignment.round_id, assignment.id, participant.founder_user_id,
         required_slot.response_type, array[contract.allowed_choice_keys[1]]
  from public.collaboration_experience_prompt_assignments assignment
  join public.collaboration_experience_round_prompts round_prompt
    on round_prompt.id = assignment.round_prompt_id
   and round_prompt.round_id = assignment.round_id
  join public.collaboration_experience_prompt_versions prompt
    on prompt.experience_key = round_prompt.experience_key
   and prompt.pack_key = round_prompt.pack_key
   and prompt.pack_version = round_prompt.pack_version
   and prompt.prompt_key = round_prompt.prompt_key
   and prompt.prompt_version = round_prompt.prompt_version
  join public.collaboration_experience_round_participants participant
    on participant.round_id = assignment.round_id
   and participant.state = 'joined'
  cross join lateral (
    select case when participant.founder_user_id = assignment.target_user_id
      then 'self' else 'guess' end::text response_type
    union all
    select 'need' where participant.founder_user_id <> assignment.target_user_id
      and prompt.need_mode = 'required'
  ) required_slot
  join public.collaboration_experience_prompt_response_contracts contract
    on contract.experience_key = round_prompt.experience_key
   and contract.pack_key = round_prompt.pack_key
   and contract.pack_version = round_prompt.pack_version
   and contract.prompt_key = round_prompt.prompt_key
   and contract.prompt_version = round_prompt.prompt_version
   and contract.response_type = required_slot.response_type
  where assignment.round_id = p_round_id;
$$;

create or replace function pg_temp.open_rmm_lifecycle_reveal(
  p_round_id uuid,
  p_position integer
)
returns void language plpgsql as $$
declare
  v_round_prompt_id uuid;
begin
  select round_prompt.id into v_round_prompt_id
  from public.collaboration_experience_round_prompts round_prompt
  where round_prompt.round_id = p_round_id
    and round_prompt.position = p_position;
  perform public.get_collaboration_prompt_reveal(v_round_prompt_id);
end;
$$;

create or replace function pg_temp.seed_rmm_lifecycle_receipts(p_round_id uuid)
returns void language sql as $$
  insert into public.collaboration_experience_reveal_receipts (
    round_id, round_prompt_id, participant_user_id
  )
  select p_round_id, round_prompt.id, participant.founder_user_id
  from public.collaboration_experience_round_prompts round_prompt
  cross join public.collaboration_experience_round_participants participant
  where round_prompt.round_id = p_round_id
    and participant.round_id = p_round_id
    and participant.state = 'joined';
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','b1111111-1111-4111-8111-111111111111','authenticated','authenticated','lifecycle-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-4222-8222-222222222222','authenticated','authenticated','lifecycle-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b3333333-3333-4333-8333-333333333333','authenticated','authenticated','lifecycle-c@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b4444444-4444-4444-8444-444444444444','authenticated','authenticated','lifecycle-advisor@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','b5555555-5555-4555-8555-555555555555','authenticated','authenticated','lifecycle-stranger@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams (id, name, team_context) values
  ('bb111111-1111-4111-8111-111111111111','Lifecycle Forming','existing_team'),
  ('bb222222-2222-4222-8222-222222222222','Lifecycle Reveal Privacy','existing_team'),
  ('bb333333-3333-4333-8333-333333333333','Lifecycle Completed','existing_team'),
  ('bb444444-4444-4444-8444-444444444444','Lifecycle Membership','existing_team'),
  ('bb555555-5555-4555-8555-555555555555','Lifecycle Trio','existing_team');

insert into public.founder_team_members (team_id, user_id, created_at) values
  ('bb111111-1111-4111-8111-111111111111','b1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('bb111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('bb222222-2222-4222-8222-222222222222','b1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('bb222222-2222-4222-8222-222222222222','b2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('bb333333-3333-4333-8333-333333333333','b1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('bb333333-3333-4333-8333-333333333333','b2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('bb444444-4444-4444-8444-444444444444','b1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('bb444444-4444-4444-8444-444444444444','b2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('bb555555-5555-4555-8555-555555555555','b1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('bb555555-5555-4555-8555-555555555555','b2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('bb555555-5555-4555-8555-555555555555','b3333333-3333-4333-8333-333333333333','2026-01-03');

-- Make the nonparticipant authorization fixture a real linked advisor.
insert into public.relationships (id, user_a_id, user_b_id, founder_team_id)
values (
  'bc111111-1111-4111-8111-111111111111',
  'b1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222',
  'bb222222-2222-4222-8222-222222222222'
);
insert into public.relationship_advisors (
  relationship_id, advisor_user_id, advisor_email, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  'bc111111-1111-4111-8111-111111111111',
  'b4444444-4444-4444-8444-444444444444',
  'lifecycle-advisor@example.com', 'linked', true, true, now(), now()
);

-- A pending participant cannot abandon; the joined creator can abandon forming.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('bb111111-1111-4111-8111-111111111111','easy_start',1);
reset role;
insert into pg_temp.rmm_round_refs
select 'forming_r1', id from public.collaboration_experience_rounds
where founder_team_id = 'bb111111-1111-4111-8111-111111111111' and status = 'forming';

select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.abandon_collaboration_experience_round(pg_temp.rmm_ref('forming_r1')); raise exception 'pending participant abandoned round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select * from public.abandon_collaboration_experience_round(pg_temp.rmm_ref('forming_r1'));
reset role;
insert into pg_temp.rmm_lifecycle_times
select 'forming_abandoned', abandoned_at from public.collaboration_experience_rounds
where id = pg_temp.rmm_ref('forming_r1');
select pg_temp.assert_rmm_lifecycle(
  (select status = 'abandoned' and abandoned_at is not null
   from public.collaboration_experience_rounds where id = pg_temp.rmm_ref('forming_r1')),
  'joined creator could not abandon forming round'
);

-- Repeated authorized abandonment is a no-op and preserves the timestamp.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select * from public.abandon_collaboration_experience_round(pg_temp.rmm_ref('forming_r1'));
reset role;
select pg_temp.assert_rmm_lifecycle(
  (select abandoned_at = (select value from pg_temp.rmm_lifecycle_times where label = 'forming_abandoned')
   from public.collaboration_experience_rounds where id = pg_temp.rmm_ref('forming_r1')),
  'idempotent abandon changed abandoned_at'
);

-- Abandon frees the partial unique index; pending decline remains a separate operation.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('bb111111-1111-4111-8111-111111111111','how_we_work',1);
reset role;
insert into pg_temp.rmm_round_refs
select 'forming_r2', id from public.collaboration_experience_rounds
where founder_team_id = 'bb111111-1111-4111-8111-111111111111' and status = 'forming';
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.decline_collaboration_experience_round(pg_temp.rmm_ref('forming_r2'));
reset role;
select pg_temp.assert_rmm_lifecycle(
  (select status = 'abandoned' from public.collaboration_experience_rounds where id = pg_temp.rmm_ref('forming_r2'))
  and
  (select state = 'declined' from public.collaboration_experience_round_participants
   where round_id = pg_temp.rmm_ref('forming_r2') and founder_user_id = 'b2222222-2222-4222-8222-222222222222'),
  'pending decline contract was not preserved'
);

-- Active privacy fixture: complete answers, but each founder opens only prompt 1.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('bb222222-2222-4222-8222-222222222222','easy_start',1);
reset role;
insert into pg_temp.rmm_round_refs
select 'privacy_active', id from public.collaboration_experience_rounds
where founder_team_id = 'bb222222-2222-4222-8222-222222222222' and status = 'forming';
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_ref('privacy_active'));
reset role;
select pg_temp.fill_rmm_lifecycle_answers(pg_temp.rmm_ref('privacy_active'));

select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_lifecycle_reveal(pg_temp.rmm_ref('privacy_active'),0);
reset role;
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_lifecycle_reveal(pg_temp.rmm_ref('privacy_active'),0);
reset role;

-- Advisor and stranger have no abandon authority even while the round is active.
select set_config('request.jwt.claims','{"sub":"b4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.abandon_collaboration_experience_round(pg_temp.rmm_ref('privacy_active')); raise exception 'advisor abandoned round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"b5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.abandon_collaboration_experience_round(pg_temp.rmm_ref('privacy_active')); raise exception 'stranger abandoned round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select * from public.abandon_collaboration_experience_round(pg_temp.rmm_ref('privacy_active'));
reset role;

-- Abandoned rounds cannot expose another prompt, create receipts, accept responses, or complete.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform pg_temp.open_rmm_lifecycle_reveal(pg_temp.rmm_ref('privacy_active'),1); raise exception 'founder A opened reveal after abandon';
  exception when insufficient_privilege then null; end;
  begin
    perform public.lock_collaboration_response(
      (select id from public.collaboration_experience_prompt_assignments
       where round_id = pg_temp.rmm_ref('privacy_active')
         and target_user_id = 'b1111111-1111-4111-8111-111111111111' limit 1),
      'self', array['not_reached']
    );
    raise exception 'founder A locked response after abandon';
  exception when insufficient_privilege then null; end;
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_ref('privacy_active')); raise exception 'abandoned round completed';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.assert_rmm_lifecycle(
  (select count(*) > 0 from public.collaboration_experience_responses
   where round_id = pg_temp.rmm_ref('privacy_active') and respondent_user_id = auth.uid())
  and
  (select count(*) = 0 from public.collaboration_experience_responses
   where round_id = pg_temp.rmm_ref('privacy_active') and respondent_user_id <> auth.uid()),
  'direct response select leaked another founder response after abandon'
);
reset role;

select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform pg_temp.open_rmm_lifecycle_reveal(pg_temp.rmm_ref('privacy_active'),1); raise exception 'founder B opened reveal after abandon';
  exception when insufficient_privilege then null; end;
  begin
    perform public.lock_collaboration_response(
      (select id from public.collaboration_experience_prompt_assignments
       where round_id = pg_temp.rmm_ref('privacy_active')
         and target_user_id = 'b2222222-2222-4222-8222-222222222222' limit 1),
      'self', array['not_reached']
    );
    raise exception 'founder B locked response after abandon';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.assert_rmm_lifecycle(
  (select count(*) = 2 from public.collaboration_experience_reveal_receipts
   where round_id = pg_temp.rmm_ref('privacy_active')),
  'abandon allowed a new reveal receipt'
);

-- Active abandon also frees the team for a new round.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('bb222222-2222-4222-8222-222222222222','how_we_work',1);
reset role;
select pg_temp.assert_rmm_lifecycle(
  (select count(*) = 1 from public.collaboration_experience_rounds
   where founder_team_id = 'bb222222-2222-4222-8222-222222222222' and status = 'forming'),
  'active abandon did not release the open-round constraint'
);

-- Completion wins terminally: completed cannot transition to abandoned.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('bb333333-3333-4333-8333-333333333333','easy_start',1);
reset role;
insert into pg_temp.rmm_round_refs
select 'completed_round', id from public.collaboration_experience_rounds
where founder_team_id = 'bb333333-3333-4333-8333-333333333333' and status = 'forming';
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_ref('completed_round'));
reset role;
select pg_temp.fill_rmm_lifecycle_answers(pg_temp.rmm_ref('completed_round'));
select pg_temp.seed_rmm_lifecycle_receipts(pg_temp.rmm_ref('completed_round'));
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select * from public.complete_collaboration_experience_round(pg_temp.rmm_ref('completed_round'));
reset role;
insert into pg_temp.rmm_lifecycle_times
select 'completed', completed_at from public.collaboration_experience_rounds
where id = pg_temp.rmm_ref('completed_round');
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.abandon_collaboration_experience_round(pg_temp.rmm_ref('completed_round')); raise exception 'completed round abandoned';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.assert_rmm_lifecycle(
  (select status = 'completed'
      and completed_at = (select value from pg_temp.rmm_lifecycle_times where label = 'completed')
      and abandoned_at is null
   from public.collaboration_experience_rounds where id = pg_temp.rmm_ref('completed_round')),
  'completed terminal state changed during abandon attempt'
);

-- Membership lifecycle: a newly added nonparticipant and a removed former member are denied.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('bb444444-4444-4444-8444-444444444444','easy_start',1);
reset role;
insert into pg_temp.rmm_round_refs
select 'membership_round', id from public.collaboration_experience_rounds
where founder_team_id = 'bb444444-4444-4444-8444-444444444444' and status = 'forming';
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_ref('membership_round'));
reset role;
insert into public.founder_team_members (team_id, user_id)
values ('bb444444-4444-4444-8444-444444444444','b3333333-3333-4333-8333-333333333333');
select set_config('request.jwt.claims','{"sub":"b3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.abandon_collaboration_experience_round(pg_temp.rmm_ref('membership_round')); raise exception 'nonparticipant team member abandoned round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from public.founder_team_members
where team_id = 'bb444444-4444-4444-8444-444444444444'
  and user_id = 'b1111111-1111-4111-8111-111111111111';
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.abandon_collaboration_experience_round(pg_temp.rmm_ref('membership_round')); raise exception 'former member abandoned round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select * from public.abandon_collaboration_experience_round(pg_temp.rmm_ref('membership_round'));
reset role;

-- Three-founder foundation remains team-scoped: any joined founder may abandon active.
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('bb555555-5555-4555-8555-555555555555','easy_start',1);
reset role;
insert into pg_temp.rmm_round_refs
select 'trio_round', id from public.collaboration_experience_rounds
where founder_team_id = 'bb555555-5555-4555-8555-555555555555' and status = 'forming';
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_ref('trio_round'));
reset role;
select set_config('request.jwt.claims','{"sub":"b3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_ref('trio_round'));
select * from public.abandon_collaboration_experience_round(pg_temp.rmm_ref('trio_round'));
reset role;
select pg_temp.assert_rmm_lifecycle(
  (select status = 'abandoned' and abandoned_at is not null
   from public.collaboration_experience_rounds where id = pg_temp.rmm_ref('trio_round')),
  'third joined founder could not abandon active team-scoped round'
);
select set_config('request.jwt.claims','{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_ref('trio_round')); raise exception 'abandoned trio completed';
  exception when insufficient_privilege then null; end;
end $$;
select public.create_collaboration_experience_round('bb555555-5555-4555-8555-555555555555','how_we_work',1);
reset role;

-- Function grants stay narrow; anon cannot call and direct round mutation stays denied.
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
  begin perform public.abandon_collaboration_experience_round(pg_temp.rmm_ref('forming_r1')); raise exception 'anon abandoned round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.assert_rmm_lifecycle(
  has_function_privilege('authenticated','public.abandon_collaboration_experience_round(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.abandon_collaboration_experience_round(uuid)','EXECUTE')
  and not has_table_privilege('authenticated','public.collaboration_experience_rounds','UPDATE'),
  'abandon grants or direct round mutation privileges are too broad'
);

select extensions.pass('Read My Mind abandon is founder-authorized, terminal, privacy-preserving, idempotent, and serialized with completion');
select * from extensions.finish();
rollback;
