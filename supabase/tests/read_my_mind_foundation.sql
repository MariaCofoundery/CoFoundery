\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_rmm(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'read my mind assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.rmm_round_for_team(p_team_id uuid)
returns uuid language sql stable as $$
  select id from public.collaboration_experience_rounds
  where founder_team_id = p_team_id order by created_at desc limit 1
$$;

create or replace function pg_temp.rmm_prompt_for_team(p_team_id uuid, p_position integer)
returns uuid language sql stable as $$
  select round_prompt.id
  from public.collaboration_experience_round_prompts round_prompt
  where round_prompt.round_id = pg_temp.rmm_round_for_team(p_team_id)
    and round_prompt.position = p_position
$$;

create or replace function pg_temp.fill_rmm_creator_answers(p_round_id uuid)
returns void language sql as $$
  insert into public.collaboration_experience_responses (
    round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys
  )
  select assignment.round_id, assignment.id, participant.founder_user_id,
         required_slot.response_type, array[contract.allowed_choice_keys[1]]
  from public.collaboration_experience_prompt_assignments assignment
  join public.collaboration_experience_round_prompts round_prompt
    on round_prompt.id = assignment.round_prompt_id
  join public.collaboration_experience_prompt_versions prompt
    on prompt.experience_key = round_prompt.experience_key
   and prompt.pack_key = round_prompt.pack_key
   and prompt.pack_version = round_prompt.pack_version
   and prompt.prompt_key = round_prompt.prompt_key
   and prompt.prompt_version = round_prompt.prompt_version
  join public.collaboration_experience_round_participants participant
    on participant.round_id = assignment.round_id and participant.state = 'joined'
  cross join lateral (
    select case when participant.founder_user_id = assignment.target_user_id then 'self' else 'guess' end::text response_type
    union all
    select 'need' where participant.founder_user_id <> assignment.target_user_id and prompt.need_mode = 'required'
  ) required_slot
  join public.collaboration_experience_prompt_response_contracts contract
    on contract.experience_key = round_prompt.experience_key
   and contract.pack_key = round_prompt.pack_key
   and contract.pack_version = round_prompt.pack_version
   and contract.prompt_key = round_prompt.prompt_key
   and contract.prompt_version = round_prompt.prompt_version
   and contract.response_type = required_slot.response_type
  where assignment.round_id = p_round_id
  on conflict (prompt_assignment_id, respondent_user_id, response_type) do nothing;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-4111-8111-111111111111','authenticated','authenticated','rmm-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','d2222222-2222-4222-8222-222222222222','authenticated','authenticated','rmm-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','d3333333-3333-4333-8333-333333333333','authenticated','authenticated','rmm-c@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','d4444444-4444-4444-8444-444444444444','authenticated','authenticated','rmm-x@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','d5555555-5555-4555-8555-555555555555','authenticated','authenticated','cleanup-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','d6666666-6666-4666-8666-666666666666','authenticated','authenticated','cleanup-b@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams(id, name, team_context) values
  ('da111111-1111-4111-8111-111111111111','RMM Pair','existing_team'),
  ('da222222-2222-4222-8222-222222222222','RMM Trio','existing_team'),
  ('da333333-3333-4333-8333-333333333333','Cleanup Pair','existing_team');
insert into public.founder_team_members(team_id,user_id,created_at) values
  ('da111111-1111-4111-8111-111111111111','d1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('da111111-1111-4111-8111-111111111111','d2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('da222222-2222-4222-8222-222222222222','d1111111-1111-4111-8111-111111111111','2026-01-01'),
  ('da222222-2222-4222-8222-222222222222','d2222222-2222-4222-8222-222222222222','2026-01-02'),
  ('da222222-2222-4222-8222-222222222222','d3333333-3333-4333-8333-333333333333','2026-01-03'),
  ('da333333-3333-4333-8333-333333333333','d5555555-5555-4555-8555-555555555555','2026-01-01'),
  ('da333333-3333-4333-8333-333333333333','d6666666-6666-4666-8666-666666666666','2026-01-02');

select pg_temp.assert_rmm(
  (select count(*) = 3 from public.collaboration_experience_pack_versions)
  and (select count(*) = 15 from public.collaboration_experience_prompt_versions)
  and (select count(*) = 30 + 9 from public.collaboration_experience_prompt_response_contracts),
  'published structural content contract is incomplete'
);

create temporary table pg_temp.rmm_expected_contract (
  pack_key text, prompt_key text, position smallint, need_mode text,
  response_format text, choice_keys text[], min_count smallint, max_count smallint,
  need_keys text[]
) on commit drop;
insert into pg_temp.rmm_expected_contract values
  ('easy_start','silent_day',0,'none','single_choice',array['quiet_works_well','check_in_once','want_regular_contact'],1,1,null),
  ('easy_start','update_frequency',1,'required','single_choice',array['only_when_needed','one_or_two_fixed','short_daily'],1,1,array['space','predictability','connection']),
  ('easy_start','please_do_not_ask',2,'none','multi_choice',array['early_draft','focus_time','personal_context','every_small_decision'],1,2,null),
  ('easy_start','brief_focus_break',3,'required','single_choice',array['no_message_needed','short_signal','agree_return_time'],1,1,array['autonomy','short_notice','clear_return']),
  ('easy_start','really_bad_workday',4,'required','single_choice',array['reduce_coordination','sort_priorities','take_concrete_task'],1,1,array['capacity','clarity','practical_support']),
  ('how_we_work','just_do_it',0,'none','single_choice',array['act_independently','quick_alignment','decide_together'],1,1,null),
  ('how_we_work','when_to_involve_you',1,'required','single_choice',array['at_impact','before_commitment','from_the_start'],1,1,array['autonomy','early_context','shared_decision']),
  ('how_we_work','good_enough',2,'none','single_choice',array['usable_now','agreed_criteria_met','highly_polished'],1,1,null),
  ('how_we_work','slower_than_expected',3,'required','single_choice',array['name_expectation','ask_about_blockers','adjust_plan'],1,1,array['trust','transparency','support']),
  ('how_we_work','reopen_decision',4,'none','single_choice',array['new_facts_only','important_concern','always_possible'],1,1,null),
  ('when_things_get_tricky','shaky_deadline',0,'required','single_choice',array['reduce_scope','move_date','ask_for_help'],1,1,array['early_signal','shared_tradeoff','realistic_plan']),
  ('when_things_get_tricky','tell_me_it_is_not_good',1,'required','single_choice',array['directly','with_context','privately','with_alternative'],1,1,array['clarity','respect','privacy','next_step']),
  ('when_things_get_tricky','after_the_argument',2,'required','single_choice',array['pause_then_talk','talk_soon','write_first'],1,1,array['space','repair','structure']),
  ('when_things_get_tricky','not_now',3,'required','single_choice',array['respect_boundary','ask_when_later','briefly_name_issue'],1,1,array['space','time_commitment','brief_context']),
  ('when_things_get_tricky','disagreeing_before_customer',4,'none','single_choice',array['one_leads','brief_internal_pause','present_shared_minimum'],1,1,null);

select pg_temp.assert_rmm(
  not exists (
    (select expected.pack_key, 1, expected.prompt_key, 1, expected.position, expected.need_mode,
            expected.response_format, expected.choice_keys, expected.min_count, expected.max_count,
            expected.need_keys,
            case when expected.need_keys is null then null else 'single_choice' end,
            case when expected.need_keys is null then null else 1::smallint end,
            case when expected.need_keys is null then null else 1::smallint end
     from pg_temp.rmm_expected_contract expected)
    except
    (select prompt.pack_key, prompt.pack_version, prompt.prompt_key, prompt.prompt_version,
            prompt.position, prompt.need_mode, self_contract.response_format,
            self_contract.allowed_choice_keys, self_contract.min_selections,
            self_contract.max_selections, need_contract.allowed_choice_keys,
            need_contract.response_format, need_contract.min_selections,
            need_contract.max_selections
     from public.collaboration_experience_prompt_versions prompt
     join public.collaboration_experience_prompt_response_contracts self_contract
       on self_contract.experience_key=prompt.experience_key and self_contract.pack_key=prompt.pack_key
      and self_contract.pack_version=prompt.pack_version and self_contract.prompt_key=prompt.prompt_key
      and self_contract.prompt_version=prompt.prompt_version and self_contract.response_type='self'
     left join public.collaboration_experience_prompt_response_contracts need_contract
       on need_contract.experience_key=prompt.experience_key and need_contract.pack_key=prompt.pack_key
      and need_contract.pack_version=prompt.pack_version and need_contract.prompt_key=prompt.prompt_key
      and need_contract.prompt_version=prompt.prompt_version and need_contract.response_type='need'
     where prompt.experience_key='read_my_mind')
  )
  and not exists (
    select 1
    from public.collaboration_experience_prompt_response_contracts self_contract
    join public.collaboration_experience_prompt_response_contracts guess_contract
      using (experience_key,pack_key,pack_version,prompt_key,prompt_version)
    where self_contract.response_type='self' and guess_contract.response_type='guess'
      and (self_contract.response_format, self_contract.allowed_choice_keys,
           self_contract.min_selections, self_contract.max_selections)
          is distinct from
          (guess_contract.response_format, guess_contract.allowed_choice_keys,
           guess_contract.min_selections, guess_contract.max_selections)
  ),
  'DB V1 contract differs from the frozen TypeScript key, format, need, choice, or min/max contract'
);
do $$ begin
  begin
    update public.collaboration_experience_prompt_versions set prompt_version = 2
    where prompt_key = 'silent_day';
    raise exception 'published content unexpectedly mutated';
  exception when insufficient_privilege then null; end;
  begin delete from public.collaboration_experience_prompt_versions where prompt_key='silent_day'; raise exception 'published prompt deleted'; exception when insufficient_privilege then null; end;
  begin update public.collaboration_experience_pack_versions set prompt_count=4 where pack_key='easy_start'; raise exception 'published pack mutated'; exception when insufficient_privilege then null; end;
  begin delete from public.collaboration_experience_pack_versions where pack_key='easy_start'; raise exception 'published pack deleted'; exception when insufficient_privilege then null; end;
  begin update public.collaboration_experience_prompt_response_contracts set max_selections=2 where prompt_key='silent_day' and response_type='self'; raise exception 'published choice contract mutated'; exception when insufficient_privilege then null; end;
  begin delete from public.collaboration_experience_prompt_response_contracts where prompt_key='silent_day' and response_type='self'; raise exception 'published choice contract deleted'; exception when insufficient_privilege then null; end;
end $$;

-- Stranger/advisor-like authenticated user cannot create a round for a foreign team.
select set_config('request.jwt.claims','{"sub":"d4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.create_collaboration_experience_round('da111111-1111-4111-8111-111111111111','easy_start',1);
    raise exception 'nonmember created round';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Creator joins explicitly by starting; only that founder may answer during the sequential forming turn.
select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('da111111-1111-4111-8111-111111111111','easy_start',1);
select pg_temp.assert_rmm(
  (select status = 'forming' from public.collaboration_experience_rounds where id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111'))
  and (select state = 'joined' from public.collaboration_experience_round_participants where round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111') and founder_user_id = 'd1111111-1111-4111-8111-111111111111')
  and (select state = 'pending' from public.collaboration_experience_round_participants where round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111') and founder_user_id = 'd2222222-2222-4222-8222-222222222222')
  and (select count(*) = 5 from public.collaboration_experience_round_prompts where round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111'))
  and (select count(*) = 10 from public.collaboration_experience_prompt_assignments where round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')),
  'two-founder snapshot, forming state, or two-target assignments are wrong'
);
do $$ declare v_assignment uuid; begin
  select assignment.id into v_assignment
  from public.collaboration_experience_prompt_assignments assignment
  join public.collaboration_experience_round_prompts prompt on prompt.id = assignment.round_prompt_id
  where assignment.round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')
    and assignment.target_user_id = 'd1111111-1111-4111-8111-111111111111'
    and prompt.position = 0;
  perform public.lock_collaboration_response(v_assignment,'self',array['quiet_works_well']);
  begin
    perform public.create_collaboration_experience_round('da111111-1111-4111-8111-111111111111','easy_start',1);
    raise exception 'duplicate open pack round succeeded';
  exception when unique_violation then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ declare v_assignment uuid; begin
  select assignment.id into v_assignment
  from public.collaboration_experience_prompt_assignments assignment
  join public.collaboration_experience_round_prompts prompt on prompt.id = assignment.round_prompt_id
  where assignment.round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')
    and assignment.target_user_id = 'd2222222-2222-4222-8222-222222222222'
    and prompt.position = 0;
  begin perform public.lock_collaboration_response(v_assignment,'self',array['quiet_works_well']);
    raise exception 'pending founder locked a forming response';
  exception when insufficient_privilege then null; end;
  begin perform public.join_collaboration_experience_round(pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111'));
    raise exception 'pending founder joined before creator handoff';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select pg_temp.fill_rmm_creator_answers(pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111'));
select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(public.join_collaboration_experience_round(pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')) = 'active','last join did not activate pair round');
reset role;

-- Invalid content, duplicate selections, and a self-slot claimed by the guesser fail in the RPC.
select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ declare v_self uuid; v_multi uuid; begin
  select id into v_self from public.collaboration_experience_prompt_assignments
  where round_id=pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')
    and round_prompt_id=pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0)
    and target_user_id='d1111111-1111-4111-8111-111111111111';
  select id into v_multi from public.collaboration_experience_prompt_assignments
  where round_id=pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')
    and round_prompt_id=pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',2)
    and target_user_id='d1111111-1111-4111-8111-111111111111';
  begin perform public.lock_collaboration_response(v_self,'self',array['fabricated']); raise exception 'invalid choice succeeded'; exception when invalid_parameter_value then null; end;
  begin perform public.lock_collaboration_response(v_self,'self',array['quiet_works_well','quiet_works_well']); raise exception 'duplicate single choice succeeded'; exception when invalid_parameter_value then null; end;
  begin perform public.lock_collaboration_response(v_multi,'self',array['early_draft','focus_time','personal_context']); raise exception 'over-limit multi choice succeeded'; exception when invalid_parameter_value then null; end;
end $$;
reset role;

-- Complete prompt zero only. The round-wide barrier must still deny every reveal.
select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ declare a record; begin
  for a in select * from public.collaboration_experience_prompt_assignments where round_prompt_id = pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0) loop
    if a.target_user_id = 'd1111111-1111-4111-8111-111111111111' then
      perform public.lock_collaboration_response(a.id,'self',array['quiet_works_well']);
    else
      perform public.lock_collaboration_response(a.id,'guess',array['quiet_works_well']);
    end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ declare a record; begin
  for a in select * from public.collaboration_experience_prompt_assignments where round_prompt_id = pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0) loop
    if a.target_user_id = 'd2222222-2222-4222-8222-222222222222' then
      perform public.lock_collaboration_response(a.id,'self',array['quiet_works_well']);
    else
      perform public.lock_collaboration_response(a.id,'guess',array['quiet_works_well']);
    end if;
  end loop;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(not public.is_collaboration_round_answer_phase_complete(pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')),'one complete prompt opened the round-wide barrier');
do $$ declare v_round_prompt uuid := pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0); begin
  begin
    perform public.get_collaboration_prompt_reveal(v_round_prompt);
    raise exception 'early prompt reveal succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Fill every valid slot from each founder using the DB-published contracts.
select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ declare a record; v_type text; v_choices text[]; begin
  for a in
    select assignment.*, round_prompt.experience_key, round_prompt.pack_key,
           round_prompt.pack_version, round_prompt.prompt_key,
           round_prompt.prompt_version, round_prompt.position as prompt_position,
           prompt.need_mode
    from public.collaboration_experience_prompt_assignments assignment
    join public.collaboration_experience_round_prompts round_prompt
      on round_prompt.id = assignment.round_prompt_id
    join public.collaboration_experience_prompt_versions prompt
      using (experience_key,pack_key,pack_version,prompt_key,prompt_version)
    where assignment.round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')
  loop
    v_type := case when a.target_user_id = 'd1111111-1111-4111-8111-111111111111' then 'self' else 'guess' end;
    select array[allowed_choice_keys[1]] into v_choices
    from public.collaboration_experience_prompt_response_contracts
    where experience_key=a.experience_key and pack_key=a.pack_key and pack_version=a.pack_version
      and prompt_key=a.prompt_key and prompt_version=a.prompt_version and response_type=v_type;
    perform public.lock_collaboration_response(a.id,v_type,v_choices);
    if a.target_user_id <> 'd1111111-1111-4111-8111-111111111111' and a.need_mode='required' then
      select array[allowed_choice_keys[1]] into v_choices
      from public.collaboration_experience_prompt_response_contracts
      where experience_key=a.experience_key and pack_key=a.pack_key and pack_version=a.pack_version
        and prompt_key=a.prompt_key and prompt_version=a.prompt_version and response_type='need';
      perform public.lock_collaboration_response(a.id,'need',v_choices);
    end if;
  end loop;
end $$;
-- Own select contains no foreign responses. Direct mutations remain unavailable.
select pg_temp.assert_rmm(
  not exists (select 1 from public.collaboration_experience_responses where respondent_user_id <> 'd1111111-1111-4111-8111-111111111111'),
  'direct response SELECT exposed another founder pre-reveal'
);
do $$ declare v_id uuid; v_assignment uuid; v_first uuid; v_second uuid; begin
  select response.id,response.prompt_assignment_id into v_id,v_assignment
  from public.collaboration_experience_responses response
  join public.collaboration_experience_prompt_assignments assignment on assignment.id=response.prompt_assignment_id
  join public.collaboration_experience_round_prompts round_prompt on round_prompt.id=assignment.round_prompt_id
  where round_prompt.prompt_key='silent_day' limit 1;
  v_first := public.lock_collaboration_response(v_assignment,(select response_type from public.collaboration_experience_responses where id=v_id),(select choice_keys from public.collaboration_experience_responses where id=v_id));
  v_second := public.lock_collaboration_response(v_assignment,(select response_type from public.collaboration_experience_responses where id=v_id),(select choice_keys from public.collaboration_experience_responses where id=v_id));
  if v_first <> v_second then raise exception 'identical retry was not idempotent'; end if;
  begin perform public.lock_collaboration_response(v_assignment,(select response_type from public.collaboration_experience_responses where id=v_id),array['check_in_once']); raise exception 'changed retry succeeded'; exception when insufficient_privilege then null; end;
  begin insert into public.collaboration_experience_responses(round_id,prompt_assignment_id,respondent_user_id,response_type,choice_keys) values (pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111'),v_assignment,'d1111111-1111-4111-8111-111111111111','need',array['space']); raise exception 'direct insert succeeded'; exception when insufficient_privilege then null; end;
  begin update public.collaboration_experience_responses set choice_keys=array['forged'] where id=v_id; raise exception 'direct update succeeded'; exception when insufficient_privilege then null; end;
  begin delete from public.collaboration_experience_responses where id=v_id; raise exception 'direct delete succeeded'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
do $$ declare a record; v_type text; v_choices text[]; begin
  for a in
    select assignment.*, round_prompt.experience_key, round_prompt.pack_key,
           round_prompt.pack_version, round_prompt.prompt_key,
           round_prompt.prompt_version, round_prompt.position as prompt_position,
           prompt.need_mode
    from public.collaboration_experience_prompt_assignments assignment
    join public.collaboration_experience_round_prompts round_prompt
      on round_prompt.id = assignment.round_prompt_id
    join public.collaboration_experience_prompt_versions prompt
      using (experience_key,pack_key,pack_version,prompt_key,prompt_version)
    where assignment.round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')
      and round_prompt.position < 4
  loop
    v_type := case when a.target_user_id = 'd2222222-2222-4222-8222-222222222222' then 'self' else 'guess' end;
    select array[allowed_choice_keys[1]] into v_choices
    from public.collaboration_experience_prompt_response_contracts
    where experience_key=a.experience_key and pack_key=a.pack_key and pack_version=a.pack_version
      and prompt_key=a.prompt_key and prompt_version=a.prompt_version and response_type=v_type;
    perform public.lock_collaboration_response(a.id,v_type,v_choices);
    if a.target_user_id <> 'd2222222-2222-4222-8222-222222222222' and a.need_mode='required' then
      select array[allowed_choice_keys[1]] into v_choices
      from public.collaboration_experience_prompt_response_contracts
      where experience_key=a.experience_key and pack_key=a.pack_key and pack_version=a.pack_version
        and prompt_key=a.prompt_key and prompt_version=a.prompt_version and response_type='need';
      perform public.lock_collaboration_response(a.id,'need',v_choices);
    end if;
  end loop;
end $$;
select pg_temp.assert_rmm(
  not public.is_collaboration_round_answer_phase_complete(pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')),
  'prompt five missing did not keep the round-wide barrier closed'
);
do $$ declare a record; v_type text; v_choices text[]; begin
  for a in
    select assignment.*, round_prompt.experience_key, round_prompt.pack_key,
           round_prompt.pack_version, round_prompt.prompt_key,
           round_prompt.prompt_version, round_prompt.position as prompt_position,
           prompt.need_mode
    from public.collaboration_experience_prompt_assignments assignment
    join public.collaboration_experience_round_prompts round_prompt
      on round_prompt.id = assignment.round_prompt_id
    join public.collaboration_experience_prompt_versions prompt
      using (experience_key,pack_key,pack_version,prompt_key,prompt_version)
    where assignment.round_id = pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')
      and round_prompt.position = 4
  loop
    v_type := case when a.target_user_id = 'd2222222-2222-4222-8222-222222222222' then 'self' else 'guess' end;
    select array[allowed_choice_keys[1]] into v_choices
    from public.collaboration_experience_prompt_response_contracts
    where experience_key=a.experience_key and pack_key=a.pack_key and pack_version=a.pack_version
      and prompt_key=a.prompt_key and prompt_version=a.prompt_version and response_type=v_type;
    perform public.lock_collaboration_response(a.id,v_type,v_choices);
    if a.target_user_id <> 'd2222222-2222-4222-8222-222222222222' and a.need_mode='required' then
      select array[allowed_choice_keys[1]] into v_choices
      from public.collaboration_experience_prompt_response_contracts
      where experience_key=a.experience_key and pack_key=a.pack_key and pack_version=a.pack_version
        and prompt_key=a.prompt_key and prompt_version=a.prompt_version and response_type='need';
      perform public.lock_collaboration_response(a.id,'need',v_choices);
    end if;
  end loop;
end $$;
select pg_temp.assert_rmm(public.is_collaboration_round_answer_phase_complete(pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111')),'full pair answer phase did not open reveal barrier');
create temporary table pg_temp.rmm_reveal_result on commit drop as
select * from public.get_collaboration_prompt_reveal(
  pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0)
);
select pg_temp.assert_rmm(
  (select count(*) = 4 from pg_temp.rmm_reveal_result),
  'authorized reveal projection omitted locked answers'
);
select pg_temp.assert_rmm(
  (select count(*) = 1 from public.collaboration_experience_reveal_receipts
   where round_prompt_id=pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0)
     and participant_user_id='d2222222-2222-4222-8222-222222222222'),
  'prompt-wide reveal receipt was not recorded exactly once'
);
reset role;

-- A completed two-founder round remains available to its current-member participants even
-- after a third founder joins. Team membership alone never grants historical access.
update public.collaboration_experience_rounds
set status='completed', completed_at=now()
where id=pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111');
create temporary table pg_temp.rmm_completed_history_prompt on commit drop as
select pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0) id;
grant select on pg_temp.rmm_completed_history_prompt to authenticated;
insert into public.founder_team_members(team_id,user_id)
values ('da111111-1111-4111-8111-111111111111','d3333333-3333-4333-8333-333333333333');

select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(
  (select count(*)=1 from public.collaboration_experience_rounds where id=pg_temp.rmm_round_for_team('da111111-1111-4111-8111-111111111111'))
  and (select count(*)=4 from public.get_collaboration_prompt_reveal((select id from pg_temp.rmm_completed_history_prompt))),
  'original founder A lost completed-round review after a third founder joined'
);
reset role;

select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(
  (select count(*)=4 from public.get_collaboration_prompt_reveal((select id from pg_temp.rmm_completed_history_prompt))),
  'original founder B lost completed-round review after a third founder joined'
);
reset role;

select set_config('request.jwt.claims','{"sub":"d3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(
  (select count(*)=0 from public.collaboration_experience_rounds)
  and (select count(*)=0 from public.collaboration_experience_round_participants)
  and (select count(*)=0 from public.collaboration_experience_responses)
  and (select count(*)=0 from public.collaboration_experience_reveal_receipts),
  'new third founder received historical round or reveal data'
);
do $$ begin
  begin perform public.get_collaboration_prompt_reveal((select id from pg_temp.rmm_completed_history_prompt)); raise exception 'new third founder revealed historical round'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- The completed round also survives removal. The remaining participant keeps review access,
-- while the removed participant immediately loses it.
delete from public.founder_team_members
where team_id='da111111-1111-4111-8111-111111111111' and user_id='d2222222-2222-4222-8222-222222222222';
select pg_temp.assert_rmm(
  (select status='completed' from public.collaboration_experience_rounds where founder_team_id='da111111-1111-4111-8111-111111111111'),
  'completed round was deleted or abandoned by membership change'
);
select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(
  (select count(*)=4 from public.get_collaboration_prompt_reveal((select id from pg_temp.rmm_completed_history_prompt))),
  'remaining founder lost completed-round review after the other founder left'
);
reset role;
select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm((select count(*)=0 from public.collaboration_experience_rounds),'removed participant retained completed-round access');
reset role;

-- Three-founder snapshot uses one deterministic target per prompt and requires all opt-ins.
select set_config('request.jwt.claims','{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('da222222-2222-4222-8222-222222222222','how_we_work',1);
select pg_temp.assert_rmm(
  (select count(*)=3 and min(position)=0 and max(position)=2 from public.collaboration_experience_round_participants where round_id=pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222'))
  and (select count(*)=5 from public.collaboration_experience_round_prompts where round_id=pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222'))
  and (select count(*)=5 from public.collaboration_experience_prompt_assignments where round_id=pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222'))
  and (
    select array_agg(assignment.target_position order by round_prompt.position)=array[0,1,2,0,1]::smallint[]
    from public.collaboration_experience_prompt_assignments assignment
    join public.collaboration_experience_round_prompts round_prompt on round_prompt.id=assignment.round_prompt_id
    where assignment.round_id=pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222')
  ),
  'three-founder snapshot or deterministic rotation is wrong'
);
reset role;
select set_config('request.jwt.claims','{"sub":"d2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(public.join_collaboration_experience_round(pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222'))='forming','trio activated before all founders joined');
reset role;
select set_config('request.jwt.claims','{"sub":"d3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(public.join_collaboration_experience_round(pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222'))='active','trio did not activate at 3/3');
do $$ declare a record; begin
  select * into a from public.collaboration_experience_prompt_assignments where round_id=pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222') and target_user_id <> 'd3333333-3333-4333-8333-333333333333' limit 1;
  begin perform public.lock_collaboration_response(a.id,'self',array['act_independently']); raise exception 'non-target wrote self slot'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A membership change terminally abandons an active round and blocks subsequent responses/reveal.
delete from public.founder_team_members
where team_id='da222222-2222-4222-8222-222222222222' and user_id='d3333333-3333-4333-8333-333333333333';
select pg_temp.assert_rmm(
  (select status='abandoned' and abandoned_at is not null from public.collaboration_experience_rounds where id=pg_temp.rmm_round_for_team('da222222-2222-4222-8222-222222222222')),
  'membership change did not abandon active round'
);

-- Account deletion removes every relational round before participant/auth FKs can leave residue.
select set_config('request.jwt.claims','{"sub":"d5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('da333333-3333-4333-8333-333333333333','when_things_get_tricky',1);
reset role;
select pg_temp.fill_rmm_creator_answers(pg_temp.rmm_round_for_team('da333333-3333-4333-8333-333333333333'));
select set_config('request.jwt.claims','{"sub":"d6666666-6666-4666-8666-666666666666","role":"authenticated"}',true);
set local role authenticated;
select public.decline_collaboration_experience_round(pg_temp.rmm_round_for_team('da333333-3333-4333-8333-333333333333'));
select pg_temp.assert_rmm(
  (select status='abandoned' from public.collaboration_experience_rounds where founder_team_id='da333333-3333-4333-8333-333333333333'),
  'decline did not abandon forming round'
);
reset role;
select set_config('request.jwt.claims','{"sub":"d5555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('da333333-3333-4333-8333-333333333333','easy_start',1);
reset role;
set local role service_role;
select public.delete_founder_account_data('d5555555-5555-4555-8555-555555555555',null);
reset role;
select pg_temp.assert_rmm(
  not exists (select 1 from public.collaboration_experience_rounds where founder_team_id='da333333-3333-4333-8333-333333333333')
  and not exists (select 1 from public.collaboration_experience_round_participants where founder_user_id='d5555555-5555-4555-8555-555555555555'),
  'account cleanup left Read My Mind relational data'
);

-- The auth-level trigger also covers a regular direct auth deletion, without recursion or FK residue.
insert into public.founder_team_members(team_id,user_id)
values ('da333333-3333-4333-8333-333333333333','d4444444-4444-4444-8444-444444444444');
select set_config('request.jwt.claims','{"sub":"d6666666-6666-4666-8666-666666666666","role":"authenticated"}',true);
set local role authenticated;
select public.create_collaboration_experience_round('da333333-3333-4333-8333-333333333333','easy_start',1);
reset role;
delete from auth.users where id='d6666666-6666-4666-8666-666666666666';
select pg_temp.assert_rmm(
  not exists (select 1 from public.collaboration_experience_rounds where founder_team_id='da333333-3333-4333-8333-333333333333')
  and not exists (select 1 from public.collaboration_experience_round_participants where founder_user_id='d6666666-6666-4666-8666-666666666666'),
  'direct auth deletion left Read My Mind relational data'
);

-- Authenticated nonparticipants (including any advisor kind) see no round data and cannot reveal.
select set_config('request.jwt.claims','{"sub":"d4444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_rmm(
  (select count(*)=0 from public.collaboration_experience_rounds)
  and (select count(*)=0 from public.collaboration_experience_round_participants)
  and (select count(*)=0 from public.collaboration_experience_round_prompts)
  and (select count(*)=0 from public.collaboration_experience_prompt_assignments)
  and (select count(*)=0 from public.collaboration_experience_responses)
  and (select count(*)=0 from public.collaboration_experience_reveal_receipts),
  'nonparticipant or advisor can read collaboration data'
);
do $$ declare v_round_prompt uuid := pg_temp.rmm_prompt_for_team('da111111-1111-4111-8111-111111111111',0); begin
  begin perform public.get_collaboration_prompt_reveal(v_round_prompt); raise exception 'advisor-like user revealed round'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select extensions.pass('Read My Mind foundation enforces opt-in, immutable answers, round-wide reveal, membership and advisor isolation');
select * from extensions.finish();
rollback;
