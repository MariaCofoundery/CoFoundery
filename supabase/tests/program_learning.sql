\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','eb000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','eb000000-0000-4000-8000-000000000002','authenticated','authenticated','mitglied@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','eb000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','eb000000-0000-4000-8000-000000000004','authenticated','authenticated','ohne@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','eb000000-0000-4000-8000-000000000006','authenticated','authenticated','andere@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values
('eb000000-0000-4000-8000-0000000000a0', 'Programm Dreizehn'),
('eb000000-0000-4000-8000-0000000000a1', 'Programm Vierzehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000001','owner','active'),
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000002','advisor','active'),
('eb000000-0000-4000-8000-0000000000a1','eb000000-0000-4000-8000-000000000006','owner','active');
insert into public.founder_teams(id, name, team_context) values
('eb000000-0000-4000-8000-0000000000b0', 'Team Anker', 'existing_team'),
('eb000000-0000-4000-8000-0000000000b1', 'Team Boje', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('eb000000-0000-4000-8000-0000000000b0','eb000000-0000-4000-8000-000000000003'),
('eb000000-0000-4000-8000-0000000000b1','eb000000-0000-4000-8000-000000000004');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-0000000000b0','active', now(), now()),
('eb000000-0000-4000-8000-0000000000c1','eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-0000000000b1','active', now(), now());
-- Nur Team Anker hat zugestimmt; Team Boje ist damit nicht aktiv.
insert into public.team_program_consents(program_id, founder_user_id) values
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-000000000003');

set local role authenticated;

set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_learning_module('eb000000-0000-4000-8000-0000000000a0', null, ' Finanzierung ', 'Der Weg zur Runde', 10, false);
select public.save_learning_lesson((select module_id from public.list_learning('eb000000-0000-4000-8000-0000000000a0')), null, ' Pitch Deck ', null, 'https://example.org/video', 25, 'Dr. Lena Muster', 10);
select extensions.is(
  (select module_title || '/' || lesson_title from public.list_learning('eb000000-0000-4000-8000-0000000000a0')), 'Finanzierung/Pitch Deck', 'the owner adds a module and a lesson, titles are trimmed');
select extensions.throws_ok(
  $$select public.save_learning_lesson((select module_id from public.list_learning('eb000000-0000-4000-8000-0000000000a0')), null, 'Falsch', null, 'http://example.org/x', null, null, null)$$,
  '23514', null, 'a link that is not https is refused');
select extensions.throws_ok(
  $$select public.save_learning_lesson((select module_id from public.list_learning('eb000000-0000-4000-8000-0000000000a0')), null, 'Falsch', null, 'javascript:alert(1)', null, null, null)$$,
  '23514', null, 'a javascript link is refused');

set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.list_learning('eb000000-0000-4000-8000-0000000000a0')), 1, 'a member reads the module, draft included');
select extensions.throws_ok(
  $$select public.save_learning_module('eb000000-0000-4000-8000-0000000000a0', null, 'Neu', null, null, true)$$, '42501', null, 'a member cannot add a module');

-- Team Anker: Entwurf ist unsichtbar, veroeffentlicht sichtbar.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty($$select * from public.get_my_learning()$$, 'a team does not see a draft');
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_learning_module('eb000000-0000-4000-8000-0000000000a0', (select module_id from public.list_learning('eb000000-0000-4000-8000-0000000000a0')), 'Finanzierung', 'Der Weg zur Runde', 10, true);
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select lesson_title from public.get_my_learning()), 'Pitch Deck', 'a team in an active program sees a published module');

-- Ein Team ohne aktives Programm sieht nichts.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is_empty($$select * from public.get_my_learning()$$, 'a team whose program is not active sees nothing');

-- Eine andere Organisation sieht nichts.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is_empty($$select * from public.list_learning('eb000000-0000-4000-8000-0000000000a0')$$, 'another organization sees nothing');

-- Loeschen des Moduls nimmt die Lektionen mit.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.delete_learning_module((select module_id from public.list_learning('eb000000-0000-4000-8000-0000000000a0')));
reset role;
select extensions.is(
  (select count(*)::int from public.team_program_lessons), 0, 'deleting the module removes its lessons');

set local role anon;
select extensions.throws_ok($$select * from public.get_my_learning()$$, '42501', null, 'anon cannot call it');

select * from extensions.finish();
rollback;
