begin;

-- ---------------------------------------------------------------------------
-- FIND Matching v0.1: set-basierter Kandidatenpool und Eingaben (E3a)
-- ---------------------------------------------------------------------------
--
-- WARUM: Der globale Shadow (E2) lud den ganzen FIND-Bestand in vielen
-- PostgREST-Blöcken (1000 Zeilen je Seite, 200 IDs je in-Liste, nacheinander),
-- dazu alle Blockierungen. Bei 10.000 Profilen rund 160 Roundtrips. Diese
-- Migration liefert Pool und Eingaben in je einer Abfrage.
--
-- POOL = NUR PRODUKT-/ACCESS-GATES (dieselben wie FIND seit 20261130120000):
--   - FIND-Profil `active`
--   - Inhaber aktuell Founder (discovery_profile_owner_is_founder)
--   - nicht die betrachtende Person
--   - keine Blockierung in irgendeine Richtung (is_network_interaction_blocked)
--   - die betrachtende Person selbst: aktives FIND-Profil und Founder
--     (wie die heutige Suche: nur wer aktiv ist, sucht)
-- Geloeschte Konten verschwinden per Kaskade. Keine Must-haves, keine
-- Rollen-/Stunden-/Ort-/Remote-/Suchstand-/Start-/Capability-/Expertise-Filter,
-- keine Sortierung als Relevanz, keine Scores: das Gate v03 und das Ranking
-- bleiben in der Engine.
--
-- KEINE NAMEN, BIOS, HEADLINES im Pool; keine privaten Kriterien, keine
-- Capability, kein Workstyle, keine Research-Daten.
--
-- ZUGRIFF:
--   get_find_matching_pool()                  angemeldete Person, nur auth.uid()
--   get_find_matching_pool_for_viewer(uuid)   nur service_role (Server-Shadow,
--                                             Auswertung) - kein Nutzerzugriff
--   get_find_matching_inputs(uuid[])          nur service_role: person_core-
--                                             Matchingfelder, die ACHT v0.1-
--                                             Kriterien, Capability-Eintraege
--                                             nur mit Matching-Freigabe
-- Ergebnis jeweils ein JSON-Dokument (eine Zeile) - die 1000-Zeilen-Grenze von
-- PostgREST greift dadurch nicht.

-- 1. Kern (keine direkten Rechte) --------------------------------------------
create or replace function public.find_matching_pool_core(p_viewer uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select discovery.*
    from public.founder_discovery_profiles discovery
    where p_viewer is not null
      and discovery.user_id = p_viewer
      and discovery.status = 'active'
      and public.discovery_profile_owner_is_founder(p_viewer)
  ),
  pool as (
    select candidate.*,
      -- Angenommene Verbindung (nur fuer die Tiefen-Sichtbarkeit von Reasons,
      -- wie get_disclosed_capability): Intro, CONNECT-Kontakt, gemeinsames Team.
      (exists (select 1 from public.discovery_intro_requests intro
               where intro.status = 'accepted'
                 and ((intro.requester_user_id = p_viewer and intro.recipient_user_id = candidate.user_id)
                   or (intro.recipient_user_id = p_viewer and intro.requester_user_id = candidate.user_id)))
       or exists (select 1 from public.network_contact_requests request
                  where request.status = 'accepted'
                    and ((request.sender_user_id = p_viewer and request.recipient_user_id = candidate.user_id)
                      or (request.recipient_user_id = p_viewer and request.sender_user_id = candidate.user_id)))
       or exists (select 1 from public.founder_team_members mine
                  join public.founder_team_members theirs on theirs.team_id = mine.team_id
                  where mine.user_id = p_viewer and theirs.user_id = candidate.user_id)) as has_contact
    from public.founder_discovery_profiles candidate
    where exists (select 1 from viewer)
      and candidate.status = 'active'
      and candidate.user_id <> p_viewer
      and public.discovery_profile_owner_is_founder(candidate.user_id)
      and not public.is_network_interaction_blocked(candidate.user_id, p_viewer)
  )
  select case when not exists (select 1 from viewer) then null else jsonb_build_object(
    'viewer', (
      select jsonb_build_object(
        'user_id', v.user_id, 'profile_id', v.id,
        'own_roles', v.own_roles, 'seeking_roles', v.seeking_roles,
        'availability_hours_per_week', v.availability_hours_per_week,
        'availability_flexibility', v.availability_flexibility,
        'commitment_level', v.commitment_level, 'venture_stage', v.venture_stage, 'venture_goal', v.venture_goal,
        'search_intent', v.search_intent, 'start_horizon', v.start_horizon,
        'published_at', v.published_at, 'updated_at', v.updated_at, 'has_contact', false)
      from viewer v),
    'candidates', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', c.user_id, 'profile_id', c.id,
        'own_roles', c.own_roles, 'seeking_roles', c.seeking_roles,
        'availability_hours_per_week', c.availability_hours_per_week,
        'availability_flexibility', c.availability_flexibility,
        'commitment_level', c.commitment_level, 'venture_stage', c.venture_stage, 'venture_goal', c.venture_goal,
        'search_intent', c.search_intent, 'start_horizon', c.start_horizon,
        'published_at', c.published_at, 'updated_at', c.updated_at, 'has_contact', c.has_contact)
        order by c.user_id)
      from pool c), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.find_matching_pool_core(uuid) from public, anon, authenticated, service_role;

-- 2. Fuer die angemeldete Person ---------------------------------------------
create or replace function public.get_find_matching_pool()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.find_matching_pool_core(auth.uid()) where auth.uid() is not null;
$$;

comment on function public.get_find_matching_pool() is
  'FIND-Matching-Pool der angemeldeten Person: nur Produkt-/Access-Gates (aktiv, Founder, nicht selbst, keine Blockierung). Keine Namen, keine privaten Kriterien, keine Capability. Null, wenn die Person selbst nicht aktiv sucht.';

revoke all on function public.get_find_matching_pool() from public, anon;
grant execute on function public.get_find_matching_pool() to authenticated;

-- 3. Fuer serverseitige Shadows / Auswertung ----------------------------------
create or replace function public.get_find_matching_pool_for_viewer(p_viewer uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.find_matching_pool_core(p_viewer);
$$;

comment on function public.get_find_matching_pool_for_viewer(uuid) is
  'Wie get_find_matching_pool, fuer eine benannte Person. Nur service_role (Server-Shadow, Auswertung).';

revoke all on function public.get_find_matching_pool_for_viewer(uuid) from public, anon, authenticated;
grant execute on function public.get_find_matching_pool_for_viewer(uuid) to service_role;

-- 4. Matching-Eingaben je Person (nur service_role) ---------------------------
-- Von den privaten Suchkriterien verlassen nur die acht v0.1-Gate-Kriterien die
-- Datenbank (camelCase und snake_case, wie normalizeMustHaves sie liest) - die
-- vier Produktfelder ausserhalb v0.1 nie. Capability-Eintraege nur mit
-- ausdruecklicher Matching-Freigabe.
create or replace function public.get_find_matching_inputs(p_user_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', core.user_id,
    'industries', core.industries,
    'expertise', core.expertise,
    'location_region', core.location_region,
    'remote_mode', core.remote_mode,
    'capability_disclosure', core.capability_disclosure,
    'capability_matching_allowed', core.capability_matching_allowed,
    'must_haves', (
      select jsonb_strip_nulls(jsonb_build_object(
        'requiredRolesAny', prefs.must_haves -> 'requiredRolesAny',
        'required_roles_any', prefs.must_haves -> 'required_roles_any',
        'minimumAvailabilityHoursPerWeek', prefs.must_haves -> 'minimumAvailabilityHoursPerWeek',
        'minimum_availability_hours_per_week', prefs.must_haves -> 'minimum_availability_hours_per_week',
        'acceptedRemoteModes', prefs.must_haves -> 'acceptedRemoteModes',
        'accepted_remote_modes', prefs.must_haves -> 'accepted_remote_modes',
        'desiredLocationRegion', prefs.must_haves -> 'desiredLocationRegion',
        'desired_location_region', prefs.must_haves -> 'desired_location_region',
        'acceptedSearchIntents', prefs.must_haves -> 'acceptedSearchIntents',
        'accepted_search_intents', prefs.must_haves -> 'accepted_search_intents',
        'acceptedStartHorizons', prefs.must_haves -> 'acceptedStartHorizons',
        'accepted_start_horizons', prefs.must_haves -> 'accepted_start_horizons',
        'requiredCapabilityAreasAny', prefs.must_haves -> 'requiredCapabilityAreasAny',
        'required_capability_areas_any', prefs.must_haves -> 'required_capability_areas_any',
        'requiredExpertiseAny', prefs.must_haves -> 'requiredExpertiseAny',
        'required_expertise_any', prefs.must_haves -> 'required_expertise_any'))
      from public.founder_search_preferences prefs
      where prefs.user_id = core.user_id),
    'capability_entries', case when core.capability_matching_allowed then coalesce((
      select jsonb_agg(jsonb_build_object(
        'area_id', entry.area_id,
        'application_level', entry.application_level,
        'ownership_wish', entry.ownership_wish) order by entry.area_id)
      from public.person_capability_entries entry
      where entry.user_id = core.user_id), '[]'::jsonb) else '[]'::jsonb end
  ) order by core.user_id), '[]'::jsonb)
  from public.person_core core
  where core.user_id = any(coalesce(p_user_ids, '{}'::uuid[]));
$$;

comment on function public.get_find_matching_inputs(uuid[]) is
  'Matching-v0.1-Eingaben je Person: person_core-Matchingfelder, die acht v0.1-Gate-Kriterien (nie die vier Produktfelder), Capability-Eintraege nur mit Matching-Freigabe. Nur service_role.';

revoke all on function public.get_find_matching_inputs(uuid[]) from public, anon, authenticated;
grant execute on function public.get_find_matching_inputs(uuid[]) to service_role;

commit;
