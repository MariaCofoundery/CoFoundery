\set ON_ERROR_STOP on

-- Capability-Matching-Freigabe (20261128120000) und Betrachterprüfung in
-- get_disclosed_capability (20261128130000).

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(23);

-- A = Zielperson (Founder, FIND und CONNECT aktiv)
-- F = Founder-Betrachter, V = Advisor, M = reines Connect-Mitglied, N = angemeldet ohne Kontext
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','cb000000-0000-4000-8000-00000000000a','authenticated','authenticated','perm-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cb000000-0000-4000-8000-00000000000f','authenticated','authenticated','perm-f@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cb000000-0000-4000-8000-00000000000e','authenticated','authenticated','perm-v@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cb000000-0000-4000-8000-00000000000d','authenticated','authenticated','perm-m@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','cb000000-0000-4000-8000-00000000000c','authenticated','authenticated','perm-n@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id, display_name, roles) values
('cb000000-0000-4000-8000-00000000000a','Ziel A',array['founder']),
('cb000000-0000-4000-8000-00000000000f','Founder F',array['founder']),
('cb000000-0000-4000-8000-00000000000e','Advisor V',array['advisor']),
('cb000000-0000-4000-8000-00000000000d','Mitglied M','{}'),
('cb000000-0000-4000-8000-00000000000c','Ohne Kontext N','{}');

insert into public.network_memberships(user_id, status)
values ('cb000000-0000-4000-8000-00000000000d','active')
on conflict do nothing;

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end;
$$;

-- ===========================================================================
-- 1. Freigabe: Spalte, Default, Schreiben, Lesen
-- ===========================================================================
select extensions.ok(
  (select is_nullable = 'NO' and column_default = 'false'
   from information_schema.columns
   where table_schema = 'public' and table_name = 'person_core' and column_name = 'capability_matching_allowed'),
  'capability_matching_allowed ist NOT NULL DEFAULT false');
select extensions.is(
  (select capability_matching_allowed from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  false, 'eine neue Person hat keine Freigabe');

select pg_temp.as_user('cb000000-0000-4000-8000-00000000000a');
set local role authenticated;
update public.person_core set capability_matching_allowed = true where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(
  (select capability_matching_allowed from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  true, 'false -> true durch die Person selbst');
update public.person_core set capability_matching_allowed = false where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(
  (select capability_matching_allowed from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  false, 'true -> false durch die Person selbst');
update public.person_core set capability_matching_allowed = true where user_id = 'cb000000-0000-4000-8000-00000000000a';
reset role;

select pg_temp.as_user('cb000000-0000-4000-8000-00000000000f');
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  0, 'eine fremde Person kann die Freigabe nicht lesen');
update public.person_core set capability_matching_allowed = false where user_id = 'cb000000-0000-4000-8000-00000000000a';
reset role;
select extensions.is(
  (select capability_matching_allowed from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  true, 'eine fremde Person kann die Freigabe nicht ändern');

set local role anon;
select extensions.throws_ok(
  $$select capability_matching_allowed from public.person_core$$,
  '42501', null, 'anon liest person_core überhaupt nicht');
reset role;

-- ===========================================================================
-- 2. Trennung von Sichtbarkeit und Freigabe
-- ===========================================================================
select pg_temp.as_user('cb000000-0000-4000-8000-00000000000a');
set local role authenticated;
update public.person_core set capability_disclosure = 'areas_depth_on_contact' where user_id = 'cb000000-0000-4000-8000-00000000000a';
update public.person_core set capability_matching_allowed = false where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(
  (select capability_disclosure from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  'areas_depth_on_contact', 'das Ausschalten der Freigabe ändert die Sichtbarkeit nicht');
update public.person_core set capability_disclosure = 'areas' where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(
  (select capability_matching_allowed from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  false, 'eine sichtbare Freigabestufe schaltet die Matching-Freigabe nicht ein');
update public.person_core set capability_matching_allowed = true where user_id = 'cb000000-0000-4000-8000-00000000000a';
update public.person_core set capability_disclosure = 'private' where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(
  (select capability_matching_allowed from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  true, 'Sichtbarkeit private schaltet die Matching-Freigabe nicht aus');
update public.person_core set capability_matching_allowed = false where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(
  (select capability_disclosure from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  'private', 'und der Widerruf lässt private stehen');
reset role;

-- ===========================================================================
-- 3. get_disclosed_capability: Betrachter muss zum Kontext gehören
-- ===========================================================================
update public.person_core set capability_disclosure = 'areas' where user_id = 'cb000000-0000-4000-8000-00000000000a';
insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish) values
('cb000000-0000-4000-8000-00000000000a','b2b_sales',4,'prefer_other');
insert into public.founder_discovery_profiles(
  user_id, display_name, headline, bio, own_roles, seeking_roles,
  availability_hours_per_week, commitment_level, venture_stage, venture_goal, status, published_at
) values (
  'cb000000-0000-4000-8000-00000000000a','Ziel A','Product Strategist',
  'Eine ausreichend lange Biografie fuer die Veroeffentlichung.',
  array['product'], array['tech'], 40, 'full_time', 'idea_validating', 'venture_scale', 'active', now());
insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at)
values ('cb000000-0000-4000-8000-00000000000a','Ziel A','Product Strategist',
        'Eine ausreichend lange Biografie fuer das Netzwerk.', array['founder'], 'active', now());

select extensions.ok(public.is_network_member('cb000000-0000-4000-8000-00000000000e'), 'Vorbedingung: der Advisor ist Netzwerk-Mitglied');
select extensions.ok(not public.is_network_member('cb000000-0000-4000-8000-00000000000c'), 'Vorbedingung: N ist kein Mitglied');

create function pg_temp.disclosed(viewer uuid, context text) returns integer language plpgsql as $$
declare n integer;
begin
  perform pg_temp.as_user(viewer);
  set local role authenticated;
  select count(*)::integer into n from public.get_disclosed_capability('cb000000-0000-4000-8000-00000000000a', context);
  reset role;
  return n;
end;
$$;

select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000f', 'discovery'), 1, 'discovery: Founder sieht die freigegebenen Bereiche');
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000e', 'discovery'), 0, 'discovery: Advisor ohne Founder-Rolle sieht nichts');
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000d', 'discovery'), 0, 'discovery: reines Connect-Mitglied sieht nichts');
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000c', 'discovery'), 0, 'discovery: angemeldet ohne Kontext sieht nichts');
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000f', 'connect'), 1, 'connect: Founder (Mitglied) sieht die Bereiche');
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000d', 'connect'), 1, 'connect: Connect-Mitglied sieht die Bereiche');
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000c', 'connect'), 0, 'connect: ohne Mitgliedschaft nichts');

-- Die Matching-Freigabe ändert die Sichtbarkeit nicht - in keine Richtung
update public.person_core set capability_matching_allowed = true where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000e', 'discovery'), 0, 'Matching-Freigabe macht nichts sichtbar');
update public.person_core set capability_disclosure = 'private', capability_matching_allowed = true where user_id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(pg_temp.disclosed('cb000000-0000-4000-8000-00000000000f', 'discovery'), 0, 'private bleibt privat, auch mit Matching-Freigabe');

-- ===========================================================================
-- 4. Kontolöschung
-- ===========================================================================
delete from auth.users where id = 'cb000000-0000-4000-8000-00000000000a';
select extensions.is(
  (select count(*)::integer from public.person_core where user_id = 'cb000000-0000-4000-8000-00000000000a'),
  0, 'mit dem Konto verschwindet auch die Freigabe');

select * from extensions.finish();
rollback;
