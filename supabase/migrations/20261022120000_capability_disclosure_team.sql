begin;

-- ---------------------------------------------------------------------------
-- Die Freigabeleiter kennt jetzt auch das Team
-- ---------------------------------------------------------------------------
--
-- GEBRAUCHT FUER DIE TEAMAUSWERTUNG (gewuenscht am 21.09.2026: "dass dann die
-- ganzen Rollen und Verantwortlichkeiten von dem Founder-Team gut gezeigt
-- werden können"). Die Auswertung braucht von jedem Mitglied Stufe UND
-- Verantwortungswunsch - ohne beides ergibt jeder Bereich "keine Grundlage",
-- und die Seite haette nichts zu sagen.
--
-- WARUM GETEILTE TEAMMITGLIEDSCHAFT ALS BEZIEHUNG GILT, und das ist die
-- eigentliche Entscheidung dieser Migration:
--
--   Die Funktion gibt Tiefe und Wunsch bisher nur bei einer ANGENOMMENEN
--   Verbindung heraus - einer angenommenen Vorstellungsanfrage aus Find oder
--   einer angenommenen Kontaktanfrage aus Connect. In einem Founder-Team
--   landet niemand versehentlich: Jemand hat eingeladen, jemand hat
--   angenommen, und danach arbeiten diese Menschen in Setup, Commitment Lab
--   und Collaboration Lab miteinander. Das ist die engste Beziehung, die
--   dieses Produkt kennt - engster als eine angenommene Kontaktanfrage.
--
-- WAS SICH AUSDRUECKLICH NICHT AENDERT: die STUFE der Freigabe. Wer
-- `private` eingestellt hat, gibt weiterhin nichts heraus; wer `areas`
-- eingestellt hat, gibt Bereiche und keine Tiefe heraus - auch im eigenen
-- Team. Die Teammitgliedschaft ersetzt die Beziehung, nicht die Entscheidung.
-- Eine Teamauswertung zeigt deshalb offen, wie viele ihre Tiefe freigegeben
-- haben, statt eine Luecke als Aussage auszugeben.
--
-- UND NICHT UEBER EINE NEUE TABELLE: Eine eigene "Freigabe an dieses Team"
-- waere ein zweiter Ort, an dem dieselbe Frage entschieden wird - und dann
-- gaebe es Menschen, deren Profileinstellung das eine und deren Teamfreigabe
-- das andere sagt. Eine Frage, eine Einstellung.
--
-- Die uebrigen Bedingungen sind unveraendert aus
-- 20260908120000_create_capability_disclosure_v01.sql uebernommen; `create or
-- replace function` kennt keinen Teilersatz.
-- ---------------------------------------------------------------------------

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
      -- Bedingung 1: das Kontextprofil muss aktiv sein
      and (
        (p_context = 'discovery' and exists (
          select 1 from public.founder_discovery_profiles discovery
          where discovery.user_id = p_user_id and discovery.status = 'active'))
        or
        (p_context = 'connect' and exists (
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
  'Die freigegebene Sicht auf die Faehigkeiten einer Person, je Kontext (discovery, connect, team). Bereiche ab Freigabestufe "areas"; Stufe und Verantwortungswunsch nur bei "areas_depth_on_contact" UND einer angenommenen Verbindung - seit 21.09.2026 gilt eine geteilte Founder-Team-Mitgliedschaft als solche, weil in einem Team niemand versehentlich landet. Die Stufe der Freigabe bleibt davon unberuehrt.';

commit;
