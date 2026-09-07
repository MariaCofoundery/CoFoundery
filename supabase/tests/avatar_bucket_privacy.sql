\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

-- Der avatars-Bucket war oeffentlich: jede hochgeladene Datei ohne Login per
-- Direkt-URL abrufbar. Bestandsdateien wurden nicht verschoben; geschlossen
-- wurde ausschliesslich der anonyme Zugriff.

select extensions.is((select public from storage.buckets where id = 'avatars'),
  false, 'der avatars-Bucket ist nicht mehr oeffentlich');

select extensions.is((select count(*)::int from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_public_read'),
  0, 'die oeffentliche Lese-Policy ist entfernt');

select extensions.is((select count(*)::int from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_authenticated_read'),
  1, 'stattdessen duerfen angemeldete Personen lesen');

select extensions.is((select roles::text from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_authenticated_read'),
  '{authenticated}', 'und ausschliesslich angemeldete - anon ist nicht dabei');

-- Der private Connect-Bucket war von Anfang an richtig und bleibt unberuehrt.
select extensions.is((select public from storage.buckets where id = 'network-profile-images'),
  false, 'der Connect-Bucket bleibt privat');

select * from extensions.finish();
rollback;
