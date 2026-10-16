\set ON_ERROR_STOP on

-- get_disclosed_capability(..., 'discovery') bei Blockierung (20261201120000).

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

-- A, B, E, C = Founder. A blockiert B, E blockiert A. C ist unbeteiligt.
-- Alle zeigen ihre Bereiche mit Tiefe nach Kontakt; B erlaubt zusätzlich Matching.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('dc000000-0000-4000-8000-00000000000'||c)::uuid, 'authenticated','authenticated',
       'dcap-'||c||'@example.invalid','',now(),'{}','{}',now(),now()
from unnest(array['a','b','c','e']) c;

insert into public.profiles(user_id, display_name, roles)
select ('dc000000-0000-4000-8000-00000000000'||c)::uuid, 'Founder '||c, array['founder'] from unnest(array['a','b','c','e']) c;

insert into public.founder_discovery_profiles(user_id, display_name, headline, bio, own_roles, seeking_roles,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal, status, published_at)
select ('dc000000-0000-4000-8000-00000000000'||c)::uuid, 'Founder '||c, 'Headline '||c,
       'Eine ausreichend lange Biografie fuer die Veroeffentlichung.', array['product'], array['tech'],
       20, 'part_time', 'idea_validating', 'venture_scale', 'active', now()
from unnest(array['a','b','c','e']) c;

-- CONNECT-Profile fuer A und B (Kontext connect)
insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at)
select ('dc000000-0000-4000-8000-00000000000'||c)::uuid, 'Founder '||c, 'Headline '||c,
       'Eine ausreichend lange Biografie fuer das Netzwerk.', array['founder'], 'active', now()
from unnest(array['a','b']) c;

update public.person_core set capability_disclosure = 'areas_depth_on_contact'
where user_id in (select ('dc000000-0000-4000-8000-00000000000'||c)::uuid from unnest(array['a','b','c','e']) c);
update public.person_core set capability_matching_allowed = true where user_id = 'dc000000-0000-4000-8000-00000000000b';

insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish)
select ('dc000000-0000-4000-8000-00000000000'||c)::uuid, 'b2b_sales', 4, 'own' from unnest(array['a','b','e']) c;

-- Verbindungen VOR der Blockierung: angenommenes Intro A-B, gemeinsames Team A-B
insert into public.discovery_intro_requests(requester_user_id, recipient_user_id, status, message)
values ('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','pending','Hallo');
update public.discovery_intro_requests set status = 'accepted', responded_at = now()
where requester_user_id = 'dc000000-0000-4000-8000-00000000000a';
insert into public.founder_teams(id, name, team_context) values ('dc000000-0000-4000-8000-0000000000ab', 'Team AB', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('dc000000-0000-4000-8000-0000000000ab','dc000000-0000-4000-8000-00000000000a'),
('dc000000-0000-4000-8000-0000000000ab','dc000000-0000-4000-8000-00000000000b');

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end;
$$;

-- Ergebnis als JSON, damit "leer" und "Tiefe" vergleichbar sind
create function pg_temp.cap(viewer uuid, target uuid, context text) returns jsonb language plpgsql as $$
declare result jsonb;
begin
  perform pg_temp.as_user(viewer);
  set local role authenticated;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into result from public.get_disclosed_capability(target, context) r;
  reset role;
  return result;
end;
$$;

-- ===========================================================================
-- A) ohne Blockierung
-- ===========================================================================
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','discovery'),
  '[{"area_id":"b2b_sales","family_id":"commercial_growth","application_level":4,"ownership_wish":"own"}]'::jsonb,
  'ohne Blockierung: A sieht B mit Tiefe (Verbindung besteht)');
select extensions.is(jsonb_array_length(pg_temp.cap('dc000000-0000-4000-8000-00000000000c','dc000000-0000-4000-8000-00000000000a','discovery')), 1,
  'ohne Blockierung: C sieht A');
select extensions.is(jsonb_array_length(pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000e','discovery')), 1,
  'ohne Blockierung: A sieht E');

-- Blockierungen setzen
insert into public.network_blocks(blocker_user_id, blocked_user_id) values
('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b'),
('dc000000-0000-4000-8000-00000000000e','dc000000-0000-4000-8000-00000000000a');

-- ===========================================================================
-- B) A blockiert B / C) E blockiert A - beide Richtungen dicht
-- ===========================================================================
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','discovery'), '[]'::jsonb,
  'A blockiert B: A sieht B nicht');
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000b','dc000000-0000-4000-8000-00000000000a','discovery'), '[]'::jsonb,
  'A blockiert B: B sieht A nicht');
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000e','discovery'), '[]'::jsonb,
  'E blockiert A: A sieht E nicht');
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000e','dc000000-0000-4000-8000-00000000000a','discovery'), '[]'::jsonb,
  'E blockiert A: E sieht A nicht');

-- ===========================================================================
-- D) Tiefe + Verbindung, E) Matching-Freigabe - Blockierung gewinnt
-- ===========================================================================
select extensions.ok(
  (select capability_disclosure = 'areas_depth_on_contact' and capability_matching_allowed from public.person_core
   where user_id = 'dc000000-0000-4000-8000-00000000000b'),
  'Vorbedingung: B zeigt Tiefe und erlaubt Matching');
select extensions.ok(
  exists (select 1 from public.discovery_intro_requests where status = 'accepted' and requester_user_id = 'dc000000-0000-4000-8000-00000000000a'),
  'Vorbedingung: angenommene Verbindung A-B besteht weiter');
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','discovery'), '[]'::jsonb,
  'Tiefe, Verbindung und Matching-Freigabe aendern nichts: Blockierung gewinnt');

-- ===========================================================================
-- F) unbeteiligt: weiter gemaess Freigabe (Bereich ja, Tiefe nein ohne Kontakt)
-- ===========================================================================
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000c','dc000000-0000-4000-8000-00000000000b','discovery'),
  '[{"area_id":"b2b_sales","family_id":"commercial_growth","application_level":null,"ownership_wish":null}]'::jsonb,
  'C (unbeteiligt) sieht B weiter gemaess Freigabe');
select extensions.is(jsonb_array_length(pg_temp.cap('dc000000-0000-4000-8000-00000000000c','dc000000-0000-4000-8000-00000000000a','discovery')), 1,
  'C sieht auch A weiter');

-- ===========================================================================
-- I) keine Richtung: blockiert sieht aus wie "keine Capability sichtbar"
-- ===========================================================================
select extensions.is(
  pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','discovery'),
  pg_temp.cap('dc000000-0000-4000-8000-00000000000b','dc000000-0000-4000-8000-00000000000a','discovery'),
  'gleiches Ergebnis fuer Blockierende und Blockierte');
select extensions.is(
  pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','discovery'),
  pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000c','discovery'),
  'gleiches Ergebnis wie bei einer Person ohne Capability-Eintraege');
select pg_temp.as_user('dc000000-0000-4000-8000-00000000000b');
set local role authenticated;
select extensions.lives_ok($$select * from public.get_disclosed_capability('dc000000-0000-4000-8000-00000000000a', 'discovery')$$,
  'kein Fehler, keine Meldung - nur keine Zeilen');
reset role;

-- ===========================================================================
-- G) team unveraendert; H) connect siehe 20261202120000
-- ===========================================================================
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','team'),
  '[{"area_id":"b2b_sales","family_id":"commercial_growth","application_level":4,"ownership_wish":"own"}]'::jsonb,
  'team: unveraendert - das gemeinsame Team ist der Kontext');
-- connect ist seit 20261202120000 ebenfalls dicht (eigene Suite connect_capability_blocking.sql)
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000a','dc000000-0000-4000-8000-00000000000b','connect'), '[]'::jsonb,
  'connect: bei Blockierung ebenfalls keine Capability (20261202120000)');

-- Founder-Rolle des Ziels: wie das FIND-Profil selbst
update public.profiles set roles = array['advisor'] where user_id = 'dc000000-0000-4000-8000-00000000000c';
update public.founder_discovery_profiles set status = 'active' where user_id = 'dc000000-0000-4000-8000-00000000000c';
insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish)
values ('dc000000-0000-4000-8000-00000000000c', 'b2b_sales', 3, 'own');
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000b','dc000000-0000-4000-8000-00000000000c','discovery'), '[]'::jsonb,
  'Ziel ohne Founder-Rolle: keine Capability (wie das FIND-Profil)');

-- Advisor als Betrachter weiter ausgeschlossen (20261128130000)
select extensions.is(pg_temp.cap('dc000000-0000-4000-8000-00000000000c','dc000000-0000-4000-8000-00000000000b','discovery'), '[]'::jsonb,
  'Betrachter ohne Founder-Rolle: weiter keine Capability');

select set_config('request.jwt.claims', '', true);
set local role anon;
select extensions.throws_ok($$select * from public.get_disclosed_capability('dc000000-0000-4000-8000-00000000000b', 'discovery')$$,
  '42501', null, 'anon weiter ausgeschlossen');
reset role;

select * from extensions.finish();
rollback;
