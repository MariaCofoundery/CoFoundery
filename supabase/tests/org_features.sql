\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ee000000-0000-4000-8000-000000000001','authenticated','authenticated','u1@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ee000000-0000-4000-8000-000000000002','authenticated','authenticated','u2@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ee000000-0000-4000-8000-000000000003','authenticated','authenticated','u3@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ee000000-0000-4000-8000-000000000004','authenticated','authenticated','u4@example.com','',now(),'{}','{}',now(),now());
-- u1 Inhaber, u2 Mitglied, u3 Team, u4 neue Organisation
insert into public.advisor_orgs(id, name) values ('ee000000-0000-4000-8000-0000000000a0', 'Programm Neunzehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values ('ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-000000000001','owner','active'), ('ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-000000000002','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('ee000000-0000-4000-8000-0000000000b0','Team Anker','existing_team');
insert into public.founder_team_members(team_id, user_id) values ('ee000000-0000-4000-8000-0000000000b0','ee000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values ('ee000000-0000-4000-8000-0000000000c0','ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-0000000000b0','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values ('ee000000-0000-4000-8000-0000000000c0','ee000000-0000-4000-8000-000000000003');
insert into public.team_program_events(org_id, title, starts_at) values ('ee000000-0000-4000-8000-0000000000a0','Workshop', now() + interval '3 days');
insert into public.team_program_materials(org_id, title, url) values ('ee000000-0000-4000-8000-0000000000a0','Folien','https://example.org/f');
insert into public.team_program_modules(id, org_id, title, published) values ('ee000000-0000-4000-8000-0000000000d0','ee000000-0000-4000-8000-0000000000a0','Finanzierung', true);
insert into public.team_program_lessons(module_id, title, url) values ('ee000000-0000-4000-8000-0000000000d0','Pitch','https://example.org/v');
insert into public.team_program_org_data(program_id, company_name) values ('ee000000-0000-4000-8000-0000000000c0','Anker GmbH');

set local role authenticated;

-- Eine neu angelegte Organisation bekommt die kleine Vorbelegung, die Auswahl steht aus.
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.create_advisor_org('Neue Beratung');
reset role;
select extensions.is((select features from public.advisor_orgs where name = 'Neue Beratung'), array['plan','materials','learning']::text[], 'a new organization starts with plan, materials and learning');
select extensions.is((select features_setup_done from public.advisor_orgs where name = 'Neue Beratung'), false, 'and the choice is still open');
select extensions.is((select features_setup_done from public.advisor_orgs where id = 'ee000000-0000-4000-8000-0000000000a0'), true, 'existing organizations keep everything and need no choice');
set local role authenticated;

-- Alles eingeschaltet (Standard): Teams sehen alles.
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_events()), 1, 'the team sees events while plan is on');
select extensions.is((select count(*)::int from public.get_my_program_materials()), 1, 'materials while materials are on');
select extensions.is((select count(*)::int from public.get_my_learning()), 1, 'the learning area while it is on');
select extensions.is((select count(*)::int from public.get_team_program_org_data('ee000000-0000-4000-8000-0000000000c0')), 1, 'the master data while orgdata is on');

-- Ausschalten: Teams sehen nichts mehr, die Daten bleiben.
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_org_features('ee000000-0000-4000-8000-0000000000a0', array['success']::text[]);
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.get_my_program_events()) + (select count(*)::int from public.get_my_program_materials())
  + (select count(*)::int from public.get_my_learning()) + (select count(*)::int from public.get_team_program_org_data('ee000000-0000-4000-8000-0000000000c0')),
  0, 'with everything off a team sees none of it');
reset role;
select extensions.is((select count(*)::int from public.team_program_materials where org_id = 'ee000000-0000-4000-8000-0000000000a0'), 1, 'the data stays when a feature is off');
select extensions.is((select program_success_enabled from public.advisor_orgs where id = 'ee000000-0000-4000-8000-0000000000a0'), true, 'success is kept in its own switch');
set local role authenticated;

-- Wieder einschalten.
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_org_features('ee000000-0000-4000-8000-0000000000a0', array['materials']::text[]);
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_materials()), 1, 'switching it on again brings it back');

-- Rechte.
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.set_org_features('ee000000-0000-4000-8000-0000000000a0', array['unbekannt']::text[])$$, 'P0002', null, 'an unknown feature is refused');
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.set_org_features('ee000000-0000-4000-8000-0000000000a0', array['plan']::text[])$$, '42501', null, 'a member cannot change the features');
select extensions.throws_ok($$select public.org_feature_enabled('ee000000-0000-4000-8000-0000000000a0', 'plan')$$, '42501', null, 'the internal helper is not callable');

select * from extensions.finish();
rollback;
