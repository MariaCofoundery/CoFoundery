-- Read My Mind V1 Slice 3D: independent open rounds per pack and manual batched handoff mail.

drop index if exists public.collaboration_experience_one_open_round_per_team_idx;

create unique index collaboration_experience_one_open_round_per_team_pack_idx
  on public.collaboration_experience_rounds(founder_team_id, experience_key, pack_key)
  where status in ('forming', 'active');

create or replace function public.claim_collaboration_team_handoff_emails(
  p_founder_team_id uuid
)
returns table (
  round_id uuid,
  pack_key text,
  pack_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_eligible_count integer;
  v_recipient_count integer;
begin
  if v_user_id is null then
    raise exception 'collaboration_round_auth_required' using errcode = '42501';
  end if;

  -- Keep the existing team -> round mutation lock order. The team lock also
  -- serializes repeated batch claims for the same team.
  perform 1
  from public.founder_teams team_row
  where team_row.id = p_founder_team_id
  for update;
  if not found or not exists (
    select 1
    from public.founder_team_members member
    where member.team_id = p_founder_team_id
      and member.user_id = v_user_id
  ) then
    raise exception 'collaboration_handoff_unavailable' using errcode = '42501';
  end if;

  if (select count(*) from public.founder_team_members member
      where member.team_id = p_founder_team_id) <> 2 then
    raise exception 'collaboration_handoff_unavailable' using errcode = '42501';
  end if;

  select count(*), count(distinct pending.founder_user_id)
  into v_eligible_count, v_recipient_count
  from public.collaboration_experience_rounds round_row
  join public.collaboration_experience_round_participants pending
    on pending.round_id = round_row.id
   and pending.state = 'pending'
  where round_row.founder_team_id = p_founder_team_id
    and round_row.experience_key = 'read_my_mind'
    and round_row.status = 'forming'
    and round_row.created_by_user_id = v_user_id
    and round_row.handoff_ready_at is not null
    and round_row.handoff_email_claimed_at is null
    and public.is_collaboration_participant_answer_complete(round_row.id, v_user_id)
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = round_row.id) = 2
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = round_row.id and participant.state = 'joined') = 1
    and (select count(*) from public.collaboration_experience_round_participants participant
         where participant.round_id = round_row.id and participant.state = 'pending') = 1;

  if v_eligible_count = 0 then
    return;
  end if;
  if v_recipient_count <> 1 then
    raise exception 'collaboration_handoff_recipient_mismatch' using errcode = '42501';
  end if;

  return query
  update public.collaboration_experience_rounds round_row
  set handoff_email_claimed_at = pg_catalog.now()
  where round_row.id in (
    select candidate.id
    from public.collaboration_experience_rounds candidate
    where candidate.founder_team_id = p_founder_team_id
      and candidate.experience_key = 'read_my_mind'
      and candidate.status = 'forming'
      and candidate.created_by_user_id = v_user_id
      and candidate.handoff_ready_at is not null
      and candidate.handoff_email_claimed_at is null
      and public.is_collaboration_participant_answer_complete(candidate.id, v_user_id)
      and (select count(*) from public.collaboration_experience_round_participants participant
           where participant.round_id = candidate.id) = 2
      and (select count(*) from public.collaboration_experience_round_participants participant
           where participant.round_id = candidate.id and participant.state = 'joined') = 1
      and (select count(*) from public.collaboration_experience_round_participants participant
           where participant.round_id = candidate.id and participant.state = 'pending') = 1
  )
  returning round_row.id, round_row.pack_key, round_row.pack_version;
end;
$$;

revoke all on function public.claim_collaboration_round_handoff_email(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.claim_collaboration_team_handoff_emails(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_collaboration_team_handoff_emails(uuid) to authenticated;

comment on index public.collaboration_experience_one_open_round_per_team_pack_idx is
  'Allows independent Read My Mind rounds per pack while keeping each team/experience/pack race-safe and singular while forming or active.';
comment on function public.claim_collaboration_team_handoff_emails(uuid) is
  'Atomically claims every unannounced, handoff-ready two-founder Read My Mind round created by the current founder for one team and one pending recipient. Returns only round and pack identifiers.';
