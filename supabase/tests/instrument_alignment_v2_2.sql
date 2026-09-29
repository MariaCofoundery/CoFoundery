\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

select extensions.is(
  (select status from public.instruments where id = 'founder-alignment-v2-2'),
  'draft',
  'v2.2 existiert und wird niemandem vorgelegt');

select extensions.is(
  (select status from public.instruments where id = 'founder-alignment-v2-1'),
  'archived',
  'v2.1 ist archiviert');

select extensions.is(
  (select status from public.instruments where id = 'founder-alignment-v2'),
  'archived',
  'v2 auch');

-- ---------------------------------------------------------------------------
-- Archiviert heisst: noch da
-- ---------------------------------------------------------------------------
--
-- "Weg koennen" heisst nicht geloescht. Die Kennung steht als Fremdschluessel
-- an jeder Antwort; sie zu loeschen wuerde Antworten heimatlos machen.

select extensions.is(
  (select count(*)::int from public.instruments
    where id in ('founder-alignment-v2', 'founder-alignment-v2-1')),
  2,
  'beide Fassungen sind noch da und referenzierbar');

select extensions.is(
  (select count(*)::int from public.instruments where status = 'active'),
  1,
  'genau eine Fassung ist aktiv - zwei waeren die Frage, welche jemand sieht');

select extensions.is(
  (select introduced_at from public.instruments where id = 'founder-alignment-v2-2'),
  null,
  'v2.2 hat noch kein Einfuehrungsdatum, weil es noch niemand gesehen hat');

rollback;
