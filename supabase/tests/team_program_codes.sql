\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000002','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000003','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e7000000-0000-4000-8000-000000000004','authenticated','authenticated','c@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e7000000-0000-4000-8000-0000000000a0', 'Programm Sechs');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e7000000-0000-4000-8000-0000000000a0','e7000000-0000-4000-8000-000000000001','owner','active');
insert into public.founder_teams(id, name, team_context) values
('e7000000-0000-4000-8000-0000000000b0', 'Team Eins', 'existing_team'),
('e7000000-0000-4000-8000-0000000000b1', 'Team Zwei', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e7000000-0000-4000-8000-0000000000b0','e7000000-0000-4000-8000-000000000002'),
('e7000000-0000-4000-8000-0000000000b0','e7000000-0000-4000-8000-000000000003'),
('e7000000-0000-4000-8000-0000000000b1','e7000000-0000-4000-8000-000000000004');

set local role authenticated;

-- Nur der Inhaber legt Codes an.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.create_team_program_code('e7000000-0000-4000-8000-0000000000a0', 'ABCD2345', 'x', 1, 30)$$,
  '42501', null, 'only the owner creates codes');
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.isnt(public.create_team_program_code('e7000000-0000-4000-8000-0000000000a0', 'ABCD2345', 'Batch', 1, 30), null, 'the owner creates a code');
select extensions.is((select count(*)::int from public.list_team_program_codes('e7000000-0000-4000-8000-0000000000a0')), 1, 'and lists it');

-- Ein Team tritt mit dem Code bei (Kleinschreibung und Leerzeichen sind egal).
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_team_program_code_options(' abcd2345 ')), 1, 'the code shows the own team');
create temp table prog as select public.start_team_program_by_code('abcd2345', 'e7000000-0000-4000-8000-0000000000b0') as id;
grant select on prog to authenticated;
select extensions.isnt((select id from prog), null, 'a member joins with the code');

-- Das andere Teammitglied bekommt den Hinweis, das Programm ist noch nicht aktiv.
reset role;
select extensions.is(
  (select count(*)::int from public.in_app_notices where kind = 'program_invited' and subject_id = (select id from prog)), 1, 'the rest of the team gets a notice');
set local role authenticated;
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000004","role":"authenticated"}';

-- Der Code war auf ein Team begrenzt: jetzt verbraucht.
select extensions.is((select count(*)::int from public.get_team_program_code_options('ABCD2345')), 0, 'a used-up code offers nothing');

-- Gesperrt, abgelaufen oder falsch ist von aussen nicht zu unterscheiden; nach zehn Fehlversuchen antwortet nichts mehr.
reset role;
update public.team_program_codes set max_uses = 5;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.get_team_program_code_options('ZZZZZZZZ') from generate_series(1, 10);
select extensions.is((select count(*)::int from public.get_team_program_code_options('ABCD2345')), 0, 'after ten wrong guesses even the right code is not answered');

-- Sperren.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.revoke_team_program_code((select code_id from public.list_team_program_codes('e7000000-0000-4000-8000-0000000000a0') limit 1));
select extensions.is((select status from public.list_team_program_codes('e7000000-0000-4000-8000-0000000000a0') limit 1), 'revoked', 'the owner can revoke a code');

select * from extensions.finish();
rollback;
