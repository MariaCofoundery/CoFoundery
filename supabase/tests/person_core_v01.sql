\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

-- ---------------------------------------------------------------------------
-- 1. Struktur: der Kern impliziert nichts
-- ---------------------------------------------------------------------------
select extensions.has_table('public', 'person_core', 'person_core existiert');

select extensions.col_is_null('public', 'person_core', 'display_name',
  'display_name ist nullable - leer heisst leer');
select extensions.col_hasnt_default('public', 'person_core', 'display_name',
  'display_name hat keinen inhaltlichen Default');
select extensions.col_hasnt_default('public', 'person_core', 'expertise',
  'expertise hat keinen Default - kein leeres Array als Sentinel wie in den Quelltabellen');

-- Keine Spalte darf eine Rolle, einen Typ oder eine Veroeffentlichung andeuten.
-- Das ist die Lehre aus profiles.roles default '{founder}'.
select extensions.hasnt_column('public', 'person_core', 'roles',
  'kein roles im Kern - Produktrollen bleiben in profiles');
select extensions.hasnt_column('public', 'person_core', 'status',
  'kein status im Kern - Status gehoert in die Publikationszeilen');
select extensions.hasnt_column('public', 'person_core', 'visibility',
  'keine visibility im Kern - Sichtbarkeit gehoert in die Publikationszeilen');

-- ---------------------------------------------------------------------------
-- 2. Trigger: jeder registrierte Mensch bekommt eine Zeile
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','fc000000-0000-4000-8000-000000000001','authenticated','authenticated','core-a@example.com','',now(),'{}','{"full_name":"Aus Auth Geraten"}',now(),now());

select extensions.is((select count(*)::int from public.person_core where user_id='fc000000-0000-4000-8000-000000000001'),
  1, 'Trigger legt die Kernzeile beim Signup an');
select extensions.ok((select display_name is null from public.person_core where user_id='fc000000-0000-4000-8000-000000000001'),
  'die neue Kernzeile ist leer - nichts aus raw_user_meta_data uebernommen');

-- ---------------------------------------------------------------------------
-- 3. Constraints
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$update public.person_core set display_name = repeat('x', 81) where user_id='fc000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'display_name ueber 80 Zeichen wird abgewiesen');
select extensions.throws_ok(
  $$update public.person_core set remote_mode = 'irgendwas' where user_id='fc000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'unbekannter remote_mode wird abgewiesen');

-- ---------------------------------------------------------------------------
-- 4. Backfill-Logik
--
-- Spiegelt die Anweisung aus 20260907120000_create_person_core_v01.sql. Die
-- Migration laeuft genau einmal und aendert sich danach nicht mehr; dieser
-- Test haelt fest, was sie zum Zeitpunkt der Anwendung getan hat.
--
-- Der kritische Fall: founder_discovery_profiles und network_profiles
-- deklarieren display_name/headline/bio als `not null default ''` und
-- expertise/industries als `not null default '{}'`. Leer darf NICHT als
-- Eingabe zaehlen, sonst ueberschreibt ein leeres, aber kuerzlich angelegtes
-- Profil einen echten Namen.
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','fc000000-0000-4000-8000-000000000002','authenticated','authenticated','core-b@example.com','',now(),'{}','{}',now(),now());

-- Basisprofil: echter Name, aelter.
insert into public.profiles(user_id, display_name, headline, roles, created_at, updated_at) values
('fc000000-0000-4000-8000-000000000002','Echter Name','Echte Headline',array['founder'], now() - interval '10 days', now() - interval '10 days');

-- Connect-Profil: neuer, aber komplett leer (Default-Zustand).
-- Die Mitgliedschaft hat der Trigger ensure_network_membership_after_profile_role
-- beim profiles-Insert oben schon angelegt, weil roles 'founder' enthaelt.
insert into public.network_memberships(user_id, status) values ('fc000000-0000-4000-8000-000000000002','active')
on conflict (user_id) do nothing;
insert into public.network_profiles(user_id, created_at, updated_at) values
('fc000000-0000-4000-8000-000000000002', now(), now());

-- Discovery-Profil: mittleres Alter, echte Bio und Expertise, remote_mode
-- steht auf dem Default 'flexible'.
insert into public.founder_discovery_profiles(user_id, bio, expertise, industries, location_region, remote_mode, created_at, updated_at) values
('fc000000-0000-4000-8000-000000000002','Eine echte Biografie aus dem Discovery-Profil.',array['Product'],array['SaaS'],'Berlin','flexible', now() - interval '5 days', now() - interval '5 days');

-- Seit Phase 2 (20260907140000) halten Trigger den Kern bei jeder Schreibung
-- in eine Kontextzeile aktuell. Die Inserts oben haben deshalb schon
-- synchronisiert, unter anderem die Discovery-Bio.
--
-- In Produktion lief der Backfill, bevor diese Trigger existierten. Damit hier
-- weiterhin die BACKFILL-Anweisung geprueft wird und nicht der Sync, wird bio
-- vor dem Backfill zurueckgesetzt. Die Assertion danach zeigt dann, dass der
-- Backfill selbst bio nicht setzt - genau die Entscheidung aus Phase 1.
update public.person_core set bio = null where user_id='fc000000-0000-4000-8000-000000000002';

with quellen as (
  select profile.user_id,
         nullif(btrim(profile.display_name), '') as display_name,
         nullif(btrim(profile.headline), '') as headline,
         null::text as bio, null::text as location_region,
         null::text as remote_mode_signal, null::text as remote_mode_fallback,
         null::text[] as expertise, null::text[] as industries,
         profile.updated_at
  from public.profiles profile
  union all
  select discovery.user_id,
         nullif(btrim(discovery.display_name), ''), nullif(btrim(discovery.headline), ''),
         nullif(btrim(discovery.bio), ''), nullif(btrim(discovery.location_region), ''),
         null::text, discovery.remote_mode,
         case when cardinality(discovery.expertise) > 0 then discovery.expertise end,
         case when cardinality(discovery.industries) > 0 then discovery.industries end,
         discovery.updated_at
  from public.founder_discovery_profiles discovery
  union all
  select connect.user_id,
         nullif(btrim(connect.display_name), ''), nullif(btrim(connect.headline), ''),
         nullif(btrim(connect.bio), ''), nullif(btrim(connect.location_region), ''),
         connect.remote_mode, null::text,
         case when cardinality(connect.expertise) > 0 then connect.expertise end,
         case when cardinality(connect.industries) > 0 then connect.industries end,
         connect.updated_at
  from public.network_profiles connect
)
update public.person_core core
set display_name = (
      select quelle.display_name from quellen quelle
      where quelle.user_id = core.user_id and quelle.display_name is not null
      order by quelle.updated_at desc limit 1),
    headline = (
      select quelle.headline from quellen quelle
      where quelle.user_id = core.user_id and quelle.headline is not null
      order by quelle.updated_at desc limit 1),
    -- bio bewusst ausgelassen, siehe Migration
    location_region = (
      select quelle.location_region from quellen quelle
      where quelle.user_id = core.user_id and quelle.location_region is not null
      order by quelle.updated_at desc limit 1),
    remote_mode = coalesce(
      (select quelle.remote_mode_signal from quellen quelle
       where quelle.user_id = core.user_id and quelle.remote_mode_signal is not null
       order by quelle.updated_at desc limit 1),
      (select quelle.remote_mode_fallback from quellen quelle
       where quelle.user_id = core.user_id and quelle.remote_mode_fallback is not null
       order by quelle.updated_at desc limit 1)),
    expertise = (
      select quelle.expertise from quellen quelle
      where quelle.user_id = core.user_id and quelle.expertise is not null
      order by quelle.updated_at desc limit 1),
    industries = (
      select quelle.industries from quellen quelle
      where quelle.user_id = core.user_id and quelle.industries is not null
      order by quelle.updated_at desc limit 1)
where exists (select 1 from quellen quelle where quelle.user_id = core.user_id);

select extensions.is((select display_name from public.person_core where user_id='fc000000-0000-4000-8000-000000000002'),
  'Echter Name', 'leeres neueres Connect-Profil ueberschreibt den echten Namen NICHT');
select extensions.is((select headline from public.person_core where user_id='fc000000-0000-4000-8000-000000000002'),
  'Echte Headline', 'dasselbe fuer die Headline');
select extensions.ok((select bio is null from public.person_core where user_id='fc000000-0000-4000-8000-000000000002'),
  'bio bleibt leer - Bestandstexte aus der Testphase werden nicht uebernommen');
select extensions.is((select bio from public.founder_discovery_profiles where user_id='fc000000-0000-4000-8000-000000000002'),
  'Eine echte Biografie aus dem Discovery-Profil.', 'die Quell-Bio bleibt erhalten und ist nachtraeglich uebernehmbar');
select extensions.is((select expertise from public.person_core where user_id='fc000000-0000-4000-8000-000000000002'),
  array['Product'], 'leeres Connect-Array ueberschreibt echte Expertise NICHT');
select extensions.is((select remote_mode from public.person_core where user_id='fc000000-0000-4000-8000-000000000002'),
  'flexible', 'ohne Connect-Signal greift der Discovery-Rueckfall');

-- Sobald Connect einen echten remote_mode hat, gewinnt er - auch wenn
-- Discovery neuer ist, weil der Discovery-Wert ein Default sein kann.
update public.network_profiles set remote_mode = 'onsite', updated_at = now() - interval '9 days'
where user_id='fc000000-0000-4000-8000-000000000002';
select extensions.is(
  (select coalesce(
     (select connect.remote_mode from public.network_profiles connect
      where connect.user_id='fc000000-0000-4000-8000-000000000002' and connect.remote_mode is not null),
     (select discovery.remote_mode from public.founder_discovery_profiles discovery
      where discovery.user_id='fc000000-0000-4000-8000-000000000002'))),
  'onsite', 'Connect-remote_mode schlaegt den Discovery-Default trotz aelterem Zeitstempel');

-- ---------------------------------------------------------------------------
-- 5. RLS: in Phase 1 liest niemand ausser dem Eigentuemer
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"fc000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_core),
  1, 'Eigentuemer sieht ausschliesslich die eigene Kernzeile');
select extensions.is((select count(*)::int from public.person_core where user_id='fc000000-0000-4000-8000-000000000001'),
  0, 'fremde Kernzeile ist nicht lesbar');
reset role;

set local role anon;
select extensions.throws_ok($$select count(*) from public.person_core$$,
  '42501', null, 'anon kann den Kern nicht lesen');
reset role;

-- ---------------------------------------------------------------------------
-- 6. Lebenszyklus
-- ---------------------------------------------------------------------------
delete from auth.users where id='fc000000-0000-4000-8000-000000000001';
select extensions.is((select count(*)::int from public.person_core where user_id='fc000000-0000-4000-8000-000000000001'),
  0, 'Kontoloeschung entfernt die Kernzeile');

select * from extensions.finish();
rollback;
