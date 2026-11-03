-- Aufraeumen nach der Inventur vom 03.11.2026: vier Funktionen ohne jeden Aufrufer
-- (App, Skripte, andere Funktionen, Trigger, Policies). Keine Tabelle und keine
-- gespeicherten Daten sind betroffen.
-- - ensure_relationship_for_users: liest public.participants, die seit
--   20260220183046 nicht mehr existiert; jeder Aufruf bricht ab, war aber fuer
--   authenticated/anon ausfuehrbar.
-- - block_report_run_modules_mutation: Triggerfunktion fuer report_run_modules,
--   die Tabelle ist seit 20260220183046 geloescht; ausfuehrbar fuer authenticated/anon.
-- - delete_user_operational_data: Vorlaeufer von delete_founder_account_data, nicht mehr aufgerufen.
-- - discovery_preferences_for_match: FIND nutzt diesen Weg nicht mehr.
begin;
drop function public.ensure_relationship_for_users(uuid,uuid,uuid);
drop function public.block_report_run_modules_mutation();
drop function public.delete_user_operational_data(uuid,text,text);
drop function public.discovery_preferences_for_match(uuid,uuid);
commit;
