\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','fd000000-0000-4000-8000-000000000001','authenticated','authenticated','sync-a@example.com','',now(),'{}','{}',now(),now());

-- ---------------------------------------------------------------------------
-- 1. Basisprofil -> Kern
-- ---------------------------------------------------------------------------
insert into public.profiles(user_id, display_name, roles) values
('fd000000-0000-4000-8000-000000000001','Maria Beispiel',array['founder']);
select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria Beispiel', 'Basisprofil-Insert wandert in den Kern');

update public.profiles set headline = 'Product Strategist' where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select headline from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Product Strategist', 'Basisprofil-Update wandert in den Kern');
select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria Beispiel', 'ein Update an einem anderen Feld laesst den Namen unberuehrt');

-- ---------------------------------------------------------------------------
-- 2. Leer gilt nicht als Eingabe
-- ---------------------------------------------------------------------------
-- Die Mitgliedschaft entsteht per Trigger aus profiles.roles.
insert into public.network_profiles(user_id) values ('fd000000-0000-4000-8000-000000000001');
select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria Beispiel', 'leeres Connect-Profil ueberschreibt den echten Namen NICHT');
select extensions.ok((select expertise is null from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'leeres Array aus dem Connect-Profil landet nicht im Kern');

update public.profiles set display_name = '   ' where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria Beispiel', 'ein auf Leerzeichen gesetzter Name ueberschreibt den Kern NICHT');

-- ---------------------------------------------------------------------------
-- 3. Echte Werte aus dem Connect-Profil
-- ---------------------------------------------------------------------------
update public.network_profiles
set display_name = 'Maria B.', expertise = array['Product','Sales'], remote_mode = 'hybrid'
where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select display_name from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Maria B.', 'echter Name aus dem Connect-Profil gewinnt als letzte Schreibung');
select extensions.is((select expertise from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  array['Product','Sales'], 'Expertise wandert in den Kern');
select extensions.is((select remote_mode from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'hybrid', 'Connect-remote_mode wandert in den Kern');

-- ---------------------------------------------------------------------------
-- 4. Discovery: remote_mode wandert bewusst nicht
-- ---------------------------------------------------------------------------
insert into public.founder_discovery_profiles(user_id, bio, location_region, remote_mode) values
('fd000000-0000-4000-8000-000000000001','Eine Biografie aus dem Discovery-Profil.','Berlin','onsite');
select extensions.is((select bio from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Eine Biografie aus dem Discovery-Profil.', 'Discovery-Bio wandert in den Kern');
select extensions.is((select location_region from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'Berlin', 'Discovery-Region wandert in den Kern');
select extensions.is((select remote_mode from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  'hybrid', 'Discovery-remote_mode wandert NICHT - der Default dort ist nicht von einer Wahl unterscheidbar');

-- ---------------------------------------------------------------------------
-- 5. Kein Feldwechsel, keine Schreibung
-- ---------------------------------------------------------------------------
-- Ein Update, das nur ein nicht synchronisiertes Feld anfasst, darf den Kern
-- nicht beruehren. Geprueft ueber updated_at, das der Kern-Trigger sonst setzt.
select set_config('test.core_updated_at',
  (select updated_at::text from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'), true);
update public.founder_discovery_profiles set availability_hours_per_week = 30
where user_id='fd000000-0000-4000-8000-000000000001';
select extensions.is((select updated_at::text from public.person_core where user_id='fd000000-0000-4000-8000-000000000001'),
  current_setting('test.core_updated_at'), 'ein Update ohne synchronisierte Feldaenderung schreibt den Kern nicht');

-- ---------------------------------------------------------------------------
-- 6. Sichtbarkeit bleibt unveraendert
-- ---------------------------------------------------------------------------
set local role anon;
select extensions.throws_ok($$select count(*) from public.person_core$$,
  '42501', null, 'anon kann den Kern weiterhin nicht lesen');
reset role;

select * from extensions.finish();
rollback;
