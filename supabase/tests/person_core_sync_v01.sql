\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- ---------------------------------------------------------------------------
-- Die Identitaet fliesst nur noch in eine Richtung
-- ---------------------------------------------------------------------------
--
-- Diese Datei hielt bis zum 30.09.2026 das Gegenteil fest: dass ein
-- Connect- oder Discovery-Profil seine Identitaet in den Kern zurueckschreibt.
-- Das war in Phase 2 des Profil-Zusammenzugs richtig - damals hatten beide
-- Formulare eigene Identitaetsfelder.
--
-- Heute nehmen beide Formulare die Identitaet AUS dem Kern entgegen, und der
-- Rueckweg hat nur noch Schaden angerichtet: Connect kappte die Bio auf 800
-- Zeichen und schrieb den gekuerzten Wert zurueck. Gemessen wurden 1000 rein
-- und 800 raus. Migration 20261092120000 hat beide Rueck-Trigger entfernt und
-- die Bio-Grenze angeglichen.
--
-- Was diese Datei jetzt festhaelt, ist die Zielarchitektur:
--
--     person_core
--         ↓
--     veroeffentlichte Kopien (network_profiles, founder_discovery_profiles)
--
-- Die Gegenrichtung gibt es nur noch fuer `profiles.display_name`, und nur
-- uebergangsweise - Abschnitt 1.

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','fd000000-0000-4000-8000-000000000001','authenticated','authenticated','sync-a@example.com','',now(),'{}','{}',now(),now());

-- ---------------------------------------------------------------------------
-- 1. Das Basisprofil erreicht den Kern gar nicht mehr
-- ---------------------------------------------------------------------------
--
-- Bis zum 01.10.2026 trug ein Trigger den Namen von `profiles` in den Kern.
-- Er war noetig, weil fuenf Stellen direkt nach `profiles` schrieben. Die
-- schreiben jetzt in den Kern (`features/profile/displayNameWrite.ts`), und
-- Migration 20261093120000 hat den Trigger entfernt.
--
-- Der Kern traegt den Namen hier zuerst, so wie es die Anwendung tut.
insert into public.profiles(user_id, roles) values
('fd000000-0000-4000-8000-000000000001',array['founder']);
update public.person_core set display_name = 'Maria Beispiel'
where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select display_name from public.profiles where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria Beispiel', 'der Kern traegt den Namen ins Basisprofil');

-- Und zurueck geht nichts mehr - weder der Name noch die Headline.
update public.person_core set headline = 'Aus dem Kern'
where user_id='fd000000-0000-4000-8000-000000000001';
update public.profiles set display_name = 'Direkt in profiles', headline = 'Aus dem Basisprofil'
where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria Beispiel', 'ein Schreibvorgang auf profiles erreicht den Kern NICHT mehr');
select extensions.is((select headline from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Aus dem Kern', 'auch die Headline nicht');

-- KEINE SCHLEIFE. Gaebe es sie, waere schon das Update oben mit
-- "stack depth limit exceeded" abgebrochen; dass hier etwas steht, ist der
-- Beweis. Zusaetzlich: Der Kern hat genau einmal geschrieben.
update public.person_core set display_name = 'Maria B.'
where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select display_name from public.profiles where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria B.', 'der Kern ueberschreibt eine direkte Eingabe in profiles beim naechsten Mal');

-- ---------------------------------------------------------------------------
-- 2. Der Kern verteilt weiterhin
-- ---------------------------------------------------------------------------
-- Die Mitgliedschaft entsteht per Trigger aus profiles.roles.
insert into public.network_profiles(user_id) values ('fd000000-0000-4000-8000-000000000001');
insert into public.founder_discovery_profiles(user_id) values ('fd000000-0000-4000-8000-000000000001');

update public.person_core set
  display_name = 'Maria aus dem Kern',
  bio = 'Eine Biografie, die im Kern gepflegt wird.',
  location_region = 'Berlin',
  expertise = array['Product','Sales']
where user_id='fd000000-0000-4000-8000-000000000001';

select extensions.is((select display_name from public.network_profiles where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria aus dem Kern', 'der Kern verteilt weiterhin nach Connect');
select extensions.is((select bio from public.founder_discovery_profiles where user_id='fd000000-0000-4000-8000-000000000001'),
  'Eine Biografie, die im Kern gepflegt wird.', 'der Kern verteilt weiterhin nach FIND');

-- ---------------------------------------------------------------------------
-- 3. Connect schreibt den Kern nicht mehr
-- ---------------------------------------------------------------------------
update public.network_profiles set
  display_name = 'In Connect umbenannt',
  bio = 'Eine Bio, die nur in Connect steht.',
  location_region = 'Hamburg',
  remote_mode = 'onsite',
  expertise = array['Nur Connect']
where user_id='fd000000-0000-4000-8000-000000000001';

select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria aus dem Kern', 'ein Connect-Schreibvorgang aendert den Namen im Kern nicht');
select extensions.is((select bio from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Eine Biografie, die im Kern gepflegt wird.', 'ein Connect-Schreibvorgang aendert die Bio im Kern nicht');
select extensions.is((select location_region from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Berlin', 'ein Connect-Schreibvorgang aendert die Region im Kern nicht');

-- ---------------------------------------------------------------------------
-- 4. FIND schreibt den Kern nicht mehr
-- ---------------------------------------------------------------------------
update public.founder_discovery_profiles set
  display_name = 'In FIND umbenannt',
  bio = 'Eine Bio, die nur in FIND steht.',
  location_region = 'Muenchen'
where user_id='fd000000-0000-4000-8000-000000000001';

select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria aus dem Kern', 'ein FIND-Schreibvorgang aendert den Namen im Kern nicht');
select extensions.is((select bio from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Eine Biografie, die im Kern gepflegt wird.', 'ein FIND-Schreibvorgang aendert die Bio im Kern nicht');

-- ---------------------------------------------------------------------------
-- 5. Die 1200 Zeichen ueberleben
-- ---------------------------------------------------------------------------
--
-- DER GEMESSENE FALL. Vorher: 1200 rein, 800 raus. Connect nimmt jetzt
-- dieselbe Laenge an wie der Kern, und selbst wenn dort etwas kuerzte, kaeme
-- es nicht mehr zurueck.
update public.person_core set bio = repeat('x', 1200)
where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select char_length(bio) from public.network_profiles where user_id='fd000000-0000-4000-8000-000000000001'),
  1200, 'Connect nimmt eine 1200-Zeichen-Bio an');

update public.network_profiles set headline = 'Irgendetwas anderes'
where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select char_length(bio) from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  1200, 'nach einem Connect-Schreibvorgang steht die Bio im Kern unveraendert');

-- ---------------------------------------------------------------------------
-- 6. Sichtbarkeit bleibt unveraendert
-- ---------------------------------------------------------------------------
set local role anon;
select extensions.throws_ok($$select count(*) from public.person_core$$,
  '42501', null, 'anon kann den Kern weiterhin nicht lesen');
reset role;

select * from extensions.finish();
rollback;
