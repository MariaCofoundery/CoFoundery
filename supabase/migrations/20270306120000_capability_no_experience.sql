begin;

-- ---------------------------------------------------------------------------
-- Capability: "Keine" Erfahrung ist eine Angabe, kein Treffer
-- ---------------------------------------------------------------------------
--
-- Seit dem 04.11.2026 bietet "Wo kennst du dich aus?" je Bereich die
-- Erfahrung "Keine" an - die bestehende Stufe 1 ("noch nicht praktisch
-- angewandt"), kein neuer Wert. Wer sie waehlt, sagt etwas ueber den Bereich
-- ("will ich lernen", "soll lieber jemand anderes machen"), bringt ihn aber
-- nicht mit.
--
-- Zwei Stellen lesen einen Bereich ohne Stufe als "hat die Person":
--
--   search_founder_discovery_profiles_v2  Suche nach Bereichen in FIND
--   get_disclosed_capability              Freigabe "areas" bzw. Tiefe noch
--                                         nicht sichtbar
--
-- Beide uebergehen jetzt Eintraege mit Stufe 1. Wo die Stufe mitgezeigt wird,
-- bleibt der Eintrag sichtbar - dort steht "Keine" dabei. Dieselbe Regel
-- steht in der Anwendung (`bringsArea`, capabilityTypes.ts).
--
-- Beide Funktionen sind sonst unveraendert (Stand 20270114120000 bzw.
-- 20261202120000).
-- ---------------------------------------------------------------------------

create or replace function public.search_founder_discovery_profiles_v2(
  p_roles text[] default '{}'::text[],
  p_expertise text[] default '{}'::text[],
  p_location_region text default null,
  p_remote_modes text[] default '{}'::text[],
  p_min_availability smallint default null,
  p_page_size integer default 12,
  p_offset integer default 0,
  p_capability_areas text[] default '{}'::text[],
  p_search_intents text[] default '{}'::text[],
  p_start_horizons text[] default '{}'::text[],
  p_commitment_levels text[] default '{}'::text[]
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
  own_role_parts text[],
  seeking_role_parts text[],
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
      -- NEU (20261130120000): nur, wer die Founder-Rolle aktuell hat ...
      and public.discovery_profile_owner_is_founder(profile.user_id)
      -- ... und ohne Blockierung zwischen beiden, egal in welche Richtung.
      and not public.is_network_interaction_blocked(profile.user_id, auth.uid())
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
      -- NEU (20261217120000): Verglichen wird der Ort vor dem ersten Komma.
      -- "Berlin" findet damit auch "Berlin, DE" und umgekehrt, "Bern" aber
      -- nicht "Bernau". Wer keinen Ort angegeben hat, faellt bei einer Suche
      -- danach weiter heraus.
      and (
        nullif(btrim(p_location_region), '') is null
        or (
          nullif(btrim(profile.location_region), '') is not null
          and lower(btrim(split_part(profile.location_region, ',', 1)))
            = lower(btrim(split_part(p_location_region, ',', 1)))
        )
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
            -- NEU (20270306120000): "Keine" Erfahrung ist kein Treffer.
            and entry.application_level is distinct from 1
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
      -- NEU (20261216120000): Einsatz ("Vollzeit", "All-in" ...). Gleiche
      -- Regel wie davor: mehrere Werte sind ein ODER, leer heisst egal, und
      -- wer nichts angegeben hat, faellt bei einer Suche danach heraus.
      and (
        coalesce(cardinality(p_commitment_levels), 0) = 0
        or profile.commitment_level = any (p_commitment_levels)
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
    profile.own_role_parts,
    profile.seeking_role_parts,
    count(*) over() as total_count
  from filtered profile
  order by profile.published_at desc nulls last, profile.id
  limit greatest(coalesce(p_page_size, 12), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

comment on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[], text[], text[], text[]
) is
  'Die Suche in FIND. Prueft Faehigkeitsbereiche, ohne sie herauszugeben - und '
  'nur bei Menschen, die ihre Bereiche freigegeben haben. Filtert nach Einsatz. '
  'Liefert die selbst gewaehlten Unterbereiche der Schwerpunkte mit.';

revoke all on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[], text[], text[], text[]
) from public, anon;
grant execute on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[], text[], text[], text[]
) to authenticated;

create or replace function public.get_disclosed_capability(p_user_id uuid, p_context text)
returns table (
  area_id text,
  family_id text,
  application_level smallint,
  ownership_wish text
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select auth.uid() as user_id
  ),
  -- Ein gemeinsames Founder-Team. Einmal berechnet, weil es unten zweimal
  -- gebraucht wird: als Kontext UND als Beziehung.
  shared_team as (
    select exists (
      select 1
      from public.founder_team_members mine
      join public.founder_team_members theirs on theirs.team_id = mine.team_id
      cross join viewer
      where mine.user_id = viewer.user_id
        and theirs.user_id = p_user_id
    ) as together
  ),
  eligible as (
    select
      core.capability_disclosure,
      -- Bedingung 3: angenommene Verbindung, im jeweiligen Kontext
      exists (
        select 1 from public.discovery_intro_requests intro, viewer
        where intro.status = 'accepted'
          and ((intro.requester_user_id = viewer.user_id and intro.recipient_user_id = p_user_id)
            or (intro.recipient_user_id = viewer.user_id and intro.requester_user_id = p_user_id))
      ) or exists (
        select 1 from public.network_contact_requests request, viewer
        where request.status = 'accepted'
          and ((request.sender_user_id = viewer.user_id and request.recipient_user_id = p_user_id)
            or (request.recipient_user_id = viewer.user_id and request.sender_user_id = p_user_id))
      ) or (select together from shared_team) as connected
    from public.person_core core, viewer
    where core.user_id = p_user_id
      and viewer.user_id is not null
      and core.capability_disclosure in ('areas', 'areas_depth_on_contact')
      -- Bedingung 1: das Kontextprofil muss aktiv sein - und der Betrachter
      -- muss zu diesem Kontext gehören (neu am 14.10.2026).
      and (
        (p_context = 'discovery'
          and public.is_current_user_discovery_founder()
          -- NEU (20261201120000): dieselbe Sichtbarkeit wie das FIND-Profil
          -- selbst - keine Blockierung in irgendeine Richtung, Inhaber ist
          -- Founder. Sonst: keine Zeilen, wie "keine Capability sichtbar".
          and public.discovery_profile_visible_to_current_user(p_user_id)
          and exists (
            select 1 from public.founder_discovery_profiles discovery
            where discovery.user_id = p_user_id and discovery.status = 'active'))
        or
        (p_context = 'connect'
          and public.is_network_member(viewer.user_id)
          -- NEU (20261202120000): dieselbe Sichtbarkeit wie CONNECT-Inhalte
          -- (connect_owner_visible) - keine Blockierung in irgendeine
          -- Richtung. Sonst: keine Zeilen, wie "keine Capability sichtbar".
          and public.connect_owner_visible(p_user_id)
          and exists (
            select 1 from public.network_profiles connect
            join public.network_memberships membership on membership.user_id = connect.user_id
            where connect.user_id = p_user_id
              and connect.status = 'active'
              and membership.status = 'active'))
        or
        -- Im Team ist die Mitgliedschaft selbst der Kontext: Es gibt kein
        -- "Teamprofil", das aktiv sein koennte.
        (p_context = 'team' and (select together from shared_team))
      )
  )
  select entry.area_id,
    area.family_id,
    case when eligible.capability_disclosure = 'areas_depth_on_contact' and eligible.connected
      then entry.application_level end,
    case when eligible.capability_disclosure = 'areas_depth_on_contact' and eligible.connected
      then entry.ownership_wish end
  from public.person_capability_entries entry
  join public.capability_areas area on area.area_id = entry.area_id
  cross join eligible
  where entry.user_id = p_user_id
    -- NEU (20270306120000): Ohne sichtbare Stufe liest sich jeder Bereich als
    -- "bringt die Person mit". Ein Bereich mit "Keine" Erfahrung erscheint
    -- deshalb nur, wo die Stufe mitgezeigt wird.
    and (
      entry.application_level is distinct from 1
      or (eligible.capability_disclosure = 'areas_depth_on_contact' and eligible.connected)
    )
  order by area.family_id, area.sort_order;
$$;

revoke all on function public.get_disclosed_capability(uuid, text) from public;
revoke all on function public.get_disclosed_capability(uuid, text) from anon;
grant execute on function public.get_disclosed_capability(uuid, text) to authenticated;

comment on function public.get_disclosed_capability(uuid, text) is
  'Die freigegebene Sicht auf die Faehigkeiten einer Person, je Kontext (discovery, connect, team). Der Betrachter muss zum Kontext gehoeren (discovery: Founder, und das FIND-Profil muss fuer ihn sichtbar sein - keine Blockierung in irgendeine Richtung; connect: Netzwerk-Mitglied, und die CONNECT-Inhalte des Ziels muessen fuer ihn sichtbar sein - keine Blockierung in irgendeine Richtung; team: gemeinsames Team). Bereiche ab Freigabestufe "areas"; Stufe und Verantwortungswunsch nur bei "areas_depth_on_contact" UND einer angenommenen Verbindung. Unabhaengig von capability_matching_allowed.';

commit;
