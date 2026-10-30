\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e3000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e3000000-0000-4000-8000-000000000002','authenticated','authenticated','kontakt@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e3000000-0000-4000-8000-000000000003','authenticated','authenticated','andere@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e3000000-0000-4000-8000-000000000004','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e3000000-0000-4000-8000-000000000005','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e3000000-0000-4000-8000-0000000000a0', 'Programm Zwei');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e3000000-0000-4000-8000-0000000000a0','e3000000-0000-4000-8000-000000000001','owner','active'),
('e3000000-0000-4000-8000-0000000000a0','e3000000-0000-4000-8000-000000000002','advisor','active'),
('e3000000-0000-4000-8000-0000000000a0','e3000000-0000-4000-8000-000000000003','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('e3000000-0000-4000-8000-0000000000b0', 'Team Nordlicht', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e3000000-0000-4000-8000-0000000000b0','e3000000-0000-4000-8000-000000000004'),
('e3000000-0000-4000-8000-0000000000b0','e3000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e3000000-0000-4000-8000-0000000000c0','e3000000-0000-4000-8000-0000000000a0','e3000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e3000000-0000-4000-8000-0000000000c0','e3000000-0000-4000-8000-000000000004'),
('e3000000-0000-4000-8000-0000000000c0','e3000000-0000-4000-8000-000000000005');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('e3000000-0000-4000-8000-0000000000c0','e3000000-0000-4000-8000-000000000002');

set local role authenticated;

-- Das Team legt einen Meilenstein an.
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.isnt(
  public.save_team_program_milestone('e3000000-0000-4000-8000-0000000000c0', null, 'Prototyp getestet', current_date - 3, 5, 2),
  null, 'a team member can add a milestone');
select extensions.throws_ok(
  $$select public.save_team_program_milestone('e3000000-0000-4000-8000-0000000000c0', null, 'x', null, 3, 9)$$,
  '23514', null, 'done cannot exceed the target');

-- Die Bezugsperson sieht und aendert sie.
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.list_team_program_milestones('e3000000-0000-4000-8000-0000000000c0')), 1, 'the contact sees the milestone');
select extensions.isnt(
  public.save_team_program_milestone('e3000000-0000-4000-8000-0000000000c0', null, 'MVP live', current_date + 30, null, 0),
  null, 'the contact can add one too');
select extensions.is(
  (select count(*)::int from public.get_org_milestone_deadlines('e3000000-0000-4000-8000-0000000000a0')), 1, 'only the missed deadline shows up in the list');

-- Eine andere Advisorin der Organisation sieht nichts.
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.list_team_program_milestones('e3000000-0000-4000-8000-0000000000c0')$$,
  'an advisor who is not a contact sees nothing');
select extensions.throws_ok(
  $$select public.save_team_program_milestone('e3000000-0000-4000-8000-0000000000c0', null, 'x', null, null, 0)$$,
  '42501', null, 'and cannot write');

-- Der Inhaber sieht alle.
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.list_team_program_milestones('e3000000-0000-4000-8000-0000000000c0')), 2, 'the owner sees all milestones');

-- Faellt die Zustimmung weg, ist alles zu.
reset role;
delete from public.team_program_consents where founder_user_id = 'e3000000-0000-4000-8000-000000000005';
set local role authenticated;
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.list_team_program_milestones('e3000000-0000-4000-8000-0000000000c0')$$,
  'without every current consent the milestones are closed to the organisation');

select * from extensions.finish();
rollback;
