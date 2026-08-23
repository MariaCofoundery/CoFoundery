begin;

-- Durable team shell above the existing pairwise relationship model. Existing relationships
-- remain valid without a team assignment and are intentionally not inferred or backfilled.
create table if not exists public.founder_teams (
  id uuid primary key default gen_random_uuid(),
  name text,
  team_context text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_teams_name_nonempty_check
    check (name is null or nullif(btrim(name), '') is not null),
  constraint founder_teams_team_context_check
    check (team_context in ('pre_founder', 'existing_team'))
);

create table if not exists public.founder_team_members (
  team_id uuid not null references public.founder_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists founder_team_members_user_team_idx
  on public.founder_team_members (user_id, team_id);

alter table public.relationships
  add column if not exists founder_team_id uuid references public.founder_teams(id) on delete restrict;

create index if not exists relationships_founder_team_id_idx
  on public.relationships (founder_team_id)
  where founder_team_id is not null;

create or replace function public.set_founder_team_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_founder_teams_set_updated_at on public.founder_teams;
create trigger trg_founder_teams_set_updated_at
before update on public.founder_teams
for each row execute function public.set_founder_team_updated_at();

-- Serializing on the team row makes the three-member limit safe under concurrent inserts.
create or replace function public.enforce_founder_team_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_count integer;
begin
  if tg_op = 'UPDATE'
     and (new.team_id is distinct from old.team_id or new.user_id is distinct from old.user_id) then
    raise exception 'founder_team_membership_identity_is_immutable' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    perform 1
    from public.founder_teams team
    where team.id = new.team_id
    for update;

    if not found then
      raise exception 'founder_team_not_found' using errcode = '23503';
    end if;

    select count(*)
      into v_member_count
    from public.founder_team_members member
    where member.team_id = new.team_id;

    if v_member_count >= 3 then
      raise exception 'founder_team_member_limit_reached' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_founder_team_members_enforce_limit on public.founder_team_members;
create trigger trg_founder_team_members_enforce_limit
before insert or update on public.founder_team_members
for each row execute function public.enforce_founder_team_member_limit();

-- A relationship can only be linked once and both pair participants must already be members of
-- that team. Normal clients have no relationship UPDATE policy; this trigger also protects
-- privileged maintenance from creating an inconsistent association accidentally.
create or replace function public.enforce_relationship_founder_team_assignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.founder_team_id is not null
     and new.founder_team_id is distinct from old.founder_team_id then
    raise exception 'relationship_founder_team_is_immutable' using errcode = '42501';
  end if;

  if new.founder_team_id is not null and not (
    exists (
      select 1
      from public.founder_team_members member
      where member.team_id = new.founder_team_id
        and member.user_id = new.user_a_id
    )
    and exists (
      select 1
      from public.founder_team_members member
      where member.team_id = new.founder_team_id
        and member.user_id = new.user_b_id
    )
  ) then
    raise exception 'relationship_founders_must_be_team_members' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_relationships_enforce_founder_team on public.relationships;
create trigger trg_relationships_enforce_founder_team
before insert or update of founder_team_id, user_a_id, user_b_id on public.relationships
for each row execute function public.enforce_relationship_founder_team_assignment();

-- Internal idempotent primitive for invite/workspace flows. Supplying an explicit team is the
-- future three-founder path; current pair flows pass null and never infer merges from other rows.
create or replace function public.ensure_founder_team_for_relationship(
  p_relationship_id uuid,
  p_team_context text,
  p_founder_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_relationship public.relationships%rowtype;
  v_team public.founder_teams%rowtype;
  v_team_id uuid;
  v_resulting_member_count integer;
begin
  if p_team_context not in ('pre_founder', 'existing_team') then
    raise exception 'invalid_founder_team_context' using errcode = '22023';
  end if;

  select *
    into v_relationship
  from public.relationships relationship
  where relationship.id = p_relationship_id
  for update;

  if not found then
    raise exception 'relationship_not_found' using errcode = 'P0002';
  end if;

  if v_relationship.founder_team_id is not null then
    return v_relationship.founder_team_id;
  end if;

  if p_founder_team_id is null then
    insert into public.founder_teams (team_context)
    values (p_team_context)
    returning id into v_team_id;
  else
    select *
      into v_team
    from public.founder_teams team
    where team.id = p_founder_team_id
    for update;

    if not found then
      raise exception 'founder_team_not_found' using errcode = 'P0002';
    end if;

    if v_team.team_context <> p_team_context then
      raise exception 'founder_team_context_mismatch' using errcode = '22023';
    end if;

    v_team_id := v_team.id;
  end if;

  select count(distinct member_user_id)
    into v_resulting_member_count
  from (
    select member.user_id as member_user_id
    from public.founder_team_members member
    where member.team_id = v_team_id
    union all
    select v_relationship.user_a_id
    union all
    select v_relationship.user_b_id
  ) resulting_members;

  if v_resulting_member_count > 3 then
    raise exception 'founder_team_member_limit_reached' using errcode = '23514';
  end if;

  insert into public.founder_team_members (team_id, user_id)
  values
    (v_team_id, v_relationship.user_a_id),
    (v_team_id, v_relationship.user_b_id)
  on conflict (team_id, user_id) do nothing;

  update public.relationships
  set founder_team_id = v_team_id
  where id = v_relationship.id
    and founder_team_id is null;

  return v_team_id;
end;
$$;

revoke all on function public.ensure_founder_team_for_relationship(uuid, text, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.ensure_founder_team_for_relationship(uuid, text, uuid)
to service_role;

-- Founder acceptance already creates/reuses the pair relationship before marking the invitation
-- accepted. The trigger adds the team in the same transaction only when the current invite has an
-- explicit context. Historical accepted rows are deliberately left untouched.
create or replace function public.ensure_founder_team_after_invitation_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_relationship_id uuid;
begin
  if new.status::text = 'accepted'
     and old.status::text is distinct from 'accepted'
     and new.invitee_user_id is not null
     and new.team_context in ('pre_founder', 'existing_team') then
    select relationship.id
      into v_relationship_id
    from public.relationships relationship
    where relationship.user_low = least(new.inviter_user_id, new.invitee_user_id)
      and relationship.user_high = greatest(new.inviter_user_id, new.invitee_user_id)
    limit 1;

    if v_relationship_id is null then
      raise exception 'accepted_invitation_relationship_missing';
    end if;

    perform public.ensure_founder_team_for_relationship(
      v_relationship_id,
      new.team_context,
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_invitations_ensure_founder_team on public.invitations;
create trigger trg_invitations_ensure_founder_team
after update of status, invitee_user_id on public.invitations
for each row execute function public.ensure_founder_team_after_invitation_acceptance();

-- Discovery becomes a team only at the existing conscious workspace transition. Discovery is a
-- pre-founder flow; viewing an intro or report alone still creates no team.
create or replace function public.ensure_founder_team_after_matching_workspace()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ensure_founder_team_for_relationship(
    new.relationship_id,
    'pre_founder',
    null
  );
  return new;
end;
$$;

drop trigger if exists trg_matching_workspaces_ensure_founder_team on public.matching_workspaces;
create trigger trg_matching_workspaces_ensure_founder_team
after insert on public.matching_workspaces
for each row execute function public.ensure_founder_team_after_matching_workspace();

alter table public.founder_teams enable row level security;
alter table public.founder_team_members enable row level security;

create or replace function public.is_current_user_founder_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.founder_team_members member
    where member.team_id = p_team_id
      and member.user_id = auth.uid()
  );
$$;

revoke all on function public.is_current_user_founder_team_member(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.is_current_user_founder_team_member(uuid)
to authenticated;

drop policy if exists founder_teams_select_members on public.founder_teams;
create policy founder_teams_select_members
on public.founder_teams
for select to authenticated
using (public.is_current_user_founder_team_member(id));

drop policy if exists founder_team_members_select_team_members on public.founder_team_members;
create policy founder_team_members_select_team_members
on public.founder_team_members
for select to authenticated
using (public.is_current_user_founder_team_member(team_id));

comment on table public.founder_teams is
  'Durable two-to-three-founder team shell for future team-wide product modules.';
comment on table public.founder_team_members is
  'Founder memberships for a durable team. V1 has no role hierarchy or client mutation path.';
comment on column public.relationships.founder_team_id is
  'Optional immutable team assignment for an existing pairwise founder relationship.';
comment on function public.ensure_founder_team_for_relationship(uuid, text, uuid) is
  'Service-only, race-safe primitive that creates or explicitly extends a two-to-three-founder team and assigns one pair relationship.';

commit;
