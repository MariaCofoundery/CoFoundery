begin;

-- SICHERHEITSFIX.
--
-- Sieben `security definer`-Funktionen ohne Aufruferpruefung waren fuer die
-- Rolle `anon` ausfuehrbar, also ohne jede Anmeldung. Zwei davon loeschen
-- Nutzerdaten.
--
-- Lokal verifiziert: `set local role anon` und dann
-- `select public.delete_founder_account_data('<uuid>')` hat die Profilzeile
-- der Zielperson entfernt. Der Aufruf haette ueber die REST-Schnittstelle mit
-- dem anon-Schluessel genauso funktioniert, weil das Schema `public` in
-- config.toml exponiert ist.
--
-- URSACHE, und sie ist nicht Unachtsamkeit in den alten Migrationen:
-- Die Original-Migrationen haben es korrekt versucht -
--
--     revoke all on function ... from public;
--     grant execute on function ... to service_role;
--
-- Nur entfernt `revoke ... from public` genau den PUBLIC-Grant. Supabase setzt
-- zusaetzlich Default-Privilegien, die jeder neuen Funktion im Schema public
-- automatisch ein EXPLIZITES Ausfuehrungsrecht fuer anon, authenticated und
-- service_role geben. Ein expliziter Grant an eine benannte Rolle wird von
-- einem Revoke gegen PUBLIC nicht beruehrt. Die Absicht war richtig, der
-- Mechanismus unvollstaendig.
--
-- Der Schutz war bisher allein, dass ein Angreifer die user_id kennen muss.
-- Das ist keine Autorisierung, sondern Unauffindbarkeit.

-- ---------------------------------------------------------------------------
-- 1. Ausschliesslich service_role - so war es gemeint
-- ---------------------------------------------------------------------------
-- Die Anwendung ruft delete_founder_account_data mit dem Service-Role-Client
-- auf (features/account/deleteFounderAccount.ts). delete_user_operational_data
-- und die drei Analytics-Funktionen haben keine Aufrufstelle im App-Code.
revoke all on function public.delete_founder_account_data(uuid, text) from anon, authenticated;
revoke all on function public.delete_user_operational_data(uuid, text, text) from anon, authenticated;
revoke all on function public.aggregate_phase1_questionnaire_analytics_for_date(date, integer) from anon, authenticated;
revoke all on function public.run_phase1_daily_analytics(date, integer) from anon, authenticated;
revoke all on function public.schedule_phase1_analytics_jobs(text, text, integer) from anon, authenticated;

grant execute on function public.delete_founder_account_data(uuid, text) to service_role;
grant execute on function public.delete_user_operational_data(uuid, text, text) to service_role;
grant execute on function public.aggregate_phase1_questionnaire_analytics_for_date(date, integer) to service_role;
grant execute on function public.run_phase1_daily_analytics(date, integer) to service_role;
grant execute on function public.schedule_phase1_analytics_jobs(text, text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 2. authenticated behaelt das Recht, anon nicht
-- ---------------------------------------------------------------------------
-- repair_report_run_payload wurde ausdruecklich an authenticated vergeben und
-- hat eine Aufrufstelle in der Anwendung.
revoke all on function public.repair_report_run_payload(uuid, jsonb, public.assessment_module[], uuid[]) from anon;
grant execute on function public.repair_report_run_payload(uuid, jsonb, public.assessment_module[], uuid[]) to authenticated, service_role;

-- is_matching_session_active_participant wird von drei RLS-Policies benutzt
-- (matching_report_runs, matching_workspaces, matching_workspace_agreements).
-- Die Policy wird mit den Rechten der abfragenden Rolle ausgewertet, deshalb
-- braucht authenticated das Ausfuehrungsrecht - ein Entzug wuerde die Policies
-- fuer angemeldete Nutzer brechen.
revoke all on function public.is_matching_session_active_participant(uuid, uuid) from anon;
grant execute on function public.is_matching_session_active_participant(uuid, uuid) to authenticated, service_role;

commit;
