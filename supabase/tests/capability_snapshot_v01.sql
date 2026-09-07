\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(23);

-- ---------------------------------------------------------------------------
-- 1. Vokabular: die Zahlen aus dem Brief
-- ---------------------------------------------------------------------------
select extensions.is((select count(*)::int from public.capability_families where family_id <> 'other'),
  8, 'acht Funktionsfamilien');
select extensions.is((select count(*)::int from public.capability_areas where family_id <> 'other'),
  42, '42 Bereiche');
select extensions.ok((select min(anzahl) >= 4 and max(anzahl) <= 7 from (
    select count(*) as anzahl from public.capability_areas
    where family_id <> 'other' group by family_id) pro_familie),
  'vier bis sieben Bereiche pro Familie');
select extensions.is((select count(*)::int from public.capability_areas where area_id = 'other'),
  1, 'ein globaler Auffangwert, nicht einer pro Familie');

-- Jeder Bereich haengt an einer existierenden Familie; der Fremdschluessel
-- macht ein verwaistes Vokabular unmoeglich.
select extensions.throws_ok(
  $$insert into public.capability_areas(area_id, family_id, sort_order) values ('erfunden','gibt_es_nicht',99)$$,
  '23503', null, 'ein Bereich ohne existierende Familie wird abgewiesen');

-- ---------------------------------------------------------------------------
-- 2. Eintraege
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','fe000000-0000-4000-8000-000000000001','authenticated','authenticated','cap-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','fe000000-0000-4000-8000-000000000002','authenticated','authenticated','cap-b@example.com','',now(),'{}','{}',now(),now());

-- person_core entsteht per Trigger; der Eintrag haengt daran.
select extensions.is((select count(*)::int from public.person_core where user_id='fe000000-0000-4000-8000-000000000001'),
  1, 'Kernzeile existiert als Voraussetzung fuer Eintraege');

insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish) values
('fe000000-0000-4000-8000-000000000001','b2b_sales',4,'prefer_other');
select extensions.is((select application_level from public.person_capability_entries
  where user_id='fe000000-0000-4000-8000-000000000001' and area_id='b2b_sales'),
  4::smallint, 'Eintrag mit Stufe und Ownership-Wunsch');

-- CAN ist nicht WANT TO OWN: hohe Stufe plus prefer_other muss zulaessig sein.
select extensions.is((select ownership_wish from public.person_capability_entries
  where user_id='fe000000-0000-4000-8000-000000000001' and area_id='b2b_sales'),
  'prefer_other', 'viel Erfahrung und trotzdem kein Ownership-Wunsch ist ein gueltiger Zustand');

-- Leer heisst leer, nicht Stufe 0.
insert into public.person_capability_entries(user_id, area_id) values
('fe000000-0000-4000-8000-000000000001','product_management');
select extensions.ok((select application_level is null and ownership_wish is null
  from public.person_capability_entries
  where user_id='fe000000-0000-4000-8000-000000000001' and area_id='product_management'),
  'ein gewaehlter Bereich ohne Einstufung bleibt leer');

select extensions.throws_ok(
  $$insert into public.person_capability_entries(user_id, area_id, application_level) values ('fe000000-0000-4000-8000-000000000002','ux_design',0)$$,
  '23514', null, 'Stufe 0 wird abgewiesen - es gibt fuenf Stufen ab 1');
select extensions.throws_ok(
  $$insert into public.person_capability_entries(user_id, area_id, application_level) values ('fe000000-0000-4000-8000-000000000002','ux_design',6)$$,
  '23514', null, 'Stufe 6 wird abgewiesen');
select extensions.throws_ok(
  $$insert into public.person_capability_entries(user_id, area_id, ownership_wish) values ('fe000000-0000-4000-8000-000000000002','ux_design','vielleicht')$$,
  '23514', null, 'unbekannter Ownership-Wunsch wird abgewiesen');
select extensions.throws_ok(
  $$insert into public.person_capability_entries(user_id, area_id) values ('fe000000-0000-4000-8000-000000000002','gibt_es_nicht')$$,
  '23503', null, 'unbekannter Bereich wird abgewiesen');
select extensions.throws_ok(
  $$insert into public.person_capability_entries(user_id, area_id) values ('fe000000-0000-4000-8000-000000000001','b2b_sales')$$,
  '23505', null, 'ein Bereich kann pro Person nur einmal belegt werden');

-- ---------------------------------------------------------------------------
-- 3. Beleg
-- ---------------------------------------------------------------------------
insert into public.person_capability_evidence(entry_id, narrative)
select id, 'Ersten Enterprise-Kunden von der ersten Mail bis zum Vertrag begleitet.'
from public.person_capability_entries
where user_id='fe000000-0000-4000-8000-000000000001' and area_id='b2b_sales';
select extensions.is((select count(*)::int from public.person_capability_evidence), 1, 'Beleg haengt am Eintrag');

select extensions.throws_ok(
  $$insert into public.person_capability_evidence(entry_id, narrative)
    select id, 'zu kurz' from public.person_capability_entries
    where user_id='fe000000-0000-4000-8000-000000000001' and area_id='b2b_sales'$$,
  '23514', null, 'ein zu kurzer Beleg wird abgewiesen');

-- ---------------------------------------------------------------------------
-- 4. Sichtbarkeit
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"fe000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_capability_entries),
  2, 'Eigentuemer sieht die eigenen Eintraege');
select extensions.is((select count(*)::int from public.capability_areas), 43,
  'das Vokabular ist fuer Mitglieder lesbar');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"fe000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_capability_entries),
  0, 'fremde Eintraege sind nicht lesbar');
select extensions.is((select count(*)::int from public.person_capability_evidence),
  0, 'fremde Belege sind nicht lesbar');
reset role;

set local role anon;
select extensions.throws_ok($$select count(*) from public.person_capability_entries$$,
  '42501', null, 'anon kann Eintraege nicht lesen');
select extensions.throws_ok($$select count(*) from public.capability_areas$$,
  '42501', null, 'anon kann nicht einmal das Vokabular lesen');
reset role;

-- ---------------------------------------------------------------------------
-- 5. Lebenszyklus
-- ---------------------------------------------------------------------------
delete from auth.users where id='fe000000-0000-4000-8000-000000000001';
select extensions.is((select count(*)::int from public.person_capability_evidence), 0,
  'Kontoloeschung entfernt Eintraege und Belege ueber die Kette auth.users -> person_core -> entry -> evidence');

select * from extensions.finish();
rollback;
