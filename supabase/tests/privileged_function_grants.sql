\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

-- Wachhund gegen eine ganze Fehlerklasse, nicht nur gegen die sieben Funde.
--
-- Supabase setzt Default-Privilegien, die jeder neuen Funktion im Schema
-- public automatisch ein explizites Ausfuehrungsrecht fuer anon geben. Ein
-- `revoke ... from public` entfernt das nicht - es trifft nur den
-- PUBLIC-Grant. Wer eine `security definer`-Funktion anlegt und nur gegen
-- PUBLIC revoked, hinterlaesst sie fuer anonyme Aufrufer offen.
--
-- Genau so waren delete_founder_account_data und delete_user_operational_data
-- ohne Anmeldung aufrufbar.

-- ---------------------------------------------------------------------------
-- 1. Die Regel
-- ---------------------------------------------------------------------------
-- Keine security-definer-Funktion ohne Aufruferpruefung darf fuer anon
-- ausfuehrbar sein - ausser den SIEBEN oeffentlichen Projektionen, die genau
-- dafuer gebaut wurden und ihre Bedingungen selbst pruefen.
--
-- DAZUGEKOMMEN AM 21.09.2026: `get_public_network_profile_linkedin`. Sie ist
-- am 19.09.2026 mit den LinkedIn-Adressen entstanden und stand seither in
-- diesem Test - er war rot, und weil `npm run ci:check` keine pgTAP-Tests
-- ausfuehrt, sah es niemand.
--
-- GEPRUEFT UND KEIN LECK: Sie nimmt einen oeffentlichen Slug (keine user_id),
-- verlangt ein oeffentliches, aktives Profil mit aktiver Mitgliedschaft UND
-- zusaetzlich die eigene Entscheidung fuer genau diese Angabe
-- (`linkedin_visibility = 'public'`). Ein oeffentliches Netzwerkprofil zu
-- haben ist keine Zustimmung dazu, den Klarnamen-Lebenslauf daneben zu
-- stellen. Der anon-Grant ist ausdruecklich gesetzt, und die oeffentlichen
-- Netzwerkseiten brauchen ihn.
--
-- Der Wachhund hat also nicht gebellt, weil etwas offen war, sondern weil eine
-- Ausnahme hinzukam, ueber die ein Mensch entscheiden muss. Das ist seine
-- Aufgabe - und deshalb bleibt die Liste eine Liste und wird keine Regel
-- ("alles, was mit public_ anfaengt, darf").
select extensions.is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and pg_get_function_result(p.oid) <> 'trigger'
     and p.proacl::text like '%anon=X%'
     and p.prosrc !~* 'auth\.uid|auth\.role|request\.jwt|service_role'
     and p.proname not in (
       'get_public_network_profile',
       'get_public_network_listing',
       'get_public_network_problem',
       'list_public_network_profile_listings',
       'list_public_network_profile_ventures',
       'list_public_network_sitemap',
       'get_public_network_profile_linkedin'
     )),
  '',
  'keine security-definer-Funktion ohne Aufruferpruefung ist fuer anon ausfuehrbar');

-- ---------------------------------------------------------------------------
-- 1b. Und die Ausnahmen muessen ihre Ausnahme verdienen
-- ---------------------------------------------------------------------------
--
-- Eine Namensliste ist eine Behauptung ("die pruefen sich selbst"). Diese
-- Pruefung macht daraus eine Tatsache: Jede der sieben muss Sichtbarkeit UND
-- Status im eigenen Koerper pruefen. Wer eine davon umschreibt und die
-- Bedingung dabei verliert, faellt hier auf - und nicht erst, wenn eine
-- zurueckgezogene Seite noch Daten herausgibt.
--
-- Dazugekommen am 21.09.2026, zusammen mit der siebten Ausnahme: Eine Liste,
-- die nur laenger wird, ist irgendwann keine Ausnahme mehr, sondern die Regel.
select extensions.is(
  (select coalesce(string_agg(p.proname, ', ' order by p.proname), '')
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in (
       'get_public_network_profile',
       'get_public_network_listing',
       'get_public_network_problem',
       'list_public_network_profile_listings',
       'list_public_network_profile_ventures',
       'list_public_network_sitemap',
       'get_public_network_profile_linkedin'
     )
     and not (p.prosrc like '%visibility = ''public''%' and p.prosrc like '%status = ''active''%')),
  '',
  'jede oeffentliche Projektion prueft Sichtbarkeit und Status selbst');

-- ---------------------------------------------------------------------------
-- 2. Die beiden Loeschfunktionen namentlich
-- ---------------------------------------------------------------------------
-- Sie loeschen Nutzerdaten und nehmen die user_id als Parameter. Fuer sie gilt
-- die Regel besonders, deshalb stehen sie zusaetzlich einzeln hier.
select extensions.ok(
  (select proacl::text not like '%anon=X%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='delete_founder_account_data'),
  'delete_founder_account_data ist fuer anon nicht ausfuehrbar');
select extensions.ok(
  (select proacl::text not like '%authenticated=X%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='delete_founder_account_data'),
  'und auch nicht fuer beliebige angemeldete Nutzer - die Anwendung ruft sie mit der Service-Rolle');
select extensions.ok(
  (select proacl::text not like '%anon=X%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='delete_user_operational_data'),
  'delete_user_operational_data ist fuer anon nicht ausfuehrbar');

-- ---------------------------------------------------------------------------
-- 3. Was absichtlich erreichbar bleibt
-- ---------------------------------------------------------------------------
-- Der Fix darf nicht mehr zumachen als notwendig. Drei RLS-Policies rufen
-- is_matching_session_active_participant auf, und Policies werden mit den
-- Rechten der abfragenden Rolle ausgewertet.
select extensions.ok(
  (select proacl::text like '%authenticated=X%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='is_matching_session_active_participant'),
  'is_matching_session_active_participant bleibt fuer authenticated ausfuehrbar, sonst brechen drei Policies');
select extensions.ok(
  (select proacl::text like '%authenticated=X%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='repair_report_run_payload'),
  'repair_report_run_payload bleibt fuer authenticated ausfuehrbar - so war es vergeben und die Anwendung nutzt es');

select * from extensions.finish();
rollback;
