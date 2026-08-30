begin;

create or replace function public.is_commitment_lab_complete(p_relationship_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_relationship public.relationships%rowtype;
begin
  if v_user_id is null then
    raise exception 'commitment_lab_auth_required' using errcode = '42501';
  end if;

  select *
  into v_relationship
  from public.relationships relationship
  where relationship.id = p_relationship_id;

  if not found or v_user_id not in (v_relationship.user_a_id, v_relationship.user_b_id) then
    raise exception 'commitment_lab_unavailable' using errcode = '42501';
  end if;

  return exists (
    select 1
    from public.commitment_labs lab
    where lab.relationship_id = p_relationship_id
      and nullif(btrim(lab.shared_reflection), '') is not null
  ) and (
    select count(*) = 2
    from public.commitment_lab_founder_entries entry
    where entry.relationship_id = p_relationship_id
      and entry.user_id in (v_relationship.user_a_id, v_relationship.user_b_id)
      and entry.current_hours is not null
      and entry.difficult_week_hours is not null
      and entry.reality_fit is not null
      and nullif(btrim(entry.commitment_meaning), '') is not null
      and nullif(btrim(entry.priority_reflection), '') is not null
      and nullif(btrim(entry.reliability_reflection), '') is not null
      and nullif(btrim(entry.transparency_reflection), '') is not null
      and nullif(btrim(entry.responsibility_reflection), '') is not null
      and nullif(btrim(entry.renegotiation_reflection), '') is not null
      and not exists (
        select 1
        from (values
          ('motivation_progress'),
          ('time_circumstances'),
          ('attractive_alternative'),
          ('team_responsibility')
        ) required_scenario(key)
        where nullif(btrim(entry.scenario_answers -> required_scenario.key ->> 'action'), '') is null
           or nullif(btrim(entry.scenario_answers -> required_scenario.key ->> 'expectation'), '') is null
      )
  );
end;
$$;

revoke all on function public.is_commitment_lab_complete(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.is_commitment_lab_complete(uuid)
  to authenticated;

comment on function public.is_commitment_lab_complete(uuid) is
  'Returns only whether both relationship founders completed the required Commitment Lab inputs and a shared reflection exists. Setup handoff, discussions, markers, and scores are not completion requirements.';

commit;
