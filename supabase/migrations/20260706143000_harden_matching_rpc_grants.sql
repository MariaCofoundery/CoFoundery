revoke execute on function public.create_matching_session_from_discovery_start(uuid)
  from anon;
revoke execute on function public.create_matching_session_from_discovery_start(uuid)
  from public;
grant execute on function public.create_matching_session_from_discovery_start(uuid)
  to authenticated;

revoke execute on function public.create_matching_report_run_from_session(
  uuid,
  jsonb,
  public.assessment_module[],
  uuid[]
)
  from anon;
revoke execute on function public.create_matching_report_run_from_session(
  uuid,
  jsonb,
  public.assessment_module[],
  uuid[]
)
  from public;
grant execute on function public.create_matching_report_run_from_session(
  uuid,
  jsonb,
  public.assessment_module[],
  uuid[]
)
  to authenticated;

revoke execute on function public.start_workspace_from_matching_session(uuid)
  from anon;
revoke execute on function public.start_workspace_from_matching_session(uuid)
  from public;
grant execute on function public.start_workspace_from_matching_session(uuid)
  to authenticated;

revoke execute on function public.create_or_get_matching_workspace_agreement(uuid)
  from anon;
revoke execute on function public.create_or_get_matching_workspace_agreement(uuid)
  from public;
grant execute on function public.create_or_get_matching_workspace_agreement(uuid)
  to authenticated;
