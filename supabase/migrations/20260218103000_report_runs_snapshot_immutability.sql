-- Report run snapshot hardening: immutable runs + source/input persistence.

alter table public.report_runs
  add column if not exists source_session_id uuid references public.sessions(id) on delete set null;

alter table public.report_runs
  add column if not exists input_refs jsonb not null default '{}'::jsonb;

alter table public.report_runs drop constraint if exists report_runs_input_refs_object_check;
alter table public.report_runs
  add constraint report_runs_input_refs_object_check
  check (jsonb_typeof(input_refs) = 'object');

create index if not exists report_runs_source_session_created_idx
  on public.report_runs(source_session_id, created_at desc)
  where source_session_id is not null;

-- Explicitly keep report_runs write-once for authenticated clients.
drop policy if exists "report_runs_update_member" on public.report_runs;
drop policy if exists "report_runs_delete_member" on public.report_runs;
drop policy if exists "report_run_modules_update_member" on public.report_run_modules;
drop policy if exists "report_run_modules_delete_member" on public.report_run_modules;

create or replace function public.block_report_runs_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'report_runs_are_immutable';
end;
$$;

drop trigger if exists report_runs_immutable on public.report_runs;
create trigger report_runs_immutable
before update or delete on public.report_runs
for each row
execute function public.block_report_runs_mutation();

create or replace function public.block_report_run_modules_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'report_run_modules_are_immutable';
end;
$$;

drop trigger if exists report_run_modules_immutable on public.report_run_modules;
create trigger report_run_modules_immutable
before update or delete on public.report_run_modules
for each row
execute function public.block_report_run_modules_mutation();

create or replace function public.ensure_relationship_for_users(
  p_user_a_id uuid,
  p_user_b_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_relationship_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_user_a_id is null or p_user_b_id is null then
    raise exception 'invalid_pair';
  end if;

  if p_user_a_id = p_user_b_id then
    raise exception 'invalid_pair';
  end if;

  if v_uid not in (p_user_a_id, p_user_b_id) then
    raise exception 'forbidden';
  end if;

  insert into public.relationships (user_a_id, user_b_id, status)
  values (p_user_a_id, p_user_b_id, 'active')
  on conflict (pair_user_low, pair_user_high)
  do update set updated_at = now()
  returning id into v_relationship_id;

  return v_relationship_id;
end;
$$;

grant execute on function public.ensure_relationship_for_users(uuid, uuid) to authenticated;
