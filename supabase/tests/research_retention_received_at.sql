\set ON_ERROR_STOP on

-- Aufbewahrungsfrist nach received_at (Migration 20261124120000).
-- Ein Client-Zeitstempel darf die Frist weder verlängern noch verkürzen.

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','eb111111-1111-4111-8111-111111111111','authenticated','authenticated','retention-probe@example.com','',now(),'{}','{}',now(),now());

select set_config('request.jwt.claims', '{"sub":"eb111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.set_my_research_consent('accepted', 'research_consent_copy_2026-10-14', 'de', 'settings');
reset role;

-- Grenze wie in der Funktion
create temporary table probe_cutoff as
  select date_trunc('day', now()) - interval '30 days' as cutoff;

-- Aufbau und Aufruf als Testbesitzer: Die Funktion ist SECURITY DEFINER, ihre
-- Rechte prüfen die has_function_privilege-Fälle unten getrennt.

-- Research: (Name, received_at, client_occurred_at)
insert into public.research_events (event_name, subject_hash, received_at, client_occurred_at, research_consent_version)
select v.name, encode(extensions.digest(p.research_subject_id::text, 'sha256'), 'hex'), v.received_at, v.client_at, 'research_consent_v1'
from public.research_consent_preferences p
cross join (
  select 'retention_old'::text as name, (select cutoff from probe_cutoff) - interval '1 day' as received_at, null::timestamptz as client_at
  union all select 'retention_fresh', now(), null
  union all select 'retention_old_future_client', (select cutoff from probe_cutoff) - interval '1 day', now() + interval '10 years'
  union all select 'retention_fresh_past_client', now(), now() - interval '10 years'
  union all select 'retention_at_cutoff', (select cutoff from probe_cutoff), null
) v
where p.user_id = 'eb111111-1111-4111-8111-111111111111';

insert into public.product_analytics_events (event_name, received_at, client_occurred_at)
values
  ('retention_old', (select cutoff from probe_cutoff) - interval '1 day', null),
  ('retention_fresh', now(), null),
  ('retention_old_future_client', (select cutoff from probe_cutoff) - interval '1 day', now() + interval '10 years'),
  ('retention_fresh_past_client', now(), now() - interval '10 years'),
  ('retention_at_cutoff', (select cutoff from probe_cutoff), null);

-- Erwartete Zählwerte über alle Zeilen (die lokale DB kann ältere Zeilen enthalten)
create temporary table probe_expected as
  select
    (select count(*) from public.research_events where received_at < (select cutoff from probe_cutoff))::integer as research,
    (select count(*) from public.product_analytics_events where received_at < (select cutoff from probe_cutoff))::integer as product;

create temporary table probe_result as select public.purge_old_research_events(30) as result;

select extensions.is(
  (select array_agg(key order by key) from probe_result, jsonb_object_keys(result) key),
  array['cutoff', 'deletedProductAnalyticsEvents', 'deletedResearchEvents', 'retentionDays'],
  'Rückgabeformat unverändert'
);
select extensions.is((select (result ->> 'retentionDays')::integer from probe_result), 30, 'retentionDays = 30');
select extensions.is(
  (select (result ->> 'deletedResearchEvents')::integer from probe_result),
  (select research from probe_expected),
  'Research-Zählwert = Zeilen mit received_at vor der Grenze'
);
select extensions.is(
  (select (result ->> 'deletedProductAnalyticsEvents')::integer from probe_result),
  (select product from probe_expected),
  'Produkt-Zählwert = Zeilen mit received_at vor der Grenze'
);

select extensions.ok(not exists(select 1 from public.research_events where event_name = 'retention_old'), 'research: received_at vor der Grenze wird gelöscht');
select extensions.ok(exists(select 1 from public.research_events where event_name = 'retention_fresh'), 'research: frisches received_at bleibt');
select extensions.ok(not exists(select 1 from public.research_events where event_name = 'retention_old_future_client'), 'research: Client-Zeit in der Zukunft verlängert die Frist nicht');
select extensions.ok(exists(select 1 from public.research_events where event_name = 'retention_fresh_past_client'), 'research: Client-Zeit weit zurück löscht nicht vorzeitig');
select extensions.ok(exists(select 1 from public.research_events where event_name = 'retention_at_cutoff'), 'research: genau auf der Grenze bleibt (strikt kleiner)');

select extensions.ok(not exists(select 1 from public.product_analytics_events where event_name = 'retention_old'), 'produkt: received_at vor der Grenze wird gelöscht');
select extensions.ok(exists(select 1 from public.product_analytics_events where event_name = 'retention_fresh'), 'produkt: frisches received_at bleibt');
select extensions.ok(not exists(select 1 from public.product_analytics_events where event_name = 'retention_old_future_client'), 'produkt: Client-Zeit in der Zukunft verlängert die Frist nicht');
select extensions.ok(exists(select 1 from public.product_analytics_events where event_name = 'retention_fresh_past_client'), 'produkt: Client-Zeit weit zurück löscht nicht vorzeitig');

select extensions.ok(
  not has_function_privilege('anon', 'public.purge_old_research_events(integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.purge_old_research_events(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.cleanup_expired_event_data()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.cleanup_expired_event_data()', 'EXECUTE'),
  'anon und authenticated dürfen keine der beiden Löschfunktionen ausführen'
);
select extensions.ok(
  has_function_privilege('service_role', 'public.purge_old_research_events(integer)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.cleanup_expired_event_data()', 'EXECUTE'),
  'service_role darf beide Löschfunktionen ausführen'
);
select extensions.ok(
  (select prosecdef and proconfig @> array['search_path=public']
   from pg_proc where oid = 'public.purge_old_research_events(integer)'::regprocedure),
  'SECURITY DEFINER mit search_path = public bleibt'
);

select * from extensions.finish();
rollback;
