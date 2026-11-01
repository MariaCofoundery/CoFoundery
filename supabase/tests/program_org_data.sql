\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000002','authenticated','authenticated','kontakt@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000004','authenticated','authenticated','andere@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e6000000-0000-4000-8000-000000000005','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e6000000-0000-4000-8000-0000000000a0', 'Programm Fuenf');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000001','owner','active'),
('e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000002','advisor','active'),
('e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000004','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('e6000000-0000-4000-8000-0000000000b0', 'Team Leuchtturm', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e6000000-0000-4000-8000-0000000000b0','e6000000-0000-4000-8000-000000000003'),
('e6000000-0000-4000-8000-0000000000b0','e6000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e6000000-0000-4000-8000-0000000000c0','e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e6000000-0000-4000-8000-0000000000c0','e6000000-0000-4000-8000-000000000003'),
('e6000000-0000-4000-8000-0000000000c0','e6000000-0000-4000-8000-000000000005');
insert into public.team_program_contacts(program_id, advisor_user_id) values ('e6000000-0000-4000-8000-0000000000c0','e6000000-0000-4000-8000-000000000002');

set local role authenticated;

-- Die Bezugsperson traegt ein.
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.save_team_program_org_data('e6000000-0000-4000-8000-0000000000c0', 'Leuchtturm', 'GmbH i. G.', 'Kai 3, Kiel', 'Anna Beispiel', 'Anna@Leuchtturm.example', '0431 99', 'leuchtturm.example', date '2027-02-01', 'A-17', 'Zahlt in zwei Raten');
select extensions.is(
  (select contact_email from public.get_team_program_org_data('e6000000-0000-4000-8000-0000000000c0')), 'anna@leuchtturm.example', 'the contact saves the master data, the email is normalised');
select extensions.throws_ok(
  $$select public.save_team_program_org_data('e6000000-0000-4000-8000-0000000000c0', null, null, null, null, 'ohne-at', null, null, null, null, null)$$,
  '23514', null, 'an email without @ is refused');

-- Das Team liest, schreibt aber nicht.
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select reference from public.get_team_program_org_data('e6000000-0000-4000-8000-0000000000c0')), 'A-17', 'the team reads what the organisation keeps about it');
select extensions.throws_ok(
  $$select public.save_team_program_org_data('e6000000-0000-4000-8000-0000000000c0', 'x', null, null, null, null, null, null, null, null, null)$$,
  '42501', null, 'the team cannot edit it');

-- Eine andere Person der Organisation sieht nichts und schreibt nichts.
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_team_program_org_data('e6000000-0000-4000-8000-0000000000c0')$$,
  'another advisor of the organisation sees nothing');
select extensions.throws_ok(
  $$select public.save_team_program_org_data('e6000000-0000-4000-8000-0000000000c0', 'x', null, null, null, null, null, null, null, null, null)$$,
  '42501', null, 'and cannot write');

-- Der Inhaber liest und ueberschreibt.
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_team_program_org_data('e6000000-0000-4000-8000-0000000000c0', 'Leuchtturm', null, null, null, null, null, null, null, null, 'Neu');
select extensions.is(
  (select note from public.get_team_program_org_data('e6000000-0000-4000-8000-0000000000c0')), 'Neu', 'the owner overwrites it');

-- Es gehoert nur in den Export der Person, die es eingetragen hat.
select extensions.is(
  (select jsonb_array_length(public.export_my_restricted_data() -> 'team_program_org_data')), 1, 'the owner export carries the entry');

-- Beendet das Team das Programm, ist es weg.
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.end_team_program('e6000000-0000-4000-8000-0000000000c0');
reset role;
select extensions.is(
  (select count(*)::int from public.team_program_org_data where program_id = 'e6000000-0000-4000-8000-0000000000c0'), 0, 'ending the program deletes the master data');

select * from extensions.finish();
rollback;
