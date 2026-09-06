begin;

-- The Network product area is now called Connect. Only the public URL paths
-- change; every table, function, policy and bucket keeps its network_* name,
-- because those are storage identifiers the user never sees.
--
-- Safe to replace in place: the function is a pure projection that builds the
-- sitemap paths, so no data is rewritten and no publication state is touched.
create or replace function public.list_public_network_sitemap()
returns table (path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select '/connect/p/' || profile.public_slug, profile.updated_at
  from public.network_profiles profile
  join public.network_memberships membership on membership.user_id = profile.user_id
  where profile.visibility = 'public' and profile.status = 'active' and membership.status = 'active'
  union all
  select '/connect/l/' || listing.public_slug, listing.updated_at
  from public.network_listings listing
  join public.network_profiles profile on profile.user_id = listing.owner_user_id
  join public.network_memberships membership on membership.user_id = listing.owner_user_id
  where listing.visibility = 'public' and listing.status = 'active' and listing.expires_at > now()
    and profile.status = 'active' and membership.status = 'active';
$$;

commit;
