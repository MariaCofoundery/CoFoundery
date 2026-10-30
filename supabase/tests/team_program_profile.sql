\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e5000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e5000000-0000-4000-8000-000000000002','authenticated','authenticated','kontakt@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e5000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e5000000-0000-4000-8000-000000000004','authenticated','authenticated','andere@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e5000000-0000-4000-8000-0000000000a0', 'Programm Vier');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e5000000-0000-4000-8000-0000000000a0','e5000000-0000-4000-8000-000000000001','owner','active'),
('e5000000-0000-4000-8000-0000000000a0','e5000000-0000-4000-8000-000000000002','advisor','active'),
('e5000000-0000-4000-8000-0000000000a0','e5000000-0000-4000-8000-000000000004','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('e5000000-0000-4000-8000-0000000000b0', 'Team Seeblick', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('e5000000-0000-4000-8000-0000000000b0','e5000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e5000000-0000-4000-8000-0000000000c0','e5000000-0000-4000-8000-0000000000a0','e5000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values ('e5000000-0000-4000-8000-0000000000c0','e5000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values ('e5000000-0000-4000-8000-0000000000c0','e5000000-0000-4000-8000-000000000002');

set local role authenticated;

set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.save_team_program_profile('e5000000-0000-4000-8000-0000000000c0', 'Seeblick GmbH', 'Anna und Ben', 'Hafenstr. 1, Kiel', 'Hallo@Seeblick.example', '0431 123');
select extensions.is(
  (select contact_email from public.get_team_program_profile('e5000000-0000-4000-8000-0000000000c0')), 'hallo@seeblick.example', 'the team saves its profile, the email is normalised');
select extensions.throws_ok(
  $$select public.save_team_program_profile('e5000000-0000-4000-8000-0000000000c0', null, null, null, 'keine-adresse', null)$$,
  '23514', null, 'an email without @ is refused');

set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select company_name from public.get_team_program_profile('e5000000-0000-4000-8000-0000000000c0')), 'Seeblick GmbH', 'the contact reads it');
select extensions.throws_ok(
  $$select public.save_team_program_profile('e5000000-0000-4000-8000-0000000000c0', 'x', null, null, null, null)$$,
  '42501', null, 'the contact cannot edit it');

set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_team_program_profile('e5000000-0000-4000-8000-0000000000c0')$$,
  'another advisor of the organisation sees nothing');

set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.get_team_program_profile('e5000000-0000-4000-8000-0000000000c0')), 1, 'the owner reads it');

-- Beendet das Team das Programm, ist auch das Eingetragene weg.
set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.end_team_program('e5000000-0000-4000-8000-0000000000c0');
reset role;
select extensions.is(
  (select count(*)::int from public.team_program_profiles where program_id = 'e5000000-0000-4000-8000-0000000000c0'), 0, 'ending the program deletes what the team entered');

select * from extensions.finish();
rollback;
