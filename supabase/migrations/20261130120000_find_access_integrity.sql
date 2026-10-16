begin;

-- ---------------------------------------------------------------------------
-- FIND: nur Founder werden gezeigt, und nie zwischen blockierten Personen
-- ---------------------------------------------------------------------------
--
-- BUG 1 (verifiziert 16.10.2026): Unter /profile laesst sich die Rolle
-- "founder" abwaehlen (profiles_update_self). Das FIND-Profil blieb danach
-- `active`: Andere fanden und lasen es weiter - die Select-Policy prueft nur
-- die Rolle der BETRACHTENDEN Person -, waehrend die Person selbst ihr Profil
-- nicht mehr sehen und nicht pausieren konnte (alle eigenen Zugriffe
-- verlangen is_current_user_discovery_founder()).
--
-- BUG 2 (verifiziert 16.10.2026): Die FIND-Suche prueft keine Blockierung.
-- CONNECT blendet blockierte Inhalte aus (connect_owner_visible), FIND nicht.
-- Intros verhindert bereits enforce_discovery_intro_block.
--
-- WAS SICH AENDERT:
--   1. Wer die Founder-Rolle verliert, dessen aktives FIND-Profil wird
--      `paused`. Daten und Suchkriterien bleiben. Kommt die Rolle zurueck,
--      bleibt das Profil pausiert, bis die Person es selbst wieder aktiviert.
--   2. Einmalige Bereinigung: bestehende aktive Profile ohne Founder-Rolle
--      werden pausiert.
--   3. Lesen (unabhaengig vom Trigger, fuer Altdaten): Ein fremdes FIND-Profil
--      ist nur lesbar, wenn der Inhaber aktuell Founder ist UND keine
--      Blockierung zwischen beiden besteht, in beide Richtungen (Select-Policy
--      und Suche; zentrale Semantik is_network_interaction_blocked). Das gilt
--      auch fuer direkte API-/Tabellenzugriffe.
--   4. get_relationship_display_names: Bestehende Beziehungen (Paar, Team,
--      Intro, Discovery-Matching-Start, alte Matching-Sitzung) lasen bisher den
--      Anzeigenamen der Gegenseite aus founder_discovery_profiles. Sie bekommen
--      ihn jetzt aus dieser eng begrenzten Funktion: nur Name und ob das
--      FIND-Profil aktiv ist, nur fuer Personen mit einer solchen Beziehung -
--      unabhaengig von einer Blockierung, damit Verbindungen nicht still
--      anonymisiert werden. Keine weiteren Discovery-Daten.
--
-- Intros, Kontakte und Teams werden nicht angefasst.
--
-- OFFEN NACH MERGE DES MATCHING-BRANCHES (verbindlich): get_disclosed_capability
-- wird dort neu definiert (20261128130000). Eine spaetere Migration muss im
-- Kontext 'discovery' bei bestehender Blockierung keine Capability-Daten mehr
-- liefern (Test: supabase/tests/find_access_integrity.sql, TODO-Block am Ende).

-- 1. Ist der Inhaber eines FIND-Profils aktuell Founder? ---------------------
create or replace function public.discovery_profile_owner_is_founder(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1 from public.profiles profile
    where profile.user_id = p_user_id
      and 'founder' = any(coalesce(profile.roles, '{}'::text[]))
  );
$$;

comment on function public.discovery_profile_owner_is_founder(uuid) is
  'Hat der Inhaber eines FIND-Profils aktuell die Rolle founder? Fuer Select-Policy und Suche.';

revoke all on function public.discovery_profile_owner_is_founder(uuid) from public, anon;
grant execute on function public.discovery_profile_owner_is_founder(uuid) to authenticated, service_role;

-- 2. Rolle entzogen -> FIND-Profil pausieren --------------------------------
create or replace function public.pause_discovery_profile_without_founder_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.founder_discovery_profiles
  set status = 'paused'
  where user_id = new.user_id
    and status = 'active';
  return new;
end;
$$;

revoke all on function public.pause_discovery_profile_without_founder_role() from public, anon, authenticated, service_role;

-- Nur das tatsaechliche Entfernen von founder - andere Rollenaenderungen
-- (z. B. advisor dazu oder weg) beruehren FIND nicht.
drop trigger if exists pause_discovery_profile_on_founder_role_removal on public.profiles;
create trigger pause_discovery_profile_on_founder_role_removal
after update of roles on public.profiles
for each row
when (
  'founder' = any(coalesce(old.roles, '{}'::text[]))
  and not ('founder' = any(coalesce(new.roles, '{}'::text[])))
)
execute function public.pause_discovery_profile_without_founder_role();

-- 3. Einmalige Bereinigung bestehender Zeilen -------------------------------
update public.founder_discovery_profiles discovery
set status = 'paused'
where discovery.status = 'active'
  and not public.discovery_profile_owner_is_founder(discovery.user_id);

-- 4. Fremdes FIND-Profil lesbar? Founder-Rolle UND keine Blockierung ---------
create or replace function public.discovery_profile_visible_to_current_user(p_owner_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.discovery_profile_owner_is_founder(p_owner_user_id)
    and not public.is_network_interaction_blocked(p_owner_user_id, auth.uid());
$$;

comment on function public.discovery_profile_visible_to_current_user(uuid) is
  'Darf die angemeldete Person das (aktive) FIND-Profil dieses Inhabers sehen? Inhaber ist Founder und keine Blockierung in irgendeine Richtung.';

revoke all on function public.discovery_profile_visible_to_current_user(uuid) from public, anon;
grant execute on function public.discovery_profile_visible_to_current_user(uuid) to authenticated;

drop policy if exists founder_discovery_profiles_select_founders on public.founder_discovery_profiles;
create policy founder_discovery_profiles_select_founders
on public.founder_discovery_profiles
for select
to authenticated
using (
  public.is_current_user_discovery_founder()
  and (
    user_id = auth.uid()
    or (status = 'active' and public.discovery_profile_visible_to_current_user(user_id))
  )
);

-- 5. Anzeigenamen fuer bestehende Beziehungen --------------------------------
-- Nur fuer die uebergebenen Personen, mit denen die angemeldete Person eine
-- Beziehung hat (und fuer sie selbst). Liefert denselben Namen wie bisher
-- (founder_discovery_profiles.display_name, ohne FIND-Profil
-- person_core.display_name) und ob das FIND-Profil aktiv und vom Founder ist -
-- so behalten die bisherigen Leser ihre Regel ("Name nur bei aktivem
-- FIND-Profil"). Eine Blockierung spielt hier bewusst keine Rolle; die Funktion
-- verraet sie auch nicht. Keine weiteren Profildaten.
create or replace function public.get_relationship_display_names(p_user_ids uuid[])
returns table (user_id uuid, display_name text, discovery_active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select auth.uid() as id),
  wanted as (
    select distinct candidate
    from unnest(coalesce(p_user_ids, '{}'::uuid[])) candidate, me
    where me.id is not null
  ),
  related as (
    select wanted.candidate
    from wanted, me
    where wanted.candidate = me.id
       or exists (select 1 from public.relationships r
                  where (r.user_a_id = me.id and r.user_b_id = wanted.candidate)
                     or (r.user_b_id = me.id and r.user_a_id = wanted.candidate))
       or exists (select 1 from public.founder_team_members mine
                  join public.founder_team_members theirs on theirs.team_id = mine.team_id
                  where mine.user_id = me.id and theirs.user_id = wanted.candidate)
       or exists (select 1 from public.discovery_intro_requests i
                  where (i.requester_user_id = me.id and i.recipient_user_id = wanted.candidate)
                     or (i.recipient_user_id = me.id and i.requester_user_id = wanted.candidate))
       or exists (select 1 from public.discovery_matching_starts s
                  where (s.requester_user_id = me.id and s.recipient_user_id = wanted.candidate)
                     or (s.recipient_user_id = me.id and s.requester_user_id = wanted.candidate))
       or exists (select 1 from public.matching_session_participants mine
                  join public.matching_session_participants theirs
                    on theirs.matching_session_id = mine.matching_session_id
                  where mine.user_id = me.id and theirs.user_id = wanted.candidate)
  )
  select related.candidate,
         coalesce(nullif(btrim(discovery.display_name), ''), nullif(btrim(core.display_name), '')),
         coalesce(discovery.status = 'active' and public.discovery_profile_owner_is_founder(related.candidate), false)
  from related
  left join public.founder_discovery_profiles discovery on discovery.user_id = related.candidate
  left join public.person_core core on core.user_id = related.candidate;
$$;

comment on function public.get_relationship_display_names(uuid[]) is
  'Anzeigename (und ob das FIND-Profil aktiv ist) fuer Personen mit bestehender Beziehung zur angemeldeten Person: Paar, Team, Intro, Discovery-Matching-Start, alte Matching-Sitzung. Unabhaengig von Blockierungen; keine weiteren Profildaten.';

revoke all on function public.get_relationship_display_names(uuid[]) from public, anon;
grant execute on function public.get_relationship_display_names(uuid[]) to authenticated;

-- 6. Suche: Founder-Rolle und Blockierung -----------------------------------
-- Unveraendert aus 20261091120000_search_by_frame.sql bis auf die zwei
-- markierten Zeilen. Sortierung weiter published_at desc nulls last, id.
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
