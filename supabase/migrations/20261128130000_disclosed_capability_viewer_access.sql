begin;

-- ---------------------------------------------------------------------------
-- get_disclosed_capability: auch der BETRACHTER muss zum Kontext gehören
-- ---------------------------------------------------------------------------
--
-- BEFUND (Security-Audit 14.10.2026): Im Kontext 'discovery' und 'connect'
-- prüfte die Funktion nur die Zielperson (aktives Kontextprofil, Freigabestufe,
-- Verbindung) - nicht, ob die anfragende Person diesen Kontext überhaupt sehen
-- darf. Jede angemeldete Person, die eine User-ID kannte, bekam so die
-- Capability-Bereiche einer FIND-Person, auch ohne Founder-Rolle (Advisor,
-- reines Connect-Mitglied) - obwohl `founder_discovery_profiles` selbst nur für
-- Founder lesbar ist. Ebenso im Connect-Kontext ohne Netzwerk-Mitgliedschaft.
--
-- DIE SEMANTIK STAND SCHON DA: Der Team-Kontext prüft den Betrachter (geteilte
-- Teammitgliedschaft), und alle Aufrufer im Code fragen den Kontext nur dort
-- ab, wo der Betrachter das Kontextprofil sehen darf (FIND nur für Founder,
-- CONNECT nur für Mitglieder, Vergleich nur aus per RLS sichtbaren Zeilen).
-- Die Funktion setzt jetzt durch, was die Aufrufer voraussetzen:
--
--   discovery  Betrachter ist Founder (is_current_user_discovery_founder)
--   connect    Betrachter ist Netzwerk-Mitglied (is_network_member)
--   team       unverändert: geteilte Teammitgliedschaft
--
-- Alles andere ist wörtlich die Fassung aus 20261119130000.

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
  'Die freigegebene Sicht auf die Faehigkeiten einer Person, je Kontext (discovery, connect, team). Der Betrachter muss zum Kontext gehoeren (discovery: Founder, connect: Netzwerk-Mitglied, team: gemeinsames Team). Bereiche ab Freigabestufe "areas"; Stufe und Verantwortungswunsch nur bei "areas_depth_on_contact" UND einer angenommenen Verbindung. Unabhaengig von capability_matching_allowed.';

commit;
