\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ff000000-0000-4000-8000-000000000001','authenticated','authenticated','prop-a@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id, display_name, roles) values
('ff000000-0000-4000-8000-000000000001','Alt Name',array['founder']);
-- Ein aktives Connect-Profil muss network_profiles_active_complete_check
-- erfuellen: Name >= 2, Headline >= 3, Bio >= 20, eine Rolle, published_at.
insert into public.network_profiles(user_id, display_name, headline, bio, expertise, remote_mode, network_roles, status, published_at) values
('ff000000-0000-4000-8000-000000000001','Alt Name','Alte Headline','Alte Biografie im Connect-Profil, lang genug fuer den Vollstaendigkeitscheck.',array['Sales'],'onsite',array['founder'],'active',now());
insert into public.founder_discovery_profiles(user_id, display_name, bio, remote_mode) values
('ff000000-0000-4000-8000-000000000001','Alt Name','Alte Biografie im Discovery-Profil.','flexible');

-- ---------------------------------------------------------------------------
-- 1. Kern -> Kontext
-- ---------------------------------------------------------------------------
update public.person_core set display_name = 'Neuer Name' where user_id='ff000000-0000-4000-8000-000000000001';

select extensions.is((select display_name from public.profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'Neuer Name', 'Kernaenderung erreicht das Basisprofil');
select extensions.is((select display_name from public.network_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'Neuer Name', 'Kernaenderung erreicht das Connect-Profil - das ist es, was andere sehen');
select extensions.is((select display_name from public.founder_discovery_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'Neuer Name', 'Kernaenderung erreicht das Discovery-Profil');

-- ---------------------------------------------------------------------------
-- 2. Leere Kernwerte loeschen nichts
-- ---------------------------------------------------------------------------
-- headline ist im Kern nach dem Insert noch null; die Verteilung oben darf die
-- vorhandene Connect-Headline nicht ausgeloescht haben.
select extensions.is((select headline from public.network_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'Alte Headline', 'ein leeres Kernfeld loescht den Kontextwert nicht');
select extensions.is((select bio from public.founder_discovery_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'Alte Biografie im Discovery-Profil.', 'dasselbe fuer die Bio');

-- Wichtiger Grenzfall: Der Kern ist permissiv, die Veroeffentlichung streng.
-- Wer bei aktivem Connect-Profil die Headline unter die dort geforderte
-- Mindestlaenge kuerzt, bekommt die Aenderung abgewiesen. Das ist gewollt -
-- die Alternative waere ein stiller Widerspruch zwischen Kern und
-- veroeffentlichtem Profil. Die Anwendung muss diesen Fall als eigene
-- Meldung zeigen, nicht als generischen Speicherfehler.
select extensions.throws_ok(
  $$update public.person_core set headline = 'ab' where user_id='ff000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'eine Kernaenderung, die ein aktives Connect-Profil unvollstaendig machen wuerde, wird abgewiesen');
select extensions.is((select remote_mode from public.network_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'onsite', 'ohne Kernwert bleibt remote_mode stehen statt auf einen Default zu fallen');
select extensions.is((select expertise from public.network_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  array['Sales'], 'ein leeres Kern-Array loescht die Kontext-Expertise nicht');

-- ---------------------------------------------------------------------------
-- 3. Veroeffentlichung bleibt unberuehrt
-- ---------------------------------------------------------------------------
select extensions.is((select status from public.network_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'active', 'der Kern aendert den Status nicht');
select extensions.is((select visibility from public.network_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'members_only', 'der Kern aendert die Sichtbarkeit nicht');

-- ---------------------------------------------------------------------------
-- 4. Kein Kreislauf, und beide Richtungen bleiben stimmig
-- ---------------------------------------------------------------------------
-- Der Schleifenschutz greift ueber pg_trigger_depth. Kaeme es zu einer
-- Endlosschleife, wuerde bereits das Update oben mit stack depth exceeded
-- abbrechen; dass die Assertions laufen, ist der Beweis. Zusaetzlich muss die
-- Gegenrichtung weiterhin funktionieren.
update public.network_profiles set headline = 'Headline aus Connect'
where user_id='ff000000-0000-4000-8000-000000000001';
select extensions.is((select headline from public.person_core where user_id='ff000000-0000-4000-8000-000000000001'),
  'Headline aus Connect', 'Kontext -> Kern funktioniert weiterhin');
select extensions.is((select headline from public.founder_discovery_profiles where user_id='ff000000-0000-4000-8000-000000000001'),
  'Alte Headline', 'die Gegenrichtung verteilt nicht weiter - sonst waere der Schleifenschutz umgangen');

-- ---------------------------------------------------------------------------
-- 5. Keine Zeilen aus dem Nichts
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ff000000-0000-4000-8000-000000000002','authenticated','authenticated','prop-b@example.com','',now(),'{}','{}',now(),now());
update public.person_core set display_name = 'Nur Kern' where user_id='ff000000-0000-4000-8000-000000000002';
select extensions.is((select count(*)::int from public.network_profiles where user_id='ff000000-0000-4000-8000-000000000002'),
  0, 'der Kern legt kein Connect-Profil an');
select extensions.is((select count(*)::int from public.founder_discovery_profiles where user_id='ff000000-0000-4000-8000-000000000002'),
  0, 'der Kern legt kein Discovery-Profil an');

select * from extensions.finish();
rollback;
