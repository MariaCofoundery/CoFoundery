-- Preflight fuer 20260907120000_create_person_core_v01.sql
--
-- NUR LESEND. Aendert nichts. Vor dem Backfill gegen die Ziel-Datenbank
-- ausfuehren, um zu sehen, was der Backfill vorfinden wird.
--
-- Die Migration muss entscheiden, welche Quelle gewinnt, wenn dieselbe Person
-- in mehreren Tabellen unterschiedliche Angaben hat. Diese Abfrage zeigt, ob
-- es solche Konflikte ueberhaupt gibt. Bei null Konflikten ist die
-- Aktualitaetslogik im Backfill rein defensiv und kann nichts falsch machen.
--
-- Es werden absichtlich nur Zaehlwerte ausgegeben, keine Namen oder
-- Profilinhalte.
--
-- Wichtig zur Lesart: founder_discovery_profiles und network_profiles
-- deklarieren display_name, headline und bio als `not null default ''` und
-- expertise/industries als `not null default '{}'`. Leer bedeutet dort "nie
-- ausgefuellt", nicht NULL. Diese Abfrage behandelt leer deshalb ueberall als
-- nicht gesetzt - genauso wie der Backfill.

\set ON_ERROR_STOP on

-- 1. Mengenverhaeltnisse: wie viele Kernzeilen entstehen, und wie viele
--    Nutzer haben ueberhaupt schon irgendein Profil?
select 'registrierte Nutzer (= entstehende Kernzeilen)' as kennzahl, count(*)::text as wert
from auth.users
union all
select 'davon mit profiles-Zeile', count(*)::text from public.profiles
union all
select 'davon mit Discovery-Profil', count(*)::text from public.founder_discovery_profiles
union all
select 'davon mit Connect-Profil', count(*)::text from public.network_profiles
union all
select 'Nutzer ohne jedes Profil (Kernzeile bleibt leer)', count(*)::text
from auth.users users
where not exists (select 1 from public.profiles p where p.user_id = users.id)
  and not exists (select 1 from public.founder_discovery_profiles d where d.user_id = users.id)
  and not exists (select 1 from public.network_profiles n where n.user_id = users.id);

-- 2. Wie viele Nutzer haben mehr als eine Quelle? Nur dort koennen
--    Konflikte auftreten.
with quellenzahl as (
  select users.id,
    (case when exists (select 1 from public.profiles p where p.user_id = users.id) then 1 else 0 end)
  + (case when exists (select 1 from public.founder_discovery_profiles d where d.user_id = users.id) then 1 else 0 end)
  + (case when exists (select 1 from public.network_profiles n where n.user_id = users.id) then 1 else 0 end) as anzahl
  from auth.users users
)
select anzahl as anzahl_quellen, count(*) as nutzer
from quellenzahl
group by anzahl
order by anzahl;

-- 3. Echte Konflikte pro Feld: mehr als ein VERSCHIEDENER nicht-leerer Wert
--    fuer dieselbe Person. Genau diese Faelle entscheidet die
--    Aktualitaetslogik des Backfills.
with normalisiert as (
  select profile.user_id,
         nullif(btrim(profile.display_name), '') as display_name,
         nullif(btrim(profile.headline), '') as headline,
         null::text as bio,
         null::text as location_region,
         null::text[] as expertise,
         null::text[] as industries
  from public.profiles profile
  union all
  select discovery.user_id,
         nullif(btrim(discovery.display_name), ''),
         nullif(btrim(discovery.headline), ''),
         nullif(btrim(discovery.bio), ''),
         nullif(btrim(discovery.location_region), ''),
         case when cardinality(discovery.expertise) > 0 then discovery.expertise end,
         case when cardinality(discovery.industries) > 0 then discovery.industries end
  from public.founder_discovery_profiles discovery
  union all
  select connect.user_id,
         nullif(btrim(connect.display_name), ''),
         nullif(btrim(connect.headline), ''),
         nullif(btrim(connect.bio), ''),
         nullif(btrim(connect.location_region), ''),
         case when cardinality(connect.expertise) > 0 then connect.expertise end,
         case when cardinality(connect.industries) > 0 then connect.industries end
  from public.network_profiles connect
)
select 'display_name' as feld, count(*) as nutzer_mit_konflikt from (
  select user_id from normalisiert where display_name is not null
  group by user_id having count(distinct display_name) > 1) k
union all
select 'headline', count(*) from (
  select user_id from normalisiert where headline is not null
  group by user_id having count(distinct headline) > 1) k
union all
select 'bio', count(*) from (
  select user_id from normalisiert where bio is not null
  group by user_id having count(distinct bio) > 1) k
union all
select 'location_region', count(*) from (
  select user_id from normalisiert where location_region is not null
  group by user_id having count(distinct location_region) > 1) k
union all
select 'expertise', count(*) from (
  select user_id from normalisiert where expertise is not null
  group by user_id having count(distinct expertise) > 1) k
union all
select 'industries', count(*) from (
  select user_id from normalisiert where industries is not null
  group by user_id having count(distinct industries) > 1) k;

-- 4. remote_mode gesondert, weil founder_discovery_profiles hier
--    `not null default 'flexible'` verwendet und eine Wahl dort nicht von
--    einem unberuehrten Default zu unterscheiden ist. Der Backfill bevorzugt
--    deshalb den nullable Connect-Wert. Diese Zahl zeigt, wie oft das
--    ueberhaupt greift.
select 'Nutzer mit Connect-remote_mode UND abweichendem Discovery-Wert' as kennzahl,
       count(*) as nutzer
from public.network_profiles connect
join public.founder_discovery_profiles discovery on discovery.user_id = connect.user_id
where connect.remote_mode is not null
  and connect.remote_mode <> discovery.remote_mode;

-- 5. Werte, die der Kern kappen wuerde: Bio laenger als 1200 Zeichen.
--    Erwartung ist 0, weil beide Quellen strenger sind (1200 bzw. 800).
select 'Bios ueber 1200 Zeichen (wuerden gekappt)' as kennzahl, count(*) as anzahl
from (
  select bio from public.founder_discovery_profiles where char_length(bio) > 1200
  union all
  select bio from public.network_profiles where char_length(bio) > 1200
) zu_lang;
