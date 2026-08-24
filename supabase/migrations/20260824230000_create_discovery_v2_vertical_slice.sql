begin;

alter table public.founder_discovery_profiles
  add column if not exists expertise text[] not null default '{}'::text[],
  add column if not exists location_region text;

alter table public.founder_discovery_profiles
  drop constraint if exists founder_discovery_profiles_expertise_limit_check,
  add constraint founder_discovery_profiles_expertise_limit_check
    check (cardinality(expertise) <= 8),
  drop constraint if exists founder_discovery_profiles_location_region_length_check,
  add constraint founder_discovery_profiles_location_region_length_check
    check (location_region is null or char_length(location_region) <= 120);

create index if not exists founder_discovery_profiles_expertise_gin_idx
  on public.founder_discovery_profiles using gin (expertise);

create index if not exists founder_discovery_profiles_location_region_lower_idx
  on public.founder_discovery_profiles (lower(location_region))
  where location_region is not null;

alter table public.founder_search_preferences
  add column if not exists discovery_v2_alignment_enabled boolean not null default false,
  add column if not exists discovery_v2_alignment_dimensions text[] not null default '{}'::text[],
  add column if not exists discovery_v2_alignment_consented_at timestamptz;

alter table public.founder_search_preferences
  drop constraint if exists founder_search_preferences_v2_alignment_dimensions_check,
  add constraint founder_search_preferences_v2_alignment_dimensions_check
    check (
      cardinality(discovery_v2_alignment_dimensions) <= 3
      and discovery_v2_alignment_dimensions <@ array[
        'company_logic',
        'decision_logic',
        'work_structure',
        'commitment',
        'risk_orientation',
        'conflict_style'
      ]::text[]
    ),
  drop constraint if exists founder_search_preferences_v2_alignment_consent_check,
  add constraint founder_search_preferences_v2_alignment_consent_check
    check (
      (discovery_v2_alignment_enabled and discovery_v2_alignment_consented_at is not null)
      or (not discovery_v2_alignment_enabled and discovery_v2_alignment_consented_at is null)
    );

create or replace function public.search_founder_discovery_profiles_v2(
  p_roles text[] default '{}'::text[],
  p_expertise text[] default '{}'::text[],
  p_location_region text default null,
  p_remote_modes text[] default '{}'::text[],
  p_min_availability smallint default null,
  p_page_size integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  candidate_user_id uuid,
  display_name text,
  headline text,
  own_roles text[],
  seeking_roles text[],
  expertise text[],
  location_region text,
  remote_mode text,
  availability_hours_per_week smallint,
  commitment_level text,
  venture_stage text,
  venture_goal text,
  published_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with filtered as (
    select profile.*
    from public.founder_discovery_profiles profile
    where auth.uid() is not null
      and profile.status = 'active'
      and profile.user_id <> auth.uid()
      and (
        coalesce(cardinality(p_roles), 0) = 0
        or profile.own_roles && p_roles
      )
      and (
        coalesce(cardinality(p_expertise), 0) = 0
        or exists (
          select 1
          from unnest(profile.expertise) profile_expertise
          join unnest(p_expertise) requested_expertise
            on lower(btrim(profile_expertise)) = lower(btrim(requested_expertise))
        )
      )
      and (
        nullif(btrim(p_location_region), '') is null
        or lower(btrim(profile.location_region)) = lower(btrim(p_location_region))
      )
      and (
        coalesce(cardinality(p_remote_modes), 0) = 0
        or profile.remote_mode = any(p_remote_modes)
      )
      and (
        p_min_availability is null
        or profile.availability_hours_per_week >= p_min_availability
      )
  )
  select
    profile.id,
    profile.user_id as candidate_user_id,
    profile.display_name,
    profile.headline,
    profile.own_roles,
    profile.seeking_roles,
    profile.expertise,
    profile.location_region,
    profile.remote_mode,
    profile.availability_hours_per_week,
    profile.commitment_level,
    profile.venture_stage,
    profile.venture_goal,
    profile.published_at,
    count(*) over() as total_count
  from filtered profile
  order by profile.published_at desc nulls last, profile.id
  limit least(greatest(coalesce(p_page_size, 12), 1), 24)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
) from public, anon;
grant execute on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
) to authenticated;

comment on column public.founder_discovery_profiles.expertise is
  'Explicitly published Discovery expertise tags. Does not expose profiles.skills.';
comment on column public.founder_discovery_profiles.location_region is
  'Explicitly published coarse city or region for Discovery V2; no address or coordinates.';
comment on column public.founder_search_preferences.discovery_v2_alignment_enabled is
  'Explicit opt-in for using existing founder alignment signals as a bounded Discovery V2 soft signal.';
comment on column public.founder_search_preferences.discovery_v2_alignment_dimensions is
  'Up to three explicitly prioritized, measured founder alignment dimensions. Private to the owner.';
comment on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
) is 'RLS-respecting, paginated Discovery V2 presentation search. Practical filters are applied before pagination.';

commit;
