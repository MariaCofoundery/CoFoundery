begin;

create table if not exists public.matching_workspace_agreements (
  id uuid primary key default gen_random_uuid(),
  matching_workspace_id uuid not null unique references public.matching_workspaces(id) on delete cascade,
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  status text not null default 'draft',
  sections jsonb not null default '{}'::jsonb,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  updated_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matching_workspace_agreements_status_check
    check (status in ('draft')),
  constraint matching_workspace_agreements_sections_object_check
    check (jsonb_typeof(sections) = 'object')
);

create index if not exists matching_workspace_agreements_relationship_created_idx
  on public.matching_workspace_agreements (relationship_id, created_at desc);

create or replace function public.set_matching_workspace_agreements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_matching_workspace_agreements_set_updated_at
  on public.matching_workspace_agreements;

create trigger trg_matching_workspace_agreements_set_updated_at
before update on public.matching_workspace_agreements
for each row
execute function public.set_matching_workspace_agreements_updated_at();

create or replace function public.initial_matching_workspace_agreement_sections()
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'roles', jsonb_build_object('notes', '', 'agreement', '', 'updatedAt', null),
    'commitment', jsonb_build_object('notes', '', 'agreement', '', 'updatedAt', null),
    'decisions', jsonb_build_object('notes', '', 'agreement', '', 'updatedAt', null),
    'conflict', jsonb_build_object('notes', '', 'agreement', '', 'updatedAt', null),
    'communication', jsonb_build_object('notes', '', 'agreement', '', 'updatedAt', null),
    'equity_conversation', jsonb_build_object('notes', '', 'agreement', '', 'updatedAt', null),
    'next_90_days', jsonb_build_object('notes', '', 'agreement', '', 'updatedAt', null)
  );
$$;

alter table public.matching_workspace_agreements enable row level security;

drop policy if exists matching_workspace_agreements_select_active_participants
  on public.matching_workspace_agreements;

create policy matching_workspace_agreements_select_active_participants
on public.matching_workspace_agreements
for select
to authenticated
using (
  exists (
    select 1
    from public.matching_workspaces workspace
    where workspace.id = matching_workspace_agreements.matching_workspace_id
      and public.is_matching_session_active_participant(workspace.matching_session_id, auth.uid())
  )
);

create or replace function public.create_or_get_matching_workspace_agreement(
  p_matching_workspace_id uuid
)
returns table (
  agreement_id uuid,
  matching_workspace_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_workspace public.matching_workspaces%rowtype;
  v_existing_agreement public.matching_workspace_agreements%rowtype;
  v_agreement_id uuid;
begin
  if v_current_user_id is null then
    raise exception 'matching_workspace_agreement_auth_required';
  end if;

  select *
    into v_workspace
  from public.matching_workspaces workspace
  where workspace.id = p_matching_workspace_id;

  if not found then
    raise exception 'matching_workspace_agreement_workspace_unavailable';
  end if;

  if not public.is_matching_session_active_participant(
    v_workspace.matching_session_id,
    v_current_user_id
  ) then
    raise exception 'matching_workspace_agreement_workspace_unavailable';
  end if;

  if v_workspace.status <> 'prepared' then
    raise exception 'matching_workspace_agreement_workspace_not_prepared';
  end if;

  select *
    into v_existing_agreement
  from public.matching_workspace_agreements agreement
  where agreement.matching_workspace_id = p_matching_workspace_id;

  if found then
    agreement_id := v_existing_agreement.id;
    matching_workspace_id := v_existing_agreement.matching_workspace_id;
    status := v_existing_agreement.status;
    return next;
    return;
  end if;

  insert into public.matching_workspace_agreements (
    matching_workspace_id,
    relationship_id,
    status,
    sections,
    created_by_user_id,
    updated_by_user_id
  )
  values (
    p_matching_workspace_id,
    v_workspace.relationship_id,
    'draft',
    public.initial_matching_workspace_agreement_sections(),
    v_current_user_id,
    v_current_user_id
  )
  on conflict on constraint matching_workspace_agreements_matching_workspace_id_key
  do nothing
  returning id into v_agreement_id;

  if v_agreement_id is null then
    select agreement.id
      into v_agreement_id
    from public.matching_workspace_agreements agreement
    where agreement.matching_workspace_id = p_matching_workspace_id;
  end if;

  if v_agreement_id is null then
    raise exception 'matching_workspace_agreement_create_failed';
  end if;

  agreement_id := v_agreement_id;
  matching_workspace_id := p_matching_workspace_id;
  status := 'draft';
  return next;
end;
$$;

revoke all on function public.initial_matching_workspace_agreement_sections()
  from public;

grant execute on function public.initial_matching_workspace_agreement_sections()
  to authenticated;

revoke all on function public.create_or_get_matching_workspace_agreement(uuid)
  from public;

grant execute on function public.create_or_get_matching_workspace_agreement(uuid)
  to authenticated;

comment on table public.matching_workspace_agreements is
  'Neutral draft Operating Agreement foundation for prepared matching workspaces. V1 does not create invitations, legacy workbooks, advisor rows, reports, emails, or copy assessment answers.';

comment on function public.create_or_get_matching_workspace_agreement(uuid) is
  'Atomically creates or returns a draft agreement for a prepared matching workspace after validating active participant access. It derives relationship_id from matching_workspaces and does not touch legacy workbook, advisor, invitation, report, email, profile, preference, or assessment-answer data.';

commit;
