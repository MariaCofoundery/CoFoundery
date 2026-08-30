begin;

create or replace function public.is_founder_in_the_wild_participant_answer_complete(
  p_round_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collaboration_experience_prompt_assignments assignment
    where assignment.round_id = p_round_id
      and assignment.target_user_id = p_user_id
  )
  and not exists (
    select 1
    from public.collaboration_experience_prompt_assignments assignment
    join public.collaboration_experience_round_prompts prompt
      on prompt.id = assignment.round_prompt_id
     and prompt.round_id = assignment.round_id
    join public.collaboration_experience_prompt_response_contracts contract
      on contract.experience_key = prompt.experience_key
     and contract.pack_key = prompt.pack_key
     and contract.pack_version = prompt.pack_version
     and contract.prompt_key = prompt.prompt_key
     and contract.prompt_version = prompt.prompt_version
    where assignment.round_id = p_round_id
      and assignment.target_user_id = p_user_id
      and not exists (
        select 1
        from public.collaboration_experience_responses response
        where response.prompt_assignment_id = assignment.id
          and response.respondent_user_id = p_user_id
          and response.response_type = contract.response_type
          and response.locked_at is not null
      )
  );
$$;

create or replace function public.mark_founder_in_the_wild_handoff_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_id uuid;
begin
  if not exists (
    select 1
    from public.collaboration_experience_rounds round_row
    where round_row.id = new.round_id
      and round_row.experience_key = 'founder_in_the_wild'
      and round_row.status = 'active'
      and round_row.handoff_ready_at is null
  ) then
    return new;
  end if;

  select participant.founder_user_id
  into v_partner_id
  from public.collaboration_experience_round_participants participant
  where participant.round_id = new.round_id
    and participant.state = 'joined'
    and participant.founder_user_id <> new.respondent_user_id;

  if v_partner_id is not null
     and (select count(*) from public.collaboration_experience_round_participants participant
          where participant.round_id = new.round_id and participant.state = 'joined') = 2
     and public.is_founder_in_the_wild_participant_answer_complete(new.round_id, new.respondent_user_id)
     and not public.is_founder_in_the_wild_participant_answer_complete(new.round_id, v_partner_id) then
    update public.collaboration_experience_rounds round_row
    set handoff_ready_at = coalesce(round_row.handoff_ready_at, pg_catalog.now())
    where round_row.id = new.round_id
      and round_row.status = 'active'
      and round_row.handoff_ready_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists mark_founder_in_the_wild_handoff_ready_after_response
  on public.collaboration_experience_responses;
create trigger mark_founder_in_the_wild_handoff_ready_after_response
after insert on public.collaboration_experience_responses
for each row execute function public.mark_founder_in_the_wild_handoff_ready();

create or replace function public.get_founder_in_the_wild_handoff_state(p_round_id uuid)
returns table (
  own_started boolean,
  own_complete boolean,
  partner_started boolean,
  partner_complete boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_partner_id uuid;
begin
  if v_user_id is null
     or not public.is_current_user_collaboration_round_participant(p_round_id, true)
     or not exists (
       select 1
       from public.collaboration_experience_rounds round_row
       where round_row.id = p_round_id
         and round_row.experience_key = 'founder_in_the_wild'
         and round_row.status in ('active', 'completed')
     ) then
    raise exception 'founder_in_the_wild_unavailable' using errcode = '42501';
  end if;

  select participant.founder_user_id
  into v_partner_id
  from public.collaboration_experience_round_participants participant
  where participant.round_id = p_round_id
    and participant.state = 'joined'
    and participant.founder_user_id <> v_user_id;

  if v_partner_id is null
     or (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = p_round_id and participant.state = 'joined') <> 2 then
    raise exception 'founder_in_the_wild_unavailable' using errcode = '42501';
  end if;

  return query select
    exists (
      select 1 from public.collaboration_experience_responses response
      where response.round_id = p_round_id and response.respondent_user_id = v_user_id
    ),
    public.is_founder_in_the_wild_participant_answer_complete(p_round_id, v_user_id),
    exists (
      select 1 from public.collaboration_experience_responses response
      where response.round_id = p_round_id and response.respondent_user_id = v_partner_id
    ),
    public.is_founder_in_the_wild_participant_answer_complete(p_round_id, v_partner_id);
end;
$$;

create or replace function public.claim_founder_in_the_wild_handoff_email(p_round_id uuid)
returns table (recipient_user_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round public.collaboration_experience_rounds%rowtype;
  v_recipient_id uuid;
begin
  if v_user_id is null then
    raise exception 'founder_in_the_wild_auth_required' using errcode = '42501';
  end if;

  select * into v_round
  from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id;
  if not found then
    raise exception 'founder_in_the_wild_handoff_unavailable' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team_row
  where team_row.id = v_round.founder_team_id for update;
  select * into v_round from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id for update;

  if v_round.experience_key <> 'founder_in_the_wild'
     or not public.is_current_user_collaboration_round_participant(p_round_id, true) then
    raise exception 'founder_in_the_wild_handoff_unavailable' using errcode = '42501';
  end if;

  if v_round.status <> 'active'
     or v_round.handoff_ready_at is null
     or v_round.handoff_email_claimed_at is not null
     or not public.is_founder_in_the_wild_participant_answer_complete(p_round_id, v_user_id) then
    return;
  end if;

  select participant.founder_user_id
  into v_recipient_id
  from public.collaboration_experience_round_participants participant
  where participant.round_id = p_round_id
    and participant.state = 'joined'
    and participant.founder_user_id <> v_user_id
    and not public.is_founder_in_the_wild_participant_answer_complete(
      p_round_id,
      participant.founder_user_id
    );

  if v_recipient_id is null
     or (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = p_round_id and participant.state = 'joined') <> 2 then
    return;
  end if;

  update public.collaboration_experience_rounds round_row
  set handoff_email_claimed_at = pg_catalog.now()
  where round_row.id = p_round_id
    and round_row.handoff_email_claimed_at is null;
  if not found then return; end if;

  return query select v_recipient_id;
end;
$$;

revoke all on function public.is_founder_in_the_wild_participant_answer_complete(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.mark_founder_in_the_wild_handoff_ready()
  from public, anon, authenticated, service_role;
revoke all on function public.get_founder_in_the_wild_handoff_state(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_founder_in_the_wild_handoff_email(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_founder_in_the_wild_handoff_state(uuid) to authenticated;
grant execute on function public.claim_founder_in_the_wild_handoff_email(uuid) to authenticated;

comment on function public.get_founder_in_the_wild_handoff_state(uuid) is
  'Returns only current/partner started and complete flags for a two-founder FITW participant; no responses or choice keys.';
comment on function public.claim_founder_in_the_wild_handoff_email(uuid) is
  'Atomically claims the one FITW handoff email after the current founder completes and while the other founder remains incomplete.';

commit;
