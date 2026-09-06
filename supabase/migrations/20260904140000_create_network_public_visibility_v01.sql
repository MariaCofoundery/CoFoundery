begin;

alter table public.network_profiles
  add column visibility text not null default 'members_only',
  add column public_slug text not null default ('profile-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)),
  add constraint network_profiles_visibility_check check (visibility in ('members_only', 'public')),
  add constraint network_profiles_public_slug_check check (public_slug ~ '^profile-[a-f0-9]{24}$'),
  add constraint network_profiles_public_slug_key unique (public_slug);

alter table public.network_listings
  add column visibility text not null default 'members_only',
  add column public_slug text not null default ('listing-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)),
  add constraint network_listings_visibility_check check (visibility in ('members_only', 'public')),
  add constraint network_listings_public_slug_check check (public_slug ~ '^listing-[a-f0-9]{24}$'),
  add constraint network_listings_public_slug_key unique (public_slug);

create index network_profiles_public_idx
  on public.network_profiles (updated_at desc)
  where visibility = 'public' and status = 'active';
create index network_listings_public_idx
  on public.network_listings (updated_at desc, expires_at)
  where visibility = 'public' and status = 'active';

create or replace function public.get_public_network_profile(p_public_slug text)
returns table (
  public_slug text,
  display_name text,
  headline text,
  bio text,
  network_roles text[],
  expertise text[],
  industries text[],
  location_region text,
  photo_available boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.public_slug,
    profile.display_name,
    profile.headline,
    profile.bio,
    profile.network_roles,
    profile.expertise,
    profile.industries,
    profile.location_region,
    profile.photo_visibility = 'public_allowed'
      and profile.photo_source is not null
      and (profile.photo_avatar_id is not null or profile.photo_path is not null),
    profile.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  where profile.public_slug = p_public_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active';
$$;

create or replace function public.list_public_network_profile_listings(p_profile_slug text)
returns table (
  public_slug text,
  direction text,
  category text,
  title text,
  summary text,
  topics text[],
  industries text[],
  geographic_scope text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select listing.public_slug,
    listing.direction,
    listing.category,
    listing.title,
    listing.summary,
    listing.topics,
    listing.industries,
    listing.geographic_scope,
    listing.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  join public.network_listings listing on listing.owner_user_id = profile.user_id
  where profile.public_slug = p_profile_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and membership.status = 'active'
    and listing.visibility = 'public'
    and listing.status = 'active'
    and listing.expires_at > now()
  order by listing.published_at desc;
$$;

create or replace function public.get_public_network_listing(p_public_slug text)
returns table (
  public_slug text,
  direction text,
  category text,
  title text,
  summary text,
  topics text[],
  industries text[],
  locations text[],
  geographic_scope text,
  remote_mode text,
  starts_on date,
  ends_on date,
  venture_stage text,
  owner_display_name text,
  owner_headline text,
  owner_profile_slug text,
  owner_photo_available boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select listing.public_slug,
    listing.direction,
    listing.category,
    listing.title,
    listing.summary,
    listing.topics,
    listing.industries,
    listing.locations,
    listing.geographic_scope,
    listing.remote_mode,
    listing.starts_on,
    listing.ends_on,
    listing.venture_stage,
    profile.display_name,
    profile.headline,
    case when profile.visibility = 'public' then profile.public_slug else null end,
    profile.photo_visibility = 'public_allowed'
      and profile.photo_source is not null
      and (profile.photo_avatar_id is not null or profile.photo_path is not null),
    listing.updated_at
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where listing.public_slug = p_public_slug
    and listing.visibility = 'public'
    and listing.status = 'active'
    and listing.expires_at > now()
    and profile.status = 'active'
    and membership.status = 'active';
$$;

create or replace function public.list_public_network_sitemap()
returns table (path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select '/network/p/' || profile.public_slug, profile.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  where profile.visibility = 'public' and profile.status = 'active' and membership.status = 'active'
  union all
  select '/network/l/' || listing.public_slug, listing.updated_at
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where listing.visibility = 'public' and listing.status = 'active' and listing.expires_at > now()
    and profile.status = 'active' and membership.status = 'active';
$$;

create or replace function public.resolve_public_network_photo(p_entity_type text, p_public_slug text)
returns table (photo_source text, photo_avatar_id text, photo_path text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'public_network_photo_service_required' using errcode = '42501';
  end if;
  return query
  select profile.photo_source, profile.photo_avatar_id, profile.photo_path
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  where p_entity_type = 'profile'
    and profile.public_slug = p_public_slug
    and profile.visibility = 'public'
    and profile.status = 'active'
    and profile.photo_visibility = 'public_allowed'
    and membership.status = 'active'
  union all
  select profile.photo_source, profile.photo_avatar_id, profile.photo_path
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where p_entity_type = 'listing'
    and listing.public_slug = p_public_slug
    and listing.visibility = 'public'
    and listing.status = 'active'
    and listing.expires_at > now()
    and profile.status = 'active'
    and profile.photo_visibility = 'public_allowed'
    and membership.status = 'active'
  limit 1;
end;
$$;

revoke all on function public.get_public_network_profile(text) from public;
revoke all on function public.list_public_network_profile_listings(text) from public;
revoke all on function public.get_public_network_listing(text) from public;
revoke all on function public.list_public_network_sitemap() from public;
revoke all on function public.resolve_public_network_photo(text, text) from public;
grant execute on function public.get_public_network_profile(text) to anon, authenticated, service_role;
grant execute on function public.list_public_network_profile_listings(text) to anon, authenticated, service_role;
grant execute on function public.get_public_network_listing(text) to anon, authenticated, service_role;
grant execute on function public.list_public_network_sitemap() to anon, authenticated, service_role;
grant execute on function public.resolve_public_network_photo(text, text) to service_role;

comment on column public.network_profiles.visibility is
  'Independent publication consent for the current explicit public profile whitelist. New profile fields are not public automatically.';
comment on column public.network_listings.visibility is
  'Independent publication consent for this listing. It does not publish the owner profile.';
comment on column public.network_profiles.photo_visibility is
  'Photo preference only. Public delivery additionally requires an eligible public profile or listing context.';

commit;
