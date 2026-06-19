begin;

create or replace function public.create_matching_report_run_from_session(
  p_matching_session_id uuid,
  p_payload jsonb,
  p_modules public.assessment_module[],
  p_input_assessment_ids uuid[]
)
returns table (
  matching_report_run_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_session public.matching_sessions%rowtype;
  v_existing_report public.matching_report_runs%rowtype;
  v_report_id uuid;
  v_session_modules public.assessment_module[];
  v_session_input_assessment_ids uuid[];
  v_required_input_count integer := 0;
  v_present_required_input_count integer := 0;
begin
  if v_current_user_id is null then
    raise exception 'matching_report_auth_required';
  end if;

  select *
    into v_session
  from public.matching_sessions session
  where session.id = p_matching_session_id;

  if not found then
    raise exception 'matching_report_session_unavailable';
  end if;

  if not public.is_matching_session_active_participant(p_matching_session_id, v_current_user_id) then
    raise exception 'matching_report_session_unavailable';
  end if;

  select *
    into v_existing_report
  from public.matching_report_runs report_run
  where report_run.matching_session_id = p_matching_session_id;

  if found then
    matching_report_run_id := v_existing_report.id;
    status := v_session.status;
    return next;
    return;
  end if;

  if v_session.status <> 'ready_for_report' then
    raise exception 'matching_report_session_not_ready';
  end if;

  select array_agg(module order by module)
    into v_session_modules
  from public.matching_session_modules
  where matching_session_id = p_matching_session_id;

  if coalesce(v_session_modules, array[]::public.assessment_module[])
     <> (
       select coalesce(array_agg(module order by module), array[]::public.assessment_module[])
       from unnest(p_modules) as module
     ) then
    raise exception 'matching_report_modules_mismatch';
  end if;

  select array_agg(input.assessment_id order by input.assessment_id)
    into v_session_input_assessment_ids
  from public.matching_session_inputs input
  join public.matching_session_participants participant
    on participant.matching_session_id = input.matching_session_id
   and participant.user_id = input.user_id
   and participant.status = 'active'
  join public.matching_session_modules session_module
    on session_module.matching_session_id = input.matching_session_id
   and session_module.module = input.module
  where input.matching_session_id = p_matching_session_id;

  if coalesce(v_session_input_assessment_ids, array[]::uuid[])
     <> (
       select coalesce(array_agg(assessment_id order by assessment_id), array[]::uuid[])
       from unnest(p_input_assessment_ids) as assessment_id
     ) then
    raise exception 'matching_report_input_assessment_ids_mismatch';
  end if;

  select count(*)
    into v_required_input_count
  from public.matching_session_participants participant
  cross join public.matching_session_modules session_module
  where participant.matching_session_id = p_matching_session_id
    and participant.status = 'active'
    and session_module.matching_session_id = p_matching_session_id
    and session_module.required = true;

  select count(*)
    into v_present_required_input_count
  from public.matching_session_inputs input
  join public.matching_session_participants participant
    on participant.matching_session_id = input.matching_session_id
   and participant.user_id = input.user_id
   and participant.status = 'active'
  join public.matching_session_modules session_module
    on session_module.matching_session_id = input.matching_session_id
   and session_module.module = input.module
   and session_module.required = true
  where input.matching_session_id = p_matching_session_id;

  if v_required_input_count = 0 or v_present_required_input_count <> v_required_input_count then
    raise exception 'matching_report_required_inputs_missing';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'matching_report_payload_invalid';
  end if;

  if p_payload ->> 'reportType' <> 'founder_alignment_v1' then
    raise exception 'matching_report_payload_invalid';
  end if;

  insert into public.matching_report_runs (
    matching_session_id,
    modules,
    input_assessment_ids,
    payload,
    created_by_user_id
  )
  values (
    p_matching_session_id,
    p_modules,
    p_input_assessment_ids,
    p_payload,
    v_current_user_id
  )
  returning id into v_report_id;

  update public.matching_sessions
  set
    status = 'report_ready',
    report_ready_at = coalesce(report_ready_at, now())
  where id = p_matching_session_id;

  matching_report_run_id := v_report_id;
  status := 'report_ready';
  return next;
end;
$$;

revoke all on function public.create_matching_report_run_from_session(
  uuid,
  jsonb,
  public.assessment_module[],
  uuid[]
) from public;

grant execute on function public.create_matching_report_run_from_session(
  uuid,
  jsonb,
  public.assessment_module[],
  uuid[]
) to authenticated;

comment on function public.create_matching_report_run_from_session(
  uuid,
  jsonb,
  public.assessment_module[],
  uuid[]
) is
  'Creates an immutable report snapshot for a ready neutral matching session after validating participants, modules, and session input assessment ids. Does not create invitations, relationships, workbooks, emails, or copy assessment answers.';

commit;
