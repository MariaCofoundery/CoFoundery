\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_sequential(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'sequential handoff assertion failed: %', message;
  end if;
end;
$$;

create or replace function pg_temp.round_for(p_team_id uuid)
returns uuid language sql stable as $$
  select id from public.collaboration_experience_rounds
  where founder_team_id = p_team_id order by created_at desc, id desc limit 1
$$;

create or replace function pg_temp.lock_all_own_answers(
  p_round_id uuid,
  p_max_prompt_position integer default 4
)
returns void language plpgsql as $$
declare
  v_user_id uuid := auth.uid();
  v_slot record;
begin
  for v_slot in
    select assignment.id assignment_id, required_slot.response_type,
           array[contract.allowed_choice_keys[1]] choice_keys
    from public.collaboration_experience_prompt_assignments assignment
    join public.collaboration_experience_round_prompts round_prompt
      on round_prompt.id = assignment.round_prompt_id
    join public.collaboration_experience_prompt_versions prompt
      on prompt.experience_key = round_prompt.experience_key
     and prompt.pack_key = round_prompt.pack_key
     and prompt.pack_version = round_prompt.pack_version
     and prompt.prompt_key = round_prompt.prompt_key
     and prompt.prompt_version = round_prompt.prompt_version
    cross join lateral (
      select case when v_user_id = assignment.target_user_id then 'self' else 'guess' end::text response_type
      union all
      select 'need' where v_user_id <> assignment.target_user_id and prompt.need_mode = 'required'
    ) required_slot
    join public.collaboration_experience_prompt_response_contracts contract
      on contract.experience_key = round_prompt.experience_key
     and contract.pack_key = round_prompt.pack_key
     and contract.pack_version = round_prompt.pack_version
     and contract.prompt_key = round_prompt.prompt_key
     and contract.prompt_version = round_prompt.prompt_version
     and contract.response_type = required_slot.response_type
    where assignment.round_id = p_round_id
      and round_prompt.position <= p_max_prompt_position
    order by round_prompt.position, required_slot.response_type
  loop
    perform public.lock_collaboration_response(
      v_slot.assignment_id,
      v_slot.response_type,
      v_slot.choice_keys
    );
  end loop;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','e1111111-1111-4111-8111-111111111111','authenticated','authenticated','sequential-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','e2222222-2222-4222-8222-222222222222','authenticated','authenticated','sequential-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','e3333333-3333-4333-8333-333333333333','authenticated','authenticated','sequential-c@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','e4444444-4444-4444-8444-444444444444','authenticated','authenticated','sequential-d@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams (id, name, team_context) values
  ('ee111111-1111-4111-8111-111111111111','Sequential Happy','existing_team'),
  ('ee222222-2222-4222-8222-222222222222','Sequential Decline','existing_team'),
  ('ee333333-3333-4333-8333-333333333333','Sequential Abandon','existing_team'),
  ('ee444444-4444-4444-8444-444444444444','Sequential Trio','existing_team');

insert into public.founder_team_members (team_id, user_id, created_at) values
  ('ee111111-1111-4111-8111-111111111111','e1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('ee111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('ee222222-2222-4222-8222-222222222222','e1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('ee222222-2222-4222-8222-222222222222','e2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('ee333333-3333-4333-8333-333333333333','e1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('ee333333-3333-4333-8333-333333333333','e2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('ee444444-4444-4444-8444-444444444444','e1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('ee444444-4444-4444-8444-444444444444','e2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('ee444444-4444-4444-8444-444444444444','e3333333-3333-4333-8333-333333333333','2026-01-03');

-- Creator starts and can answer; pending B can neither answer nor join early.
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('ee111111-1111-4111-8111-111111111111','easy_start',1);
reset role;

select set_config('request.jwt.claims','{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ declare v_assignment uuid; begin
  select assignment.id into v_assignment
  from public.collaboration_experience_prompt_assignments assignment
  join public.collaboration_experience_round_prompts prompt on prompt.id = assignment.round_prompt_id
  where assignment.round_id = pg_temp.round_for('ee111111-1111-4111-8111-111111111111')
    and assignment.target_user_id = auth.uid() and prompt.position = 0;
  begin perform public.lock_collaboration_response(v_assignment,'self',array['quiet_works_well']);
    raise exception 'pending participant locked response'; exception when insufficient_privilege then null; end;
  begin perform public.join_collaboration_experience_round(pg_temp.round_for('ee111111-1111-4111-8111-111111111111'));
    raise exception 'pending participant joined before handoff'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.lock_all_own_answers(pg_temp.round_for('ee111111-1111-4111-8111-111111111111'), 3);
select pg_temp.assert_sequential(
  (select handoff_ready_at is null
   from public.collaboration_experience_rounds
   where id = pg_temp.round_for('ee111111-1111-4111-8111-111111111111')),
  'creator prompts one through four marked the handoff ready too early'
);
select pg_temp.lock_all_own_answers(pg_temp.round_for('ee111111-1111-4111-8111-111111111111'));
select pg_temp.assert_sequential(
  (select status = 'forming' and handoff_ready_at is not null
   from public.collaboration_experience_rounds
   where id = pg_temp.round_for('ee111111-1111-4111-8111-111111111111')),
  'creator completion did not set handoff ready exactly in forming'
);
do $$ declare v_ready_at timestamptz; begin
  select handoff_ready_at into v_ready_at
  from public.collaboration_experience_rounds
  where id = pg_temp.round_for('ee111111-1111-4111-8111-111111111111');
  perform pg_temp.lock_all_own_answers(pg_temp.round_for('ee111111-1111-4111-8111-111111111111'));
  perform pg_temp.assert_sequential(
    (select handoff_ready_at = v_ready_at from public.collaboration_experience_rounds
     where id = pg_temp.round_for('ee111111-1111-4111-8111-111111111111')),
    'idempotent response retry changed handoff readiness'
  );
end $$;
select pg_temp.assert_sequential(
  public.claim_collaboration_round_handoff_email(pg_temp.round_for('ee111111-1111-4111-8111-111111111111'))
  and not public.claim_collaboration_round_handoff_email(pg_temp.round_for('ee111111-1111-4111-8111-111111111111')),
  'handoff email claim was not at-most-once'
);
reset role;

select set_config('request.jwt.claims','{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_sequential(
  public.join_collaboration_experience_round(pg_temp.round_for('ee111111-1111-4111-8111-111111111111')) = 'active',
  'eligible recipient join did not activate the round'
);
select pg_temp.assert_sequential(
  not public.is_collaboration_round_answer_phase_complete(pg_temp.round_for('ee111111-1111-4111-8111-111111111111')),
  'creator completion opened the round-wide reveal barrier'
);
select pg_temp.lock_all_own_answers(pg_temp.round_for('ee111111-1111-4111-8111-111111111111'));
select pg_temp.assert_sequential(
  public.is_collaboration_round_answer_phase_complete(pg_temp.round_for('ee111111-1111-4111-8111-111111111111')),
  'recipient completion did not open the unchanged round-wide barrier'
);
reset role;

-- Decline after handoff purges every pre-join answer choice.
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('ee222222-2222-4222-8222-222222222222','how_we_work',1);
select pg_temp.lock_all_own_answers(pg_temp.round_for('ee222222-2222-4222-8222-222222222222'));
reset role;
select set_config('request.jwt.claims','{"sub":"e2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select public.decline_collaboration_experience_round(pg_temp.round_for('ee222222-2222-4222-8222-222222222222'));
reset role;
select pg_temp.assert_sequential(
  (select status = 'abandoned' and activated_at is null
   from public.collaboration_experience_rounds where id = pg_temp.round_for('ee222222-2222-4222-8222-222222222222'))
  and (select count(*) = 0 from public.collaboration_experience_responses where round_id = pg_temp.round_for('ee222222-2222-4222-8222-222222222222'))
  and (select count(*) = 0 from public.collaboration_experience_reveal_receipts where round_id = pg_temp.round_for('ee222222-2222-4222-8222-222222222222'))
  and (select count(*) = 0 from public.collaboration_experience_conversation_markers where round_id = pg_temp.round_for('ee222222-2222-4222-8222-222222222222')),
  'decline retained pre-join collaboration content'
);

-- Creator forming-abandon also purges partial answers.
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('ee333333-3333-4333-8333-333333333333','easy_start',1);
do $$ declare v_assignment uuid; begin
  select assignment.id into v_assignment
  from public.collaboration_experience_prompt_assignments assignment
  join public.collaboration_experience_round_prompts prompt on prompt.id = assignment.round_prompt_id
  where assignment.round_id = pg_temp.round_for('ee333333-3333-4333-8333-333333333333')
    and assignment.target_user_id = auth.uid() and prompt.position = 0;
  perform public.lock_collaboration_response(v_assignment,'self',array['quiet_works_well']);
end $$;
select * from public.abandon_collaboration_experience_round(pg_temp.round_for('ee333333-3333-4333-8333-333333333333'));
reset role;
select pg_temp.assert_sequential(
  (select count(*) = 0 from public.collaboration_experience_responses
   where round_id = pg_temp.round_for('ee333333-3333-4333-8333-333333333333')),
  'creator forming-abandon retained partial response choices'
);

-- Three-founder foundation keeps its old opt-in behavior but never gains a forming creator-answer turn.
select set_config('request.jwt.claims','{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('ee444444-4444-4444-8444-444444444444','easy_start',1);
do $$ declare v_assignment uuid; begin
  select id into v_assignment from public.collaboration_experience_prompt_assignments
  where round_id = pg_temp.round_for('ee444444-4444-4444-8444-444444444444') limit 1;
  begin perform public.lock_collaboration_response(v_assignment,'self',array['quiet_works_well']);
    raise exception 'three-founder forming response succeeded'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select pg_temp.assert_sequential(
  has_function_privilege('authenticated','public.claim_collaboration_round_handoff_email(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.claim_collaboration_round_handoff_email(uuid)','EXECUTE')
  and not has_table_privilege('authenticated','public.collaboration_experience_responses','DELETE')
  and not has_table_privilege('authenticated','public.collaboration_experience_rounds','UPDATE'),
  'handoff grants exposed lifecycle mutation directly'
);

select extensions.pass('Read My Mind sequential handoff is creator-first, private, deduplicated, purge-safe, and keeps the round-wide barrier');
select * from extensions.finish();
rollback;
