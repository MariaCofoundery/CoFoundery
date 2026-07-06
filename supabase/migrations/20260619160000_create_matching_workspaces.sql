begin;

create table if not exists public.matching_workspaces (
  id uuid primary key default gen_random_uuid(),
  matching_session_id uuid not null unique references public.matching_sessions(id) on delete cascade,
  matching_report_run_id uuid not null unique references public.matching_report_runs(id) on delete cascade,
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'prepared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matching_workspaces_status_check
    check (status in ('prepared'))
);

create index if not exists matching_workspaces_relationship_created_idx
  on public.matching_workspaces (relationship_id, created_at desc);

create or replace function public.set_matching_workspaces_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_matching_workspaces_set_updated_at
  on public.matching_workspaces;

create trigger trg_matching_workspaces_set_updated_at
before update on public.matching_workspaces
for each row
execute function public.set_matching_workspaces_updated_at();

alter table public.matching_workspaces enable row level security;

drop policy if exists matching_workspaces_select_active_participants
  on public.matching_workspaces;

create policy matching_workspaces_select_active_participants
on public.matching_workspaces
for select
to authenticated
using (
  public.is_matching_session_active_participant(matching_workspaces.matching_session_id, auth.uid())
);

create or replace function public.start_workspace_from_matching_session(
  p_matching_session_id uuid
)
returns table (
  matching_workspace_id uuid,
  relationship_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_session public.matching_sessions%rowtype;
  v_report public.matching_report_runs%rowtype;
  v_existing_workspace public.matching_workspaces%rowtype;
  v_participant_a uuid;
  v_participant_b uuid;
  v_participant_count integer := 0;
  v_relationship_id uuid;
  v_workspace_id uuid;
begin
  if v_current_user_id is null then
    raise exception 'matching_workspace_auth_required';
  end if;

  select *
    into v_session
  from public.matching_sessions session
  where session.id = p_matching_session_id;

  if not found then
    raise exception 'matching_workspace_session_unavailable';
  end if;

  if not public.is_matching_session_active_participant(p_matching_session_id, v_current_user_id) then
    raise exception 'matching_workspace_session_unavailable';
  end if;

  if v_session.status <> 'report_ready' then
    raise exception 'matching_workspace_session_not_report_ready';
  end if;

  select *
    into v_report
  from public.matching_report_runs report_run
  where report_run.matching_session_id = p_matching_session_id;

  if not found then
    raise exception 'matching_workspace_report_missing';
  end if;

  select *
    into v_existing_workspace
  from public.matching_workspaces workspace
  where workspace.matching_session_id = p_matching_session_id;

  if found then
    matching_workspace_id := v_existing_workspace.id;
    relationship_id := v_existing_workspace.relationship_id;
    return next;
    return;
  end if;

  select count(*)
    into v_participant_count
  from public.matching_session_participants participant
  where participant.matching_session_id = p_matching_session_id
    and participant.role = 'founder'
    and participant.status = 'active';

  if v_participant_count <> 2 then
    raise exception 'matching_workspace_participants_invalid';
  end if;

  select participant.user_id
    into v_participant_a
  from public.matching_session_participants participant
  where participant.matching_session_id = p_matching_session_id
    and participant.role = 'founder'
    and participant.status = 'active'
  order by participant.created_at asc, participant.user_id asc
  limit 1;

  select participant.user_id
    into v_participant_b
  from public.matching_session_participants participant
  where participant.matching_session_id = p_matching_session_id
    and participant.role = 'founder'
    and participant.status = 'active'
    and participant.user_id <> v_participant_a
  order by participant.created_at asc, participant.user_id asc
  limit 1;

  if v_participant_a is null or v_participant_b is null or v_participant_a = v_participant_b then
    raise exception 'matching_workspace_participants_invalid';
  end if;

  insert into public.relationships(user_a_id, user_b_id)
  values (v_participant_a, v_participant_b)
  on conflict (user_low, user_high)
  do nothing
  returning id into v_relationship_id;

  if v_relationship_id is null then
    select relationship.id
      into v_relationship_id
    from public.relationships relationship
    where relationship.user_low = least(v_participant_a, v_participant_b)
      and relationship.user_high = greatest(v_participant_a, v_participant_b)
    limit 1;
  end if;

  if v_relationship_id is null then
    raise exception 'matching_workspace_relationship_unavailable';
  end if;

  insert into public.matching_workspaces (
    matching_session_id,
    matching_report_run_id,
    relationship_id,
    created_by_user_id,
    status
  )
  values (
    p_matching_session_id,
    v_report.id,
    v_relationship_id,
    v_current_user_id,
    'prepared'
  )
  on conflict (matching_session_id)
  do nothing
  returning id into v_workspace_id;

  if v_workspace_id is null then
    select workspace.id, workspace.relationship_id
      into v_workspace_id, v_relationship_id
    from public.matching_workspaces workspace
    where workspace.matching_session_id = p_matching_session_id;
  end if;

  matching_workspace_id := v_workspace_id;
  relationship_id := v_relationship_id;
  return next;
end;
$$;

revoke all on function public.start_workspace_from_matching_session(uuid)
  from public;

grant execute on function public.start_workspace_from_matching_session(uuid)
  to authenticated;

comment on table public.matching_workspaces is
  'Prepared shared workspaces created consciously from session-based matching reports. V1 creates/reuses a relationship but does not create invitations, legacy report_runs, workbooks, emails, or copy assessment answers.';

comment on function public.start_workspace_from_matching_session(uuid) is
  'Atomically prepares a shared workspace from a report-ready neutral matching session and immutable matching report. It creates or reuses the pair relationship and does not create invitations, workbooks, legacy report_runs, emails, or read assessment answers.';

commit;
