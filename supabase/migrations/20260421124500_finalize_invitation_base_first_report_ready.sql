drop function if exists public.finalize_invitation_if_ready(uuid, jsonb);

create function public.finalize_invitation_if_ready(
  p_invitation_id uuid,
  p_payload jsonb default null
)
returns table (
  ready boolean,
  report_run_id uuid,
  relationship_id uuid,
  modules public.assessment_module[],
  assessment_ids uuid[],
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
  v_required_modules public.assessment_module[];
  v_report_modules public.assessment_module[] := array['base'::public.assessment_module];
  v_assessment_id uuid;
  v_assessment_ids uuid[] := '{}'::uuid[];
  v_relationship_id uuid;
  v_report_run_id uuid;
  v_inviter_values_id uuid;
  v_invitee_values_id uuid;
begin
  select * into v_inv
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'invitation_not_found';
    return;
  end if;

  if v_inv.revoked_at is not null or v_inv.status = 'revoked' then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'revoked';
    return;
  end if;

  if v_inv.expires_at < now() then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'expired';
    return;
  end if;

  if v_inv.status <> 'accepted' then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'not_accepted';
    return;
  end if;

  if v_inv.invitee_user_id is null then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'missing_invitee';
    return;
  end if;

  select coalesce(array_agg(im.module order by im.module), '{}'::public.assessment_module[])
    into v_required_modules
  from public.invitation_modules im
  where im.invitation_id = v_inv.id;

  if array_position(v_required_modules, 'base'::public.assessment_module) is null then
    v_required_modules := array_prepend('base'::public.assessment_module, v_required_modules);
  end if;

  select imi.assessment_id
    into v_assessment_id
  from public.invitation_matching_inputs imi
  join public.assessments a
    on a.id = imi.assessment_id
  where imi.invitation_id = v_inv.id
    and imi.user_id = v_inv.inviter_user_id
    and imi.module = 'base'::public.assessment_module
    and a.submitted_at is not null
  order by a.submitted_at desc nulls last, a.created_at desc
  limit 1;

  if v_assessment_id is null then
    select a.id
      into v_assessment_id
    from public.assessments a
    where a.user_id = v_inv.inviter_user_id
      and a.module = 'base'::public.assessment_module
      and a.submitted_at is not null
    order by a.submitted_at desc nulls last, a.created_at desc
    limit 1;
  end if;

  if v_assessment_id is null then
    return query select false, null::uuid, null::uuid, v_report_modules, v_assessment_ids, 'waiting_for_answers';
    return;
  end if;

  v_assessment_ids := array_append(v_assessment_ids, v_assessment_id);
  v_assessment_id := null;

  select imi.assessment_id
    into v_assessment_id
  from public.invitation_matching_inputs imi
  join public.assessments a
    on a.id = imi.assessment_id
  where imi.invitation_id = v_inv.id
    and imi.user_id = v_inv.invitee_user_id
    and imi.module = 'base'::public.assessment_module
    and a.submitted_at is not null
  order by a.submitted_at desc nulls last, a.created_at desc
  limit 1;

  if v_assessment_id is null then
    select a.id
      into v_assessment_id
    from public.assessments a
    where a.user_id = v_inv.invitee_user_id
      and a.module = 'base'::public.assessment_module
      and a.submitted_at is not null
    order by a.submitted_at desc nulls last, a.created_at desc
    limit 1;
  end if;

  if v_assessment_id is null then
    return query select false, null::uuid, null::uuid, v_report_modules, v_assessment_ids, 'waiting_for_answers';
    return;
  end if;

  v_assessment_ids := array_append(v_assessment_ids, v_assessment_id);

  if array_position(v_required_modules, 'values'::public.assessment_module) is not null then
    select imi.assessment_id
      into v_inviter_values_id
    from public.invitation_matching_inputs imi
    join public.assessments a
      on a.id = imi.assessment_id
    where imi.invitation_id = v_inv.id
      and imi.user_id = v_inv.inviter_user_id
      and imi.module = 'values'::public.assessment_module
      and a.submitted_at is not null
    order by a.submitted_at desc nulls last, a.created_at desc
    limit 1;

    if v_inviter_values_id is null then
      select a.id
        into v_inviter_values_id
      from public.assessments a
      where a.user_id = v_inv.inviter_user_id
        and a.module = 'values'::public.assessment_module
        and a.submitted_at is not null
      order by a.submitted_at desc nulls last, a.created_at desc
      limit 1;
    end if;

    select imi.assessment_id
      into v_invitee_values_id
    from public.invitation_matching_inputs imi
    join public.assessments a
      on a.id = imi.assessment_id
    where imi.invitation_id = v_inv.id
      and imi.user_id = v_inv.invitee_user_id
      and imi.module = 'values'::public.assessment_module
      and a.submitted_at is not null
    order by a.submitted_at desc nulls last, a.created_at desc
    limit 1;

    if v_invitee_values_id is null then
      select a.id
        into v_invitee_values_id
      from public.assessments a
      where a.user_id = v_inv.invitee_user_id
        and a.module = 'values'::public.assessment_module
        and a.submitted_at is not null
      order by a.submitted_at desc nulls last, a.created_at desc
      limit 1;
    end if;

    if v_inviter_values_id is not null and v_invitee_values_id is not null then
      v_report_modules := array['base'::public.assessment_module, 'values'::public.assessment_module];
      v_assessment_ids := array_append(v_assessment_ids, v_inviter_values_id);
      v_assessment_ids := array_append(v_assessment_ids, v_invitee_values_id);
    end if;
  end if;

  insert into public.relationships(user_a_id, user_b_id)
  values (v_inv.inviter_user_id, v_inv.invitee_user_id)
  on conflict (user_low, user_high)
  do nothing
  returning id into v_relationship_id;

  if v_relationship_id is null then
    select r.id
      into v_relationship_id
    from public.relationships r
    where r.user_low = least(v_inv.inviter_user_id, v_inv.invitee_user_id)
      and r.user_high = greatest(v_inv.inviter_user_id, v_inv.invitee_user_id)
    limit 1;
  end if;

  select rr.id
    into v_report_run_id
  from public.report_runs rr
  where rr.invitation_id = v_inv.id
  limit 1;

  if v_report_run_id is null and p_payload is not null then
    insert into public.report_runs(
      relationship_id,
      invitation_id,
      modules,
      input_assessment_ids,
      payload
    )
    values (
      v_relationship_id,
      v_inv.id,
      v_report_modules,
      v_assessment_ids,
      p_payload
    )
    on conflict (invitation_id)
    do nothing
    returning id into v_report_run_id;

    if v_report_run_id is null then
      select rr.id
        into v_report_run_id
      from public.report_runs rr
      where rr.invitation_id = v_inv.id
      limit 1;
    end if;
  end if;

  return query select true, v_report_run_id, v_relationship_id, v_report_modules, v_assessment_ids, null::text;
end;
$$;

revoke all on function public.finalize_invitation_if_ready(uuid, jsonb) from public;
grant execute on function public.finalize_invitation_if_ready(uuid, jsonb) to authenticated;
grant execute on function public.finalize_invitation_if_ready(uuid, jsonb) to service_role;
