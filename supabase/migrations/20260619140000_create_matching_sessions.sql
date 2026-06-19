begin;

create table if not exists public.matching_sessions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  status text not null default 'awaiting_inputs',
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  canceled_at timestamptz,
  report_ready_at timestamptz,
  constraint matching_sessions_source_type_check
    check (source_type in ('discovery_matching_start', 'invitation', 'manual', 'program', 'advisor')),
  constraint matching_sessions_status_check
    check (status in ('awaiting_inputs', 'ready_for_report', 'report_ready', 'canceled')),
  constraint matching_sessions_canceled_at_check
    check (
      (status = 'canceled' and canceled_at is not null)
      or (status <> 'canceled' and canceled_at is null)
    ),
  constraint matching_sessions_report_ready_at_check
    check (
      report_ready_at is null
      or status in ('ready_for_report', 'report_ready')
    )
);

create unique index if not exists matching_sessions_source_unique_idx
  on public.matching_sessions (source_type, source_id)
  where source_id is not null;

create index if not exists matching_sessions_created_by_status_idx
  on public.matching_sessions (created_by_user_id, status, created_at desc);

create table if not exists public.matching_session_participants (
  matching_session_id uuid not null references public.matching_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'founder',
  status text not null default 'active',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (matching_session_id, user_id),
  constraint matching_session_participants_role_check
    check (role in ('founder', 'advisor_viewer')),
  constraint matching_session_participants_status_check
    check (status in ('active', 'left', 'removed'))
);

create index if not exists matching_session_participants_user_status_idx
  on public.matching_session_participants (user_id, status, created_at desc);

create table if not exists public.matching_session_modules (
  matching_session_id uuid not null references public.matching_sessions(id) on delete cascade,
  module public.assessment_module not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (matching_session_id, module)
);

create table if not exists public.matching_session_inputs (
  id uuid primary key default gen_random_uuid(),
  matching_session_id uuid not null references public.matching_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module public.assessment_module not null,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matching_session_inputs_user_module_unique
    unique (matching_session_id, user_id, module),
  constraint matching_session_inputs_assessment_unique
    unique (matching_session_id, assessment_id)
);

create index if not exists matching_session_inputs_user_module_idx
  on public.matching_session_inputs (user_id, module);

create or replace function public.validate_matching_session_input()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.matching_session_participants participant
    where participant.matching_session_id = new.matching_session_id
      and participant.user_id = new.user_id
      and participant.status = 'active'
  ) then
    raise exception 'matching_session_input_user_not_active_participant';
  end if;

  if not exists (
    select 1
    from public.matching_session_modules session_module
    where session_module.matching_session_id = new.matching_session_id
      and session_module.module = new.module
  ) then
    raise exception 'matching_session_input_module_not_enabled';
  end if;

  if not exists (
    select 1
    from public.assessments assessment
    where assessment.id = new.assessment_id
      and assessment.user_id = new.user_id
      and assessment.module = new.module
      and assessment.submitted_at is not null
  ) then
    raise exception 'matching_session_input_assessment_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_matching_sessions_set_updated_at
  on public.matching_sessions;

create trigger trg_matching_sessions_set_updated_at
before update on public.matching_sessions
for each row
execute function public.set_founder_discovery_updated_at();

drop trigger if exists trg_matching_session_participants_set_updated_at
  on public.matching_session_participants;

create trigger trg_matching_session_participants_set_updated_at
before update on public.matching_session_participants
for each row
execute function public.set_founder_discovery_updated_at();

drop trigger if exists trg_matching_session_inputs_set_updated_at
  on public.matching_session_inputs;

create trigger trg_matching_session_inputs_set_updated_at
before update on public.matching_session_inputs
for each row
execute function public.set_founder_discovery_updated_at();

drop trigger if exists trg_matching_session_inputs_validate
  on public.matching_session_inputs;

create trigger trg_matching_session_inputs_validate
before insert or update on public.matching_session_inputs
for each row
execute function public.validate_matching_session_input();

alter table public.matching_sessions enable row level security;
alter table public.matching_session_participants enable row level security;
alter table public.matching_session_modules enable row level security;
alter table public.matching_session_inputs enable row level security;

drop policy if exists matching_sessions_select_active_participants on public.matching_sessions;
create policy matching_sessions_select_active_participants
on public.matching_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.matching_session_participants participant
    where participant.matching_session_id = matching_sessions.id
      and participant.user_id = auth.uid()
      and participant.status = 'active'
  )
);

drop policy if exists matching_session_participants_select_active_participants
  on public.matching_session_participants;
create policy matching_session_participants_select_active_participants
on public.matching_session_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.matching_session_participants viewer
    where viewer.matching_session_id = matching_session_participants.matching_session_id
      and viewer.user_id = auth.uid()
      and viewer.status = 'active'
  )
);

drop policy if exists matching_session_modules_select_active_participants
  on public.matching_session_modules;
create policy matching_session_modules_select_active_participants
on public.matching_session_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.matching_session_participants participant
    where participant.matching_session_id = matching_session_modules.matching_session_id
      and participant.user_id = auth.uid()
      and participant.status = 'active'
  )
);

drop policy if exists matching_session_inputs_select_active_participants
  on public.matching_session_inputs;
create policy matching_session_inputs_select_active_participants
on public.matching_session_inputs
for select
to authenticated
using (
  exists (
    select 1
    from public.matching_session_participants participant
    where participant.matching_session_id = matching_session_inputs.matching_session_id
      and participant.user_id = auth.uid()
      and participant.status = 'active'
  )
);

comment on table public.matching_sessions is
  'Neutral matching context for known users. V1 stores session readiness only and does not create invitations, relationships, reports, workbooks, emails, or copy assessment answers.';

comment on table public.matching_session_inputs is
  'References submitted assessments for a matching session. Raw assessment answers are not copied.';

commit;
