begin;

create or replace function public.create_matching_session_from_discovery_start(
  p_discovery_matching_start_id uuid
)
returns table (
  matching_session_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_start public.discovery_matching_starts%rowtype;
  v_intro public.discovery_intro_requests%rowtype;
  v_existing_session public.matching_sessions%rowtype;
  v_session_id uuid;
  v_requester_base_assessment_id uuid;
  v_recipient_base_assessment_id uuid;
  v_status text := 'awaiting_inputs';
  v_report_ready_at timestamptz := null;
  v_confirmed_at timestamptz;
begin
  if v_current_user_id is null then
    raise exception 'matching_core_auth_required';
  end if;

  select *
    into v_start
  from public.discovery_matching_starts
  where id = p_discovery_matching_start_id;

  if not found then
    raise exception 'matching_core_discovery_start_unavailable';
  end if;

  if v_current_user_id not in (v_start.requester_user_id, v_start.recipient_user_id) then
    raise exception 'matching_core_discovery_start_unavailable';
  end if;

  if v_start.status <> 'ready_for_matching' then
    raise exception 'matching_core_discovery_start_not_ready';
  end if;

  if v_start.requester_user_id = v_start.recipient_user_id then
    raise exception 'matching_core_discovery_start_not_ready';
  end if;

  select *
    into v_intro
  from public.discovery_intro_requests
  where id = v_start.intro_request_id;

  if not found
     or v_intro.status <> 'accepted'
     or v_intro.requester_user_id <> v_start.requester_user_id
     or v_intro.recipient_user_id <> v_start.recipient_user_id then
    raise exception 'matching_core_discovery_start_not_ready';
  end if;

  if exists (
    select 1
    from public.relationships relationship
    where relationship.user_low = least(v_start.requester_user_id, v_start.recipient_user_id)
      and relationship.user_high = greatest(v_start.requester_user_id, v_start.recipient_user_id)
  ) then
    raise exception 'matching_core_relationship_exists';
  end if;

  if not exists (
    select 1
    from public.founder_discovery_profiles profile
    where profile.user_id = v_start.requester_user_id
      and profile.status = 'active'
  )
  or not exists (
    select 1
    from public.founder_discovery_profiles profile
    where profile.user_id = v_start.recipient_user_id
      and profile.status = 'active'
  ) then
    raise exception 'matching_core_profiles_inactive';
  end if;

  select *
    into v_existing_session
  from public.matching_sessions session
  where session.source_type = 'discovery_matching_start'
    and session.source_id = v_start.id;

  if found then
    matching_session_id := v_existing_session.id;
    status := v_existing_session.status;
    return next;
    return;
  end if;

  select assessment.id
    into v_requester_base_assessment_id
  from public.assessments assessment
  where assessment.user_id = v_start.requester_user_id
    and assessment.module = 'base'
    and assessment.submitted_at is not null
  order by assessment.submitted_at desc, assessment.created_at desc
  limit 1;

  select assessment.id
    into v_recipient_base_assessment_id
  from public.assessments assessment
  where assessment.user_id = v_start.recipient_user_id
    and assessment.module = 'base'
    and assessment.submitted_at is not null
  order by assessment.submitted_at desc, assessment.created_at desc
  limit 1;

  if v_requester_base_assessment_id is not null
     and v_recipient_base_assessment_id is not null then
    v_status := 'ready_for_report';
    v_report_ready_at := now();
  end if;

  insert into public.matching_sessions (
    source_type,
    source_id,
    status,
    created_by_user_id,
    report_ready_at
  )
  values (
    'discovery_matching_start',
    v_start.id,
    v_status,
    v_current_user_id,
    v_report_ready_at
  )
  returning id into v_session_id;

  v_confirmed_at := coalesce(v_start.confirmed_at, now());

  insert into public.matching_session_participants (
    matching_session_id,
    user_id,
    role,
    status,
    confirmed_at
  )
  values
    (v_session_id, v_start.requester_user_id, 'founder', 'active', v_confirmed_at),
    (v_session_id, v_start.recipient_user_id, 'founder', 'active', v_confirmed_at);

  insert into public.matching_session_modules (
    matching_session_id,
    module,
    required
  )
  values (
    v_session_id,
    'base',
    true
  );

  if v_requester_base_assessment_id is not null then
    insert into public.matching_session_inputs (
      matching_session_id,
      user_id,
      module,
      assessment_id
    )
    values (
      v_session_id,
      v_start.requester_user_id,
      'base',
      v_requester_base_assessment_id
    );
  end if;

  if v_recipient_base_assessment_id is not null then
    insert into public.matching_session_inputs (
      matching_session_id,
      user_id,
      module,
      assessment_id
    )
    values (
      v_session_id,
      v_start.recipient_user_id,
      'base',
      v_recipient_base_assessment_id
    );
  end if;

  matching_session_id := v_session_id;
  status := v_status;
  return next;
end;
$$;

revoke all on function public.create_matching_session_from_discovery_start(uuid)
  from public;

grant execute on function public.create_matching_session_from_discovery_start(uuid)
  to authenticated;

comment on function public.create_matching_session_from_discovery_start(uuid) is
  'Atomically creates or returns a neutral matching session from a ready Discovery matching start. Does not create invitations, relationships, reports, workbooks, emails, or copy assessment answers.';

commit;
