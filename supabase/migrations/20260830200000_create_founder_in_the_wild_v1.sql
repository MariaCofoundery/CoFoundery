begin;

alter table public.collaboration_experience_pack_versions
  drop constraint collaboration_pack_experience_check,
  add constraint collaboration_pack_experience_check
    check (experience_key in ('read_my_mind', 'founder_in_the_wild'));

alter table public.collaboration_experience_prompt_response_contracts
  drop constraint collaboration_response_contract_type_check,
  add constraint collaboration_response_contract_type_check
    check (response_type in ('self', 'guess', 'need', 'move', 'matters'));

alter table public.collaboration_experience_responses
  drop constraint collaboration_response_type_check,
  add constraint collaboration_response_type_check
    check (response_type in ('self', 'guess', 'need', 'move', 'matters'));

insert into public.collaboration_experience_pack_versions
  (experience_key, pack_key, pack_version, prompt_count)
values ('founder_in_the_wild', 'under_pressure_v1', 1, 5);

insert into public.collaboration_experience_prompt_versions
  (experience_key, pack_key, pack_version, prompt_key, prompt_version, position, need_mode)
values
  ('founder_in_the_wild','under_pressure_v1',1,'pitch_shifts',1,0,'required'),
  ('founder_in_the_wild','under_pressure_v1',1,'customer_by_friday',1,1,'required'),
  ('founder_in_the_wild','under_pressure_v1',1,'four_months_runway',1,2,'required'),
  ('founder_in_the_wild','under_pressure_v1',1,'commitment_missed',1,3,'required'),
  ('founder_in_the_wild','under_pressure_v1',1,'pivot_pull',1,4,'required');

with contracts(prompt_key, move_keys, matters_keys, need_keys) as (
  values
    ('pitch_shifts', array['clarify_shared_position','continue_then_private','ask_open_question','explore_direction'], array['external_alignment','honesty','speed','shared_decision','openness'], array['include_me_now','stay_calm','open_disagreement','take_responsibility','reliable_follow_up']),
    ('customer_by_friday', array['reprioritize','negotiate_scope','protect_roadmap','clarify_commitment'], array['revenue_opportunity','focus','team_reliability','speed','firm_commitment'], array['decide_quickly','protect_boundaries','explore_opportunity','take_responsibility','consider_team']),
    ('four_months_runway', array['reduce_costs','prioritize_sales','intensify_fundraising','observe_then_decide'], array['security','momentum','agency','protect_team','keep_options_open'], array['share_numbers','raise_hard_choices','stay_calm','take_position','carry_together']),
    ('commitment_missed', array['rescue_together','leave_responsibility','address_now','secure_then_clarify'], array['reliability','mutual_support','responsibility','external_impact','understand_causes'], array['signal_early','take_responsibility','accept_support','address_directly','new_commitment']),
    ('pivot_pull', array['prioritize_new_path','limited_experiment','protect_core','criteria_deadline'], array['focus','learning','speed','shared_vision','evidence'], array['open_to_change','defend_vision','use_data','hold_uncertainty','commit_to_decision'])
)
insert into public.collaboration_experience_prompt_response_contracts (
  experience_key, pack_key, pack_version, prompt_key, prompt_version,
  response_type, response_format, allowed_choice_keys, min_selections, max_selections
)
select 'founder_in_the_wild', 'under_pressure_v1', 1, contract.prompt_key, 1,
       slot.response_type,
       case when slot.response_type = 'matters' then 'multi_choice' else 'single_choice' end,
       case slot.response_type when 'move' then contract.move_keys when 'matters' then contract.matters_keys else contract.need_keys end,
       1,
       case when slot.response_type = 'matters' then 2 else 1 end
from contracts contract
cross join (values ('move'::text), ('matters'::text), ('need'::text)) slot(response_type);

create or replace function public.create_founder_in_the_wild_round(
  p_founder_team_id uuid,
  p_pack_key text default 'under_pressure_v1',
  p_pack_version integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round_id uuid;
  v_round_prompt_id uuid;
  v_prompt record;
  v_member record;
begin
  if v_user_id is null then raise exception 'founder_in_the_wild_auth_required' using errcode = '42501'; end if;
  perform 1 from public.founder_teams where id = p_founder_team_id for update;
  if not found or not exists (select 1 from public.founder_team_members where team_id = p_founder_team_id and user_id = v_user_id) then
    raise exception 'founder_in_the_wild_unavailable' using errcode = '42501';
  end if;
  if (select count(*) from public.founder_team_members where team_id = p_founder_team_id) <> 2 then
    raise exception 'founder_in_the_wild_requires_two_founders' using errcode = '22023';
  end if;
  if not exists (select 1 from public.collaboration_experience_pack_versions where experience_key = 'founder_in_the_wild' and pack_key = p_pack_key and pack_version = p_pack_version) then
    raise exception 'founder_in_the_wild_pack_unavailable' using errcode = '22023';
  end if;

  select round_row.id into v_round_id
  from public.collaboration_experience_rounds round_row
  where round_row.founder_team_id = p_founder_team_id
    and round_row.experience_key = 'founder_in_the_wild'
    and round_row.pack_key = p_pack_key
    and round_row.status in ('forming', 'active')
  limit 1;
  if found then return v_round_id; end if;

  insert into public.collaboration_experience_rounds (
    founder_team_id, experience_key, pack_key, pack_version, created_by_user_id,
    status, rotation_offset, activated_at
  ) values (
    p_founder_team_id, 'founder_in_the_wild', p_pack_key, p_pack_version, v_user_id,
    'active', 0, pg_catalog.now()
  ) returning id into v_round_id;

  insert into public.collaboration_experience_round_participants (round_id, founder_user_id, position, state, joined_at)
  select v_round_id, member.user_id,
         (row_number() over (order by member.created_at, member.user_id) - 1)::smallint,
         'joined', pg_catalog.now()
  from public.founder_team_members member where member.team_id = p_founder_team_id;

  for v_prompt in
    select * from public.collaboration_experience_prompt_versions
    where experience_key = 'founder_in_the_wild' and pack_key = p_pack_key and pack_version = p_pack_version
    order by position
  loop
    insert into public.collaboration_experience_round_prompts (
      round_id, experience_key, pack_key, pack_version, prompt_key, prompt_version, position
    ) values (
      v_round_id, 'founder_in_the_wild', p_pack_key, p_pack_version, v_prompt.prompt_key, v_prompt.prompt_version, v_prompt.position
    ) returning id into v_round_prompt_id;
    for v_member in select founder_user_id, position from public.collaboration_experience_round_participants where round_id = v_round_id loop
      insert into public.collaboration_experience_prompt_assignments (round_id, round_prompt_id, target_user_id, target_position)
      values (v_round_id, v_round_prompt_id, v_member.founder_user_id, v_member.position);
    end loop;
  end loop;
  return v_round_id;
exception when unique_violation then
  select round_row.id into v_round_id
  from public.collaboration_experience_rounds round_row
  where round_row.founder_team_id = p_founder_team_id
    and round_row.experience_key = 'founder_in_the_wild'
    and round_row.pack_key = p_pack_key
    and round_row.status in ('forming', 'active')
  limit 1;
  if found then return v_round_id; end if;
  raise;
end;
$$;

create or replace function public.lock_founder_in_the_wild_response(
  p_prompt_assignment_id uuid,
  p_response_type text,
  p_choice_keys text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_assignment public.collaboration_experience_prompt_assignments%rowtype;
  v_prompt public.collaboration_experience_round_prompts%rowtype;
  v_round public.collaboration_experience_rounds%rowtype;
  v_contract public.collaboration_experience_prompt_response_contracts%rowtype;
  v_existing public.collaboration_experience_responses%rowtype;
  v_choices text[];
  v_response_id uuid;
begin
  if v_user_id is null then raise exception 'founder_in_the_wild_auth_required' using errcode = '42501'; end if;
  if p_response_type not in ('move','matters','need') then raise exception 'founder_in_the_wild_response_invalid' using errcode = '22023'; end if;
  select * into v_assignment from public.collaboration_experience_prompt_assignments where id = p_prompt_assignment_id;
  select * into v_prompt from public.collaboration_experience_round_prompts where id = v_assignment.round_prompt_id and round_id = v_assignment.round_id;
  select * into v_round from public.collaboration_experience_rounds where id = v_assignment.round_id;
  if not found or v_round.experience_key <> 'founder_in_the_wild' or v_round.status <> 'active'
     or v_assignment.target_user_id <> v_user_id
     or not public.is_current_user_collaboration_round_participant(v_round.id, true) then
    raise exception 'founder_in_the_wild_response_unavailable' using errcode = '42501';
  end if;
  perform 1 from public.founder_teams where id = v_round.founder_team_id for update;
  perform 1 from public.collaboration_experience_rounds where id = v_round.id for update;
  if not exists (
    select 1
    from public.collaboration_experience_rounds round_row
    join public.founder_team_members member
      on member.team_id = round_row.founder_team_id
     and member.user_id = v_user_id
    where round_row.id = v_round.id
      and round_row.experience_key = 'founder_in_the_wild'
      and round_row.status = 'active'
  ) then
    raise exception 'founder_in_the_wild_response_unavailable' using errcode = '42501';
  end if;
  select * into v_contract from public.collaboration_experience_prompt_response_contracts
  where experience_key = v_prompt.experience_key and pack_key = v_prompt.pack_key and pack_version = v_prompt.pack_version
    and prompt_key = v_prompt.prompt_key and prompt_version = v_prompt.prompt_version and response_type = p_response_type;
  if not found then raise exception 'founder_in_the_wild_response_unavailable' using errcode = '42501'; end if;
  select coalesce(array_agg(key order by key), '{}'::text[]) into v_choices
  from (select distinct unnest(coalesce(p_choice_keys, '{}'::text[])) key) normalized;
  if cardinality(v_choices) <> cardinality(coalesce(p_choice_keys, '{}'::text[]))
     or cardinality(v_choices) not between v_contract.min_selections and v_contract.max_selections
     or not v_choices <@ v_contract.allowed_choice_keys then
    raise exception 'founder_in_the_wild_choices_invalid' using errcode = '22023';
  end if;
  select * into v_existing from public.collaboration_experience_responses
  where prompt_assignment_id = p_prompt_assignment_id and respondent_user_id = v_user_id and response_type = p_response_type;
  if found then
    if v_existing.choice_keys = v_choices then return v_existing.id; end if;
    raise exception 'collaboration_response_is_locked' using errcode = '42501';
  end if;
  insert into public.collaboration_experience_responses (round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys)
  values (v_round.id, p_prompt_assignment_id, v_user_id, p_response_type, v_choices)
  returning id into v_response_id;
  return v_response_id;
exception when unique_violation then
  select * into v_existing from public.collaboration_experience_responses
  where prompt_assignment_id = p_prompt_assignment_id and respondent_user_id = v_user_id and response_type = p_response_type;
  if v_existing.choice_keys = v_choices then return v_existing.id; end if;
  raise exception 'collaboration_response_is_locked' using errcode = '42501';
end;
$$;

create or replace function public.is_founder_in_the_wild_round_answer_complete(p_round_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_current_user_collaboration_round_participant(p_round_id, true)
    and exists (select 1 from public.collaboration_experience_rounds where id = p_round_id and experience_key = 'founder_in_the_wild' and status in ('active','completed'))
    and not exists (
      select 1
      from public.collaboration_experience_prompt_assignments assignment
      join public.collaboration_experience_round_prompts prompt on prompt.id = assignment.round_prompt_id and prompt.round_id = assignment.round_id
      join public.collaboration_experience_prompt_response_contracts contract
        on contract.experience_key = prompt.experience_key and contract.pack_key = prompt.pack_key and contract.pack_version = prompt.pack_version
       and contract.prompt_key = prompt.prompt_key and contract.prompt_version = prompt.prompt_version
      where assignment.round_id = p_round_id
        and not exists (select 1 from public.collaboration_experience_responses response
          where response.prompt_assignment_id = assignment.id and response.respondent_user_id = assignment.target_user_id
            and response.response_type = contract.response_type and response.locked_at is not null)
    );
$$;

create or replace function public.get_founder_in_the_wild_round_state(p_round_id uuid)
returns table (
  round_id uuid,
  own_answer_complete boolean,
  answer_phase_complete boolean,
  own_reveal_count integer,
  can_discard boolean,
  can_decline boolean,
  both_started boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_current_user_collaboration_round_participant(p_round_id, true)
     or not exists (
       select 1 from public.collaboration_experience_rounds round_row
       where round_row.id = p_round_id
         and round_row.experience_key = 'founder_in_the_wild'
         and round_row.status in ('active', 'completed')
     ) then
    raise exception 'founder_in_the_wild_unavailable' using errcode = '42501';
  end if;
  return query select p_round_id,
    not exists (
      select 1 from public.collaboration_experience_prompt_assignments assignment
      join public.collaboration_experience_round_prompts prompt on prompt.id = assignment.round_prompt_id
      join public.collaboration_experience_prompt_response_contracts contract on contract.experience_key=prompt.experience_key and contract.pack_key=prompt.pack_key and contract.pack_version=prompt.pack_version and contract.prompt_key=prompt.prompt_key and contract.prompt_version=prompt.prompt_version
      where assignment.round_id=p_round_id and assignment.target_user_id=auth.uid()
        and not exists (select 1 from public.collaboration_experience_responses response where response.prompt_assignment_id=assignment.id and response.respondent_user_id=auth.uid() and response.response_type=contract.response_type)
    ),
    public.is_founder_in_the_wild_round_answer_complete(p_round_id),
    (select count(*)::integer from public.collaboration_experience_reveal_receipts where round_id=p_round_id and participant_user_id=auth.uid()),
    exists (
      select 1 from public.collaboration_experience_rounds round_row
      where round_row.id=p_round_id and round_row.status='active'
        and round_row.created_by_user_id=auth.uid()
        and not exists (
          select 1 from public.collaboration_experience_responses response
          where response.round_id=p_round_id and response.respondent_user_id<>auth.uid()
        )
    ),
    exists (
      select 1 from public.collaboration_experience_rounds round_row
      where round_row.id=p_round_id and round_row.status='active'
        and round_row.created_by_user_id<>auth.uid()
        and not exists (
          select 1 from public.collaboration_experience_responses response
          where response.round_id=p_round_id and response.respondent_user_id=auth.uid()
        )
    ),
    (select count(distinct response.respondent_user_id)=2
     from public.collaboration_experience_responses response where response.round_id=p_round_id);
end;
$$;

create or replace function public.prevent_collaboration_response_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='DELETE' and (
    pg_trigger_depth()>1
    or exists (
      select 1 from public.collaboration_experience_rounds round_row
      where round_row.id=old.round_id and round_row.status='abandoned'
        and (round_row.activated_at is null or round_row.experience_key='founder_in_the_wild')
    )
  ) then return old; end if;
  raise exception 'collaboration_response_is_locked' using errcode='42501';
end;
$$;

create or replace function public.purge_founder_in_the_wild_abandoned_content(p_round_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.collaboration_experience_rounds round_row
    where round_row.id=p_round_id
      and round_row.experience_key='founder_in_the_wild'
      and round_row.status='abandoned'
  ) then raise exception 'founder_in_the_wild_purge_unavailable' using errcode='42501'; end if;
  delete from public.collaboration_experience_conversation_markers where round_id=p_round_id;
  delete from public.collaboration_experience_reveal_receipts where round_id=p_round_id;
  delete from public.collaboration_experience_responses where round_id=p_round_id;
end;
$$;

create or replace function public.end_founder_in_the_wild_round(p_round_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_round public.collaboration_experience_rounds%rowtype;
  v_own_started boolean;
  v_partner_started boolean;
begin
  if v_user_id is null then raise exception 'founder_in_the_wild_auth_required' using errcode='42501'; end if;
  select * into v_round from public.collaboration_experience_rounds where id=p_round_id;
  if not found then raise exception 'founder_in_the_wild_unavailable' using errcode='42501'; end if;
  perform 1 from public.founder_teams where id=v_round.founder_team_id for update;
  select * into v_round from public.collaboration_experience_rounds where id=p_round_id for update;
  if v_round.experience_key<>'founder_in_the_wild' or v_round.status<>'active'
     or not public.is_current_user_collaboration_round_participant(p_round_id,true) then
    raise exception 'founder_in_the_wild_end_unavailable' using errcode='42501';
  end if;
  select exists(select 1 from public.collaboration_experience_responses where round_id=p_round_id and respondent_user_id=v_user_id),
         exists(select 1 from public.collaboration_experience_responses where round_id=p_round_id and respondent_user_id<>v_user_id)
  into v_own_started,v_partner_started;
  if (p_action='discard' and (v_round.created_by_user_id<>v_user_id or v_partner_started))
     or (p_action='decline' and (v_round.created_by_user_id=v_user_id or v_own_started))
     or p_action not in ('discard','decline') then
    raise exception 'founder_in_the_wild_end_unavailable' using errcode='42501';
  end if;
  update public.collaboration_experience_rounds
  set status='abandoned',abandoned_at=pg_catalog.now()
  where id=p_round_id;
  perform public.purge_founder_in_the_wild_abandoned_content(p_round_id);
end;
$$;

create or replace function public.get_founder_in_the_wild_prompt_reveal(p_round_prompt_id uuid)
returns table (round_prompt_id uuid, respondent_user_id uuid, response_type text, choice_keys text[], locked_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_round_id uuid;
begin
  select prompt.round_id into v_round_id from public.collaboration_experience_round_prompts prompt
  join public.collaboration_experience_rounds round_row on round_row.id=prompt.round_id
  where prompt.id=p_round_prompt_id and round_row.experience_key='founder_in_the_wild' and round_row.status in ('active','completed');
  if not found or not public.is_current_user_collaboration_round_participant(v_round_id,true)
     or not public.is_founder_in_the_wild_round_answer_complete(v_round_id) then
    raise exception 'founder_in_the_wild_reveal_unavailable' using errcode = '42501';
  end if;
  insert into public.collaboration_experience_reveal_receipts(round_id,round_prompt_id,participant_user_id)
  values(v_round_id,p_round_prompt_id,v_user_id)
  on conflict on constraint collaboration_experience_reveal_receipts_pkey
  do update set opened_at=excluded.opened_at;
  return query select response.round_prompt_id, response.respondent_user_id, response.response_type, response.choice_keys, response.locked_at
  from (
    select assignment.round_prompt_id, raw.respondent_user_id, raw.response_type, raw.choice_keys, raw.locked_at
    from public.collaboration_experience_responses raw
    join public.collaboration_experience_prompt_assignments assignment on assignment.id=raw.prompt_assignment_id
    where assignment.round_prompt_id=p_round_prompt_id
  ) response order by response.respondent_user_id,response.response_type;
end;
$$;

create or replace function public.complete_founder_in_the_wild_round(p_round_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.collaboration_experience_rounds where id=p_round_id for update;
  if not public.is_founder_in_the_wild_round_answer_complete(p_round_id)
     or exists (
       select 1 from public.collaboration_experience_round_participants participant
       cross join public.collaboration_experience_round_prompts prompt
       where participant.round_id=p_round_id and prompt.round_id=p_round_id
         and not exists (select 1 from public.collaboration_experience_reveal_receipts receipt where receipt.round_prompt_id=prompt.id and receipt.participant_user_id=participant.founder_user_id)
     ) then raise exception 'founder_in_the_wild_reveals_incomplete' using errcode='55000'; end if;
  update public.collaboration_experience_rounds set status='completed',completed_at=coalesce(completed_at,pg_catalog.now()) where id=p_round_id and status='active';
end;
$$;

revoke all on function public.create_founder_in_the_wild_round(uuid,text,integer) from public,anon,authenticated,service_role;
revoke all on function public.lock_founder_in_the_wild_response(uuid,text,text[]) from public,anon,authenticated,service_role;
revoke all on function public.is_founder_in_the_wild_round_answer_complete(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_founder_in_the_wild_round_state(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_founder_in_the_wild_prompt_reveal(uuid) from public,anon,authenticated,service_role;
revoke all on function public.complete_founder_in_the_wild_round(uuid) from public,anon,authenticated,service_role;
revoke all on function public.purge_founder_in_the_wild_abandoned_content(uuid) from public,anon,authenticated,service_role;
revoke all on function public.end_founder_in_the_wild_round(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.create_founder_in_the_wild_round(uuid,text,integer) to authenticated;
grant execute on function public.lock_founder_in_the_wild_response(uuid,text,text[]) to authenticated;
grant execute on function public.is_founder_in_the_wild_round_answer_complete(uuid) to authenticated;
grant execute on function public.get_founder_in_the_wild_round_state(uuid) to authenticated;
grant execute on function public.get_founder_in_the_wild_prompt_reveal(uuid) to authenticated;
grant execute on function public.complete_founder_in_the_wild_round(uuid) to authenticated;
grant execute on function public.end_founder_in_the_wild_round(uuid,text) to authenticated;

comment on function public.create_founder_in_the_wild_round(uuid,text,integer) is 'Creates one active, two-founder Under Pressure round with joined participant snapshots and one self assignment per scenario.';
comment on function public.get_founder_in_the_wild_prompt_reveal(uuid) is 'Returns structured Founder in the Wild responses only after the round-wide answer barrier and records an explicit reveal receipt.';

commit;
