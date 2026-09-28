\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

-- ---------------------------------------------------------------------------
-- Welche Fassung vorgelegt wird - und welche nicht
-- ---------------------------------------------------------------------------

select extensions.is(
  (select status from public.instruments where id = 'founder-alignment-v2-1'),
  'draft',
  'v2.1 existiert und wird niemandem vorgelegt');

select extensions.is(
  (select status from public.instruments where id = 'founder-alignment-v2'),
  'archived',
  'v2 ist archiviert, nicht geloescht - eine Fassung, die es gab, verschwindet nicht');

select extensions.is(
  (select status from public.instruments where id = 'founder-compatibility-v1'),
  'active',
  'v1 bleibt aktiv, bis der Umstieg wirklich stattfindet');

select extensions.is(
  (select count(*)::int from public.instruments where status = 'active'),
  1,
  'genau eine Fassung ist aktiv - zwei waeren die Frage, welche jemand sieht');

-- introduced_at ist ein Datum ueber Menschen, nicht ueber Code: Es sagt, wann
-- jemandem diese Fragen vorgelegt wurden. Solange das nicht geschehen ist,
-- waere ein Eintrag eine Behauptung.
select extensions.is(
  (select introduced_at from public.instruments where id = 'founder-alignment-v2-1'),
  null,
  'v2.1 hat noch kein Einfuehrungsdatum, weil es noch niemand gesehen hat');

rollback;
