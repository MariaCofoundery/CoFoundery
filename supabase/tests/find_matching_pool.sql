\set ON_ERROR_STOP on

-- FIND Matching v0.1: set-basierter Pool und Eingaben (20261203120000).

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(26);

-- V = betrachtende Founderin. A, W = aktive Founder. P pausiert, D Entwurf.
-- N = Altdaten: aktives Profil ohne Founder-Rolle. X blockiert V, V blockiert Y.
-- W hat private Kriterien, die V ausschliessen wuerden, und Produktfelder.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ab000000-0000-4000-8000-00000000000'||c)::uuid, 'authenticated','authenticated',
       'pool-'||c||'@example.invalid','',now(),'{}','{}',now(),now()
from unnest(array['1','a','b','c','d','e','f','9']) c;

insert into public.profiles(user_id, display_name, roles)
select ('ab000000-0000-4000-8000-00000000000'||c)::uuid, 'Person '||c, array['founder'] from unnest(array['1','a','b','c','d','e','f','9']) c;

insert into public.founder_discovery_profiles(user_id, display_name, headline, bio, own_roles, seeking_roles,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal, status, published_at)
select ('ab000000-0000-4000-8000-00000000000'||c)::uuid, 'Person '||c, 'Headline '||c,
       'Eine ausreichend lange Biografie fuer die Veroeffentlichung.', array['product'], array['tech'],
       20, 'part_time', 'idea_validating', 'venture_scale', case when c = 'd' then 'draft' else 'active' end,
       case when c = 'd' then null else now() end
from unnest(array['1','a','b','c','d','e','f','9']) c;
update public.founder_discovery_profiles set status = 'paused' where user_id = 'ab000000-0000-4000-8000-00000000000c';

alter table public.profiles disable trigger pause_discovery_profile_on_founder_role_removal;
update public.profiles set roles = array['advisor'] where user_id = 'ab000000-0000-4000-8000-00000000000e';
alter table public.profiles enable trigger pause_discovery_profile_on_founder_role_removal;

insert into public.network_blocks(blocker_user_id, blocked_user_id) values
('ab000000-0000-4000-8000-00000000000f','ab000000-0000-4000-8000-000000000001'),
('ab000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000009');

insert into public.founder_search_preferences(user_id, must_haves) values
('ab000000-0000-4000-8000-00000000000b',
 '{"requiredRolesAny":["design"],"minimumAvailabilityHoursPerWeek":40,"requiredIndustriesAny":["Geheimbranche"],"acceptedVentureGoals":["exit_oriented"],"acceptedCommitmentLevels":["full_time"],"acceptedVentureStages":["already_building"],"irgendwas":"x"}');

update public.person_core set capability_matching_allowed = true, capability_disclosure = 'private',
  industries = array['Software'], expertise = array['Vertrieb'], location_region = 'Berlin', remote_mode = 'remote'
where user_id = 'ab000000-0000-4000-8000-00000000000a';
insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish) values
('ab000000-0000-4000-8000-00000000000a','b2b_sales',4,'own'),
('ab000000-0000-4000-8000-00000000000b','b2b_sales',5,'own');

-- angenommenes Intro V-A (fuer has_contact)
insert into public.discovery_intro_requests(requester_user_id, recipient_user_id, status, message)
values ('ab000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-00000000000a','pending','Hallo');
update public.discovery_intro_requests set status = 'accepted', responded_at = now()
where requester_user_id = 'ab000000-0000-4000-8000-000000000001';

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end;
$$;

create function pg_temp.pool_as(viewer uuid) returns jsonb language plpgsql as $$
declare result jsonb;
begin
  perform pg_temp.as_user(viewer);
  set local role authenticated;
  select public.get_find_matching_pool() into result;
  reset role;
  return result;
end;
$$;

create function pg_temp.ids(doc jsonb) returns text[] language sql as $$
  select coalesce(array_agg(c->>'user_id' order by c->>'user_id'), '{}') from jsonb_array_elements(doc->'candidates') c;
$$;

-- ===========================================================================
-- 1. Basispool: nur Produkt-/Access-Gates
-- ===========================================================================
select extensions.is(
  pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')),
  array['ab000000-0000-4000-8000-00000000000a','ab000000-0000-4000-8000-00000000000b'],
  'Pool von V: genau A und W');
select extensions.is(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')->'viewer'->>'user_id',
  'ab000000-0000-4000-8000-000000000001', 'eigene Zeile separat als viewer');
select extensions.ok(not ('ab000000-0000-4000-8000-000000000001' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')))), 'self nie im Pool');
select extensions.ok(not ('ab000000-0000-4000-8000-00000000000c' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')))), 'pausiert nicht im Pool');
select extensions.ok(not ('ab000000-0000-4000-8000-00000000000d' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')))), 'Entwurf nicht im Pool');
select extensions.ok(not ('ab000000-0000-4000-8000-00000000000e' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')))), 'ohne Founder-Rolle nicht im Pool');
select extensions.ok(not ('ab000000-0000-4000-8000-00000000000f' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')))), 'X blockiert V: X nicht in Vs Pool');
select extensions.ok(not ('ab000000-0000-4000-8000-000000000001' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-00000000000f')))), 'X blockiert V: V nicht in Xs Pool');
select extensions.ok(not ('ab000000-0000-4000-8000-000000000009' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')))), 'V blockiert Y: Y nicht in Vs Pool');
select extensions.ok(not ('ab000000-0000-4000-8000-000000000001' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000009')))), 'V blockiert Y: V nicht in Ys Pool');
select extensions.ok('ab000000-0000-4000-8000-00000000000b' = any(pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001'))),
  'private Kriterien von W wirken nicht im Pool (das macht das Gate in der Engine)');

-- ===========================================================================
-- 2. Felder: nur Struktur, keine Namen, keine Kriterien, keine Capability
-- ===========================================================================
select extensions.is(
  (select array_agg(k order by k) from jsonb_object_keys(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')->'candidates'->0) k),
  array['availability_flexibility','availability_hours_per_week','commitment_level','has_contact','own_roles','profile_id',
        'published_at','search_intent','seeking_roles','start_horizon','updated_at','user_id','venture_goal','venture_stage'],
  'nur Strukturfelder');
select extensions.is(
  (select c->>'has_contact' from jsonb_array_elements(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')->'candidates') c
   where c->>'user_id' = 'ab000000-0000-4000-8000-00000000000a'), 'true', 'angenommenes Intro: has_contact');
select extensions.ok(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')::text !~* 'display_name|headline|bio|must_haves|Geheimbranche|b2b_sales|workstyle',
  'keine Namen, Texte, Kriterien, Capability');

-- Betrachter selbst nicht aktiv / kein Founder
select extensions.is(pg_temp.pool_as('ab000000-0000-4000-8000-00000000000c'), null::jsonb, 'pausierte Betrachterin: kein Pool');
select extensions.is(pg_temp.pool_as('ab000000-0000-4000-8000-00000000000e'), null::jsonb, 'Betrachterin ohne Founder-Rolle: kein Pool');

-- ===========================================================================
-- 3. Zugriff
-- ===========================================================================
select pg_temp.as_user('ab000000-0000-4000-8000-000000000001');
set local role authenticated;
select extensions.throws_ok($$select public.get_find_matching_pool_for_viewer('ab000000-0000-4000-8000-00000000000a')$$, '42501', null, 'fremder Pool: nicht fuer Nutzer');
select extensions.throws_ok($$select public.get_find_matching_inputs(array['ab000000-0000-4000-8000-00000000000b']::uuid[])$$, '42501', null, 'Inputs: nicht fuer Nutzer');
select extensions.throws_ok($$select public.find_matching_pool_core('ab000000-0000-4000-8000-00000000000a')$$, '42501', null, 'Kern: nicht direkt aufrufbar');
reset role;
set local role anon;
select extensions.throws_ok($$select public.get_find_matching_pool()$$, '42501', null, 'anon: kein Pool');
reset role;

set local role service_role;
select extensions.is(
  pg_temp.ids(public.get_find_matching_pool_for_viewer('ab000000-0000-4000-8000-000000000001')),
  pg_temp.ids(pg_temp.pool_as('ab000000-0000-4000-8000-000000000001')),
  'Server-Variante liefert denselben Pool wie die Sitzung');

-- ===========================================================================
-- 4. Inputs: nur acht v0.1-Kriterien, Capability nur mit Freigabe
-- ===========================================================================
select extensions.is(
  (select array_agg(k order by k) from jsonb_array_elements(public.get_find_matching_inputs(array['ab000000-0000-4000-8000-00000000000b']::uuid[])) r,
     jsonb_object_keys(r->'must_haves') k),
  array['minimumAvailabilityHoursPerWeek','requiredRolesAny'],
  'Kriterien: nur v0.1-Felder, keine Produktfelder, nichts Unbekanntes');
select extensions.is(
  (select r->'capability_entries' from jsonb_array_elements(public.get_find_matching_inputs(array['ab000000-0000-4000-8000-00000000000b']::uuid[])) r),
  '[]'::jsonb, 'ohne Matching-Freigabe keine Capability-Eintraege');
select extensions.is(
  (select r->'capability_entries' from jsonb_array_elements(public.get_find_matching_inputs(array['ab000000-0000-4000-8000-00000000000a']::uuid[])) r),
  '[{"area_id":"b2b_sales","ownership_wish":"own","application_level":4}]'::jsonb, 'mit Matching-Freigabe: Eintraege');
select extensions.is(
  (select array_agg(k order by k) from jsonb_array_elements(public.get_find_matching_inputs(array['ab000000-0000-4000-8000-00000000000a']::uuid[])) r,
     jsonb_object_keys(r) k),
  array['capability_disclosure','capability_entries','capability_matching_allowed','expertise','industries','location_region','must_haves','remote_mode','user_id'],
  'Inputs: nur Matching-Felder, kein Workstyle, keine Research-Daten, keine Texte');
select extensions.is(
  (select r->'must_haves' from jsonb_array_elements(public.get_find_matching_inputs(array['ab000000-0000-4000-8000-00000000000a']::uuid[])) r),
  'null'::jsonb, 'ohne gespeicherte Kriterien: null (keine erfundenen Defaults)');
reset role;

select * from extensions.finish();
rollback;
