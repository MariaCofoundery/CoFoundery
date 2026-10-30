\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ef000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values ('ef000000-0000-4000-8000-0000000000a0', 'Programm Fuenfzehn');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-000000000001','owner','active'),
('ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-000000000004','advisor','active'),
('ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-000000000005','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('ef000000-0000-4000-8000-0000000000b0', 'Notiz', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ef000000-0000-4000-8000-0000000000b0','ef000000-0000-4000-8000-000000000002'),
('ef000000-0000-4000-8000-0000000000b0','ef000000-0000-4000-8000-000000000003');
insert into public.team_programs(id, org_id, team_id, status, activated_at)
values ('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-0000000000b0','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-000000000002'),
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-000000000003');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-000000000004');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.ok(public.can_keep_program_notes('ef000000-0000-4000-8000-0000000000c0'), 'a contact may keep notes on the team');
insert into public.advisor_private_notes (program_id, advisor_user_id, body) values ('ef000000-0000-4000-8000-0000000000c0', 'ef000000-0000-4000-8000-000000000004', 'Gespraech am Montag');
insert into public.advisor_follow_ups (program_id, advisor_user_id, due_on) values ('ef000000-0000-4000-8000-0000000000c0', 'ef000000-0000-4000-8000-000000000004', current_date + 7);
select extensions.is((select body from public.advisor_private_notes where program_id = 'ef000000-0000-4000-8000-0000000000c0'), 'Gespraech am Montag', 'and reads their own note');

-- Niemand sonst sieht sie, auch nicht der Inhaber derselben Organisation.
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.ok(public.can_keep_program_notes('ef000000-0000-4000-8000-0000000000c0'), 'the owner may keep notes too');
select extensions.is((select count(*)::int from public.advisor_private_notes where program_id = 'ef000000-0000-4000-8000-0000000000c0'), 0, 'but does not read the contact''s note');

set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.ok(not public.can_keep_program_notes('ef000000-0000-4000-8000-0000000000c0'), 'an org member who is neither owner nor contact may not');
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.ok(not public.can_keep_program_notes('ef000000-0000-4000-8000-0000000000c0'), 'nor a founder of the team');

-- Ende des Programms: Notizen und Wiedervorlagen sind weg.
reset role;
update public.team_programs set status = 'ended', ended_at = now() where id = 'ef000000-0000-4000-8000-0000000000c0';
select extensions.is((select count(*)::int from public.advisor_private_notes where program_id = 'ef000000-0000-4000-8000-0000000000c0'), 0, 'ending the program deletes the notes');
select extensions.is((select count(*)::int from public.advisor_follow_ups where program_id = 'ef000000-0000-4000-8000-0000000000c0'), 0, 'and the follow-ups');

select * from extensions.finish();
rollback;
