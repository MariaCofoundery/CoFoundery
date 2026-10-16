\set ON_ERROR_STOP on

-- FIND: Founder-Rolle und Blockierung (20261130120000).

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(39);

-- A = betrachtende Founderin, B = Founder, C = Founder + Advisor (verliert founder),
-- D = Altdaten: aktives FIND-Profil ohne Founder-Rolle, E blockiert A, F wird von A blockiert
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('fa000000-0000-4000-8000-00000000000'||c)::uuid, 'authenticated','authenticated',
       'find-access-'||c||'@example.invalid','',now(),'{}','{}',now(),now()
from unnest(array['a','b','c','d','e','f']) c;

insert into public.profiles(user_id, display_name, roles) values
('fa000000-0000-4000-8000-00000000000a','Founder A',array['founder']),
('fa000000-0000-4000-8000-00000000000b','Founder B',array['founder']),
('fa000000-0000-4000-8000-00000000000c','Founder C',array['founder','advisor']),
('fa000000-0000-4000-8000-00000000000d','Altdaten D',array['founder']),
('fa000000-0000-4000-8000-00000000000e','Founder E',array['founder']),
('fa000000-0000-4000-8000-00000000000f','Founder F',array['founder']);

insert into public.founder_discovery_profiles(user_id, display_name, headline, bio, own_roles, seeking_roles,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal, status, published_at)
select ('fa000000-0000-4000-8000-00000000000'||c)::uuid, 'Profil '||c, 'Headline '||c,
       'Eine ausreichend lange Biografie fuer die Veroeffentlichung.', array['product'], array['tech'],
       20, 'part_time', 'idea_validating', 'venture_scale', 'active', now() - (ord || ' hours')::interval
from unnest(array['a','b','c','d','e','f']) with ordinality as t(c, ord);

insert into public.founder_search_preferences(user_id, must_haves)
values ('fa000000-0000-4000-8000-00000000000c', '{"requiredRolesAny":["tech"]}');

-- D: Altdaten, an der Rollenaenderung vorbei (Trigger kurz aus)
alter table public.profiles disable trigger pause_discovery_profile_on_founder_role_removal;
update public.profiles set roles = array['advisor'] where user_id = 'fa000000-0000-4000-8000-00000000000d';
alter table public.profiles enable trigger pause_discovery_profile_on_founder_role_removal;

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end;
$$;

-- Treffer der Suche fuer `viewer` (alle Seiten)
create function pg_temp.search_hits(viewer uuid) returns uuid[] language plpgsql as $$
declare hits uuid[];
begin
  perform pg_temp.as_user(viewer);
  set local role authenticated;
  select array_agg(r.candidate_user_id order by r.ord) into hits
  from (select s.candidate_user_id, row_number() over () ord
        from public.search_founder_discovery_profiles_v2(p_page_size => 100) s) r;
  reset role;
  return coalesce(hits, '{}');
end;
$$;

-- Direktzugriff ueber die Tabelle (Detailansicht liest so)
create function pg_temp.can_read(viewer uuid, target uuid) returns boolean language plpgsql as $$
declare n integer;
begin
  perform pg_temp.as_user(viewer);
  set local role authenticated;
  select count(*) into n from public.founder_discovery_profiles where user_id = target;
  reset role;
  return n = 1;
end;
$$;

create function pg_temp.status_of(target uuid) returns text language sql as $$
  select status from public.founder_discovery_profiles where user_id = target;
$$;

-- ===========================================================================
-- 1. Founder-Rolle
-- ===========================================================================
select extensions.ok('fa000000-0000-4000-8000-00000000000b' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000a')), 'Founder mit aktivem Profil wird gefunden');
select extensions.ok(pg_temp.can_read('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000b'), 'und ist direkt lesbar');

update public.profiles set roles = array['advisor'] where user_id = 'fa000000-0000-4000-8000-00000000000c';
select extensions.is(pg_temp.status_of('fa000000-0000-4000-8000-00000000000c'), 'paused', 'Founder-Rolle entfernt -> automatisch pausiert (Advisor bleibt)');
select extensions.is((select headline from public.founder_discovery_profiles where user_id = 'fa000000-0000-4000-8000-00000000000c'), 'Headline c', 'Profildaten bleiben');
select extensions.is((select count(*)::integer from public.founder_search_preferences where user_id = 'fa000000-0000-4000-8000-00000000000c'), 1, 'Suchkriterien bleiben');
select extensions.ok(not ('fa000000-0000-4000-8000-00000000000c' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000a'))), 'pausiert: nicht in der Suche');
select extensions.ok(not pg_temp.can_read('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000c'), 'pausiert: kein Direktzugriff');

update public.profiles set roles = array['founder','advisor'] where user_id = 'fa000000-0000-4000-8000-00000000000b';
update public.profiles set roles = array['founder'] where user_id = 'fa000000-0000-4000-8000-00000000000b';
select extensions.is(pg_temp.status_of('fa000000-0000-4000-8000-00000000000b'), 'active', 'Advisor dazu und wieder weg: FIND unberuehrt');

update public.profiles set roles = array['advisor','founder'] where user_id = 'fa000000-0000-4000-8000-00000000000c';
select extensions.is(pg_temp.status_of('fa000000-0000-4000-8000-00000000000c'), 'paused', 'Founder-Rolle zurueck: bleibt pausiert');

select pg_temp.as_user('fa000000-0000-4000-8000-00000000000c');
set local role authenticated;
update public.founder_discovery_profiles set status = 'active' where user_id = 'fa000000-0000-4000-8000-00000000000c';
reset role;
select extensions.is(pg_temp.status_of('fa000000-0000-4000-8000-00000000000c'), 'active', 'bewusste Reaktivierung durch die Person selbst');
select extensions.ok('fa000000-0000-4000-8000-00000000000c' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000a')), 'danach wieder auffindbar');

-- Altdaten D: aktiv, aber ohne Founder-Rolle
select extensions.is(pg_temp.status_of('fa000000-0000-4000-8000-00000000000d'), 'active', 'Vorbedingung: inkonsistente Altdaten');
select extensions.ok(not ('fa000000-0000-4000-8000-00000000000d' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000a'))), 'Altdaten: nicht in der Suche');
select extensions.ok(not pg_temp.can_read('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000d'), 'Altdaten: kein fremder Direktzugriff');

-- Die Bereinigung der Migration auf genau solche Zeilen
update public.founder_discovery_profiles discovery set status = 'paused'
where discovery.status = 'active' and not public.discovery_profile_owner_is_founder(discovery.user_id);
select extensions.is(pg_temp.status_of('fa000000-0000-4000-8000-00000000000d'), 'paused', 'Bereinigung pausiert Altdaten');
select extensions.is(pg_temp.status_of('fa000000-0000-4000-8000-00000000000b'), 'active', 'Bereinigung laesst Founder unberuehrt');

-- ===========================================================================
-- 2. Blockierung
-- ===========================================================================
select extensions.ok('fa000000-0000-4000-8000-00000000000e' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000a')), 'ohne Blockierung: sichtbar');
select extensions.ok(pg_temp.can_read('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000e'), 'ohne Blockierung: direkt lesbar');

-- Bestehende Beziehungen VOR der Blockierung: A-E angenommenes Intro, A-F gemeinsames Team und Paar
insert into public.discovery_intro_requests(requester_user_id, recipient_user_id, status, message)
values ('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000e','pending','Hallo');
update public.discovery_intro_requests set status = 'accepted', responded_at = now()
where requester_user_id = 'fa000000-0000-4000-8000-00000000000a' and recipient_user_id = 'fa000000-0000-4000-8000-00000000000e';
insert into public.founder_teams(id, name, team_context) values ('fa000000-0000-4000-8000-0000000000aa', 'Team AF', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('fa000000-0000-4000-8000-0000000000aa','fa000000-0000-4000-8000-00000000000a'),
('fa000000-0000-4000-8000-0000000000aa','fa000000-0000-4000-8000-00000000000f');
insert into public.relationships(user_a_id, user_b_id, founder_team_id) values
('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000f','fa000000-0000-4000-8000-0000000000aa');

insert into public.network_blocks(blocker_user_id, blocked_user_id) values
('fa000000-0000-4000-8000-00000000000e','fa000000-0000-4000-8000-00000000000a'),
('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000f');

-- Suche
select extensions.ok(not ('fa000000-0000-4000-8000-00000000000e' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000a'))), 'E blockiert A: A findet E nicht');
select extensions.ok(not ('fa000000-0000-4000-8000-00000000000a' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000e'))), 'E blockiert A: E findet A nicht');
select extensions.ok(not ('fa000000-0000-4000-8000-00000000000f' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000a'))), 'A blockiert F: A findet F nicht');
select extensions.ok(not ('fa000000-0000-4000-8000-00000000000a' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000f'))), 'A blockiert F: F findet A nicht');
select extensions.ok('fa000000-0000-4000-8000-00000000000a' = any(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000b')), 'unbeteiligte B findet A weiter');

-- Direkter Tabellen-/API-Zugriff (so liest auch die Detailseite)
select extensions.ok(not pg_temp.can_read('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000e'), 'E blockiert A: A liest E nicht direkt');
select extensions.ok(not pg_temp.can_read('fa000000-0000-4000-8000-00000000000e','fa000000-0000-4000-8000-00000000000a'), 'E blockiert A: E liest A nicht direkt');
select extensions.ok(not pg_temp.can_read('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000f'), 'A blockiert F: A liest F nicht direkt');
select extensions.ok(not pg_temp.can_read('fa000000-0000-4000-8000-00000000000f','fa000000-0000-4000-8000-00000000000a'), 'A blockiert F: F liest A nicht direkt');
select extensions.ok(pg_temp.can_read('fa000000-0000-4000-8000-00000000000b','fa000000-0000-4000-8000-00000000000a'), 'unbeteiligte B liest A weiter');
select extensions.ok(pg_temp.can_read('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000a'), 'das eigene Profil bleibt lesbar');

-- Sortierung unveraendert
select extensions.is(pg_temp.search_hits('fa000000-0000-4000-8000-00000000000b'),
  (select array_agg(user_id order by published_at desc nulls last, id) from public.founder_discovery_profiles
   where status = 'active' and user_id <> 'fa000000-0000-4000-8000-00000000000b'),
  'Reihenfolge weiter published_at desc, dann id');

-- ===========================================================================
-- 3. Bestehende Beziehungen behalten den Namen - und nur den
-- ===========================================================================
create function pg_temp.names(viewer uuid, ids uuid[]) returns jsonb language plpgsql as $$
declare result jsonb;
begin
  perform pg_temp.as_user(viewer);
  set local role authenticated;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.user_id), '[]'::jsonb) into result
  from public.get_relationship_display_names(ids) r;
  reset role;
  return result;
end;
$$;

select extensions.is(
  pg_temp.names('fa000000-0000-4000-8000-00000000000a', array['fa000000-0000-4000-8000-00000000000e']::uuid[]),
  '[{"user_id":"fa000000-0000-4000-8000-00000000000e","display_name":"Profil e","discovery_active":true}]'::jsonb,
  'angenommenes Intro: Name bleibt trotz Blockierung (Dashboard, Vergleich, Intro-Liste)');
select extensions.is(
  pg_temp.names('fa000000-0000-4000-8000-00000000000e', array['fa000000-0000-4000-8000-00000000000a']::uuid[]),
  '[{"user_id":"fa000000-0000-4000-8000-00000000000a","display_name":"Profil a","discovery_active":true}]'::jsonb,
  'auch in der Gegenrichtung - gleiche Antwort, keine Blockierungsrichtung');
select extensions.is(
  pg_temp.names('fa000000-0000-4000-8000-00000000000a', array['fa000000-0000-4000-8000-00000000000f']::uuid[]),
  '[{"user_id":"fa000000-0000-4000-8000-00000000000f","display_name":"Profil f","discovery_active":true}]'::jsonb,
  'gemeinsames Team / Paar: Name bleibt trotz Blockierung');
select extensions.is(
  pg_temp.names('fa000000-0000-4000-8000-00000000000a', array['fa000000-0000-4000-8000-00000000000b']::uuid[]),
  '[]'::jsonb, 'ohne Beziehung: kein Name');
select extensions.is(
  (select pg_get_function_result(p.oid) from pg_proc p where p.proname = 'get_relationship_display_names'),
  'TABLE(user_id uuid, display_name text, discovery_active boolean)',
  'nur Name und Aktiv-Status - keine weiteren Discovery-Daten');

select pg_temp.as_user('fa000000-0000-4000-8000-00000000000a');
set local role authenticated;
select extensions.is(
  (select display_name from public.get_founder_team_member_presentations('fa000000-0000-4000-8000-0000000000aa')
   where user_id = 'fa000000-0000-4000-8000-00000000000f'),
  'Founder F', 'Team-Homebase: Name kommt aus profiles, unabhaengig von FIND und Blockierung');
select extensions.throws_ok($$
  insert into public.discovery_intro_requests(requester_user_id, recipient_user_id, status)
  values ('fa000000-0000-4000-8000-00000000000a','fa000000-0000-4000-8000-00000000000f','pending')
$$, '42501', null, 'Intro bleibt verhindert');
reset role;

select set_config('request.jwt.claims', '', true);
set local role anon;
select extensions.throws_ok($$select * from public.get_relationship_display_names(array['fa000000-0000-4000-8000-00000000000a']::uuid[])$$, '42501', null, 'anon bekommt keine Namen');
select extensions.throws_ok($$select * from public.search_founder_discovery_profiles_v2()$$, '42501', null, 'anon sucht nicht');
reset role;

-- TODO NACH MERGE DES MATCHING-BRANCHES (verbindlich):
-- get_disclosed_capability(..., 'discovery') wird dort neu definiert (20261128130000).
-- Eine Folge-Migration muss sicherstellen, dass bei bestehender Blockierung (beliebige
-- Richtung) im Kontext 'discovery' keine Capability-Daten geliefert werden. Dann hier
-- ergaenzen und den Plan erhoehen:
--   select extensions.is(pg_temp.disclosed('<A>', 'discovery' fuer <E>), 0,
--     'Blockierung: keine Capability-Daten im Discovery-Kontext');

select * from extensions.finish();
rollback;
