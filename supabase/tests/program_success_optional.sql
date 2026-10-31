\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f2000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.advisor_orgs(id, name) values ('f2000000-0000-4000-8000-0000000000a0', 'Programm Achtzehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('f2000000-0000-4000-8000-0000000000a0','f2000000-0000-4000-8000-000000000001','owner','active'),
('f2000000-0000-4000-8000-0000000000a0','f2000000-0000-4000-8000-000000000004','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('f2000000-0000-4000-8000-0000000000b0', 'Optional', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('f2000000-0000-4000-8000-0000000000b0','f2000000-0000-4000-8000-000000000002'),
('f2000000-0000-4000-8000-0000000000b0','f2000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at)
values ('f2000000-0000-4000-8000-0000000000c0','f2000000-0000-4000-8000-0000000000a0','f2000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('f2000000-0000-4000-8000-0000000000c0','f2000000-0000-4000-8000-000000000002'),
('f2000000-0000-4000-8000-0000000000c0','f2000000-0000-4000-8000-000000000003');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.get_success_enabled('f2000000-0000-4000-8000-0000000000a0'), false, 'off by default');

set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_outcomes('f2000000-0000-4000-8000-0000000000c0')), 0, 'while off, the team sees no achievements');
select extensions.throws_ok($$select public.report_program_outcome('f2000000-0000-4000-8000-0000000000c0', gen_random_uuid(), current_date, null)$$, '55000', null, 'and nothing can be recorded');

set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok($$select public.set_success_enabled('f2000000-0000-4000-8000-0000000000a0', true)$$, '42501', null, 'only the owner switches it on');

set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_success_enabled('f2000000-0000-4000-8000-0000000000a0', true);
select extensions.is(public.get_success_enabled('f2000000-0000-4000-8000-0000000000a0'), true, 'the owner switches it on');
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.cmp_ok((select count(*)::int from public.get_program_outcomes('f2000000-0000-4000-8000-0000000000c0')), '>', 0, 'then the team sees the catalog');

set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_success_enabled('f2000000-0000-4000-8000-0000000000a0', false);
set local request.jwt.claims = '{"sub":"f2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_outcomes('f2000000-0000-4000-8000-0000000000c0')), 0, 'switching off hides it again');

select * from extensions.finish();
rollback;
