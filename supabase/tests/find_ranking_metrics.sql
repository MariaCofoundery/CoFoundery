\set ON_ERROR_STOP on

-- FIND Matching v0.1: aggregierte Kennzahlen des Rankingpfads (20261204120000).
-- Nur Tageszähler aus einer festen Liste (Kennzahl, Bucket); keine Personen, IDs, Texte.

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

-- Struktur: genau vier Spalten, nichts Personenbezogenes.
select extensions.is(
  (select array_agg(column_name::text order by ordinal_position) from information_schema.columns
    where table_schema = 'public' and table_name = 'find_ranking_metrics_daily'),
  array['day', 'metric', 'bucket', 'value'],
  'nur Tag, Kennzahl, Bucket, Wert'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.find_ranking_metrics_daily'::regclass),
  'RLS eingeschaltet'
);

-- Zugriff: weder anon noch angemeldete Personen lesen oder schreiben.
select extensions.ok(not has_table_privilege('anon', 'public.find_ranking_metrics_daily', 'select'), 'anon liest nicht');
select extensions.ok(not has_table_privilege('authenticated', 'public.find_ranking_metrics_daily', 'select'), 'authenticated liest nicht');
select extensions.ok(not has_table_privilege('authenticated', 'public.find_ranking_metrics_daily', 'insert'), 'authenticated schreibt nicht');
select extensions.ok(not has_function_privilege('anon', 'public.record_find_ranking_metrics(jsonb)', 'execute'), 'anon ruft die Funktion nicht auf');
select extensions.ok(not has_function_privilege('authenticated', 'public.record_find_ranking_metrics(jsonb)', 'execute'), 'authenticated ruft die Funktion nicht auf');
select extensions.ok(has_function_privilege('service_role', 'public.record_find_ranking_metrics(jsonb)', 'execute'), 'service_role darf schreiben');
select extensions.ok(has_table_privilege('service_role', 'public.find_ranking_metrics_daily', 'select'), 'service_role darf lesen');
select extensions.ok(not has_table_privilege('service_role', 'public.find_ranking_metrics_daily', 'insert'), 'auch service_role schreibt nur über die Funktion');

-- Zähler summieren sich je Tag, Kennzahl und Bucket.
set local role service_role;
select public.record_find_ranking_metrics('[
  {"metric": "requests", "bucket": "all", "value": 1},
  {"metric": "ranking_mode", "bucket": "v01", "value": 1},
  {"metric": "pool_size", "bucket": "sum", "value": 950},
  {"metric": "gate", "bucket": "eligible", "value": 400}
]'::jsonb);
select public.record_find_ranking_metrics('[
  {"metric": "requests", "bucket": "all", "value": 1},
  {"metric": "ranking_mode", "bucket": "legacy", "value": 1},
  {"metric": "fallback", "bucket": "unexpected", "value": 1},
  {"metric": "gate", "bucket": "eligible", "value": 100}
]'::jsonb);
select extensions.is(
  (select value from public.find_ranking_metrics_daily where metric = 'requests' and bucket = 'all' and day = (now() at time zone 'utc')::date),
  2::bigint, 'requests summiert');
select extensions.is(
  (select value from public.find_ranking_metrics_daily where metric = 'gate' and bucket = 'eligible'),
  500::bigint, 'Gate-Zählung summiert');
select extensions.is((select count(*) from public.find_ranking_metrics_daily), 6::bigint, 'eine Zeile je Paar, keine je Anfrage');

-- Alles außerhalb der Liste wird abgelehnt - nichts teilweise geschrieben.
select extensions.throws_ok(
  $$select public.record_find_ranking_metrics('[{"metric": "user", "bucket": "all", "value": 1}]'::jsonb)$$,
  '22023', 'find_ranking_metrics_invalid', 'unbekannte Kennzahl');
select extensions.throws_ok(
  $$select public.record_find_ranking_metrics('[{"metric": "fallback", "bucket": "ab0000000000400080000000000000a1", "value": 1}]'::jsonb)$$,
  '22023', 'find_ranking_metrics_invalid', 'ID-artiger Bucket');
select extensions.throws_ok(
  $$select public.record_find_ranking_metrics('[{"metric": "requests", "bucket": "all", "value": 1, "user_id": "x"}]'::jsonb)$$,
  '22023', 'find_ranking_metrics_invalid', 'zusätzlicher Schlüssel');
select extensions.throws_ok(
  $$select public.record_find_ranking_metrics('[{"metric": "requests", "bucket": "all", "value": -1}]'::jsonb)$$,
  '22023', 'find_ranking_metrics_invalid', 'negativer Wert');
select extensions.throws_ok(
  $$select public.record_find_ranking_metrics('[{"metric": "requests", "bucket": "all", "value": "1"}]'::jsonb)$$,
  '22023', 'find_ranking_metrics_invalid', 'Wert als Text');
select extensions.throws_ok(
  $$select public.record_find_ranking_metrics('{"metric": "requests", "bucket": "all", "value": 1}'::jsonb)$$,
  '22023', 'find_ranking_metrics_invalid', 'kein Array');
select extensions.throws_ok(
  $$select public.record_find_ranking_metrics('[{"metric": "requests", "bucket": "all", "value": 1}, {"metric": "gate", "bucket": "Berlin", "value": 1}]'::jsonb)$$,
  '22023', 'find_ranking_metrics_invalid', 'ein ungültiger Eintrag lehnt den ganzen Aufruf ab');
select extensions.is(
  (select value from public.find_ranking_metrics_daily where metric = 'requests' and bucket = 'all'),
  2::bigint, 'nach abgelehnten Aufrufen unverändert');
reset role;

-- Auch direkt (als Eigentümer) verhindert der Check unbekannte Paare.
select extensions.throws_ok(
  $$insert into public.find_ranking_metrics_daily(day, metric, bucket, value) values (current_date, 'gate', 'person@example.invalid', 1)$$,
  '23514', null, 'Check-Constraint gegen freie Buckets');

select * from extensions.finish();
rollback;
