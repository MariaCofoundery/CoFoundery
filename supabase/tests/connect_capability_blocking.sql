\set ON_ERROR_STOP on

-- get_disclosed_capability(..., 'connect') bei Blockierung (20261202120000).

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(19);

-- A, B, C, E: Founder (damit aktive Netzwerk-Mitglieder) mit aktivem Netzwerk- und FIND-Profil.
-- N: angemeldet, kein Mitglied. A blockiert B, E blockiert A. C ist unbeteiligt.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('cc000000-0000-4000-8000-00000000000'||c)::uuid, 'authenticated','authenticated',
       'ccap-'||c||'@example.invalid','',now(),'{}','{}',now(),now()
from unnest(array['a','b','c','e','f']) c;

insert into public.profiles(user_id, display_name, roles)
select ('cc000000-0000-4000-8000-00000000000'||c)::uuid, 'Founder '||c, array['founder'] from unnest(array['a','b','c','e']) c;
insert into public.profiles(user_id, display_name, roles) values ('cc000000-0000-4000-8000-00000000000f', 'Ohne Netzwerk', '{}');

insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at)
select ('cc000000-0000-4000-8000-00000000000'||c)::uuid, 'Founder '||c, 'Headline '||c,
       'Eine ausreichend lange Biografie fuer das Netzwerk.', array['founder'], 'active', now()
from unnest(array['a','b','c','e']) c;

insert into public.founder_discovery_profiles(user_id, display_name, headline, bio, own_roles, seeking_roles,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal, status, published_at)
select ('cc000000-0000-4000-8000-00000000000'||c)::uuid, 'Founder '||c, 'Headline '||c,
       'Eine ausreichend lange Biografie fuer die Veroeffentlichung.', array['product'], array['tech'],
       20, 'part_time', 'idea_validating', 'venture_scale', 'active', now()
from unnest(array['a','b','c','e']) c;

update public.person_core set capability_disclosure = 'areas_depth_on_contact'
where user_id in (select ('cc000000-0000-4000-8000-00000000000'||c)::uuid from unnest(array['a','b','c','e']) c);
update public.person_core set capability_matching_allowed = true where user_id = 'cc000000-0000-4000-8000-00000000000b';

insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish)
select ('cc000000-0000-4000-8000-00000000000'||c)::uuid, 'b2b_sales', 4, 'own' from unnest(array['a','b','e']) c;

-- Verbindung (fuer die Tiefe) und gemeinsames Team VOR der Blockierung
insert into public.discovery_intro_requests(requester_user_id, recipient_user_id, status, message)
values ('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','pending','Hallo');
update public.discovery_intro_requests set status = 'accepted', responded_at = now()
where requester_user_id = 'cc000000-0000-4000-8000-00000000000a';
insert into public.founder_teams(id, name, team_context) values ('cc000000-0000-4000-8000-0000000000ab', 'Team AB', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('cc000000-0000-4000-8000-0000000000ab','cc000000-0000-4000-8000-00000000000a'),
('cc000000-0000-4000-8000-0000000000ab','cc000000-0000-4000-8000-00000000000b');

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end;
$$;

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
-- ohne Blockierung: wie bisher
-- ===========================================================================
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','connect'),
  '[{"area_id":"b2b_sales","family_id":"commercial_growth","application_level":4,"ownership_wish":"own"}]'::jsonb,
  'ohne Blockierung: A sieht B mit Tiefe (Verbindung besteht)');
select extensions.is(jsonb_array_length(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000e','connect')), 1,
  'ohne Blockierung: A sieht E');
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000f','cc000000-0000-4000-8000-00000000000b','connect'), '[]'::jsonb,
  'ohne Mitgliedschaft weiter nichts (unveraendert)');

insert into public.network_blocks(blocker_user_id, blocked_user_id) values
('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b'),
('cc000000-0000-4000-8000-00000000000e','cc000000-0000-4000-8000-00000000000a');

-- ===========================================================================
-- beide Richtungen dicht
-- ===========================================================================
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','connect'), '[]'::jsonb,
  'A blockiert B: A sieht B nicht');
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000b','cc000000-0000-4000-8000-00000000000a','connect'), '[]'::jsonb,
  'A blockiert B: B sieht A nicht');
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000e','connect'), '[]'::jsonb,
  'E blockiert A: A sieht E nicht');
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000e','cc000000-0000-4000-8000-00000000000a','connect'), '[]'::jsonb,
  'E blockiert A: E sieht A nicht');

-- Tiefe + Verbindung + Matching-Freigabe: Blockierung gewinnt
select extensions.ok(
  (select capability_disclosure = 'areas_depth_on_contact' and capability_matching_allowed from public.person_core
   where user_id = 'cc000000-0000-4000-8000-00000000000b'),
  'Vorbedingung: B zeigt Tiefe und erlaubt Matching');
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','connect'), '[]'::jsonb,
  'Tiefe, Verbindung und Matching-Freigabe aendern nichts: Blockierung gewinnt');
update public.person_core set capability_disclosure = 'areas' where user_id = 'cc000000-0000-4000-8000-00000000000b';
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','connect'), '[]'::jsonb,
  'auch bei Freigabestufe areas: Blockierung gewinnt');
update public.person_core set capability_disclosure = 'areas_depth_on_contact' where user_id = 'cc000000-0000-4000-8000-00000000000b';

-- ===========================================================================
-- unbeteiligt: wie bisher
-- ===========================================================================
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000c','cc000000-0000-4000-8000-00000000000b','connect'),
  '[{"area_id":"b2b_sales","family_id":"commercial_growth","application_level":null,"ownership_wish":null}]'::jsonb,
  'C (unbeteiligt) sieht B weiter gemaess Freigabe');
select extensions.is(jsonb_array_length(pg_temp.cap('cc000000-0000-4000-8000-00000000000c','cc000000-0000-4000-8000-00000000000a','connect')), 1,
  'C sieht A weiter');

-- ===========================================================================
-- keine Richtung
-- ===========================================================================
select extensions.is(
  pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','connect'),
  pg_temp.cap('cc000000-0000-4000-8000-00000000000b','cc000000-0000-4000-8000-00000000000a','connect'),
  'gleiches Ergebnis fuer Blockierende und Blockierte');
select extensions.is(
  pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','connect'),
  pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000c','connect'),
  'gleiches Ergebnis wie bei einer Person ohne Capability-Eintraege');
select pg_temp.as_user('cc000000-0000-4000-8000-00000000000b');
set local role authenticated;
select extensions.lives_ok($$select * from public.get_disclosed_capability('cc000000-0000-4000-8000-00000000000a', 'connect')$$,
  'kein Fehler, keine Meldung - nur keine Zeilen');
reset role;

-- ===========================================================================
-- discovery unveraendert dicht, team unveraendert
-- ===========================================================================
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','discovery'), '[]'::jsonb,
  'discovery: bei Blockierung weiter dicht (20261201120000)');
select extensions.is(jsonb_array_length(pg_temp.cap('cc000000-0000-4000-8000-00000000000c','cc000000-0000-4000-8000-00000000000b','discovery')), 1,
  'discovery: unbeteiligt weiter sichtbar');
select extensions.is(pg_temp.cap('cc000000-0000-4000-8000-00000000000a','cc000000-0000-4000-8000-00000000000b','team'),
  '[{"area_id":"b2b_sales","family_id":"commercial_growth","application_level":4,"ownership_wish":"own"}]'::jsonb,
  'team: unveraendert - das gemeinsame Team ist der Kontext');

select set_config('request.jwt.claims', '', true);
set local role anon;
select extensions.throws_ok($$select * from public.get_disclosed_capability('cc000000-0000-4000-8000-00000000000b', 'connect')$$,
  '42501', null, 'anon weiter ausgeschlossen');
reset role;

select * from extensions.finish();
rollback;
