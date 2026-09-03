begin;

create table public.network_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.network_memberships(user_id)
select profile.user_id
from public.profiles profile
where profile.roles && array['founder', 'advisor']::text[]
on conflict (user_id) do nothing;

create or replace function public.is_network_member(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1 from public.network_memberships membership
    where membership.user_id = p_user_id and membership.status = 'active'
  );
$$;

revoke all on function public.is_network_member(uuid) from public, anon;
grant execute on function public.is_network_member(uuid) to authenticated, service_role;

create or replace function public.ensure_network_membership_for_product_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.roles && array['founder', 'advisor']::text[] then
    insert into public.network_memberships(user_id, status)
    values (new.user_id, 'active')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger ensure_network_membership_after_profile_role
after insert or update of roles on public.profiles
for each row execute function public.ensure_network_membership_for_product_role();

revoke all on function public.ensure_network_membership_for_product_role()
from public, anon, authenticated;

create table public.network_profiles (
  user_id uuid primary key references public.network_memberships(user_id) on delete cascade,
  display_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  location_region text,
  remote_mode text,
  expertise text[] not null default '{}',
  industries text[] not null default '{}',
  network_roles text[] not null default '{}',
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint network_profiles_status_check check (status in ('draft', 'active', 'paused')),
  constraint network_profiles_remote_mode_check check (remote_mode is null or remote_mode in ('onsite', 'hybrid', 'remote', 'flexible')),
  constraint network_profiles_roles_check check (
    cardinality(network_roles) between 0 and 4 and
    network_roles <@ array['founder','aspiring_founder','expert','advisor_mentor','business_angel','company_representative']::text[]
  ),
  constraint network_profiles_expertise_check check (cardinality(expertise) <= 8),
  constraint network_profiles_industries_check check (cardinality(industries) <= 5),
  constraint network_profiles_text_check check (
    char_length(display_name) <= 80 and char_length(headline) <= 160 and
    char_length(bio) <= 800 and (location_region is null or char_length(location_region) <= 120)
  ),
  constraint network_profiles_active_complete_check check (
    status <> 'active' or (
      char_length(btrim(display_name)) >= 2 and char_length(btrim(headline)) >= 3 and
      char_length(btrim(bio)) >= 20 and cardinality(network_roles) >= 1 and published_at is not null
    )
  )
);

create table public.network_listings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.network_profiles(user_id) on delete cascade,
  direction text not null,
  category text not null,
  title text not null default '',
  summary text not null default '',
  topics text[] not null default '{}',
  industries text[] not null default '{}',
  locations text[] not null default '{}',
  geographic_scope text,
  remote_mode text,
  starts_on date,
  ends_on date,
  venture_stage text,
  status text not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint network_listings_direction_check check (direction in ('seeking', 'offering')),
  constraint network_listings_category_check check (category in ('expertise','cooperation','investment','sparring','succession')),
  constraint network_listings_status_check check (status in ('draft','active','paused','completed')),
  constraint network_listings_remote_mode_check check (remote_mode is null or remote_mode in ('onsite','hybrid','remote','flexible')),
  constraint network_listings_geographic_scope_check check (geographic_scope is null or geographic_scope in ('regional','germany','europe','global')),
  constraint network_listings_remote_category_check check (remote_mode is null or category in ('expertise','cooperation','sparring')),
  constraint network_listings_venture_stage_check check (venture_stage is null or venture_stage in ('exploring','idea','validation','early','growth','established')),
  constraint network_listings_stage_category_check check (venture_stage is null or category in ('expertise','cooperation','investment')),
  constraint network_listings_topics_check check (cardinality(topics) <= 8),
  constraint network_listings_industries_check check (cardinality(industries) <= 5),
  constraint network_listings_locations_check check (cardinality(locations) <= 3),
  constraint network_listings_content_dates_check check (starts_on is null or ends_on is null or ends_on >= starts_on),
  constraint network_listings_text_check check (
    char_length(title) <= 100 and char_length(summary) <= 800
  ),
  constraint network_listings_active_complete_check check (
    status <> 'active' or (
      char_length(btrim(title)) >= 5 and char_length(btrim(summary)) >= 20 and
      published_at is not null and expires_at is not null and expires_at > published_at
    )
  )
  ,constraint network_listings_expiry_window_check check (
    expires_at is null or published_at is null or expires_at <= published_at + interval '60 days'
  )
);

create index network_profiles_active_idx on public.network_profiles (published_at desc) where status = 'active';
create index network_listings_browse_idx on public.network_listings (published_at desc) where status = 'active';
create index network_listings_owner_idx on public.network_listings (owner_user_id, updated_at desc);
create index network_listings_topics_idx on public.network_listings using gin (topics);
create index network_listings_industries_idx on public.network_listings using gin (industries);
create index network_listings_locations_idx on public.network_listings using gin (locations);
create index network_listings_scope_idx on public.network_listings (geographic_scope, published_at desc) where status = 'active';

create or replace function public.set_network_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger network_profiles_updated_at before update on public.network_profiles
for each row execute function public.set_network_updated_at();
create trigger network_memberships_updated_at before update on public.network_memberships
for each row execute function public.set_network_updated_at();
create trigger network_listings_updated_at before update on public.network_listings
for each row execute function public.set_network_updated_at();

create or replace function public.enforce_network_publication()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'active' then
    if not public.is_network_member(new.owner_user_id) then
      raise exception 'network_member_required' using errcode = '42501';
    end if;
    if not exists (select 1 from public.network_profiles p where p.user_id = new.owner_user_id and p.status = 'active') then
      raise exception 'active_network_profile_required' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_network_profile_publication()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'active' and not public.is_network_member(new.user_id) then
    raise exception 'network_member_required' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger network_profile_publication before insert or update on public.network_profiles
for each row execute function public.enforce_network_profile_publication();
create trigger network_listing_publication before insert or update on public.network_listings
for each row execute function public.enforce_network_publication();

alter table public.network_memberships enable row level security;
alter table public.network_profiles enable row level security;
alter table public.network_listings enable row level security;

create policy network_memberships_select_owner on public.network_memberships for select to authenticated
using (user_id = auth.uid());

create policy network_profiles_select on public.network_profiles for select to authenticated
using (public.is_network_member() and (user_id = auth.uid() or status = 'active'));
create policy network_profiles_insert on public.network_profiles for insert to authenticated
with check (user_id = auth.uid() and public.is_network_member());
create policy network_profiles_update on public.network_profiles for update to authenticated
using (user_id = auth.uid() and public.is_network_member())
with check (user_id = auth.uid() and public.is_network_member());
create policy network_profiles_delete on public.network_profiles for delete to authenticated
using (user_id = auth.uid() and public.is_network_member());

create policy network_listings_select on public.network_listings for select to authenticated
using (
  public.is_network_member() and (
    owner_user_id = auth.uid() or
    (status = 'active' and expires_at > now() and exists (
      select 1 from public.network_profiles published_owner
      where published_owner.user_id = owner_user_id and published_owner.status = 'active'
    ))
  )
);
create policy network_listings_insert on public.network_listings for insert to authenticated
with check (owner_user_id = auth.uid() and public.is_network_member());
create policy network_listings_update on public.network_listings for update to authenticated
using (owner_user_id = auth.uid() and public.is_network_member())
with check (owner_user_id = auth.uid() and public.is_network_member());
create policy network_listings_delete on public.network_listings for delete to authenticated
using (owner_user_id = auth.uid() and public.is_network_member());

revoke all on public.network_memberships, public.network_profiles, public.network_listings from anon;
revoke insert, update, delete on public.network_memberships from authenticated;
grant select on public.network_memberships to authenticated;
grant select, insert, update, delete on public.network_profiles, public.network_listings to authenticated;

comment on table public.network_memberships is 'Technical Network access capability. Service-managed and independent from public Network identity roles.';
comment on table public.network_profiles is 'Explicit member-only Network identity projection; never populated or published implicitly from private profiles.';
comment on table public.network_listings is 'Member-only time-bounded needs and offers. Co-founder search deliberately remains in Founder Discovery.';
comment on column public.network_profiles.network_roles is 'Descriptive Network identity only; never grants product authorization.';
comment on column public.network_listings.expires_at is 'Publication freshness lifecycle; independent from optional content dates starts_on and ends_on.';

-- A Network-only capability must not open the personal Founder assessment module.
-- Invitation participants created before the profile-role contract remain compatible
-- until that legacy flow has its own explicit capability.
create or replace function public.has_founder_assessment_access(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and (
    exists (
      select 1 from public.profiles profile
      where profile.user_id = p_user_id and 'founder' = any(profile.roles)
    )
    or (
      not exists (
        select 1 from public.network_memberships membership
        where membership.user_id = p_user_id
      )
      and exists (
        select 1 from public.invitations invitation
        where invitation.status = 'accepted'
          and invitation.revoked_at is null
          and invitation.expires_at > now()
          and p_user_id in (invitation.inviter_user_id, invitation.invitee_user_id)
      )
    )
  );
$$;

revoke all on function public.has_founder_assessment_access(uuid) from public, anon;
grant execute on function public.has_founder_assessment_access(uuid) to authenticated, service_role;

drop policy if exists assessments_select_owner on public.assessments;
create policy assessments_select_owner on public.assessments for select to authenticated
using (user_id = auth.uid() and public.has_founder_assessment_access());
drop policy if exists assessments_select_invitation_members_submitted on public.assessments;
create policy assessments_select_invitation_members_submitted on public.assessments for select to authenticated
using (
  public.has_founder_assessment_access() and submitted_at is not null and exists (
    select 1 from public.invitations invitation
    where invitation.status = 'accepted' and invitation.revoked_at is null
      and invitation.expires_at > now()
      and auth.uid() in (invitation.inviter_user_id, invitation.invitee_user_id)
      and assessments.user_id in (invitation.inviter_user_id, invitation.invitee_user_id)
  )
);
drop policy if exists assessments_insert_owner on public.assessments;
create policy assessments_insert_owner on public.assessments for insert to authenticated
with check (user_id = auth.uid() and public.has_founder_assessment_access());
drop policy if exists assessments_update_owner on public.assessments;
create policy assessments_update_owner on public.assessments for update to authenticated
using (user_id = auth.uid() and public.has_founder_assessment_access())
with check (user_id = auth.uid() and public.has_founder_assessment_access());

drop policy if exists assessment_answers_select_owner on public.assessment_answers;
create policy assessment_answers_select_owner on public.assessment_answers for select to authenticated
using (public.has_founder_assessment_access() and exists (
  select 1 from public.assessments assessment
  where assessment.id = assessment_answers.assessment_id and assessment.user_id = auth.uid()
));
drop policy if exists assessment_answers_insert_owner on public.assessment_answers;
create policy assessment_answers_insert_owner on public.assessment_answers for insert to authenticated
with check (public.has_founder_assessment_access() and exists (
  select 1 from public.assessments assessment
  where assessment.id = assessment_answers.assessment_id and assessment.user_id = auth.uid()
));
drop policy if exists assessment_answers_update_owner on public.assessment_answers;
create policy assessment_answers_update_owner on public.assessment_answers for update to authenticated
using (public.has_founder_assessment_access() and exists (
  select 1 from public.assessments assessment
  where assessment.id = assessment_answers.assessment_id and assessment.user_id = auth.uid()
))
with check (public.has_founder_assessment_access() and exists (
  select 1 from public.assessments assessment
  where assessment.id = assessment_answers.assessment_id and assessment.user_id = auth.uid()
));

commit;
