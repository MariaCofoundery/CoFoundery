\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_rmm_completion(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'read my mind completion assertion failed: %', message;
  end if;
end;
$$;

create or replace function pg_temp.rmm_round(p_team_id uuid)
returns uuid language sql stable as $$
  select round_row.id
  from public.collaboration_experience_rounds round_row
  where round_row.founder_team_id = p_team_id
  order by case round_row.status
      when 'active' then 0
      when 'forming' then 0
      when 'abandoned' then 1
      else 2
    end,
    round_row.created_at desc,
    round_row.id desc
  limit 1
$$;

create or replace function pg_temp.fill_rmm_required_answers(
  p_round_id uuid,
  p_skip_one boolean default false
)
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
  where assignment.round_id = p_round_id
    and not (
      p_skip_one
      and round_prompt.position = 4
      and participant.position = 1
      and required_slot.response_type = case
        when participant.founder_user_id = assignment.target_user_id then 'self' else 'guess'
      end
    )
  on conflict (prompt_assignment_id, respondent_user_id, response_type) do nothing;
$$;

create or replace function pg_temp.open_rmm_reveals(
  p_round_id uuid,
  p_first_position integer,
  p_last_position integer
)
returns void language plpgsql as $$
declare
  v_round_prompt_id uuid;
begin
  for v_round_prompt_id in
    select round_prompt.id
    from public.collaboration_experience_round_prompts round_prompt
    where round_prompt.round_id = p_round_id
      and round_prompt.position between p_first_position and p_last_position
    order by round_prompt.position
  loop
    perform public.get_collaboration_prompt_reveal(v_round_prompt_id);
  end loop;
end;
$$;

create or replace function pg_temp.seed_all_rmm_receipts(p_round_id uuid)
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
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-4111-8111-111111111111','authenticated','authenticated','completion-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','a2222222-2222-4222-8222-222222222222','authenticated','authenticated','completion-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','a3333333-3333-4333-8333-333333333333','authenticated','authenticated','completion-c@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','a4444444-4444-4444-8444-444444444444','authenticated','authenticated','completion-d@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','a5555555-5555-4555-8555-555555555555','authenticated','authenticated','completion-e@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','a6666666-6666-4666-8666-666666666666','authenticated','authenticated','completion-advisor@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','a7777777-7777-4777-8777-777777777777','authenticated','authenticated','completion-stranger@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams (id, name, team_context) values
  ('aa111111-1111-4111-8111-111111111111','Completion Happy Pair','existing_team'),
  ('aa222222-2222-4222-8222-222222222222','Completion Missing Answer','existing_team'),
  ('aa333333-3333-4333-8333-333333333333','Completion Abandoned','existing_team'),
  ('aa444444-4444-4444-8444-444444444444','Completion Trio','existing_team');

insert into public.founder_team_members (team_id, user_id, created_at) values
  ('aa111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('aa111111-1111-4111-8111-111111111111','a2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('aa222222-2222-4222-8222-222222222222','a4444444-4444-4444-8444-444444444444','2026-01-01'),
  ('aa222222-2222-4222-8222-222222222222','a5555555-5555-4555-8555-555555555555','2026-01-02'),
  ('aa333333-3333-4333-8333-333333333333','a4444444-4444-4444-8444-444444444444','2026-01-01'),
  ('aa333333-3333-4333-8333-333333333333','a5555555-5555-4555-8555-555555555555','2026-01-02'),
  ('aa444444-4444-4444-8444-444444444444','a1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('aa444444-4444-4444-8444-444444444444','a2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('aa444444-4444-4444-8444-444444444444','a3333333-3333-4333-8333-333333333333','2026-01-03');

insert into public.relationships (id, user_a_id, user_b_id, founder_team_id)
values (
  'ab111111-1111-4111-8111-111111111111',
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'aa111111-1111-4111-8111-111111111111'
);
insert into public.relationship_advisors (
  relationship_id, advisor_user_id, advisor_email, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  'ab111111-1111-4111-8111-111111111111',
  'a6666666-6666-4666-8666-666666666666',
  'completion-advisor@example.com', 'linked', true, true, now(), now()
);

-- Happy pair: forming and pending participants cannot complete.
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('aa111111-1111-4111-8111-111111111111','easy_start',1);
do $$ begin
  begin
    perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));
    raise exception 'forming round completed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select pg_temp.fill_rmm_required_answers(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));

select set_config('request.jwt.claims','{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));
    raise exception 'pending participant completed forming round';
  exception when insufficient_privilege then null; end;
end $$;
select public.join_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));
reset role;

-- The per-pack open-round index still blocks a second round of the same pack
-- before completion while other packs remain independent.
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.create_collaboration_experience_round('aa111111-1111-4111-8111-111111111111','easy_start',1);
    raise exception 'duplicate open pack round succeeded';
  exception when unique_violation then null; end;
end $$;
reset role;

select pg_temp.fill_rmm_required_answers(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));

-- An authenticated founder cannot spoof another participant's receipt.
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    insert into public.collaboration_experience_reveal_receipts (
      round_id, round_prompt_id, participant_user_id
    )
    select round_prompt.round_id, round_prompt.id, 'a2222222-2222-4222-8222-222222222222'
    from public.collaboration_experience_round_prompts round_prompt
    where round_prompt.round_id = pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111')
    limit 1;
    raise exception 'founder spoofed another participant receipt';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.open_rmm_reveals(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'),0,4);
reset role;

select set_config('request.jwt.claims','{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_reveals(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'),0,3);
reset role;

-- 5/5 plus 4/5 receipts is not complete.
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));
    raise exception 'round completed with one reveal receipt missing';
  exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
select pg_temp.assert_rmm_completion(
  (select status = 'active' and completed_at is null
   from public.collaboration_experience_rounds
   where id = pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111')),
  'missing receipt changed active round state'
);

-- Advisor and stranger are not round participants, irrespective of relationship access.
select set_config('request.jwt.claims','{"sub":"a6666666-6666-4666-8666-666666666666","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111')); raise exception 'advisor completed round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"a7777777-7777-4777-8777-777777777777","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111')); raise exception 'stranger completed round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Last real receipt opens completion; a second caller preserves completed_at.
select set_config('request.jwt.claims','{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_reveals(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'),4,4);
reset role;
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select * from public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));
reset role;
create temporary table happy_completed_at on commit drop as
select completed_at value from public.collaboration_experience_rounds
where id = pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111');
select set_config('request.jwt.claims','{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select * from public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111'));
reset role;
select pg_temp.assert_rmm_completion(
  (select status = 'completed' and completed_at = (select value from happy_completed_at)
   from public.collaboration_experience_rounds
   where id = pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111')),
  'idempotent completion changed completed_at'
);

-- Completion removes R1 from the open-round index; even the same pack may be replayed
-- and R2 remains the only forming round.
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('aa111111-1111-4111-8111-111111111111','easy_start',1);
reset role;
select pg_temp.assert_rmm_completion(
  (select count(*) = 1 from public.collaboration_experience_rounds
   where founder_team_id = 'aa111111-1111-4111-8111-111111111111' and status = 'completed')
  and
  (select count(*) = 1 from public.collaboration_experience_rounds
   where founder_team_id = 'aa111111-1111-4111-8111-111111111111' and status = 'forming'),
  'completion did not allow exactly one new open round'
);

-- A current team member who is not in the round is still unauthorized. The membership
-- insertion also exercises the existing fail-closed abandonment trigger for R2.
insert into public.founder_team_members (team_id, user_id)
values ('aa111111-1111-4111-8111-111111111111','a3333333-3333-4333-8333-333333333333');
select set_config('request.jwt.claims','{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111')); raise exception 'nonparticipant team member completed round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.assert_rmm_completion(
  (select status = 'abandoned' from public.collaboration_experience_rounds
   where id = pg_temp.rmm_round('aa111111-1111-4111-8111-111111111111')),
  'membership change did not abandon the open round'
);

-- Missing answer wins even if receipt rows are constructed for every participant/prompt.
select set_config('request.jwt.claims','{"sub":"a4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('aa222222-2222-4222-8222-222222222222','easy_start',1);
reset role;
select pg_temp.fill_rmm_required_answers(pg_temp.rmm_round('aa222222-2222-4222-8222-222222222222'));
select set_config('request.jwt.claims','{"sub":"a5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_round('aa222222-2222-4222-8222-222222222222'));
reset role;
select pg_temp.fill_rmm_required_answers(pg_temp.rmm_round('aa222222-2222-4222-8222-222222222222'),true);
select pg_temp.seed_all_rmm_receipts(pg_temp.rmm_round('aa222222-2222-4222-8222-222222222222'));
select set_config('request.jwt.claims','{"sub":"a4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa222222-2222-4222-8222-222222222222')); raise exception 'round completed with a required answer missing';
  exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
select pg_temp.assert_rmm_completion(
  (select status = 'active' and completed_at is null from public.collaboration_experience_rounds
   where id = pg_temp.rmm_round('aa222222-2222-4222-8222-222222222222')),
  'missing answer changed active round state'
);

-- An otherwise complete round becomes terminally abandoned on membership removal.
select set_config('request.jwt.claims','{"sub":"a4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('aa333333-3333-4333-8333-333333333333','easy_start',1);
reset role;
select pg_temp.fill_rmm_required_answers(pg_temp.rmm_round('aa333333-3333-4333-8333-333333333333'));
select set_config('request.jwt.claims','{"sub":"a5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_round('aa333333-3333-4333-8333-333333333333'));
reset role;
select pg_temp.fill_rmm_required_answers(pg_temp.rmm_round('aa333333-3333-4333-8333-333333333333'));
select pg_temp.seed_all_rmm_receipts(pg_temp.rmm_round('aa333333-3333-4333-8333-333333333333'));
delete from public.founder_team_members
where team_id = 'aa333333-3333-4333-8333-333333333333'
  and user_id = 'a4444444-4444-4444-8444-444444444444';
select set_config('request.jwt.claims','{"sub":"a4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa333333-3333-4333-8333-333333333333')); raise exception 'former team member completed round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"a5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa333333-3333-4333-8333-333333333333')); raise exception 'abandoned round completed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.assert_rmm_completion(
  (select status = 'abandoned' and completed_at is null
   from public.collaboration_experience_rounds
   where id = pg_temp.rmm_round('aa333333-3333-4333-8333-333333333333')),
  'abandoned round was reactivated or completed'
);

-- Three-founder foundation: every participant needs every prompt receipt.
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('aa444444-4444-4444-8444-444444444444','easy_start',1);
reset role;
select set_config('request.jwt.claims','{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'));
reset role;
select set_config('request.jwt.claims','{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select public.join_collaboration_experience_round(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'));
reset role;
select pg_temp.fill_rmm_required_answers(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'));

select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_reveals(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'),0,4);
reset role;
select set_config('request.jwt.claims','{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_reveals(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'),0,4);
reset role;
select set_config('request.jwt.claims','{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.open_rmm_reveals(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'),0,3);
do $$ begin
  begin perform public.complete_collaboration_experience_round(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444')); raise exception 'trio completed with one receipt missing';
  exception when object_not_in_prerequisite_state then null; end;
end $$;
select pg_temp.open_rmm_reveals(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'),4,4);
select * from public.complete_collaboration_experience_round(pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'));
reset role;
select pg_temp.assert_rmm_completion(
  (select status = 'completed' and completed_at is not null
   from public.collaboration_experience_rounds
   where id = pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444'))
  and
  (select count(*) = 15 from public.collaboration_experience_reveal_receipts
   where round_id = pg_temp.rmm_round('aa444444-4444-4444-8444-444444444444')),
  'three-founder completion did not require participant-by-prompt receipts'
);

select pg_temp.assert_rmm_completion(
  has_function_privilege('authenticated','public.complete_collaboration_experience_round(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.complete_collaboration_experience_round(uuid)','EXECUTE')
  and not has_table_privilege('authenticated','public.collaboration_experience_rounds','UPDATE'),
  'completion grants or direct round mutation privileges are too broad'
);

select extensions.pass('Read My Mind completion is authorized, receipt-complete, idempotent, generic, and race-safe by lock and unique index');
select * from extensions.finish();
rollback;
