begin;

create table public.founder_team_advisor_setup_grants (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams(id) on delete cascade,
  advisor_user_id uuid not null references auth.users(id) on delete cascade,
  source_relationship_advisor_id uuid not null references public.relationship_advisors(id) on delete cascade,
  scope text not null default 'confirmed_only',
  status text not null default 'pending',
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  constraint founder_team_advisor_setup_grants_scope_check
    check (scope = 'confirmed_only'),
  constraint founder_team_advisor_setup_grants_status_check
    check (status in ('pending', 'active', 'revoked')),
  constraint founder_team_advisor_setup_grants_lifecycle_check
    check (
      (status = 'pending' and activated_at is null and revoked_at is null)
      or (status = 'active' and activated_at is not null and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    )
);

create unique index founder_team_advisor_setup_grants_open_team_advisor_uidx
  on public.founder_team_advisor_setup_grants(team_id, advisor_user_id)
  where revoked_at is null;

create unique index founder_team_advisor_setup_grants_open_source_uidx
  on public.founder_team_advisor_setup_grants(source_relationship_advisor_id)
  where revoked_at is null;

create index founder_team_advisor_setup_grants_advisor_idx
  on public.founder_team_advisor_setup_grants(advisor_user_id, team_id)
  where revoked_at is null;

create table public.founder_team_advisor_setup_consents (
  grant_id uuid not null references public.founder_team_advisor_setup_grants(id) on delete cascade,
  founder_user_id uuid not null references auth.users(id) on delete cascade,
  approved_at timestamptz not null default now(),
  primary key (grant_id, founder_user_id)
);

alter table public.founder_team_advisor_setup_grants enable row level security;
alter table public.founder_team_advisor_setup_consents enable row level security;

-- No direct client policies are intentional. Founder and advisor access is projected by the
-- narrowly scoped RPCs below; neither role receives broad table reads or writes.
revoke all on table public.founder_team_advisor_setup_grants
from public, anon, authenticated;
revoke all on table public.founder_team_advisor_setup_consents
from public, anon, authenticated;

create or replace function public.is_founder_team_setup_advisor_source_eligible(
  p_team_id uuid,
  p_source_relationship_advisor_id uuid,
  p_advisor_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.relationship_advisors advisor_access
    join public.relationships relationship
      on relationship.id = advisor_access.relationship_id
    where advisor_access.id = p_source_relationship_advisor_id
      and relationship.founder_team_id = p_team_id
      and advisor_access.advisor_user_id is not null
      and (p_advisor_user_id is null or advisor_access.advisor_user_id = p_advisor_user_id)
      and advisor_access.status = 'linked'
      and advisor_access.founder_a_approved = true
      and advisor_access.founder_b_approved = true
      and advisor_access.revoked_at is null
  );
$$;

revoke all on function public.is_founder_team_setup_advisor_source_eligible(uuid, uuid, uuid)
from public, anon, authenticated, service_role;

create or replace function public.refresh_founder_team_advisor_setup_grant(p_grant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant public.founder_team_advisor_setup_grants%rowtype;
  v_member_count integer;
  v_consent_count integer;
  v_active boolean;
begin
  select * into v_grant
  from public.founder_team_advisor_setup_grants grant_row
  where grant_row.id = p_grant_id
  for update;

  if not found or v_grant.revoked_at is not null then
    return false;
  end if;

  select count(*)::integer into v_member_count
  from public.founder_team_members member
  where member.team_id = v_grant.team_id;

  select count(*)::integer into v_consent_count
  from public.founder_team_advisor_setup_consents consent
  join public.founder_team_members member
    on member.team_id = v_grant.team_id
   and member.user_id = consent.founder_user_id
  where consent.grant_id = v_grant.id;

  v_active :=
    v_member_count >= 2
    and v_consent_count = v_member_count
    and public.is_founder_team_setup_advisor_source_eligible(
      v_grant.team_id,
      v_grant.source_relationship_advisor_id,
      v_grant.advisor_user_id
    );

  update public.founder_team_advisor_setup_grants
  set status = case when v_active then 'active' else 'pending' end,
      activated_at = case
        when v_active then coalesce(activated_at, now())
        else null
      end
  where id = v_grant.id;

  return v_active;
end;
$$;

revoke all on function public.refresh_founder_team_advisor_setup_grant(uuid)
from public, anon, authenticated, service_role;

create or replace function public.pause_founder_team_advisor_setup_grants_for_new_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.founder_team_advisor_setup_grants grant_row
  set status = 'pending', activated_at = null
  where grant_row.team_id = new.team_id
    and grant_row.status = 'active'
    and grant_row.revoked_at is null
    and not exists (
      select 1
      from public.founder_team_advisor_setup_consents consent
      where consent.grant_id = grant_row.id
        and consent.founder_user_id = new.user_id
    );
  return new;
end;
$$;

create trigger trg_founder_team_members_pause_advisor_setup_grants
after insert on public.founder_team_members
for each row execute function public.pause_founder_team_advisor_setup_grants_for_new_member();

revoke all on function public.pause_founder_team_advisor_setup_grants_for_new_member()
from public, anon, authenticated, service_role;

create or replace function public.propose_founder_team_advisor_setup_grant(
  p_team_id uuid,
  p_source_relationship_advisor_id uuid
)
returns table (
  grant_id uuid,
  consent_count integer,
  member_count integer,
  active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_advisor_user_id uuid;
  v_grant public.founder_team_advisor_setup_grants%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_advisor_setup_auth_required' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = p_team_id for update;
  if not found or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'founder_team_advisor_setup_unavailable' using errcode = '42501';
  end if;

  select advisor_access.advisor_user_id into v_advisor_user_id
  from public.relationship_advisors advisor_access
  where advisor_access.id = p_source_relationship_advisor_id;

  if v_advisor_user_id is null or not public.is_founder_team_setup_advisor_source_eligible(
    p_team_id,
    p_source_relationship_advisor_id,
    v_advisor_user_id
  ) then
    raise exception 'founder_team_advisor_setup_advisor_ineligible' using errcode = '42501';
  end if;

  select * into v_grant
  from public.founder_team_advisor_setup_grants grant_row
  where grant_row.team_id = p_team_id
    and grant_row.advisor_user_id = v_advisor_user_id
    and grant_row.revoked_at is null
  for update;

  if not found then
    insert into public.founder_team_advisor_setup_grants (
      team_id,
      advisor_user_id,
      source_relationship_advisor_id,
      scope,
      status,
      created_by_user_id
    ) values (
      p_team_id,
      v_advisor_user_id,
      p_source_relationship_advisor_id,
      'confirmed_only',
      'pending',
      v_user_id
    )
    returning * into v_grant;
  elsif v_grant.source_relationship_advisor_id <> p_source_relationship_advisor_id then
    raise exception 'founder_team_advisor_setup_grant_already_exists' using errcode = '23505';
  end if;

  insert into public.founder_team_advisor_setup_consents(grant_id, founder_user_id)
  values (v_grant.id, v_user_id)
  on conflict on constraint founder_team_advisor_setup_consents_pkey do nothing;

  active := public.refresh_founder_team_advisor_setup_grant(v_grant.id);
  grant_id := v_grant.id;

  select count(*)::integer into member_count
  from public.founder_team_members member where member.team_id = p_team_id;
  select count(*)::integer into consent_count
  from public.founder_team_advisor_setup_consents consent
  join public.founder_team_members member
    on member.team_id = p_team_id and member.user_id = consent.founder_user_id
  where consent.grant_id = v_grant.id;
  return next;
end;
$$;

create or replace function public.confirm_founder_team_advisor_setup_grant(p_grant_id uuid)
returns table (
  grant_id uuid,
  consent_count integer,
  member_count integer,
  active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_grant public.founder_team_advisor_setup_grants%rowtype;
begin
  if v_user_id is null then
    raise exception 'founder_team_advisor_setup_auth_required' using errcode = '42501';
  end if;

  select * into v_grant
  from public.founder_team_advisor_setup_grants grant_row
  where grant_row.id = p_grant_id;
  if not found then
    raise exception 'founder_team_advisor_setup_unavailable' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = v_grant.team_id for update;
  if not public.is_current_user_founder_team_member(v_grant.team_id) then
    raise exception 'founder_team_advisor_setup_unavailable' using errcode = '42501';
  end if;

  select * into v_grant
  from public.founder_team_advisor_setup_grants grant_row
  where grant_row.id = p_grant_id
  for update;

  if v_grant.revoked_at is not null or not public.is_founder_team_setup_advisor_source_eligible(
    v_grant.team_id,
    v_grant.source_relationship_advisor_id,
    v_grant.advisor_user_id
  ) then
    raise exception 'founder_team_advisor_setup_unavailable' using errcode = '42501';
  end if;

  insert into public.founder_team_advisor_setup_consents(grant_id, founder_user_id)
  values (v_grant.id, v_user_id)
  on conflict on constraint founder_team_advisor_setup_consents_pkey do nothing;

  active := public.refresh_founder_team_advisor_setup_grant(v_grant.id);
  grant_id := v_grant.id;

  select count(*)::integer into member_count
  from public.founder_team_members member where member.team_id = v_grant.team_id;
  select count(*)::integer into consent_count
  from public.founder_team_advisor_setup_consents consent
  join public.founder_team_members member
    on member.team_id = v_grant.team_id and member.user_id = consent.founder_user_id
  where consent.grant_id = v_grant.id;
  return next;
end;
$$;

create or replace function public.revoke_founder_team_advisor_setup_grant(p_grant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then
    raise exception 'founder_team_advisor_setup_auth_required' using errcode = '42501';
  end if;

  select grant_row.team_id into v_team_id
  from public.founder_team_advisor_setup_grants grant_row
  where grant_row.id = p_grant_id;
  if not found then
    raise exception 'founder_team_advisor_setup_unavailable' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams team where team.id = v_team_id for update;
  if not public.is_current_user_founder_team_member(v_team_id) then
    raise exception 'founder_team_advisor_setup_unavailable' using errcode = '42501';
  end if;

  update public.founder_team_advisor_setup_grants
  set status = 'revoked', revoked_at = coalesce(revoked_at, now())
  where id = p_grant_id and revoked_at is null;
  return found;
end;
$$;

create or replace function public.get_founder_team_advisor_setup_access(p_team_id uuid)
returns table (
  source_relationship_advisor_id uuid,
  advisor_name text,
  grant_id uuid,
  grant_status text,
  consented_founder_user_ids uuid[],
  access_active boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with eligible_sources as (
    select distinct on (advisor_access.advisor_user_id)
      advisor_access.id,
      advisor_access.advisor_user_id,
      advisor_access.advisor_name,
      advisor_access.updated_at
    from public.relationship_advisors advisor_access
    join public.relationships relationship
      on relationship.id = advisor_access.relationship_id
    where relationship.founder_team_id = p_team_id
      and advisor_access.advisor_user_id is not null
      and advisor_access.status = 'linked'
      and advisor_access.founder_a_approved = true
      and advisor_access.founder_b_approved = true
      and advisor_access.revoked_at is null
    order by advisor_access.advisor_user_id, advisor_access.updated_at desc, advisor_access.id
  )
  select
    source.id as source_relationship_advisor_id,
    nullif(btrim(coalesce(source.advisor_name, '')), '') as advisor_name,
    grant_row.id as grant_id,
    case
      when grant_row.id is null then 'not_granted'
      when grant_row.status = 'active'
        and public.is_founder_team_setup_advisor_source_eligible(
          grant_row.team_id,
          grant_row.source_relationship_advisor_id,
          grant_row.advisor_user_id
        )
        and not exists (
          select 1
          from public.founder_team_members missing_member
          where missing_member.team_id = p_team_id
            and not exists (
              select 1
              from public.founder_team_advisor_setup_consents consent
              where consent.grant_id = grant_row.id
                and consent.founder_user_id = missing_member.user_id
            )
        )
      then 'active'
      else 'pending'
    end as grant_status,
    coalesce(
      (
        select array_agg(consent.founder_user_id order by consent.approved_at)
        from public.founder_team_advisor_setup_consents consent
        join public.founder_team_members member
          on member.team_id = p_team_id
         and member.user_id = consent.founder_user_id
        where consent.grant_id = grant_row.id
      ),
      '{}'::uuid[]
    ) as consented_founder_user_ids,
    coalesce(
      grant_row.status = 'active'
      and public.is_founder_team_setup_advisor_source_eligible(
        grant_row.team_id,
        grant_row.source_relationship_advisor_id,
        grant_row.advisor_user_id
      )
      and not exists (
        select 1
        from public.founder_team_members missing_member
        where missing_member.team_id = p_team_id
          and not exists (
            select 1
            from public.founder_team_advisor_setup_consents consent
            where consent.grant_id = grant_row.id
              and consent.founder_user_id = missing_member.user_id
          )
      ),
      false
    ) as access_active
  from eligible_sources source
  left join lateral (
    select grant_candidate.*
    from public.founder_team_advisor_setup_grants grant_candidate
    where grant_candidate.team_id = p_team_id
      and grant_candidate.advisor_user_id = source.advisor_user_id
      and grant_candidate.revoked_at is null
    order by grant_candidate.created_at desc
    limit 1
  ) grant_row on true
  where auth.uid() is not null
    and public.is_current_user_founder_team_member(p_team_id)
  order by source.updated_at desc, source.id;
$$;

create or replace function public.get_advisor_confirmed_founder_setup(p_relationship_id uuid)
returns table (
  item_key text,
  resolution_status text,
  note text,
  documentation_reference text,
  confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    item.item_key,
    revision.resolution_status,
    revision.note,
    revision.documentation_reference,
    revision.confirmed_at
  from public.founder_team_advisor_setup_grants grant_row
  join public.relationship_advisors source_access
    on source_access.id = grant_row.source_relationship_advisor_id
  join public.relationships source_relationship
    on source_relationship.id = source_access.relationship_id
   and source_relationship.founder_team_id = grant_row.team_id
  join public.founder_team_setup_items item
    on item.team_id = grant_row.team_id
  join public.founder_team_setup_revisions revision
    on revision.id = item.current_confirmed_revision_id
   and revision.setup_item_id = item.id
  where auth.uid() is not null
    and grant_row.advisor_user_id = auth.uid()
    and grant_row.scope = 'confirmed_only'
    and grant_row.status = 'active'
    and grant_row.revoked_at is null
    and revision.confirmed_at is not null
    and revision.superseded_at is null
    and source_access.advisor_user_id = auth.uid()
    and source_access.status = 'linked'
    and source_access.founder_a_approved = true
    and source_access.founder_b_approved = true
    and source_access.revoked_at is null
    and exists (
      select 1
      from public.relationship_advisors request_access
      join public.relationships request_relationship
        on request_relationship.id = request_access.relationship_id
      where request_access.relationship_id = p_relationship_id
        and request_access.advisor_user_id = auth.uid()
        and request_access.status = 'linked'
        and request_access.founder_a_approved = true
        and request_access.founder_b_approved = true
        and request_access.revoked_at is null
        and request_relationship.founder_team_id = grant_row.team_id
    )
    and (select count(*) from public.founder_team_members member where member.team_id = grant_row.team_id) >= 2
    and not exists (
      select 1
      from public.founder_team_members missing_member
      where missing_member.team_id = grant_row.team_id
        and not exists (
          select 1
          from public.founder_team_advisor_setup_consents consent
          where consent.grant_id = grant_row.id
            and consent.founder_user_id = missing_member.user_id
        )
    )
  order by item.item_key;
$$;

revoke all on function public.propose_founder_team_advisor_setup_grant(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.confirm_founder_team_advisor_setup_grant(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.revoke_founder_team_advisor_setup_grant(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.get_founder_team_advisor_setup_access(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.get_advisor_confirmed_founder_setup(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.propose_founder_team_advisor_setup_grant(uuid, uuid)
to authenticated;
grant execute on function public.confirm_founder_team_advisor_setup_grant(uuid)
to authenticated;
grant execute on function public.revoke_founder_team_advisor_setup_grant(uuid)
to authenticated;
grant execute on function public.get_founder_team_advisor_setup_access(uuid)
to authenticated;
grant execute on function public.get_advisor_confirmed_founder_setup(uuid)
to authenticated;

comment on table public.founder_team_advisor_setup_grants is
  'Explicit team-level, unanimous, revocable advisor access to confirmed-only Founder Setup content.';
comment on table public.founder_team_advisor_setup_consents is
  'Per-current-founder consent for one team-level Advisor Founder Setup grant.';

commit;
