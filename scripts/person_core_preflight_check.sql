-- Preflight fuer 20260907120000_create_person_core_v01.sql
--
-- NUR LESEND. Aendert nichts. Eine einzige Abfrage, damit sie sich im
-- Supabase Studio SQL Editor ausfuehren laesst - dort wird bei mehreren
-- Statements nur das Ergebnis des letzten angezeigt.
--
-- Zweck: sehen, was der Backfill vorfinden wird. Die Migration muss
-- entscheiden, welche Quelle gewinnt, wenn dieselbe Person in mehreren
-- Tabellen unterschiedliche Angaben hat. Stehen alle KONFLIKT-Zeilen auf 0,
-- ist die Aktualitaetslogik im Backfill rein defensiv.
--
-- Es werden absichtlich nur Zaehlwerte ausgegeben, keine Namen oder
-- Profilinhalte.
--
-- Lesart: founder_discovery_profiles und network_profiles deklarieren
-- display_name, headline und bio als `not null default ''` und
-- expertise/industries als `not null default '{}'`. Leer bedeutet dort "nie
-- ausgefuellt", nicht NULL. Diese Abfrage behandelt leer deshalb ueberall als
-- nicht gesetzt - genauso wie der Backfill.

with normalisiert as (
  select p.user_id,
         nullif(btrim(p.display_name), '') as display_name,
         nullif(btrim(p.headline), '')     as headline,
         null::text   as bio,
         null::text   as location_region,
         null::text[] as expertise,
         null::text[] as industries
  from public.profiles p
  union all
  select d.user_id,
         nullif(btrim(d.display_name), ''), nullif(btrim(d.headline), ''),
         nullif(btrim(d.bio), ''),          nullif(btrim(d.location_region), ''),
         case when cardinality(d.expertise)  > 0 then d.expertise  end,
         case when cardinality(d.industries) > 0 then d.industries end
  from public.founder_discovery_profiles d
  union all
  select n.user_id,
         nullif(btrim(n.display_name), ''), nullif(btrim(n.headline), ''),
         nullif(btrim(n.bio), ''),          nullif(btrim(n.location_region), ''),
         case when cardinality(n.expertise)  > 0 then n.expertise  end,
         case when cardinality(n.industries) > 0 then n.industries end
  from public.network_profiles n
),
quellenzahl as (
  select u.id,
      (case when exists (select 1 from public.profiles p                   where p.user_id = u.id) then 1 else 0 end)
    + (case when exists (select 1 from public.founder_discovery_profiles d where d.user_id = u.id) then 1 else 0 end)
    + (case when exists (select 1 from public.network_profiles n           where n.user_id = u.id) then 1 else 0 end) as anzahl
  from auth.users u
)
select  1 as nr, 'registrierte Nutzer (= entstehende Kernzeilen)' as kennzahl, count(*)::text as wert from auth.users
union all select  2, 'davon mit Basisprofil',      count(*)::text from public.profiles
union all select  3, 'davon mit Discovery-Profil', count(*)::text from public.founder_discovery_profiles
union all select  4, 'davon mit Connect-Profil',   count(*)::text from public.network_profiles
union all select  5, 'Nutzer mit mehr als einer Quelle', count(*)::text from quellenzahl where anzahl > 1
union all select  6, 'KONFLIKT display_name', count(*)::text from (
  select user_id from normalisiert where display_name is not null group by user_id having count(distinct display_name) > 1) k
union all select  7, 'KONFLIKT headline', count(*)::text from (
  select user_id from normalisiert where headline is not null group by user_id having count(distinct headline) > 1) k
union all select  8, 'KONFLIKT bio', count(*)::text from (
  select user_id from normalisiert where bio is not null group by user_id having count(distinct bio) > 1) k
union all select  9, 'KONFLIKT location_region', count(*)::text from (
  select user_id from normalisiert where location_region is not null group by user_id having count(distinct location_region) > 1) k
union all select 10, 'KONFLIKT expertise', count(*)::text from (
  select user_id from normalisiert where expertise is not null group by user_id having count(distinct expertise) > 1) k
union all select 11, 'KONFLIKT industries', count(*)::text from (
  select user_id from normalisiert where industries is not null group by user_id having count(distinct industries) > 1) k
union all select 12, 'remote_mode: Connect weicht von Discovery ab', count(*)::text
  from public.network_profiles n
  join public.founder_discovery_profiles d on d.user_id = n.user_id
  where n.remote_mode is not null and n.remote_mode <> d.remote_mode
union all select 13, 'Bios ueber 1200 Zeichen (wuerden gekappt)', count(*)::text from (
  select bio from public.founder_discovery_profiles where char_length(bio) > 1200
  union all
  select bio from public.network_profiles           where char_length(bio) > 1200) z
order by nr;
