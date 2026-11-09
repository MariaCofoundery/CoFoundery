\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

-- 1 Inhaberin, 2 Gruenderin (Team Eins), 3 Fremde.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ed100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'arch' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.profiles(user_id, roles) values ('ed100000-0000-4000-8000-000000000002', array['founder']) on conflict (user_id) do nothing;
insert into public.advisor_orgs(id, name) values ('ed100000-0000-4000-8000-0000000000a0', 'Archiv Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values ('ed100000-0000-4000-8000-0000000000a0','ed100000-0000-4000-8000-000000000001','owner','active');
insert into public.founder_teams(id, name, team_context) values ('ed100000-0000-4000-8000-0000000000b0', 'Eins', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('ed100000-0000-4000-8000-0000000000b0','ed100000-0000-4000-8000-000000000002');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('ed100000-0000-4000-8000-0000000000c0','ed100000-0000-4000-8000-0000000000a0','ed100000-0000-4000-8000-0000000000b0','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values ('ed100000-0000-4000-8000-0000000000c0','ed100000-0000-4000-8000-000000000002');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"ed100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('event', public.save_program_event('ed100000-0000-4000-8000-0000000000a0', null, 'Pitch-Tag', 'education', now() + interval '10 days', null, null, null));
select public.set_program_attendance((select id from ids where key = 'event'), 'ed100000-0000-4000-8000-0000000000c0', 'present');

set local request.jwt.claims = '{"sub":"ed100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_events()), 1, 'the team sees the event');
select extensions.throws_ok($$select public.archive_program_event((select id from ids where key = 'event'))$$, '42501', null, 'a founder cannot archive');

set local request.jwt.claims = '{"sub":"ed100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.archive_program_event((select id from ids where key = 'event'))$$, '42501', null, 'neither can a stranger');

set local request.jwt.claims = '{"sub":"ed100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.archive_program_event((select id from ids where key = 'event'));
select extensions.ok((select archived_at is not null from public.list_program_events('ed100000-0000-4000-8000-0000000000a0') where event_id = (select id from ids where key = 'event')), 'the organisation still lists it, marked archived');
select extensions.is((select attendance from public.get_org_report_attendance('ed100000-0000-4000-8000-0000000000a0', null, null) where event_id = (select id from ids where key = 'event')), 'present', 'the report still counts the archived event and its attendance');
select extensions.throws_ok($$select public.set_program_attendance((select id from ids where key = 'event'), 'ed100000-0000-4000-8000-0000000000c0', 'absent')$$, '55000', 'program_event_archived', 'an archived event is frozen: no new attendance');
select extensions.throws_ok($$select public.save_program_event('ed100000-0000-4000-8000-0000000000a0', (select id from ids where key = 'event'), 'Anders', 'education', now() + interval '11 days', null, null, null)$$, '55000', 'program_event_archived', 'and cannot be edited');

set local request.jwt.claims = '{"sub":"ed100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_events()), 0, 'the team no longer sees an archived event');
select extensions.throws_ok($$select public.set_program_event_rsvp((select id from ids where key = 'event'), 'ed100000-0000-4000-8000-0000000000c0', 'yes', false)$$, '55000', 'program_event_archived', 'and cannot answer it');

set local request.jwt.claims = '{"sub":"ed100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.restore_program_event((select id from ids where key = 'event'));
set local request.jwt.claims = '{"sub":"ed100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_my_program_events()), 1, 'restoring brings it back for the team');

select * from extensions.finish();
rollback;
