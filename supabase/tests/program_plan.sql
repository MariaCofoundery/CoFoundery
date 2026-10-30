\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ee000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 7) n;
insert into public.advisor_orgs(id, name) values ('ee000000-0000-4000-8000-0000000000a0', 'Programm Vierzehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-000000000001','owner','active'),
('ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-000000000004','advisor','active'),
('ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-000000000005','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('ee000000-0000-4000-8000-0000000000b0', 'Eins', 'existing_team'),
('ee000000-0000-4000-8000-0000000000b1', 'Zwei', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ee000000-0000-4000-8000-0000000000b0','ee000000-0000-4000-8000-000000000002'),
('ee000000-0000-4000-8000-0000000000b0','ee000000-0000-4000-8000-000000000003'),
('ee000000-0000-4000-8000-0000000000b1','ee000000-0000-4000-8000-000000000006'),
('ee000000-0000-4000-8000-0000000000b1','ee000000-0000-4000-8000-000000000007');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('ee000000-0000-4000-8000-0000000000c0','ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-0000000000b0','active', now()),
('ee000000-0000-4000-8000-0000000000c1','ee000000-0000-4000-8000-0000000000a0','ee000000-0000-4000-8000-0000000000b1','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('ee000000-0000-4000-8000-0000000000c0','ee000000-0000-4000-8000-000000000002'),
('ee000000-0000-4000-8000-0000000000c0','ee000000-0000-4000-8000-000000000003'),
('ee000000-0000-4000-8000-0000000000c1','ee000000-0000-4000-8000-000000000006'),
('ee000000-0000-4000-8000-0000000000c1','ee000000-0000-4000-8000-000000000007');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('ee000000-0000-4000-8000-0000000000c0','ee000000-0000-4000-8000-000000000004');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok($$select public.save_program_event('ee000000-0000-4000-8000-0000000000a0', null, 'Workshop', 'education', now(), null, null, null)$$, '42501', null, 'a contact cannot create events');

set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000001","role":"authenticated"}';
create temp table ev as select public.save_program_event('ee000000-0000-4000-8000-0000000000a0', null, 'Education Donnerstag', 'education', now() + interval '3 days', 'Raum 2', 'Bitte pünktlich', 'Folien lesen') as id;
grant select on ev to authenticated;
select extensions.isnt((select id from ev), null, 'the owner creates an event');
select extensions.is((select count(*)::int from public.list_program_events('ee000000-0000-4000-8000-0000000000a0')), 1, 'and lists it');
select extensions.is((select count(*)::int from public.get_event_attendance((select id from ev))), 2, 'the owner sees every active team for attendance');

-- Bezugsperson: nur das eigene Team.
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_event_attendance((select id from ev))), 1, 'a contact sees only their own team');
select public.set_program_attendance((select id from ev), 'ee000000-0000-4000-8000-0000000000c0', 'absent');
select extensions.throws_ok($$select public.set_program_attendance((select id from ev), 'ee000000-0000-4000-8000-0000000000c1', 'present')$$, '42501', null, 'but cannot mark another team');
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.throws_ok($$select public.set_program_attendance((select id from ev), 'ee000000-0000-4000-8000-0000000000c0', 'present')$$, '42501', null, 'an org member who is not a contact cannot either');

-- Das Team sieht Plan und den EIGENEN Eintrag, nicht die der anderen.
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select my_status from public.get_my_program_events()), 'absent', 'the team sees its own entry');
select extensions.is((select count(*)::int from public.get_my_program_events()), 1, 'and only its own program');
select extensions.is((select count(*)::int from public.get_event_attendance((select id from ev))), 0, 'but the attendance list itself is not served to a founder');

-- Endet das Programm, ist die Teilnahme weg.
reset role;
update public.team_programs set status = 'ended', ended_at = now() where id = 'ee000000-0000-4000-8000-0000000000c0';
select extensions.is((select count(*)::int from public.team_program_attendance), 0, 'ending the program deletes its attendance');

-- Ohne Zustimmung aller kann niemand eintragen.
delete from public.team_program_consents where founder_user_id = 'ee000000-0000-4000-8000-000000000007';
set local role authenticated;
set local request.jwt.claims = '{"sub":"ee000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.set_program_attendance((select id from ev), 'ee000000-0000-4000-8000-0000000000c1', 'present')$$, '55000', null, 'an inactive program takes no attendance');

select * from extensions.finish();
rollback;
