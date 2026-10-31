\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f3000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name, program_success_enabled) values ('f3000000-0000-4000-8000-0000000000a0', 'Programm Neunzehn', true);
insert into public.advisor_org_members(org_id, user_id, role, status) values
('f3000000-0000-4000-8000-0000000000a0','f3000000-0000-4000-8000-000000000001','owner','active'),
('f3000000-0000-4000-8000-0000000000a0','f3000000-0000-4000-8000-000000000004','advisor','active'),
('f3000000-0000-4000-8000-0000000000a0','f3000000-0000-4000-8000-000000000005','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('f3000000-0000-4000-8000-0000000000b0', 'Karte', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('f3000000-0000-4000-8000-0000000000b0','f3000000-0000-4000-8000-000000000002'),
('f3000000-0000-4000-8000-0000000000b0','f3000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at)
values ('f3000000-0000-4000-8000-0000000000c0','f3000000-0000-4000-8000-0000000000a0','f3000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('f3000000-0000-4000-8000-0000000000c0','f3000000-0000-4000-8000-000000000002'),
('f3000000-0000-4000-8000-0000000000c0','f3000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('f3000000-0000-4000-8000-0000000000c0','f3000000-0000-4000-8000-000000000004');

set local role authenticated;
set local request.jwt.claims = '{"sub":"f3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_reward('f3000000-0000-4000-8000-0000000000a0', null, 5, 'Coaching', null, true);
select extensions.is((select stars from public.get_org_program_stars('f3000000-0000-4000-8000-0000000000a0')), 0, 'a team without confirmed results has no stars');
select extensions.is((select next_title from public.get_org_program_stars('f3000000-0000-4000-8000-0000000000a0')), 'Coaching', 'and the next reward is named');

set local request.jwt.claims = '{"sub":"f3000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_org_program_stars('f3000000-0000-4000-8000-0000000000a0')), 1, 'the contact sees their own team');
set local request.jwt.claims = '{"sub":"f3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_org_program_stars('f3000000-0000-4000-8000-0000000000a0')), 0, 'an org member who is neither owner nor contact sees nothing');
reset role;
update public.advisor_orgs set program_success_enabled = false where id = 'f3000000-0000-4000-8000-0000000000a0';
set local role authenticated;
set local request.jwt.claims = '{"sub":"f3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_org_program_stars('f3000000-0000-4000-8000-0000000000a0')), 0, 'with the feature off there is nothing');

select * from extensions.finish();
rollback;
