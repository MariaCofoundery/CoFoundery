begin;

alter table public.network_listings
  add column if not exists locations text[] default '{}',
  add column if not exists geographic_scope text,
  add column if not exists starts_on date,
  add column if not exists ends_on date;

update public.network_listings
set locations = '{}'
where locations is null;

update public.network_listings
set locations = array[btrim(location_region)]
where cardinality(locations) = 0
  and nullif(btrim(location_region), '') is not null;

-- These values are no longer shown or accepted for the respective categories.
update public.network_listings
set remote_mode = null
where category in ('investment', 'succession')
  and remote_mode is not null;

update public.network_listings
set venture_stage = null
where category not in ('expertise', 'cooperation', 'investment')
  and venture_stage is not null;

alter table public.network_listings
  alter column locations set default '{}',
  alter column locations set not null,
  add constraint network_listings_geographic_scope_check
    check (geographic_scope is null or geographic_scope in ('regional','germany','europe','global')),
  add constraint network_listings_remote_category_check
    check (remote_mode is null or category in ('expertise','cooperation','sparring')),
  add constraint network_listings_stage_category_check
    check (venture_stage is null or category in ('expertise','cooperation','investment')),
  add constraint network_listings_locations_check
    check (cardinality(locations) <= 3),
  add constraint network_listings_content_dates_check
    check (starts_on is null or ends_on is null or ends_on >= starts_on);

create index if not exists network_listings_locations_idx
  on public.network_listings using gin (locations);
create index if not exists network_listings_scope_idx
  on public.network_listings (geographic_scope, published_at desc)
  where status = 'active';

comment on column public.network_listings.expires_at is
  'Publication freshness lifecycle; independent from optional content dates starts_on and ends_on.';
comment on column public.network_listings.location_region is
  'Legacy location text retained after the Network V0.1 schema repair; new writes use locations.';
comment on column public.network_listings.timeframe is
  'Legacy timeframe text retained without automatic date interpretation; new writes use starts_on and ends_on.';

commit;
