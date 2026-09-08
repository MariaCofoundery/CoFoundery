\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- A = Zielperson, B = Betrachter mit Verbindung, C = Betrachter ohne Verbindung
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ca000000-0000-4000-8000-00000000000a','authenticated','authenticated','disc-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ca000000-0000-4000-8000-00000000000b','authenticated','authenticated','disc-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ca000000-0000-4000-8000-00000000000c','authenticated','authenticated','disc-c@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id, display_name, roles) values
('ca000000-0000-4000-8000-00000000000a','Ziel A',array['founder']),
('ca000000-0000-4000-8000-00000000000b','Verbunden B',array['founder']),
('ca000000-0000-4000-8000-00000000000c','Fremd C',array['founder']);

-- Aktives Discovery-Profil bei A: Bedingung 1 erfuellt. Der bestehende
-- Vollstaendigkeitscheck verlangt fuer status='active' Name, Headline, je eine
-- eigene und gesuchte Rolle, Verfuegbarkeit sowie gesetzte Phase und Ziel.
insert into public.founder_discovery_profiles(
  user_id, display_name, headline, bio, own_roles, seeking_roles,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal,
  status, published_at
) values (
  'ca000000-0000-4000-8000-00000000000a','Ziel A','Product Strategist',
  'Eine ausreichend lange Biografie fuer die Veroeffentlichung.',
  array['product'], array['tech'], 40, 'full_time', 'idea_validating', 'venture_scale',
  'active', now());

insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish) values
('ca000000-0000-4000-8000-00000000000a','b2b_sales',4,'prefer_other'),
('ca000000-0000-4000-8000-00000000000a','product_management',5,'own');

-- Angenommene Intro-Verbindung nur zwischen A und B
-- responded_at ist bei accepted/declined verpflichtend.
insert into public.discovery_intro_requests(requester_user_id, recipient_user_id, status, responded_at) values
('ca000000-0000-4000-8000-00000000000b','ca000000-0000-4000-8000-00000000000a','accepted',now());

-- ---------------------------------------------------------------------------
-- 1. Default: nichts wird freigegeben
-- ---------------------------------------------------------------------------
select extensions.is((select capability_disclosure from public.person_core where user_id='ca000000-0000-4000-8000-00000000000a'),
  'private', 'die Freigabe steht standardmaessig auf private');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000b","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')),
  0, 'bei private sieht auch eine verbundene Person nichts');
reset role;

-- ---------------------------------------------------------------------------
-- 2. Stufe areas: Bereiche ja, Tiefe nein - fuer alle Mitglieder gleich
-- ---------------------------------------------------------------------------
update public.person_core set capability_disclosure = 'areas'
where user_id='ca000000-0000-4000-8000-00000000000a';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000c","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')),
  2, 'bei areas sieht auch eine unverbundene Person die Bereiche');
select extensions.ok((select bool_and(application_level is null and ownership_wish is null)
  from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')),
  'bei areas bleibt die Tiefe leer');
select extensions.is((select family_id from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery') where area_id='b2b_sales'),
  'commercial_growth', 'die Familie kommt mit, damit die Anzeige gruppieren kann');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000b","role":"authenticated"}',true);
select extensions.ok((select bool_and(application_level is null)
  from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')),
  'auch die verbundene Person sieht bei areas keine Tiefe - die Stufe entscheidet, nicht die Beziehung allein');
reset role;

-- ---------------------------------------------------------------------------
-- 3. Stufe areas_depth_on_contact: Tiefe nur bei angenommener Verbindung
-- ---------------------------------------------------------------------------
update public.person_core set capability_disclosure = 'areas_depth_on_contact'
where user_id='ca000000-0000-4000-8000-00000000000a';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000b","role":"authenticated"}',true);
select extensions.is((select application_level from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery') where area_id='product_management'),
  5::smallint, 'die verbundene Person sieht die Erfahrungsstufe');
select extensions.is((select ownership_wish from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery') where area_id='b2b_sales'),
  'prefer_other', 'und den Verantwortungswunsch - genau die Information, die ein Gespraech braucht');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000c","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')),
  2, 'die unverbundene Person sieht weiterhin die Bereiche');
select extensions.ok((select bool_and(application_level is null and ownership_wish is null)
  from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')),
  'aber keine Tiefe - und kann nicht unterscheiden, ob sie fehlt oder nur nicht freigegeben ist');
reset role;

-- ---------------------------------------------------------------------------
-- 4. Bedingung 1: ohne aktives Kontextprofil nichts
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000b","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','connect')),
  0, 'ohne Connect-Profil gibt der Connect-Kontext nichts zurueck, obwohl Discovery etwas gibt');
reset role;

update public.founder_discovery_profiles set status = 'paused'
where user_id='ca000000-0000-4000-8000-00000000000a';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000b","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')),
  0, 'ein pausiertes Discovery-Profil zeigt nichts, obwohl die Freigabe steht');
reset role;
update public.founder_discovery_profiles set status = 'active'
where user_id='ca000000-0000-4000-8000-00000000000a';

-- ---------------------------------------------------------------------------
-- 5. Anonym und unbekannter Kontext
-- ---------------------------------------------------------------------------
set local role anon;
select extensions.throws_ok(
  $$select * from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','discovery')$$,
  '42501', null, 'anon darf die Funktion nicht ausfuehren - Capability erscheint nie oeffentlich');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-00000000000b","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.get_disclosed_capability('ca000000-0000-4000-8000-00000000000a','irgendwas')),
  0, 'ein unbekannter Kontext gibt nichts zurueck statt alles');
reset role;

-- ---------------------------------------------------------------------------
-- 6. Belege werden nie freigegeben
-- ---------------------------------------------------------------------------
-- Die Rueckgabeform selbst darf keinen Beleg enthalten.
select extensions.ok(
  (select pg_get_function_result(oid) not like '%narrative%'
   from pg_proc where proname = 'get_disclosed_capability'),
  'die Rueckgabe hat kein Belegfeld - Belege gehoeren zur spaeteren Deep Analysis');

select extensions.hasnt_column('public','person_core','capability_evidence_disclosure',
  'es gibt keine getrennte Belegfreigabe - eine Stufe, die niemand waehlen sollte, wird nicht angeboten');

select * from extensions.finish();
rollback;
