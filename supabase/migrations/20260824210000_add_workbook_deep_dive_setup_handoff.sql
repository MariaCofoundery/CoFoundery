begin;

-- Narrow, race-safe handoff for the two Alignment Deep Dive pilot topics. The
-- workbook reflection itself remains in the existing JSON payload; this RPC only
-- copies it into an empty Founder Setup working note. It cannot resolve a setup
-- item, create revisions, or create confirmations.
create or replace function public.handoff_workbook_deep_dive_note_if_empty(
  p_team_id uuid,
  p_item_key text,
  p_working_note text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_affected integer := 0;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'founder_team_setup_auth_required' using errcode = '42501';
  end if;

  if not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'founder_team_setup_unavailable' using errcode = '42501';
  end if;

  if p_item_key not in ('decision_rights', 'conflict_deadlock') then
    raise exception 'workbook_deep_dive_handoff_item_invalid' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_working_note, '')), '') is null then
    raise exception 'workbook_deep_dive_handoff_note_empty' using errcode = '22023';
  end if;

  select count(*)::integer
    into v_member_count
  from public.founder_team_members member
  where member.team_id = p_team_id;

  if v_member_count <> 2 then
    raise exception 'workbook_deep_dive_handoff_requires_two_founders' using errcode = '42501';
  end if;

  insert into public.founder_team_setup_items (
    team_id,
    item_key,
    work_status,
    working_note,
    updated_by_user_id
  ) values (
    p_team_id,
    p_item_key,
    'open',
    btrim(p_working_note),
    v_user_id
  )
  on conflict (team_id, item_key) do update
  set working_note = excluded.working_note,
      updated_by_user_id = excluded.updated_by_user_id
  where nullif(btrim(founder_team_setup_items.working_note), '') is null;

  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.handoff_workbook_deep_dive_note_if_empty(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.handoff_workbook_deep_dive_note_if_empty(uuid, text, text)
  to authenticated;

comment on function public.handoff_workbook_deep_dive_note_if_empty(uuid, text, text) is
  'Atomically copies a two-founder workbook deep-dive reflection into an empty Founder Setup working note without creating or changing any confirmed state.';

commit;
