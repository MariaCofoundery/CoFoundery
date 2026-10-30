\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e9000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values ('e9000000-0000-4000-8000-0000000000a0', 'Programm Zehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000001','owner','active'),
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000004','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('e9000000-0000-4000-8000-0000000000b0', 'Allein', 'existing_team'),
('e9000000-0000-4000-8000-0000000000b1', 'Zu zweit', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e9000000-0000-4000-8000-0000000000b0','e9000000-0000-4000-8000-000000000002'),
('e9000000-0000-4000-8000-0000000000b1','e9000000-0000-4000-8000-000000000003'),
('e9000000-0000-4000-8000-0000000000b1','e9000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-0000000000b0','active', now()),
('e9000000-0000-4000-8000-0000000000c1','e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-0000000000b1','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-000000000002'),
('e9000000-0000-4000-8000-0000000000c1','e9000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-000000000004');

select extensions.ok(not public.team_program_is_active('e9000000-0000-4000-8000-0000000000c0'), 'a team of one is not active by default');

set local role authenticated;
-- Fremde Person darf nichts markieren.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.throws_ok($$select public.set_team_program_solo('e9000000-0000-4000-8000-0000000000c0', true)$$, '42501', null, 'a stranger cannot mark the team');

-- Die Bezugsperson der Organisation darf es.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.set_team_program_solo('e9000000-0000-4000-8000-0000000000c0', true);
select extensions.ok((select is_active and solo_confirmed from public.get_org_team_programs('e9000000-0000-4000-8000-0000000000a0') where program_id = 'e9000000-0000-4000-8000-0000000000c0'), 'the contact marks it complete, the team is active');

-- Ein Team mit zwei Personen laesst sich nicht als Ein-Personen-Team markieren.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.set_team_program_solo('e9000000-0000-4000-8000-0000000000c1', true)$$, '23514', null, 'only a team of one can be marked');

-- Die Organisation nimmt die Markierung nicht zurueck, das Team schon.
select extensions.throws_ok($$select public.set_team_program_solo('e9000000-0000-4000-8000-0000000000c0', false)$$, '42501', null, 'the organisation cannot undo it');
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.ok((select solo_confirmed from public.get_my_team_programs()), 'the team sees the mark');
select public.set_team_program_solo('e9000000-0000-4000-8000-0000000000c0', false);
select extensions.ok(not (select is_active from public.get_my_team_programs()), 'and takes it back: waiting again');

-- Kommt eine zweite Person, schaltet die Markierung nichts frei: Zustimmung noetig.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.set_team_program_solo('e9000000-0000-4000-8000-0000000000c0', true);
reset role;
insert into public.founder_team_members(team_id, user_id) values ('e9000000-0000-4000-8000-0000000000b0','e9000000-0000-4000-8000-000000000005');
select extensions.ok(not public.team_program_is_active('e9000000-0000-4000-8000-0000000000c0'), 'a second person without consent: not active, the mark does not override');
insert into public.team_program_consents(program_id, founder_user_id) values ('e9000000-0000-4000-8000-0000000000c0','e9000000-0000-4000-8000-000000000005');
select extensions.ok(public.team_program_is_active('e9000000-0000-4000-8000-0000000000c0'), 'with both consents: active');
select extensions.ok(public.team_program_is_active('e9000000-0000-4000-8000-0000000000c1') = false, 'the unmarked second team without full consent stays inactive');

select * from extensions.finish();
rollback;
