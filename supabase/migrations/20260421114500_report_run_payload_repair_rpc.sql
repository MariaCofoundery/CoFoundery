create or replace function public.block_report_runs_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_account_cleanup', true) = 'on' then
    return old;
  end if;

  if tg_op = 'UPDATE' and current_setting('app.allow_report_run_repair', true) = 'on' then
    return new;
  end if;

  raise exception 'report_runs_are_immutable';
end;
$$;

create or replace function public.repair_report_run_payload(
  p_report_run_id uuid,
  p_payload jsonb,
  p_modules public.assessment_module[],
  p_input_assessment_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_run_id uuid;
begin
  if p_report_run_id is null then
    raise exception 'missing_report_run_id';
  end if;

  if p_payload is null then
    raise exception 'missing_payload';
  end if;

  perform set_config('app.allow_report_run_repair', 'on', true);

  update public.report_runs
  set payload = p_payload,
      modules = coalesce(p_modules, modules),
      input_assessment_ids = coalesce(p_input_assessment_ids, input_assessment_ids)
  where id = p_report_run_id
  returning id into v_report_run_id;

  if v_report_run_id is null then
    raise exception 'report_run_not_found';
  end if;

  return v_report_run_id;
end;
$$;

revoke all on function public.repair_report_run_payload(uuid, jsonb, public.assessment_module[], uuid[]) from public;
grant execute on function public.repair_report_run_payload(uuid, jsonb, public.assessment_module[], uuid[]) to authenticated;
grant execute on function public.repair_report_run_payload(uuid, jsonb, public.assessment_module[], uuid[]) to service_role;
