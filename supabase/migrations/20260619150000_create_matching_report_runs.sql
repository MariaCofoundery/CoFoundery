begin;

create table if not exists public.matching_report_runs (
  id uuid primary key default gen_random_uuid(),
  matching_session_id uuid not null unique references public.matching_sessions(id) on delete cascade,
  modules public.assessment_module[] not null,
  input_assessment_ids uuid[] not null,
  payload jsonb not null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint matching_report_runs_modules_nonempty_check
    check (cardinality(modules) > 0),
  constraint matching_report_runs_input_assessment_ids_nonempty_check
    check (cardinality(input_assessment_ids) > 0),
  constraint matching_report_runs_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint matching_report_runs_payload_report_type_check
    check (payload ->> 'reportType' = 'founder_alignment_v1')
);

create index if not exists matching_report_runs_created_by_created_idx
  on public.matching_report_runs (created_by_user_id, created_at desc);

create or replace function public.block_matching_report_runs_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_account_cleanup', true) = 'on' then
    return old;
  end if;

  raise exception 'matching_report_runs_are_immutable';
end;
$$;

drop trigger if exists trg_matching_report_runs_immutable_u
  on public.matching_report_runs;

create trigger trg_matching_report_runs_immutable_u
before update on public.matching_report_runs
for each row
execute function public.block_matching_report_runs_mutation();

drop trigger if exists trg_matching_report_runs_immutable_d
  on public.matching_report_runs;

create trigger trg_matching_report_runs_immutable_d
before delete on public.matching_report_runs
for each row
execute function public.block_matching_report_runs_mutation();

create or replace function public.delete_matching_session_on_account_cleanup_participant_delete()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.allow_account_cleanup', true) = 'on' then
    delete from public.matching_sessions session
    where session.id = old.matching_session_id;
  end if;

  return old;
end;
$$;

drop trigger if exists trg_matching_participants_cleanup_session
  on public.matching_session_participants;

create trigger trg_matching_participants_cleanup_session
after delete on public.matching_session_participants
for each row
execute function public.delete_matching_session_on_account_cleanup_participant_delete();

create or replace function public.is_matching_session_active_participant(
  p_matching_session_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.matching_session_participants participant
    where participant.matching_session_id = p_matching_session_id
      and participant.user_id = p_user_id
      and participant.status = 'active'
  );
$$;

revoke all on function public.is_matching_session_active_participant(uuid, uuid)
  from public;

grant execute on function public.is_matching_session_active_participant(uuid, uuid)
  to authenticated;

alter table public.matching_report_runs enable row level security;

drop policy if exists matching_report_runs_select_active_participants
  on public.matching_report_runs;

create policy matching_report_runs_select_active_participants
on public.matching_report_runs
for select
to authenticated
using (
  public.is_matching_session_active_participant(matching_report_runs.matching_session_id, auth.uid())
);

comment on table public.matching_report_runs is
  'Immutable report snapshots for neutral matching sessions. V1 does not create invitations, relationships, workbooks, emails, or copy assessment answers.';

comment on function public.delete_matching_session_on_account_cleanup_participant_delete() is
  'During account cleanup only, deleting a matching session participant deletes the whole neutral matching session so session report snapshots cascade away.';

commit;
