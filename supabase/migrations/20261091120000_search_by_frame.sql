begin;

-- ---------------------------------------------------------------------------
-- Nach Startzeitpunkt und Suchstatus filtern
-- ---------------------------------------------------------------------------
--
-- Abschnitt 5.1 der FIND-Spec nennt beide als Kriterien des praktischen
-- Rahmens. Sie standen bis zum 30.09.2026 nur AM PROFIL: Man konnte sagen,
-- ab wann man loslegen will, aber nicht danach suchen.
--
-- Beides sind Auswahlen mit wenigen Werten, und die Suche laesst mehrere zu:
-- "in den naechsten drei Monaten ODER jetzt" ist eine sinnvolle Suche,
-- "genau in den naechsten drei Monaten" waere eine kuenstliche Schaerfe.
--
-- Leer heisst wie ueberall: kein Kriterium. Wer nichts waehlt, sieht alle -
-- auch die, die dort noch nichts angegeben haben.

drop function if exists public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[]
);

create function public.search_founder_discovery_profiles_v2(
  p_roles text[] default '{}'::text[],
  p_expertise text[] default '{}'::text[],
  p_location_region text default null,
  p_remote_modes text[] default '{}'::text[],
  p_min_availability smallint default null,
  p_page_size integer default 12,
  p_offset integer default 0,
  p_capability_areas text[] default '{}'::text[],
  p_search_intents text[] default '{}'::text[],
  p_start_horizons text[] default '{}'::text[]
)
returns table (
  id uuid,
  candidate_user_id uuid,
  display_name text,
  headline text,
  own_roles text[],
  seeking_roles text[],
  own_role_other text,
  seeking_role_other text,
  expertise text[],
  location_region text,
  remote_mode text,
  availability_hours_per_week smallint,
  availability_flexibility text,
  availability_condition text,
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
security definer
set search_path to ''
as $$
  with filtered as (
    select profile.*
    from public.founder_discovery_profiles profile
    where auth.uid() is not null
      -- Stand bis zum 30.09.2026 in der Zeilensicherheit. Ohne diese Zeile
      -- waere die Funktion die Hintertuer um sie herum.
      and public.is_current_user_discovery_founder()
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
      -- WER SEINE BEREICHE PRIVAT HAELT, WIRD UEBER SIE NICHT GEFUNDEN.
      and (
        coalesce(cardinality(p_capability_areas), 0) = 0
        or exists (
          select 1
          from public.person_capability_entries entry
          join public.person_core core on core.user_id = entry.user_id
          where entry.user_id = profile.user_id
            and entry.area_id = any (p_capability_areas)
            and core.capability_disclosure in ('areas', 'areas_depth_on_contact')
        )
      )
      -- Wer nichts angegeben hat, faellt bei einer Suche danach heraus. Ein
      -- leeres Feld ist keine Antwort, und "vielleicht passt es ja doch"
      -- waere geraten.
      and (
        coalesce(cardinality(p_search_intents), 0) = 0
        or profile.search_intent = any (p_search_intents)
      )
      and (
        coalesce(cardinality(p_start_horizons), 0) = 0
        or profile.start_horizon = any (p_start_horizons)
      )
  )
  select
    profile.id,
    profile.user_id as candidate_user_id,
    profile.display_name,
    profile.headline,
    profile.own_roles,
    profile.seeking_roles,
    profile.own_role_other,
    profile.seeking_role_other,
    profile.expertise,
    profile.location_region,
    profile.remote_mode,
    profile.availability_hours_per_week,
    profile.availability_flexibility,
    profile.availability_condition,
    profile.commitment_level,
    profile.venture_stage,
    profile.venture_goal,
    profile.search_intent,
    profile.start_horizon,
    profile.published_at,
    count(*) over() as total_count
  from filtered profile
  order by profile.published_at desc nulls last, profile.id
  limit greatest(coalesce(p_page_size, 12), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[], text[], text[]
) is
  'Die Suche in FIND. Prueft Faehigkeitsbereiche, ohne sie herauszugeben - und '
  'nur bei Menschen, die ihre Bereiche freigegeben haben.';

revoke all on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[], text[], text[]
) from public, anon;
grant execute on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[], text[], text[]
) to authenticated;

commit;
