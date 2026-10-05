-- Phase 9.3: retire active editors without changing historical rows or SELECT policies.
-- Service maintenance remains available for account deletion and legacy advisor linking.
begin;
revoke insert, update on public.founder_alignment_workbooks from public, anon, authenticated;
revoke insert, update on public.matching_workspaces from public, anon, authenticated;
revoke insert, update on public.matching_workspace_agreements from public, anon, authenticated;
revoke execute on function public.start_workspace_from_matching_session(uuid) from public, anon, authenticated;
revoke execute on function public.create_or_get_matching_workspace_agreement(uuid) from public, anon, authenticated;
revoke execute on function public.handoff_workbook_deep_dive_note_if_empty(uuid, text, text) from public, anon, authenticated;
-- No changes to workbook_advisors, relationship grants, Setup, privacy RPCs or stored data.
commit;
