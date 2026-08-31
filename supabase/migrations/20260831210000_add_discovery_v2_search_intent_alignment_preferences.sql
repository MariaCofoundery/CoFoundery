begin;

alter table public.founder_discovery_profiles
  add column if not exists search_intent text,
  add column if not exists start_horizon text,
  drop constraint if exists founder_discovery_profiles_search_intent_check,
  add constraint founder_discovery_profiles_search_intent_check
    check (search_intent is null or search_intent in ('ready_now', 'actively_exploring', 'open_later')),
  drop constraint if exists founder_discovery_profiles_start_horizon_check,
  add constraint founder_discovery_profiles_start_horizon_check
    check (start_horizon is null or start_horizon in ('now', 'next_3_months', 'next_6_months', 'later_or_flexible'));

alter table public.founder_search_preferences
  add column if not exists discovery_v2_alignment_preferences jsonb not null default '{}'::jsonb;

update public.founder_search_preferences preferences
set discovery_v2_alignment_preferences = coalesce((
  select jsonb_object_agg(
    dimension,
    jsonb_build_object(
      'importance', 'important',
      'relationPreference', 'prefer_similar'
    )
  )
  from unnest(preferences.discovery_v2_alignment_dimensions) dimension
), '{}'::jsonb)
where preferences.discovery_v2_alignment_enabled
  and cardinality(preferences.discovery_v2_alignment_dimensions) > 0
  and preferences.discovery_v2_alignment_preferences = '{}'::jsonb;

create or replace function public.is_valid_discovery_v2_alignment_preferences(
  preferences jsonb,
  dimensions text[]
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_typeof(preferences) = 'object'
    and cardinality(dimensions) <= 3
    and cardinality(dimensions) = (select count(*) from jsonb_each(preferences))
    and coalesce((
      select bool_and(
        entry.key = any(array[
          'company_logic',
          'decision_logic',
          'work_structure',
          'commitment',
          'risk_orientation',
          'conflict_style'
        ]::text[])
        and entry.key = any(dimensions)
        and jsonb_typeof(entry.value) = 'object'
        and entry.value->>'importance' in ('important', 'very_important')
        and entry.value->>'relationPreference' in (
          'prefer_similar',
          'different_perspective_welcome',
          'no_direction_preference'
        )
        and entry.value - array['importance', 'relationPreference']::text[] = '{}'::jsonb
      )
      from jsonb_each(preferences) entry
    ), true);
$$;

revoke all on function public.is_valid_discovery_v2_alignment_preferences(jsonb, text[])
from public, anon, authenticated, service_role;
grant execute on function public.is_valid_discovery_v2_alignment_preferences(jsonb, text[])
to authenticated, service_role;

alter table public.founder_search_preferences
  drop constraint if exists founder_search_preferences_v2_alignment_preferences_check,
  add constraint founder_search_preferences_v2_alignment_preferences_check
    check (
      public.is_valid_discovery_v2_alignment_preferences(
        discovery_v2_alignment_preferences,
        discovery_v2_alignment_dimensions
      )
      and (
        discovery_v2_alignment_enabled
        or (
          discovery_v2_alignment_dimensions = '{}'::text[]
          and discovery_v2_alignment_preferences = '{}'::jsonb
        )
      )
    );

drop function if exists public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
);

create function public.search_founder_discovery_profiles_v2(
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
  search_intent text,
  start_horizon text,
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
    profile.search_intent,
    profile.start_horizon,
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

comment on column public.founder_discovery_profiles.search_intent is
  'Explicit optional Founder search intent. Independent from publication status and never inferred.';
comment on column public.founder_discovery_profiles.start_horizon is
  'Explicit optional approximate start horizon. Not a binding date or inferred commitment.';
comment on column public.founder_search_preferences.discovery_v2_alignment_preferences is
  'Owner-only importance and relation preferences for up to three consented Discovery alignment dimensions.';
comment on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer
) is 'RLS-respecting Discovery projection. Intent and horizon are descriptive outputs only and do not filter or rank candidates.';

commit;
