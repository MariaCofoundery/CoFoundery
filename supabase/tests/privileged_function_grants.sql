\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

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
-- ausfuehrbar sein - ausser den vier oeffentlichen Projektionen, die genau
-- dafuer gebaut wurden und ihre Bedingungen selbst pruefen.
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
       'list_public_network_profile_listings',
       'list_public_network_sitemap'
     )),
  '',
  'keine security-definer-Funktion ohne Aufruferpruefung ist fuer anon ausfuehrbar');

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
