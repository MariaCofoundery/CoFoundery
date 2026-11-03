\set ON_ERROR_STOP on
-- 20270303120000: Funktionen ohne Aufrufer sind entfernt; die Kontoloeschung bleibt.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);
select extensions.ok(to_regprocedure('public.ensure_relationship_for_users(uuid,uuid,uuid)') is null,'ensure_relationship_for_users is gone');
select extensions.ok(to_regprocedure('public.block_report_run_modules_mutation()') is null,'block_report_run_modules_mutation is gone');
select extensions.ok(to_regprocedure('public.delete_user_operational_data(uuid,text,text)') is null,'delete_user_operational_data is gone');
select extensions.ok(to_regprocedure('public.discovery_preferences_for_match(uuid,uuid)') is null,'discovery_preferences_for_match is gone');
select extensions.ok(to_regprocedure('public.delete_founder_account_data(uuid)') is not null or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='delete_founder_account_data'),'account deletion stays');
select * from extensions.finish();
rollback;
