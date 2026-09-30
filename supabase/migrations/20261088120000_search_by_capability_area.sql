begin;

-- ---------------------------------------------------------------------------
-- Nach Faehigkeiten suchen - und nur bei denen, die sie freigegeben haben
-- ---------------------------------------------------------------------------
--
-- Abschnitt 5.2 der FIND-Spec: "Was soll die Person mitbringen?" Gesucht wird
-- gegen die Capability-Bereiche, nicht gegen das Freitextfeld Expertise.
--
-- ---------------------------------------------------------------------------
-- WER SEINE BEREICHE PRIVAT HAELT, WIRD UEBER SIE NICHT GEFUNDEN
-- ---------------------------------------------------------------------------
--
-- Entschieden von Maria am 30.09.2026: "Wer das verstecken moechte, der wird
-- halt nicht gezeigt." `person_core.capability_disclosure` steht bei jedem
-- selbst auf `private`, `areas` oder `areas_depth_on_contact`; nur die
-- letzten beiden geben die Bereiche ueberhaupt preis.
--
-- Das gilt NUR, wenn nach Faehigkeiten gesucht wird. Ohne dieses Kriterium
-- erscheint weiterhin jeder - `private` versteckt niemanden aus FIND, es
-- versteckt nur die Faehigkeiten.
--
-- Die Oberflaeche sagt es an der Stelle, an der man die Sichtbarkeit setzt.
--
-- ---------------------------------------------------------------------------
-- WARUM DIE FUNKTION JETZT SECURITY DEFINER IST
-- ---------------------------------------------------------------------------
--
-- Auf `person_capability_entries` und `person_core` liegen ausschliesslich
-- Policies fuer die eigenen Zeilen - zu Recht. Die Suche muss aber PRUEFEN,
-- ob eine andere Person einen Bereich eingetragen hat, ohne ihn zu lesen.
--
-- Damit faellt die Zeilensicherheit von `founder_discovery_profiles` weg, die
-- bisher mitgeprueft hat. Ihre Bedingungen stehen deshalb jetzt ausdruecklich
-- in der Funktion: angemeldet, Founder-Rolle, veroeffentlichtes Profil, nicht
-- man selbst. Ein pgTAP-Fall haelt jede davon fest.
--
-- Herausgegeben wird nichts Neues: dieselben Spalten wie vorher. Die
-- Faehigkeiten stehen nur in einem `exists` und kommen nirgends zurueck.

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
  p_offset integer default 0,
  p_capability_areas text[] default '{}'::text[]
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
      -- Stand bisher in der Zeilensicherheit. Ohne diese Zeile waere die
      -- Funktion die Hintertuer um sie herum.
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
  text[], text[], text, text[], smallint, integer, integer, text[]
) is
  'Die Suche in FIND. Prueft Faehigkeitsbereiche, ohne sie herauszugeben - und '
  'nur bei Menschen, die ihre Bereiche freigegeben haben.';

revoke all on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[]
) from public, anon;
grant execute on function public.search_founder_discovery_profiles_v2(
  text[], text[], text, text[], smallint, integer, integer, text[]
) to authenticated;

commit;
