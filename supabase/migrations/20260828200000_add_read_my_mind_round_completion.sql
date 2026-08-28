-- Complete a Read My Mind round only after every joined participant opened every reveal.

create or replace function public.complete_collaboration_experience_round(p_round_id uuid)
returns table (
  round_id uuid,
  status text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_status text;
  v_completed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'collaboration_round_auth_required' using errcode = '42501';
  end if;

  select round_row.founder_team_id
  into v_team_id
  from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id;

  if not found then
    raise exception 'collaboration_round_unavailable' using errcode = '42501';
  end if;

  -- Keep the existing team -> round lock order used by create/join/decline and
  -- membership-change lifecycle handling.
  perform 1
  from public.founder_teams team_row
  where team_row.id = v_team_id
  for update;

  select round_row.status, round_row.completed_at
  into v_status, v_completed_at
  from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id
    and round_row.founder_team_id = v_team_id
  for update;

  if not found
     or not public.is_current_user_collaboration_round_participant(p_round_id, true) then
    raise exception 'collaboration_round_unavailable' using errcode = '42501';
  end if;

  if v_status = 'completed' then
    return query select p_round_id, v_status, v_completed_at;
    return;
  end if;

  if v_status <> 'active' then
    raise exception 'collaboration_round_completion_unavailable' using errcode = '42501';
  end if;

  if not public.is_collaboration_round_answer_phase_complete(p_round_id) then
    raise exception 'collaboration_round_answers_incomplete' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.collaboration_experience_round_participants participant
    cross join public.collaboration_experience_round_prompts round_prompt
    where participant.round_id = p_round_id
      and participant.state = 'joined'
      and round_prompt.round_id = p_round_id
      and not exists (
        select 1
        from public.collaboration_experience_reveal_receipts receipt
        where receipt.round_id = p_round_id
          and receipt.round_prompt_id = round_prompt.id
          and receipt.participant_user_id = participant.founder_user_id
      )
  ) then
    raise exception 'collaboration_round_reveals_incomplete' using errcode = '55000';
  end if;

  update public.collaboration_experience_rounds round_row
  set status = 'completed',
      completed_at = pg_catalog.now()
  where round_row.id = p_round_id
  returning round_row.status, round_row.completed_at
  into v_status, v_completed_at;

  return query select p_round_id, v_status, v_completed_at;
end;
$$;

revoke all on function public.complete_collaboration_experience_round(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.complete_collaboration_experience_round(uuid)
  to authenticated;

comment on function public.complete_collaboration_experience_round(uuid) is
  'Atomically completes a round after the existing answer barrier and one reveal receipt per joined participant and round prompt. Repeated calls preserve completed_at.';

-- A joined current founder may end an open round without conflating that action
-- with a pending participant declining the invitation to join it.
create or replace function public.abandon_collaboration_experience_round(p_round_id uuid)
returns table (
  round_id uuid,
  status text,
  abandoned_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_status text;
  v_abandoned_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'collaboration_round_auth_required' using errcode = '42501';
  end if;

  select round_row.founder_team_id
  into v_team_id
  from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id;

  if not found then
    raise exception 'collaboration_round_unavailable' using errcode = '42501';
  end if;

  -- Match the existing team -> round lock order so completion and abandonment
  -- serialize on the same rows and exactly one terminal transition can win.
  perform 1
  from public.founder_teams team_row
  where team_row.id = v_team_id
  for update;

  select round_row.status, round_row.abandoned_at
  into v_status, v_abandoned_at
  from public.collaboration_experience_rounds round_row
  where round_row.id = p_round_id
    and round_row.founder_team_id = v_team_id
  for update;

  if not found
     or not public.is_current_user_collaboration_round_participant(p_round_id, true) then
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
  set status = 'abandoned',
      abandoned_at = pg_catalog.now()
  where round_row.id = p_round_id
  returning round_row.status, round_row.abandoned_at
  into v_status, v_abandoned_at;

  return query select p_round_id, v_status, v_abandoned_at;
end;
$$;

revoke all on function public.abandon_collaboration_experience_round(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.abandon_collaboration_experience_round(uuid)
  to authenticated;

comment on function public.abandon_collaboration_experience_round(uuid) is
  'Atomically abandons a forming or active round for a joined current founder. Repeated authorized calls preserve abandoned_at; completed rounds remain terminal.';
