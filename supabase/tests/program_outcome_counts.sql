\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e9000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e9000000-0000-4000-8000-000000000002','authenticated','authenticated','bezug@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e9000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e9000000-0000-4000-8000-000000000004','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e9000000-0000-4000-8000-000000000005','authenticated','authenticated','c@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e9000000-0000-4000-8000-000000000006','authenticated','authenticated','andere@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name, program_success_enabled) values
('e9000000-0000-4000-8000-0000000000a0', 'Programm Neun', true),
('e9000000-0000-4000-8000-0000000000a1', 'Programm Zehn', true);
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000001','owner','active'),
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000002','advisor','active'),
('e9000000-0000-4000-8000-0000000000a1','e9000000-0000-4000-8000-000000000006','owner','active');
insert into public.founder_teams(id, name, team_context) values
('e9000000-0000-4000-8000-0000000000b0', 'Team Anker', 'existing_team'),
('e9000000-0000-4000-8000-0000000000b1', 'Team Boje', 'existing_team'),
('e9000000-0000-4000-8000-0000000000b2', 'Team Cape', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e9000000-0000-4000-8000-0000000000b0','e9000000-0000-4000-8000-000000000003'),
('e9000000-0000-4000-8000-0000000000b1','e9000000-0000-4000-8000-000000000004'),
('e9000000-0000-4000-8000-0000000000b2','e9000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at, batch, solo_confirmed_at) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-0000000000b0','active', now(), 'Herbst', now()),
('e9000000-0000-4000-8000-0000000000c1','e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-0000000000b1','active', now(), 'Herbst', now()),
('e9000000-0000-4000-8000-0000000000c2','e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-0000000000b2','active', now(), null, now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-000000000003'),
('e9000000-0000-4000-8000-0000000000c1','e9000000-0000-4000-8000-000000000004'),
('e9000000-0000-4000-8000-0000000000c2','e9000000-0000-4000-8000-000000000005');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('e9000000-0000-4000-8000-0000000000c1','e9000000-0000-4000-8000-000000000002');
insert into public.program_outcome_catalog(id, org_id, title, stars) values
('e9000000-0000-4000-8000-0000000000d0','e9000000-0000-4000-8000-0000000000a0','Pilotkunde', 2);
-- Team Anker: bestaetigt. Team Boje: nur gemeldet, zaehlt nicht.
insert into public.program_outcomes(program_id, catalog_id, confirmed_at, confirmed_by_user_id) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-0000000000d0', now(), 'e9000000-0000-4000-8000-000000000001');
insert into public.program_outcomes(program_id, catalog_id) values
('e9000000-0000-4000-8000-0000000000c1','e9000000-0000-4000-8000-0000000000d0');

set local role authenticated;

set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.results_eq(
  $$select teams_total, teams_done from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0') where batch = 'Herbst'$$,
  $$values (2, 1)$$, 'the owner sees 1 of 2 teams for the batch, reported-only does not count');
select extensions.results_eq(
  $$select teams_total, teams_done from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0') where batch is null$$,
  $$values (1, 0)$$, 'teams without a batch have their own row');
select extensions.is(
  (select count(*)::int from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0')), 2, 'one row per batch and catalog item, nothing else');

-- Eine Bezugsperson zaehlt nur ihr eigenes Team.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.results_eq(
  $$select teams_total, teams_done from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0')$$,
  $$values (1, 0)$$, 'a contact person counts only the program they are contact of');

-- Ein Team im Programm sieht nichts.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0')$$, 'a team in the program sees nothing');

-- Eine andere Organisation sieht nichts.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0')$$, 'another organization sees nothing');

-- Ohne eingeschaltete Erfolgs-Funktion kommt nichts.
reset role;
update public.advisor_orgs set program_success_enabled = false where id = 'e9000000-0000-4000-8000-0000000000a0';
set local role authenticated;
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is_empty(
  $$select * from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0')$$, 'nothing is counted while the success feature is off');

-- Anonym sieht nichts.
reset role;
set local role anon;
select extensions.throws_ok(
  $$select * from public.get_org_outcome_counts('e9000000-0000-4000-8000-0000000000a0')$$, '42501', null, 'anon cannot call it');

select * from extensions.finish();
rollback;
