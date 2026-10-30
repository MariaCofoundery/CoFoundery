\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e8000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 6) n;
insert into public.profiles(user_id, display_name, roles)
select ('e8000000-0000-4000-8000-00000000000' || n)::uuid, 'Nutzer ' || n, array['founder'] from generate_series(2, 3) n;
insert into public.advisor_orgs(id, name) values ('e8000000-0000-4000-8000-0000000000a0', 'Programm Neun');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000001','owner','active');

set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.create_team_program_code('e8000000-0000-4000-8000-0000000000a0', 'NEUT7345', 'Herbst', 1, 30);
select public.create_team_program_code('e8000000-0000-4000-8000-0000000000a0', 'WEEE7345', 'Weit', 5, 30);

-- Kontogrenze: 5 Konten je Team-Platz (Code NEUT7345 hat einen Platz).
select extensions.ok(public.is_valid_team_program_code('NEUT7345'), 'a fresh code lets accounts be created');
select public.record_team_program_code_arrival('neut7345');
select public.record_team_program_code_arrival('neut7345');
select extensions.is((select accounts from public.list_team_program_codes('e8000000-0000-4000-8000-0000000000a0') where code = 'NEUT7345'), 1, 'the same account counts once');

set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.record_team_program_code_arrival('NEUT7345');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.record_team_program_code_arrival('NEUT7345');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.record_team_program_code_arrival('NEUT7345');
select extensions.ok(public.is_valid_team_program_code('NEUT7345'), 'four accounts: still valid');
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000005","role":"authenticated"}';
select public.record_team_program_code_arrival('NEUT7345');
select extensions.ok(not public.is_valid_team_program_code('NEUT7345'), 'five accounts: no further account is created');

-- Team anlegen und beitreten, allein.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
create temp table prog as select public.create_team_for_program_code('weee7345', 'Seeblick') as id;
grant select on prog to authenticated;
select extensions.isnt((select id from prog), null, 'a person without a team creates one and joins');
select extensions.is((select member_count from public.get_my_team_programs()), 1, 'the new team has one member');
select extensions.ok(not (select is_active from public.get_my_team_programs()), 'alone, the team waits for co-founders and is not active');

-- Falscher Code: kein Team entsteht.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.is(public.create_team_for_program_code('XXXXXXXX', 'Nein'), null, 'a wrong code returns nothing');
reset role;
select extensions.is((select count(*)::int from public.founder_team_members where user_id = 'e8000000-0000-4000-8000-000000000006'), 0, 'and creates no team');

-- Zweite Person kommt dazu: Hinweis, aktiv erst nach Zustimmung.
insert into public.founder_team_members(team_id, user_id)
select team_id, 'e8000000-0000-4000-8000-000000000003' from public.team_programs where id = (select id from prog);
select extensions.is((select count(*)::int from public.in_app_notices where recipient_user_id = 'e8000000-0000-4000-8000-000000000003' and kind = 'program_invited'), 1, 'the new member is told about the programme');
set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.consent_team_program((select id from prog));
select extensions.ok((select is_active from public.get_my_team_programs()), 'two people who both consented: active');

select * from extensions.finish();
rollback;
