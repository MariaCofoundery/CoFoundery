\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

-- ---------------------------------------------------------------------------
-- Welche Fassungen es gibt und welche vorgelegt wird
-- ---------------------------------------------------------------------------
--
-- Seit dem 29.09.2026 sind es zwei: Das Arbeitsprofil gehoert zur Person, das
-- Venture-Alignment zu einem Vorhaben. Beide koennen getrennt wachsen - bisher
-- hiess jede Aenderung an einem Teil eine neue Gesamtfassung.

select extensions.is(
  (select count(*)::int from public.instruments
    where id in ('founder-profile-v1', 'venture-alignment-v1') and status = 'draft'),
  2,
  'beide neuen Fassungen existieren und werden niemandem vorgelegt');

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
-- an jedem Fragebogen; sie zu loeschen wuerde Antworten heimatlos machen.

select extensions.is(
  (select count(*)::int from public.instruments
    where id in ('founder-alignment-v2', 'founder-alignment-v2-1')),
  2,
  'beide alten Fassungen sind noch da und referenzierbar');

select extensions.is(
  (select count(*)::int from public.instruments where status = 'active'),
  1,
  'genau eine Fassung ist aktiv - zwei waeren die Frage, welche jemand sieht');

select extensions.is(
  (select count(*)::int from public.instruments
    where id in ('founder-profile-v1', 'venture-alignment-v1')
      and introduced_at is not null),
  0,
  'keine hat ein Einfuehrungsdatum, weil sie noch niemand gesehen hat');

rollback;
