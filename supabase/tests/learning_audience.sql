\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ed000000-0000-4000-8000-000000000001','authenticated','authenticated','u1@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ed000000-0000-4000-8000-000000000002','authenticated','authenticated','u2@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ed000000-0000-4000-8000-000000000003','authenticated','authenticated','u3@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ed000000-0000-4000-8000-000000000004','authenticated','authenticated','u4@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ed000000-0000-4000-8000-000000000005','authenticated','authenticated','u5@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ed000000-0000-4000-8000-000000000006','authenticated','authenticated','u6@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ed000000-0000-4000-8000-000000000007','authenticated','authenticated','u7@example.com','',now(),'{}','{}',now(),now());
-- u1 Inhaberin, u2 Mitglied, u3 Person mit base, u4 Person nur mit strengths, u5 Team Anker, u6 Team Boje, u7 Fremde
insert into public.advisor_orgs(id, name) values ('ed000000-0000-4000-8000-0000000000a0', 'Programm Siebzehn'), ('ed000000-0000-4000-8000-0000000000a1', 'Programm Achtzehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000001','owner','active'), ('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000002','advisor','active'), ('ed000000-0000-4000-8000-0000000000a1','ed000000-0000-4000-8000-000000000007','owner','active');
insert into public.advisor_person_grants(subject_user_id, advisor_user_id, scope, status, requested_by_user_id, approved_at) values
('ed000000-0000-4000-8000-000000000003','ed000000-0000-4000-8000-000000000001','base','active','ed000000-0000-4000-8000-000000000001', now()),
('ed000000-0000-4000-8000-000000000004','ed000000-0000-4000-8000-000000000001','strengths','active','ed000000-0000-4000-8000-000000000001', now());
insert into public.founder_teams(id, name, team_context) values
('ed000000-0000-4000-8000-0000000000b0','Team Anker','existing_team'),('ed000000-0000-4000-8000-0000000000b1','Team Boje','existing_team'),('ed000000-0000-4000-8000-0000000000b9','Team Fremd','existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ed000000-0000-4000-8000-0000000000b0','ed000000-0000-4000-8000-000000000005'),('ed000000-0000-4000-8000-0000000000b1','ed000000-0000-4000-8000-000000000006'),('ed000000-0000-4000-8000-0000000000b9','ed000000-0000-4000-8000-000000000007');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-0000000000b0','active', now(), now()),
('ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-0000000000b1','active', now(), now()),
('ed000000-0000-4000-8000-0000000000c9','ed000000-0000-4000-8000-0000000000a1','ed000000-0000-4000-8000-0000000000b9','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values ('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000005'),('ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-000000000006'),('ed000000-0000-4000-8000-0000000000c9','ed000000-0000-4000-8000-000000000007');
insert into public.team_program_modules(id, org_id, title, published) values ('ed000000-0000-4000-8000-0000000000d0','ed000000-0000-4000-8000-0000000000a0','Finanzierung', false);
insert into public.team_program_lessons(module_id, title, url) values ('ed000000-0000-4000-8000-0000000000d0','Pitch','https://example.org/v');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_module_audience('ed000000-0000-4000-8000-0000000000d0', false, '{}'::uuid[], array['ed000000-0000-4000-8000-000000000003']::uuid[]);
select extensions.is((select count(*)::int from public.list_module_shares('ed000000-0000-4000-8000-0000000000a0')), 1, 'the owner shares a module with an accompanied person');
select extensions.throws_ok($$select public.set_module_audience('ed000000-0000-4000-8000-0000000000d0', false, '{}'::uuid[], array['ed000000-0000-4000-8000-000000000004']::uuid[])$$, 'P0002', null, 'a person who did not release base cannot be added');
select extensions.throws_ok($$select public.set_module_audience('ed000000-0000-4000-8000-0000000000d0', false, array['ed000000-0000-4000-8000-0000000000c9']::uuid[], '{}'::uuid[])$$, 'P0002', null, 'a program of another organization cannot be added');
select extensions.is((select count(*)::int from public.list_module_shares('ed000000-0000-4000-8000-0000000000a0')), 1, 'refused calls changed nothing');

set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select lesson_title from public.get_my_learning()), 'Pitch', 'the shared person sees the module although it is not published for teams');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is_empty($$select * from public.get_my_learning()$$, 'a person it is not shared with sees nothing');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is_empty($$select * from public.get_my_learning()$$, 'a team in the program sees nothing while the module is a draft for teams');

-- Nur Team Anker freischalten.
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_module_audience('ed000000-0000-4000-8000-0000000000d0', false, array['ed000000-0000-4000-8000-0000000000c0']::uuid[], '{}'::uuid[]);
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_learning()), 1, 'the chosen team sees the module');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is_empty($$select * from public.get_my_learning()$$, 'another team of the same program does not');

-- Der Widerruf wirkt sofort.
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_module_audience('ed000000-0000-4000-8000-0000000000d0', false, '{}'::uuid[], array['ed000000-0000-4000-8000-000000000003']::uuid[]);
reset role;
update public.advisor_person_grants set status = 'revoked', revoked_at = now(), approved_at = null where subject_user_id = 'ed000000-0000-4000-8000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty($$select * from public.get_my_learning()$$, 'when the person withdraws the release, the module disappears at once');

-- Ein Mitglied darf nicht festlegen.
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.set_module_audience('ed000000-0000-4000-8000-0000000000d0', true, '{}'::uuid[], '{}'::uuid[])$$, '42501', null, 'a member cannot set the audience');

select * from extensions.finish();
rollback;
