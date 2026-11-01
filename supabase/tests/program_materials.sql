\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000002','authenticated','authenticated','kontakt@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000005','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000006','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000007','authenticated','authenticated','fremd2@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e7000000-0000-4000-8000-0000000000a0', 'Programm Sechs');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e7000000-0000-4000-8000-0000000000a0','e7000000-0000-4000-8000-000000000001','owner','active'),
('e7000000-0000-4000-8000-0000000000a0','e7000000-0000-4000-8000-000000000002','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('e7000000-0000-4000-8000-0000000000b0', 'Team Hafen', 'existing_team'),
('e7000000-0000-4000-8000-0000000000b1', 'Team Fremd', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e7000000-0000-4000-8000-0000000000b0','e7000000-0000-4000-8000-000000000003'),
('e7000000-0000-4000-8000-0000000000b0','e7000000-0000-4000-8000-000000000005'),
('e7000000-0000-4000-8000-0000000000b1','e7000000-0000-4000-8000-000000000006'),
('e7000000-0000-4000-8000-0000000000b1','e7000000-0000-4000-8000-000000000007');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e7000000-0000-4000-8000-0000000000c0','e7000000-0000-4000-8000-0000000000a0','e7000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e7000000-0000-4000-8000-0000000000c0','e7000000-0000-4000-8000-000000000003'),
('e7000000-0000-4000-8000-0000000000c0','e7000000-0000-4000-8000-000000000005');

set local role authenticated;

-- Der Inhaber legt an.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_program_material('e7000000-0000-4000-8000-0000000000a0', null, ' Folien Pitch ', 'https://example.org/ordner/pitch', 'Stand Februar');
select extensions.is(
  (select title from public.list_program_materials('e7000000-0000-4000-8000-0000000000a0')), 'Folien Pitch', 'the owner adds a link, the title is trimmed');
select extensions.throws_ok(
  $$select public.save_program_material('e7000000-0000-4000-8000-0000000000a0', null, 'Unsicher', 'http://example.org/x', null)$$,
  '23514', null, 'a link that is not https is refused');
select extensions.throws_ok(
  $$select public.save_program_material('e7000000-0000-4000-8000-0000000000a0', null, 'Skript', 'javascript:alert(1)', null)$$,
  '23514', null, 'a script address is refused');

-- Ein Mitglied liest, schreibt aber nicht.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.list_program_materials('e7000000-0000-4000-8000-0000000000a0')), 1, 'a member of the organization reads the list');
select extensions.throws_ok(
  $$select public.save_program_material('e7000000-0000-4000-8000-0000000000a0', null, 'x', 'https://example.org/y', null)$$,
  '42501', null, 'a member cannot add');

-- Das Team im aktiven Programm liest, schreibt nicht.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.get_my_program_materials()), 1, 'the team in an active program sees the link');
select extensions.throws_ok(
  $$select public.save_program_material('e7000000-0000-4000-8000-0000000000a0', null, 'x', 'https://example.org/y', null)$$,
  '42501', null, 'the team cannot add');

-- Ein fremdes Team ohne Programm sieht nichts.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_my_program_materials()$$, 'a team outside the program sees nothing');

-- Die Unterlagen bleiben, wenn das Team das Programm verlaesst.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.end_team_program('e7000000-0000-4000-8000-0000000000c0');
reset role;
select extensions.is(
  (select count(*)::int from public.team_program_materials where org_id = 'e7000000-0000-4000-8000-0000000000a0'), 1, 'the materials stay when a team leaves');

select * from extensions.finish();
rollback;
