begin;

alter table public.collaboration_experience_rounds
  add column handoff_ready_at timestamptz,
  add column handoff_email_claimed_at timestamptz,
  add constraint collaboration_round_handoff_email_requires_ready_check
    check (handoff_email_claimed_at is null or handoff_ready_at is not null);

create or replace function public.is_collaboration_participant_answer_complete(
  p_round_id uuid,
  p_participant_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collaboration_experience_round_participants participant
    where participant.round_id = p_round_id
      and participant.founder_user_id = p_participant_user_id
      and participant.state = 'joined'
  )
  and not exists (
    select 1
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
    cross join lateral (
      select case
        when p_participant_user_id = assignment.target_user_id then 'self'
        else 'guess'
      end::text response_type
      union all
      select 'need'
      where p_participant_user_id <> assignment.target_user_id
        and prompt.need_mode = 'required'
    ) required_slot
    where assignment.round_id = p_round_id
      and not exists (
        select 1
        from public.collaboration_experience_responses response
        where response.prompt_assignment_id = assignment.id
          and response.respondent_user_id = p_participant_user_id
          and response.response_type = required_slot.response_type
          and response.locked_at is not null
      )
  );
$$;

create or replace function public.mark_collaboration_round_handoff_ready(
  p_round_id uuid,
  p_creator_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.collaboration_experience_rounds round_row
  set handoff_ready_at = coalesce(round_row.handoff_ready_at, pg_catalog.now())
  where round_row.id = p_round_id
    and round_row.status = 'forming'
    and round_row.created_by_user_id = p_creator_user_id
    and round_row.handoff_ready_at is null
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = round_row.id) = 2
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = round_row.id and participant.state = 'joined') = 1
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = round_row.id and participant.state = 'pending') = 1
    and public.is_collaboration_participant_answer_complete(round_row.id, p_creator_user_id);
end;
$$;

create or replace function public.mark_collaboration_round_handoff_after_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.mark_collaboration_round_handoff_ready(new.round_id, new.respondent_user_id);
  return new;
end;
$$;

create trigger trg_collaboration_responses_mark_handoff_ready
after insert on public.collaboration_experience_responses
for each row execute function public.mark_collaboration_round_handoff_after_response();

create or replace function public.lock_collaboration_response(
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
  v_round_prompt public.collaboration_experience_round_prompts%rowtype;
  v_round public.collaboration_experience_rounds%rowtype;
  v_contract public.collaboration_experience_prompt_response_contracts%rowtype;
  v_response_id uuid;
  v_existing public.collaboration_experience_responses%rowtype;
  v_choices text[];
  v_forming_creator_turn boolean := false;
begin
  if v_user_id is null then raise exception 'collaboration_response_auth_required' using errcode = '42501'; end if;
  if p_response_type not in ('self','guess','need') then
    raise exception 'collaboration_response_type_invalid' using errcode = '22023';
  end if;
  select * into v_assignment from public.collaboration_experience_prompt_assignments
  where id = p_prompt_assignment_id;
  if not found then raise exception 'collaboration_prompt_unavailable' using errcode = '42501'; end if;
  select * into v_round_prompt from public.collaboration_experience_round_prompts
  where id = v_assignment.round_prompt_id and round_id = v_assignment.round_id;
  if not found then raise exception 'collaboration_prompt_unavailable' using errcode = '42501'; end if;
  select * into v_round from public.collaboration_experience_rounds
  where id = v_assignment.round_id;
  perform 1 from public.founder_teams where id = v_round.founder_team_id for update;
  select * into v_round from public.collaboration_experience_rounds
  where id = v_assignment.round_id for update;

  v_forming_creator_turn := v_round.status = 'forming'
    and v_round.created_by_user_id = v_user_id
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = v_round.id) = 2
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = v_round.id and participant.state = 'joined') = 1
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = v_round.id and participant.state = 'pending') = 1;

  if (v_round.status <> 'active' and not v_forming_creator_turn)
     or not public.is_current_user_collaboration_round_participant(v_round.id, true) then
    raise exception 'collaboration_response_unavailable' using errcode = '42501';
  end if;
  if (p_response_type = 'self' and v_user_id <> v_assignment.target_user_id)
     or (p_response_type in ('guess','need') and v_user_id = v_assignment.target_user_id) then
    raise exception 'collaboration_response_slot_invalid' using errcode = '42501';
  end if;
  select * into v_contract
  from public.collaboration_experience_prompt_response_contracts
  where experience_key = v_round_prompt.experience_key
    and pack_key = v_round_prompt.pack_key and pack_version = v_round_prompt.pack_version
    and prompt_key = v_round_prompt.prompt_key and prompt_version = v_round_prompt.prompt_version
    and response_type = p_response_type;
  if not found then raise exception 'collaboration_response_slot_invalid' using errcode = '42501'; end if;

  select coalesce(array_agg(choice_key order by choice_key), '{}'::text[]) into v_choices
  from (select distinct unnest(coalesce(p_choice_keys, '{}'::text[])) choice_key) choices;
  if cardinality(v_choices) <> cardinality(coalesce(p_choice_keys, '{}'::text[]))
     or cardinality(v_choices) not between v_contract.min_selections and v_contract.max_selections
     or not v_choices <@ v_contract.allowed_choice_keys then
    raise exception 'collaboration_response_choices_invalid' using errcode = '22023';
  end if;

  select * into v_existing from public.collaboration_experience_responses
  where prompt_assignment_id = p_prompt_assignment_id
    and respondent_user_id = v_user_id and response_type = p_response_type;
  if found then
    if v_existing.choice_keys <> v_choices then
      raise exception 'collaboration_response_is_locked' using errcode = '42501';
    end if;
    if v_forming_creator_turn then
      perform public.mark_collaboration_round_handoff_ready(v_round.id, v_user_id);
    end if;
    return v_existing.id;
  end if;

  insert into public.collaboration_experience_responses (
    round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys
  ) values (
    v_round.id, p_prompt_assignment_id, v_user_id, p_response_type, v_choices
  ) returning id into v_response_id;

  if v_forming_creator_turn then
    perform public.mark_collaboration_round_handoff_ready(v_round.id, v_user_id);
  end if;
  return v_response_id;
exception
  when unique_violation then
    select * into v_existing from public.collaboration_experience_responses
    where prompt_assignment_id = p_prompt_assignment_id
      and respondent_user_id = v_user_id and response_type = p_response_type;
    if v_existing.choice_keys = v_choices then
      perform public.mark_collaboration_round_handoff_ready(v_assignment.round_id, v_user_id);
      return v_existing.id;
    end if;
    raise exception 'collaboration_response_is_locked' using errcode = '42501';
end;
$$;

create or replace function public.claim_collaboration_round_handoff_email(p_round_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'collaboration_round_auth_required' using errcode = '42501';
  end if;

  select round_row.founder_team_id into v_team_id
  from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id;
  if not found then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;

  perform 1 from public.founder_teams where id = v_team_id for update;
  perform 1 from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id for update;

  if not public.is_current_user_collaboration_round_participant(p_round_id, true)
     or not exists (
       select 1 from public.collaboration_experience_rounds round_row
       where round_row.id = p_round_id
         and round_row.status = 'forming'
         and round_row.created_by_user_id = v_user_id
         and round_row.handoff_ready_at is not null
         and public.is_collaboration_participant_answer_complete(round_row.id, v_user_id)
         and (select count(*) from public.collaboration_experience_round_participants participant
              where participant.round_id = round_row.id) = 2
         and (select count(*) from public.collaboration_experience_round_participants participant
              where participant.round_id = round_row.id and participant.state = 'pending') = 1
     ) then
    raise exception 'collaboration_handoff_unavailable' using errcode = '42501';
  end if;

  update public.collaboration_experience_rounds round_row
  set handoff_email_claimed_at = pg_catalog.now()
  where round_row.id = p_round_id
    and round_row.handoff_email_claimed_at is null;
  return found;
end;
$$;

create or replace function public.join_collaboration_experience_round(p_round_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_status text;
  v_creator_user_id uuid;
  v_handoff_ready_at timestamptz;
  v_participant_count integer;
begin
  if v_user_id is null then raise exception 'collaboration_round_auth_required' using errcode = '42501'; end if;
  select founder_team_id into v_team_id
  from public.collaboration_experience_rounds where id = p_round_id;
  if not found then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;
  perform 1 from public.founder_teams where id = v_team_id for update;
  select status, created_by_user_id, handoff_ready_at
  into v_status, v_creator_user_id, v_handoff_ready_at
  from public.collaboration_experience_rounds where id = p_round_id for update;
  select count(*) into v_participant_count
  from public.collaboration_experience_round_participants where round_id = p_round_id;
  if v_status <> 'forming'
     or not exists (
       select 1 from public.founder_team_members where team_id = v_team_id and user_id = v_user_id
     )
     or v_participant_count not in (2, 3)
     or (
       v_participant_count = 2 and (
         v_handoff_ready_at is null
         or not public.is_collaboration_participant_answer_complete(p_round_id, v_creator_user_id)
         or (select count(*) from public.collaboration_experience_round_participants where round_id = p_round_id and state = 'joined') <> 1
         or (select count(*) from public.collaboration_experience_round_participants where round_id = p_round_id and state = 'pending') <> 1
       )
     ) then
    raise exception 'collaboration_round_unavailable' using errcode = '42501';
  end if;

  update public.collaboration_experience_round_participants
  set state = 'joined', joined_at = pg_catalog.now()
  where round_id = p_round_id and founder_user_id = v_user_id and state = 'pending';
  if not found then raise exception 'collaboration_participant_not_pending' using errcode = '22023'; end if;

  if not exists (
    select 1 from public.collaboration_experience_round_participants
    where round_id = p_round_id and state <> 'joined'
  ) then
    update public.collaboration_experience_rounds
    set status = 'active', activated_at = pg_catalog.now()
    where id = p_round_id;
    return 'active';
  end if;
  return 'forming';
end;
$$;

create or replace function public.prevent_collaboration_response_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and (
    pg_trigger_depth() > 1
    or exists (
      select 1
      from public.collaboration_experience_rounds round_row
      where round_row.id = old.round_id
        and round_row.status = 'abandoned'
        and round_row.activated_at is null
    )
  ) then
    return old;
  end if;

  raise exception 'collaboration_response_is_locked' using errcode = '42501';
end;
$$;

create or replace function public.purge_collaboration_prejoin_content(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.collaboration_experience_rounds round_row
    where round_row.id = p_round_id
      and round_row.status = 'abandoned'
      and round_row.activated_at is null
  ) then
    raise exception 'collaboration_prejoin_purge_unavailable' using errcode = '42501';
  end if;

  delete from public.collaboration_experience_conversation_markers where round_id = p_round_id;
  delete from public.collaboration_experience_reveal_receipts where round_id = p_round_id;
  delete from public.collaboration_experience_responses where round_id = p_round_id;
end;
$$;

create or replace function public.decline_collaboration_experience_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_participant_count integer;
begin
  if v_user_id is null then raise exception 'collaboration_round_auth_required' using errcode = '42501'; end if;
  select founder_team_id into v_team_id
  from public.collaboration_experience_rounds where id = p_round_id;
  if not found then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;
  perform 1 from public.founder_teams where id = v_team_id for update;
  perform 1 from public.collaboration_experience_rounds
  where id = p_round_id and status = 'forming' for update;
  select count(*) into v_participant_count
  from public.collaboration_experience_round_participants where round_id = p_round_id;
  if not found or not exists (
    select 1 from public.founder_team_members where team_id = v_team_id and user_id = v_user_id
  ) or (
    v_participant_count = 2 and not exists (
      select 1 from public.collaboration_experience_rounds
      where id = p_round_id and handoff_ready_at is not null
    )
  ) then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;
  update public.collaboration_experience_round_participants
  set state = 'declined', declined_at = pg_catalog.now()
  where round_id = p_round_id and founder_user_id = v_user_id and state = 'pending';
  if not found then raise exception 'collaboration_participant_not_pending' using errcode = '22023'; end if;
  update public.collaboration_experience_rounds
  set status = 'abandoned', abandoned_at = pg_catalog.now()
  where id = p_round_id;
  perform public.purge_collaboration_prejoin_content(p_round_id);
end;
$$;

create or replace function public.abandon_collaboration_experience_round(p_round_id uuid)
returns table (round_id uuid, status text, abandoned_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_status text;
  v_activated_at timestamptz;
  v_abandoned_at timestamptz;
begin
  if v_user_id is null then raise exception 'collaboration_round_auth_required' using errcode = '42501'; end if;
  select round_row.founder_team_id into v_team_id
  from public.collaboration_experience_rounds round_row where round_row.id = p_round_id;
  if not found then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;
  perform 1 from public.founder_teams where id = v_team_id for update;
  select round_row.status, round_row.activated_at, round_row.abandoned_at
  into v_status, v_activated_at, v_abandoned_at
  from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id and round_row.founder_team_id = v_team_id for update;
  if not found or not public.is_current_user_collaboration_round_participant(p_round_id, true) then
    raise exception 'collaboration_round_unavailable' using errcode = '42501';
  end if;
  if v_status = 'abandoned' then
    return query select p_round_id, v_status, v_abandoned_at;
    return;
  end if;
  if v_status not in ('forming', 'active') then
    raise exception 'collaboration_round_abandon_unavailable' using errcode = '42501';
  end if;
  update public.collaboration_experience_rounds round_row
  set status = 'abandoned', abandoned_at = pg_catalog.now()
  where round_row.id = p_round_id
  returning round_row.status, round_row.abandoned_at into v_status, v_abandoned_at;
  if v_activated_at is null then
    perform public.purge_collaboration_prejoin_content(p_round_id);
  end if;
  return query select p_round_id, v_status, v_abandoned_at;
end;
$$;

create or replace function public.abandon_collaboration_rounds_on_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid := case when tg_op = 'DELETE' then old.team_id else new.team_id end;
  v_round_id uuid;
begin
  perform 1 from public.founder_teams where id = v_team_id for update;
  for v_round_id in
    update public.collaboration_experience_rounds
    set status = 'abandoned', abandoned_at = pg_catalog.now()
    where founder_team_id = v_team_id and status in ('forming','active')
    returning id
  loop
    if exists (
      select 1 from public.collaboration_experience_rounds round_row
      where round_row.id = v_round_id and round_row.activated_at is null
    ) then
      perform public.purge_collaboration_prejoin_content(v_round_id);
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.is_collaboration_participant_answer_complete(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_collaboration_round_handoff_ready(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_collaboration_round_handoff_after_response()
  from public, anon, authenticated, service_role;
revoke all on function public.purge_collaboration_prejoin_content(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_collaboration_round_handoff_email(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_collaboration_round_handoff_email(uuid) to authenticated;

comment on column public.collaboration_experience_rounds.handoff_ready_at is
  'Set once when the sole joined creator in a two-participant forming round has locked every required own response.';
comment on column public.collaboration_experience_rounds.handoff_email_claimed_at is
  'Persistent at-most-once claim for the best-effort sequential handoff notification.';
comment on function public.claim_collaboration_round_handoff_email(uuid) is
  'Atomically claims the one best-effort handoff email after creator completion; it returns no recipient data.';
comment on function public.purge_collaboration_prejoin_content(uuid) is
  'Internal lifecycle cleanup for abandoned rounds that never activated; no authenticated direct delete right is granted.';

commit;
