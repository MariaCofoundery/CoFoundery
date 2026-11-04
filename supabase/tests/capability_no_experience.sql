\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

-- ---------------------------------------------------------------------------
-- "Keine" Erfahrung ist eine Angabe, kein Treffer (20270306120000)
-- ---------------------------------------------------------------------------
--
-- Seit dem 04.11.2026 kann man je Bereich "Keine" Erfahrung angeben
-- (Stufe 1) - etwa weil man ihn lernen oder abgeben will. Wo ein Bereich ohne
-- Stufe als "bringt die Person mit" gelesen wird, darf so ein Eintrag nicht
-- auftauchen: in der FIND-Suche nach Bereichen und in der freigegebenen Sicht
-- ohne Tiefe. Wo die Stufe mitkommt, bleibt er sichtbar - mit "Keine" dabei.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000001','authenticated','authenticated','ke-sucht@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000002','authenticated','authenticated','ke-flach@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000003','authenticated','authenticated','ke-tief@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles (user_id, roles) values
  ('f5000000-0000-4000-8000-000000000001', array['founder']),
  ('f5000000-0000-4000-8000-000000000002', array['founder']),
  ('f5000000-0000-4000-8000-000000000003', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.founder_discovery_profiles
  (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
   remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal,
   expertise)
values
  ('f5000000-0000-4000-8000-000000000002', 'active', 'Flach', 'Gibt Bereiche frei', '-',
   '{tech}', '{sales}', '{}', 'remote', 20, 'full_time', 'idea_validating',
   'profitable_business', '{}');

update public.person_core set capability_disclosure = 'areas'
where user_id = 'f5000000-0000-4000-8000-000000000002';
update public.person_core set capability_disclosure = 'areas_depth_on_contact'
where user_id = 'f5000000-0000-4000-8000-000000000003';

-- Vertrieb kann sie, Buchhaltung will sie lernen - ohne Erfahrung.
insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish) values
('f5000000-0000-4000-8000-000000000002','b2b_sales',4,null),
('f5000000-0000-4000-8000-000000000002','accounting_controlling',1,'grow_into'),
('f5000000-0000-4000-8000-000000000003','accounting_controlling',1,'prefer_external');

insert into public.founder_teams(id, name, team_context)
values ('f6000000-0000-4000-8000-000000000001', 'Keine-Erfahrung-Team', 'pre_founder');
insert into public.founder_team_members(team_id, user_id) values
('f6000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001'),
('f6000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000002'),
('f6000000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000003');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- FIND-Suche nach Bereichen
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{b2b_sales}')
   where candidate_user_id = 'f5000000-0000-4000-8000-000000000002'),
  1,
  'a released area with experience is still found');

select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{accounting_controlling}')
   where candidate_user_id = 'f5000000-0000-4000-8000-000000000002'),
  0,
  'an area with no experience is not a search hit');

-- ---------------------------------------------------------------------------
-- Freigegebene Sicht
-- ---------------------------------------------------------------------------
-- Ohne Tiefe: nur der Bereich, den sie mitbringt.
select extensions.results_eq(
  $$select area_id, application_level
    from public.get_disclosed_capability('f5000000-0000-4000-8000-000000000002','team')$$,
  $$values ('b2b_sales', null::smallint)$$,
  'without depth an area with no experience does not appear as an area');

-- Mit Tiefe: der Eintrag bleibt, mit "Keine" und dem Wunsch dabei.
select extensions.results_eq(
  $$select area_id, application_level, ownership_wish
    from public.get_disclosed_capability('f5000000-0000-4000-8000-000000000003','team')$$,
  $$values ('accounting_controlling', 1::smallint, 'prefer_external')$$,
  'with depth an area with no experience stays readable, level included');

-- Die eigene Sicht ist davon unberuehrt.
set local request.jwt.claims = '{"sub":"f5000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.person_capability_entries
   where user_id = 'f5000000-0000-4000-8000-000000000002'),
  2,
  'the owner still sees both own entries');

select * from extensions.finish();
rollback;
