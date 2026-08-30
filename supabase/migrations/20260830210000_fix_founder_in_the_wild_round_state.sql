begin;

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
language plpgsql
stable
security definer
set search_path = ''
as $$
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
      select 1
      from public.collaboration_experience_prompt_assignments assignment
      join public.collaboration_experience_round_prompts prompt
        on prompt.id = assignment.round_prompt_id
      join public.collaboration_experience_prompt_response_contracts contract
        on contract.experience_key = prompt.experience_key
       and contract.pack_key = prompt.pack_key
       and contract.pack_version = prompt.pack_version
       and contract.prompt_key = prompt.prompt_key
       and contract.prompt_version = prompt.prompt_version
      where assignment.round_id = p_round_id
        and assignment.target_user_id = auth.uid()
        and not exists (
          select 1
          from public.collaboration_experience_responses response
          where response.prompt_assignment_id = assignment.id
            and response.respondent_user_id = auth.uid()
            and response.response_type = contract.response_type
        )
    ),
    public.is_founder_in_the_wild_round_answer_complete(p_round_id),
    (
      select count(*)::integer
      from public.collaboration_experience_reveal_receipts receipt
      where receipt.round_id = p_round_id
        and receipt.participant_user_id = auth.uid()
    ),
    exists (
      select 1
      from public.collaboration_experience_rounds round_row
      where round_row.id = p_round_id
        and round_row.status = 'active'
        and round_row.created_by_user_id = auth.uid()
        and not exists (
          select 1
          from public.collaboration_experience_responses response
          where response.round_id = p_round_id
            and response.respondent_user_id <> auth.uid()
        )
    ),
    exists (
      select 1
      from public.collaboration_experience_rounds round_row
      where round_row.id = p_round_id
        and round_row.status = 'active'
        and round_row.created_by_user_id <> auth.uid()
        and not exists (
          select 1
          from public.collaboration_experience_responses response
          where response.round_id = p_round_id
            and response.respondent_user_id = auth.uid()
        )
    ),
    (
      select count(distinct response.respondent_user_id) = 2
      from public.collaboration_experience_responses response
      where response.round_id = p_round_id
    );
end;
$$;

revoke all on function public.get_founder_in_the_wild_round_state(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_founder_in_the_wild_round_state(uuid)
  to authenticated;

comment on function public.get_founder_in_the_wild_round_state(uuid) is
  'Returns the narrow current-participant Founder in the Wild round state without ambiguous output-column references.';

commit;
