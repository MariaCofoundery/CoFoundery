\set ON_ERROR_STOP on

-- Private FIND-Suchkriterien (founder_search_preferences.must_haves): nur die
-- Person selbst liest und schreibt sie. Keine Datenbankfunktion gibt sie heraus.

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

-- A = Eigentümerin, F = anderer Founder, V = Advisor, M = reines Connect-Mitglied, N = ohne Kontext
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','5ea00000-0000-4000-8000-00000000000a','authenticated','authenticated','sp-a@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','5ea00000-0000-4000-8000-00000000000f','authenticated','authenticated','sp-f@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','5ea00000-0000-4000-8000-00000000000e','authenticated','authenticated','sp-v@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','5ea00000-0000-4000-8000-00000000000d','authenticated','authenticated','sp-m@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','5ea00000-0000-4000-8000-00000000000c','authenticated','authenticated','sp-n@example.invalid','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id, display_name, roles) values
('5ea00000-0000-4000-8000-00000000000a','Eigentuemerin A',array['founder']),
('5ea00000-0000-4000-8000-00000000000f','Founder F',array['founder']),
('5ea00000-0000-4000-8000-00000000000e','Advisor V',array['advisor']),
('5ea00000-0000-4000-8000-00000000000d','Mitglied M','{}'),
('5ea00000-0000-4000-8000-00000000000c','Ohne Kontext N','{}');
insert into public.network_memberships(user_id, status) values ('5ea00000-0000-4000-8000-00000000000d','active')
on conflict (user_id) do nothing;

insert into public.founder_search_preferences(user_id, must_haves) values
('5ea00000-0000-4000-8000-00000000000a',
 '{"requiredRolesAny":["tech"],"desiredLocationRegion":"Leipzig","requiredIndustriesAny":["Geheimbranche"],"acceptedVentureGoals":["exit_oriented"]}'),
('5ea00000-0000-4000-8000-00000000000f', '{"requiredRolesAny":["design"]}');

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end;
$$;

create function pg_temp.visible_rows(viewer uuid) returns integer language plpgsql as $$
declare n integer;
begin
  perform pg_temp.as_user(viewer);
  set local role authenticated;
  select count(*)::integer into n from public.founder_search_preferences where user_id = '5ea00000-0000-4000-8000-00000000000a';
  reset role;
  return n;
end;
$$;

-- ===========================================================================
-- 1. Lesen
-- ===========================================================================
select extensions.is(pg_temp.visible_rows('5ea00000-0000-4000-8000-00000000000a'), 1, 'A liest die eigenen Kriterien');
select pg_temp.as_user('5ea00000-0000-4000-8000-00000000000a');
set local role authenticated;
select extensions.is(
  (select must_haves->>'desiredLocationRegion' from public.founder_search_preferences where user_id = '5ea00000-0000-4000-8000-00000000000a'),
  'Leipzig', 'A sieht den eigenen Inhalt');
select extensions.is((select count(*)::integer from public.founder_search_preferences), 1, 'A sieht insgesamt nur die eigene Zeile');
reset role;
select extensions.is(pg_temp.visible_rows('5ea00000-0000-4000-8000-00000000000f'), 0, 'anderer Founder liest nichts');
select extensions.is(pg_temp.visible_rows('5ea00000-0000-4000-8000-00000000000e'), 0, 'Advisor liest nichts');
select extensions.is(pg_temp.visible_rows('5ea00000-0000-4000-8000-00000000000d'), 0, 'Connect-Mitglied liest nichts');
select extensions.is(pg_temp.visible_rows('5ea00000-0000-4000-8000-00000000000c'), 0, 'angemeldet ohne Kontext liest nichts');
select extensions.ok(public.is_network_member('5ea00000-0000-4000-8000-00000000000e'), 'Vorbedingung: Advisor ist Netzwerk-Mitglied');
select extensions.ok(public.is_network_member('5ea00000-0000-4000-8000-00000000000d'), 'Vorbedingung: M ist Netzwerk-Mitglied');

select set_config('request.jwt.claims', '', true);
set local role anon;
select extensions.is((select count(*)::integer from public.founder_search_preferences), 0, 'anon liest nichts');
reset role;

-- ===========================================================================
-- 2. Schreiben
-- ===========================================================================
select pg_temp.as_user('5ea00000-0000-4000-8000-00000000000f');
set local role authenticated;
update public.founder_search_preferences set must_haves = '{}' where user_id = '5ea00000-0000-4000-8000-00000000000a';
delete from public.founder_search_preferences where user_id = '5ea00000-0000-4000-8000-00000000000a';
select extensions.throws_ok($$
  insert into public.founder_search_preferences(user_id, must_haves) values ('5ea00000-0000-4000-8000-00000000000c', '{}')
$$, '42501', null, 'fremde Kriterien anlegen ist verboten');
reset role;
select extensions.is(
  (select must_haves->>'desiredLocationRegion' from public.founder_search_preferences where user_id = '5ea00000-0000-4000-8000-00000000000a'),
  'Leipzig', 'anderer Founder kann nicht ändern oder löschen');

set local role anon;
select extensions.throws_ok($$
  insert into public.founder_search_preferences(user_id, must_haves) values ('5ea00000-0000-4000-8000-00000000000a', '{}')
$$, '42501', null, 'anon legt nichts an');
reset role;

-- ===========================================================================
-- 3. Keine Datenbankfunktion gibt Must-haves heraus
-- ===========================================================================
select extensions.is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.prosrc ilike '%must_haves%'),
  null, 'keine Funktion liest must_haves');
select extensions.is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public' and p.prosrc ilike '%founder_search_preferences%'),
  array['delete_founder_account_data','get_discovery_workstyle_signals','set_discovery_workstyle_consent'],
  'nur bekannte Funktionen berühren die Tabelle (Löschung, Workstyle-Zustimmung)');
select extensions.is(
  (select count(*)::integer from pg_views where schemaname = 'public' and definition ilike '%founder_search_preferences%'),
  0, 'keine View auf die Tabelle');
select extensions.is(
  (select count(*)::integer from pg_policy where polrelid = 'public.founder_search_preferences'::regclass),
  4, 'vier Policies, alle nur für die eigene Zeile');
select extensions.ok(
  (select bool_and(pg_get_expr(coalesce(polqual, polwithcheck), polrelid) = '(user_id = auth.uid())')
   from pg_policy where polrelid = 'public.founder_search_preferences'::regclass),
  'jede Policy prüft user_id = auth.uid()');

-- Die Suche gibt keine Spalte aus den Präferenzen zurück
select extensions.ok(
  not exists (select 1 from unnest((select proargnames from pg_proc where proname = 'search_founder_discovery_profiles_v2')) a
              where a ilike '%must%' or a ilike '%industr%' or a ilike '%accepted_commitment%'),
  'search_founder_discovery_profiles_v2 kennt keine Präferenzspalten');

-- A sucht: Treffer tragen keine Kriterien von A
insert into public.founder_discovery_profiles(user_id, display_name, headline, bio, own_roles, seeking_roles,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal, status, published_at) values
('5ea00000-0000-4000-8000-00000000000a','Eigentuemerin A','Product Strategist','Eine ausreichend lange Biografie fuer die Veroeffentlichung.',
 array['product'], array['tech'], 40, 'full_time', 'idea_validating', 'venture_scale', 'active', now()),
('5ea00000-0000-4000-8000-00000000000f','Founder F','Tech Lead','Eine ausreichend lange Biografie fuer die Veroeffentlichung.',
 array['tech'], array['product'], 40, 'part_time', 'idea_validating', 'profitable_business', 'active', now());
select pg_temp.as_user('5ea00000-0000-4000-8000-00000000000f');
set local role authenticated;
select extensions.ok(
  (select bool_and(to_jsonb(r)::text not ilike '%Geheimbranche%' and to_jsonb(r)::text not ilike '%Leipzig%')
   from public.search_founder_discovery_profiles_v2() r),
  'F findet A, ohne A''s Kriterien zu sehen');
select extensions.is((select count(*)::integer from public.search_founder_discovery_profiles_v2() r where r.candidate_user_id = '5ea00000-0000-4000-8000-00000000000a'), 1, 'A ist für F auffindbar');
reset role;

-- ===========================================================================
-- 4. Kontolöschung
-- ===========================================================================
delete from auth.users where id = '5ea00000-0000-4000-8000-00000000000a';
select extensions.is(
  (select count(*)::integer from public.founder_search_preferences where user_id = '5ea00000-0000-4000-8000-00000000000a'),
  0, 'mit dem Konto verschwinden die Kriterien');

select * from extensions.finish();
rollback;
