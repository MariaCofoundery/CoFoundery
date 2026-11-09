\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- 1 Inhaberin, 2 Ansprechperson (Advisor), 3 Gruenderin, 4 Fremde.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ec000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'secf' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.profiles(user_id, roles) values ('ec000000-0000-4000-8000-000000000003', array['founder']) on conflict (user_id) do nothing;
insert into public.advisor_orgs(id, name) values ('ec000000-0000-4000-8000-0000000000a0', 'Nachbesserung Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ec000000-0000-4000-8000-0000000000a0','ec000000-0000-4000-8000-000000000001','owner','active'),
('ec000000-0000-4000-8000-0000000000a0','ec000000-0000-4000-8000-000000000002','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('ec000000-0000-4000-8000-0000000000b0', 'Eins', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('ec000000-0000-4000-8000-0000000000b0','ec000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('ec000000-0000-4000-8000-0000000000c0','ec000000-0000-4000-8000-0000000000a0','ec000000-0000-4000-8000-0000000000b0','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values ('ec000000-0000-4000-8000-0000000000c0','ec000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values ('ec000000-0000-4000-8000-0000000000c0','ec000000-0000-4000-8000-000000000002');

-- Solange die Ansprechperson aktiv ist, hat sie Zugang und kann zugewiesen werden.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.ok(public.program_tasks_access('ec000000-0000-4000-8000-0000000000c0'), 'an active contact reaches the program tasks');
reset role;
select extensions.ok(public.program_task_assignee_ok('ec000000-0000-4000-8000-0000000000c0', 'ec000000-0000-4000-8000-000000000002'), 'and can be assigned');

-- Sie verlaesst die Organisation: Zugang und Rolle als Ansprechperson sind weg.
update public.advisor_org_members set status = 'revoked', revoked_at = now() where org_id = 'ec000000-0000-4000-8000-0000000000a0' and user_id = 'ec000000-0000-4000-8000-000000000002';
select extensions.is((select count(*)::int from public.team_program_contacts where advisor_user_id = 'ec000000-0000-4000-8000-000000000002'), 0, 'leaving the organisation ends the contact role');
set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.ok(not public.program_tasks_access('ec000000-0000-4000-8000-0000000000c0'), 'a former contact no longer reaches the program tasks');
reset role;
select extensions.ok(not public.program_task_assignee_ok('ec000000-0000-4000-8000-0000000000c0', 'ec000000-0000-4000-8000-000000000002'), 'and cannot be assigned any more');
-- Das Team und die Inhaberin behalten ihren Zugang.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.ok(public.program_tasks_access('ec000000-0000-4000-8000-0000000000c0'), 'the team keeps its access');
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.ok(public.program_tasks_access('ec000000-0000-4000-8000-0000000000c0'), 'the owner keeps hers');

-- Feedback: die Seite ist nie ein fremder Host, die eigene Zeile ist lesbar, fremde nicht.
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$insert into public.product_feedback(user_id,source,kind,message,page_path) values ('ec000000-0000-4000-8000-000000000003','nav','help','x','//evil.example/x')$$, '23514', null, 'a page path cannot point to another host');
select extensions.throws_ok($$insert into public.product_feedback(user_id,source,kind,message,page_path) values ('ec000000-0000-4000-8000-000000000003','nav','help','x','/a\b')$$, '23514', null, 'nor contain a backslash');
select extensions.lives_ok($$insert into public.product_feedback(user_id,source,kind,message,page_path) values ('ec000000-0000-4000-8000-000000000003','nav','help','x','/teams/:id/setup')$$, 'a normal page path is fine');
select extensions.is((select count(*)::int from public.product_feedback), 1, 'a person reads her own feedback (data export), and nobody else''s');

select * from extensions.finish();
rollback;
