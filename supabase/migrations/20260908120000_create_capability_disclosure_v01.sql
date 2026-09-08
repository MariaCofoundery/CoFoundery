begin;

-- Freigabe der Capability-Angaben. Fachliche Grundlage: Kapitel 13 des
-- Capability-Briefs, "Sichtbarkeit: eine Leiter, keine Matrix".
--
-- Capability-Daten sind nicht gleich sensibel. Bereiche lesen sich wie die
-- heutige Expertise-Liste; eine selbst gesetzte Erfahrungsstufe liest sich
-- dort, wo verglichen wird, als Eingestaendnis; und "lieber jemand anders"
-- beim Verantwortungswunsch ist Verhandlungsinformation.
--
-- Deshalb keine Matrix aus Feld x Kontext - das waeren sechs Entscheidungen in
-- einem Formular, und im Zweifel bleibt alles zu. Stattdessen eine Leiter: Die
-- Person entscheidet einmal, wie weit sie geht, und wie viel jemand sieht
-- haengt an der Beziehung zu dieser Person.
--
-- Belege werden in dieser Fassung gar nicht freigegeben. Sie sind die
-- persoenlichsten Inhalte und gehoeren zur spaeteren Deep Analysis.

alter table public.person_core
  add column capability_disclosure text not null default 'private',
  add constraint person_core_capability_disclosure_check
    check (capability_disclosure in ('private', 'areas', 'areas_depth_on_contact'));

comment on column public.person_core.capability_disclosure is
  'Wie weit die Capability-Angaben weitergegeben werden. Default private; Belege werden nie freigegeben.';

-- ---------------------------------------------------------------------------
-- Die freigegebene Sicht auf eine andere Person
-- ---------------------------------------------------------------------------
-- Drei unabhaengige Bedingungen, jede einzeln notwendig, keine hinreichend -
-- dieselbe Bauform wie der fruehere Fotovertrag, die sich als pruefbar
-- erwiesen hat:
--
--   1. das Kontextprofil der Zielperson ist aktiv
--   2. ihre Freigabestufe ist mindestens 'areas'
--   3. fuer Tiefe zusaetzlich: eine angenommene Verbindung zwischen beiden
--
-- Die Kontextpruefung liegt bewusst hier und nicht nur in der aufrufenden
-- Seite, damit die Zusage an einer Stelle steht und von pgTAP geprueft werden
-- kann.
--
-- `application_level` und `ownership_wish` kommen als null zurueck, solange
-- Bedingung 3 nicht erfuellt ist. Der Aufrufer sieht dann Bereiche ohne Tiefe -
-- und kann nicht unterscheiden, ob die Tiefe fehlt oder nur nicht freigegeben
-- ist. Das ist gewollt: sonst waere die Zurueckhaltung selbst eine Aussage.
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
      ) as connected
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

-- Wichtig: `revoke from public` allein genuegt hier nicht. Supabase setzt
-- Default-Privilegien, die neuen Funktionen im Schema public automatisch
-- Ausfuehrungsrecht fuer anon, authenticated und service_role geben. Das ist
-- ein expliziter Grant an anon, kein PUBLIC-Grant, und muss einzeln entzogen
-- werden - sonst haette anon die Funktion aufrufen koennen.
revoke all on function public.get_disclosed_capability(uuid, text) from public;
revoke all on function public.get_disclosed_capability(uuid, text) from anon;
-- Capability erscheint nie auf oeffentlichen Seiten. Die oeffentliche
-- Whitelist wurde feldweise festgelegt, und neue Felder werden nicht
-- automatisch oeffentlich.
grant execute on function public.get_disclosed_capability(uuid, text) to authenticated;

comment on function public.get_disclosed_capability(uuid, text) is
  'Freigegebene Capability-Sicht auf eine andere Person. Nur fuer angemeldete Aufrufer, nie fuer anon. Tiefe erst bei angenommener Verbindung.';

commit;
