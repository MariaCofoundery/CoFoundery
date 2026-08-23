begin;

create table public.founder_team_setup_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams(id) on delete cascade,
  item_key text not null,
  work_status text not null default 'open',
  working_note text not null default '',
  current_confirmed_revision_id uuid,
  pending_revision_id uuid,
  updated_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, item_key),
  constraint founder_team_setup_items_key_check check (
    item_key in (
      'roles_responsibilities', 'decision_rights', 'time_commitment', 'communication',
      'conflict_deadlock', 'equity', 'vesting', 'compensation', 'contributions_expenses',
      'personal_financial_risk', 'legal_entity', 'founder_agreements',
      'intellectual_property', 'outside_activities', 'accounts_access',
      'prolonged_absence', 'changing_commitment', 'founder_exit'
    )
  ),
  constraint founder_team_setup_items_work_status_check
    check (work_status in ('open', 'discussing')),
  constraint founder_team_setup_items_working_note_length_check
    check (char_length(working_note) <= 10000),
  constraint founder_team_setup_items_distinct_revision_pointers_check
    check (
      current_confirmed_revision_id is null
      or pending_revision_id is null
      or current_confirmed_revision_id <> pending_revision_id
    )
);

create table public.founder_team_setup_revisions (
  id uuid primary key default gen_random_uuid(),
  setup_item_id uuid not null references public.founder_team_setup_items(id) on delete cascade,
  resolution_status text not null,
  note text not null default '',
  documentation_reference text,
  proposed_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  superseded_at timestamptz,
  unique (id, setup_item_id),
  constraint founder_team_setup_revisions_status_check
    check (resolution_status in ('clarified', 'documented', 'not_relevant')),
  constraint founder_team_setup_revisions_note_length_check
    check (char_length(note) <= 10000),
  constraint founder_team_setup_revisions_reference_length_check
    check (documentation_reference is null or char_length(documentation_reference) <= 2000),
  constraint founder_team_setup_revisions_reference_status_check
    check (resolution_status = 'documented' or documentation_reference is null),
  constraint founder_team_setup_revisions_lifecycle_check
    check (confirmed_at is null or superseded_at is null)
);

alter table public.founder_team_setup_items
  add constraint founder_team_setup_items_current_revision_fk
  foreign key (current_confirmed_revision_id, id)
  references public.founder_team_setup_revisions(id, setup_item_id)
  deferrable initially deferred;

alter table public.founder_team_setup_items
  add constraint founder_team_setup_items_pending_revision_fk
  foreign key (pending_revision_id, id)
  references public.founder_team_setup_revisions(id, setup_item_id)
  deferrable initially deferred;

create table public.founder_team_setup_confirmations (
  revision_id uuid not null references public.founder_team_setup_revisions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  confirmed_at timestamptz not null default now(),
  primary key (revision_id, user_id)
);

create index founder_team_setup_items_team_updated_idx
  on public.founder_team_setup_items(team_id, updated_at desc);
create index founder_team_setup_revisions_item_created_idx
  on public.founder_team_setup_revisions(setup_item_id, created_at desc);
create index founder_team_setup_confirmations_user_idx
  on public.founder_team_setup_confirmations(user_id, revision_id);

-- Setup finalization locks the team row while counting current members. Serialize member
-- removals on that same row so a concurrent leave/delete cannot produce a stale 2/2 or 3/3.
create or replace function public.lock_founder_team_before_member_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  perform 1 from public.founder_teams team where team.id = old.team_id for update;
  return old;
end;
$$;

create trigger trg_founder_team_members_lock_delete
before delete on public.founder_team_members
for each row execute function public.lock_founder_team_before_member_delete();

create trigger trg_founder_team_setup_items_updated_at
before update on public.founder_team_setup_items
for each row execute function public.set_founder_team_updated_at();

alter table public.founder_team_setup_items enable row level security;
alter table public.founder_team_setup_revisions enable row level security;
alter table public.founder_team_setup_confirmations enable row level security;

create policy founder_team_setup_items_select_members
on public.founder_team_setup_items
for select to authenticated
using (public.is_current_user_founder_team_member(team_id));

create policy founder_team_setup_revisions_select_members
on public.founder_team_setup_revisions
for select to authenticated
using (
  exists (
    select 1
    from public.founder_team_setup_items item
    where item.id = founder_team_setup_revisions.setup_item_id
      and public.is_current_user_founder_team_member(item.team_id)
  )
);

create policy founder_team_setup_confirmations_select_members
on public.founder_team_setup_confirmations
for select to authenticated
using (
  exists (
    select 1
    from public.founder_team_setup_revisions revision
    join public.founder_team_setup_items item on item.id = revision.setup_item_id
    where revision.id = founder_team_setup_confirmations.revision_id
      and public.is_current_user_founder_team_member(item.team_id)
  )
);

create or replace function public.save_founder_team_setup_working_state(
  p_team_id uuid,
  p_item_key text,
  p_work_status text,
  p_working_note text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item_id uuid;
begin
  if v_user_id is null then
    raise exception 'founder_team_setup_auth_required' using errcode = '42501';
  end if;
  if not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'founder_team_setup_unavailable' using errcode = '42501';
  end if;
  if p_work_status not in ('open', 'discussing') then
    raise exception 'founder_team_setup_work_status_invalid' using errcode = '22023';
  end if;

  insert into public.founder_team_setup_items (
    team_id, item_key, work_status, working_note, updated_by_user_id
  ) values (
    p_team_id, p_item_key, p_work_status, coalesce(p_working_note, ''), v_user_id
  )
  on conflict (team_id, item_key) do update
  set work_status = excluded.work_status,
      working_note = excluded.working_note,
      updated_by_user_id = excluded.updated_by_user_id
  returning id into v_item_id;

  return v_item_id;
end;
$$;

create or replace function public.propose_founder_team_setup_revision(
  p_team_id uuid,
  p_item_key text,
  p_resolution_status text,
  p_note text,
  p_documentation_reference text default null
)
returns table (
  setup_item_id uuid,
  revision_id uuid,
  confirmation_count integer,
  member_count integer,
  finalized boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.founder_team_setup_items%rowtype;
  v_revision_id uuid;
  v_reference text := nullif(btrim(coalesce(p_documentation_reference, '')), '');
begin
  if v_user_id is null then
    raise exception 'founder_team_setup_auth_required' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = p_team_id for update;
  if not found or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'founder_team_setup_unavailable' using errcode = '42501';
  end if;
  if p_resolution_status not in ('clarified', 'documented', 'not_relevant') then
    raise exception 'founder_team_setup_resolution_status_invalid' using errcode = '22023';
  end if;
  if p_resolution_status <> 'documented' then
    v_reference := null;
  end if;

  insert into public.founder_team_setup_items (
    team_id, item_key, work_status, working_note, updated_by_user_id
  ) values (
    p_team_id, p_item_key, 'discussing', coalesce(p_note, ''), v_user_id
  )
  on conflict (team_id, item_key) do update
  set work_status = 'discussing',
      working_note = excluded.working_note,
      updated_by_user_id = excluded.updated_by_user_id;

  select * into v_item
  from public.founder_team_setup_items item
  where item.team_id = p_team_id and item.item_key = p_item_key
  for update;

  if v_item.pending_revision_id is not null then
    update public.founder_team_setup_revisions
    set superseded_at = now()
    where id = v_item.pending_revision_id
      and confirmed_at is null
      and superseded_at is null;
  end if;

  insert into public.founder_team_setup_revisions (
    setup_item_id, resolution_status, note, documentation_reference, proposed_by_user_id
  ) values (
    v_item.id, p_resolution_status, coalesce(p_note, ''), v_reference, v_user_id
  ) returning id into v_revision_id;

  insert into public.founder_team_setup_confirmations(revision_id, user_id)
  values (v_revision_id, v_user_id)
  on conflict on constraint founder_team_setup_confirmations_pkey do nothing;

  update public.founder_team_setup_items
  set pending_revision_id = v_revision_id,
      updated_by_user_id = v_user_id
  where id = v_item.id;

  select count(*)::integer into member_count
  from public.founder_team_members member where member.team_id = p_team_id;
  confirmation_count := 1;
  finalized := false;
  setup_item_id := v_item.id;
  revision_id := v_revision_id;
  return next;
end;
$$;

create or replace function public.confirm_founder_team_setup_revision(p_revision_id uuid)
returns table (
  setup_item_id uuid,
  revision_id uuid,
  confirmation_count integer,
  member_count integer,
  finalized boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_setup_item_id uuid;
  v_item public.founder_team_setup_items%rowtype;
  v_revision public.founder_team_setup_revisions%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_setup_auth_required' using errcode = '42501';
  end if;

  select revision.* into v_revision
  from public.founder_team_setup_revisions revision
  where revision.id = p_revision_id;
  if not found then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  v_setup_item_id := v_revision.setup_item_id;

  select * into v_item
  from public.founder_team_setup_items item
  where item.id = v_setup_item_id;
  if not found then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = v_item.team_id for update;
  if not public.is_current_user_founder_team_member(v_item.team_id) then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  select revision.* into v_revision
  from public.founder_team_setup_revisions revision
  where revision.id = p_revision_id
  for update;

  select * into v_item
  from public.founder_team_setup_items item
  where item.id = v_setup_item_id
  for update;

  if v_revision.confirmed_at is not null
     and v_item.current_confirmed_revision_id = v_revision.id
     and exists (
       select 1 from public.founder_team_setup_confirmations confirmation
       where confirmation.revision_id = v_revision.id and confirmation.user_id = v_user_id
     ) then
    select count(*)::integer into member_count
    from public.founder_team_members member where member.team_id = v_item.team_id;
    select count(*)::integer into confirmation_count
    from public.founder_team_setup_confirmations confirmation
    where confirmation.revision_id = v_revision.id;
    setup_item_id := v_item.id;
    revision_id := v_revision.id;
    finalized := true;
    return next;
    return;
  end if;

  if v_item.pending_revision_id is distinct from v_revision.id
     or v_revision.confirmed_at is not null
     or v_revision.superseded_at is not null then
    raise exception 'founder_team_setup_revision_not_pending' using errcode = '42501';
  end if;

  insert into public.founder_team_setup_confirmations(revision_id, user_id)
  values (v_revision.id, v_user_id)
  on conflict on constraint founder_team_setup_confirmations_pkey do nothing;

  select count(*)::integer into member_count
  from public.founder_team_members member where member.team_id = v_item.team_id;

  select count(*)::integer into confirmation_count
  from public.founder_team_setup_confirmations confirmation
  join public.founder_team_members member
    on member.team_id = v_item.team_id and member.user_id = confirmation.user_id
  where confirmation.revision_id = v_revision.id;

  finalized := member_count >= 2 and confirmation_count = member_count;
  if finalized then
    update public.founder_team_setup_revisions
    set confirmed_at = now()
    where id = v_revision.id and confirmed_at is null and superseded_at is null;

    update public.founder_team_setup_items
    set current_confirmed_revision_id = v_revision.id,
        pending_revision_id = null,
        work_status = 'open',
        updated_by_user_id = v_user_id
    where id = v_item.id and pending_revision_id = v_revision.id;
  end if;

  setup_item_id := v_item.id;
  revision_id := v_revision.id;
  return next;
end;
$$;

create or replace function public.withdraw_founder_team_setup_confirmation(p_revision_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_setup_item_id uuid;
  v_item public.founder_team_setup_items%rowtype;
  v_revision public.founder_team_setup_revisions%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_setup_auth_required' using errcode = '42501';
  end if;

  select revision.* into v_revision
  from public.founder_team_setup_revisions revision
  where revision.id = p_revision_id;
  if not found then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  v_setup_item_id := v_revision.setup_item_id;

  select * into v_item
  from public.founder_team_setup_items item
  where item.id = v_revision.setup_item_id;
  if not found then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = v_item.team_id for update;
  if not public.is_current_user_founder_team_member(v_item.team_id) then
    raise exception 'founder_team_setup_revision_unavailable' using errcode = '42501';
  end if;

  select revision.* into v_revision
  from public.founder_team_setup_revisions revision
  where revision.id = p_revision_id
  for update;

  select * into v_item
  from public.founder_team_setup_items item
  where item.id = v_setup_item_id
  for update;

  if v_revision.confirmed_at is not null
     or v_revision.superseded_at is not null
     or v_item.pending_revision_id is distinct from v_revision.id then
    raise exception 'founder_team_setup_confirmation_locked' using errcode = '42501';
  end if;

  delete from public.founder_team_setup_confirmations
  where revision_id = v_revision.id and user_id = v_user_id;
  return found;
end;
$$;

revoke all on function public.save_founder_team_setup_working_state(uuid, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.propose_founder_team_setup_revision(uuid, text, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.confirm_founder_team_setup_revision(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.withdraw_founder_team_setup_confirmation(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.save_founder_team_setup_working_state(uuid, text, text, text)
to authenticated;
grant execute on function public.propose_founder_team_setup_revision(uuid, text, text, text, text)
to authenticated;
grant execute on function public.confirm_founder_team_setup_revision(uuid)
to authenticated;
grant execute on function public.withdraw_founder_team_setup_confirmation(uuid)
to authenticated;

comment on table public.founder_team_setup_items is
  'Lazy-created team-wide Founder Setup working state. Confirmed and pending revisions remain separate.';
comment on table public.founder_team_setup_revisions is
  'Immutable proposal snapshots for a Founder Setup item; lifecycle timestamps are changed only by authorized RPCs.';
comment on table public.founder_team_setup_confirmations is
  'Per-founder confirmation of one immutable Founder Setup revision.';

commit;
