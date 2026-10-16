begin;

-- ---------------------------------------------------------------------------
-- get_disclosed_capability: im Discovery-Kontext keine Capability bei Blockierung
-- ---------------------------------------------------------------------------
--
-- BEFUND: Seit 20261130120000 sind FIND-Suche und FIND-Profile bei einer
-- Blockierung (beliebige Richtung) dicht. get_disclosed_capability(...,
-- 'discovery') prüfte das nicht: Ein blockierter Founder bekam die
-- freigegebenen Bereiche (und bei Verbindung die Tiefe) weiter.
--
-- REGEL: Im Kontext 'discovery' gilt dieselbe Sichtbarkeit wie für das
-- FIND-Profil selbst (discovery_profile_visible_to_current_user): keine
-- Blockierung in irgendeine Richtung, Inhaber ist Founder. Sonst kommen keine
-- Zeilen - genau wie bei "für diesen Kontext keine Capability sichtbar". Die
-- Richtung der Blockierung bleibt verborgen. Blockierung hat Vorrang vor
-- Freigabestufe, Verbindung und capability_matching_allowed.
--
-- FAIL CLOSED: Schlägt die Prüfung fehl, schlägt die Funktion fehl; der
-- App-Lader (getDisclosedCapability) zeigt dann nichts.
--
-- NICHT GEÄNDERT: 'connect' und 'team' (eigene Semantik; Befund siehe Bericht).
-- Alles andere ist wörtlich die Fassung aus 20261128130000.

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
  order by area.family_id, area.sort_order;
$$;

revoke all on function public.get_disclosed_capability(uuid, text) from public;
revoke all on function public.get_disclosed_capability(uuid, text) from anon;
grant execute on function public.get_disclosed_capability(uuid, text) to authenticated;

comment on function public.get_disclosed_capability(uuid, text) is
  'Die freigegebene Sicht auf die Faehigkeiten einer Person, je Kontext (discovery, connect, team). Der Betrachter muss zum Kontext gehoeren (discovery: Founder, und das FIND-Profil muss fuer ihn sichtbar sein - keine Blockierung in irgendeine Richtung; connect: Netzwerk-Mitglied; team: gemeinsames Team). Bereiche ab Freigabestufe "areas"; Stufe und Verantwortungswunsch nur bei "areas_depth_on_contact" UND einer angenommenen Verbindung. Unabhaengig von capability_matching_allowed.';

commit;
