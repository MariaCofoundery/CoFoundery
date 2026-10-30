\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- Team <-> Programm: Die Organisation laedt ein, das Team stimmt zu, jedes
-- AKTUELLE Mitglied muss zustimmen, Mitgliedschaft in der Organisation gibt nichts frei.

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e2000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e2000000-0000-4000-8000-000000000002','authenticated','authenticated','advisorin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e2000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e2000000-0000-4000-8000-000000000004','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e2000000-0000-4000-8000-000000000005','authenticated','authenticated','c@example.com','',now(),'{}','{}',now(),now());

insert into public.advisor_orgs(id, name) values ('e2000000-0000-4000-8000-0000000000a0', 'Programm Eins');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e2000000-0000-4000-8000-0000000000a0','e2000000-0000-4000-8000-000000000001','owner','active'),
('e2000000-0000-4000-8000-0000000000a0','e2000000-0000-4000-8000-000000000002','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('e2000000-0000-4000-8000-0000000000b0', 'Team Lindenhof', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e2000000-0000-4000-8000-0000000000b0','e2000000-0000-4000-8000-000000000003'),
('e2000000-0000-4000-8000-0000000000b0','e2000000-0000-4000-8000-000000000004');

set local role authenticated;

-- Nur der Inhaber laedt ein.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.create_team_program_invite('e2000000-0000-4000-8000-0000000000a0', repeat('a', 64), 'x')$$,
  '42501', null, 'a plain member cannot invite a team');

set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.isnt(
  public.create_team_program_invite('e2000000-0000-4000-8000-0000000000a0', repeat('a', 64), 'Batch 2026/1'),
  null, 'the owner can invite a team');

-- Wer nicht im Team ist, kann es nicht ins Programm bringen und sieht keine Optionen.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_team_program_invite_options(repeat('a', 64))$$,
  'someone without a team sees no options');
select extensions.throws_ok(
  $$select public.start_team_program(repeat('a', 64), 'e2000000-0000-4000-8000-0000000000b0')$$,
  '42501', null, 'a non-member cannot start a program for a team');

-- Mitglied A loest ein: Programm ist eingeladen, noch nicht aktiv (B fehlt).
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.get_team_program_invite_options(repeat('a', 64))), 1, 'a team member sees their team as an option');
create temp table prog as select public.start_team_program(repeat('a', 64), 'e2000000-0000-4000-8000-0000000000b0') as id;
grant select on prog to authenticated;
select extensions.is(
  (select status from public.get_my_team_programs() limit 1), 'invited', 'one consent is not enough while a member is missing');

-- Der Token ist verbraucht.
select extensions.throws_ok(
  $$select public.start_team_program(repeat('a', 64), 'e2000000-0000-4000-8000-0000000000b0')$$,
  '22023', null, 'a used invite cannot be redeemed twice');

-- Die Organisation sieht das Programm (Inhaber), aktiv ist es noch nicht.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select is_active from public.get_org_team_programs('e2000000-0000-4000-8000-0000000000a0') limit 1), false, 'the owner sees it, but it is not active yet');

-- Eine nicht zugeordnete Advisorin sieht nichts.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_org_team_programs('e2000000-0000-4000-8000-0000000000a0')$$,
  'an advisor who is not a contact sees no team');

-- B stimmt zu: aktiv.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.consent_team_program((select id from prog));
select extensions.is(
  (select is_active from public.get_my_team_programs() limit 1), true, 'all current members consented: active');

-- Bezugsperson zuordnen: nur der Inhaber, nur Mitglieder der Organisation.
select extensions.throws_ok(
  $$select public.set_team_program_contacts((select id from prog), array['e2000000-0000-4000-8000-000000000002']::uuid[])$$,
  '42501', null, 'a founder cannot assign contacts');
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_team_program_contacts((select id from prog), array['e2000000-0000-4000-8000-000000000005']::uuid[])$$,
  '22023', null, 'a contact must be an active member of the organisation');
select public.set_team_program_contacts((select id from prog), array['e2000000-0000-4000-8000-000000000002']::uuid[]);
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select is_contact from public.get_org_team_programs('e2000000-0000-4000-8000-0000000000a0') limit 1), true, 'the contact sees their team');

-- Ein neues Mitglied ohne Zustimmung macht es wieder inaktiv.
reset role;
insert into public.founder_team_members(team_id, user_id) values ('e2000000-0000-4000-8000-0000000000b0','e2000000-0000-4000-8000-000000000005');
set local role authenticated;
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select is_active from public.get_my_team_programs() limit 1), false, 'a new member without consent makes it inactive again');

-- Jedes Teammitglied kann beenden; danach ist nichts mehr zu sehen.
select public.end_team_program((select id from prog));
select extensions.is_empty($$select * from public.get_my_team_programs()$$, 'an ended program is gone for the team');
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_org_team_programs('e2000000-0000-4000-8000-0000000000a0')$$,
  'and for the organisation');

select * from extensions.finish();
rollback;
