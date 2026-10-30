\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ed000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values ('ed000000-0000-4000-8000-0000000000a0', 'Programm Dreizehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000001','owner','active'),
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000004','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('ed000000-0000-4000-8000-0000000000b0', 'Raus', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ed000000-0000-4000-8000-0000000000b0','ed000000-0000-4000-8000-000000000002'),
('ed000000-0000-4000-8000-0000000000b0','ed000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at)
values ('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000002'),
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000004');
insert into public.team_program_milestones(program_id, title) values ('ed000000-0000-4000-8000-0000000000c0', 'Erster Kunde');

set local role authenticated;
-- Nur der Inhaber entfernt.
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok($$select public.remove_team_from_program('ed000000-0000-4000-8000-0000000000c0')$$, '42501', null, 'a contact cannot remove the team');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.remove_team_from_program('ed000000-0000-4000-8000-0000000000c0')$$, '42501', null, 'a founder of the team cannot use the organisation path');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.throws_ok($$select public.remove_team_from_program('ed000000-0000-4000-8000-0000000000c0')$$, '42501', null, 'a stranger cannot');

set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.remove_team_from_program('ed000000-0000-4000-8000-0000000000c0');
reset role;
select extensions.is((select status from public.team_programs where id = 'ed000000-0000-4000-8000-0000000000c0'), 'ended', 'the owner ends the program');
select extensions.is((select count(*)::int from public.team_program_milestones where program_id = 'ed000000-0000-4000-8000-0000000000c0'), 0, 'its data is deleted');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'program_removed' and subject_id = 'ed000000-0000-4000-8000-0000000000c0'), 2, 'every person in the team is told');
select extensions.is((select ended_by_user_id from public.team_programs where id = 'ed000000-0000-4000-8000-0000000000c0'), 'ed000000-0000-4000-8000-000000000001'::uuid, 'and it is recorded who ended it');

select * from extensions.finish();
rollback;
