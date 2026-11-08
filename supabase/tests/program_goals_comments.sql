\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

-- ---------------------------------------------------------------------------
-- Aufgaben im Programm (20270329120000): 1 Inhaberin, 2 Ansprechperson (Team Eins), 3 Advisor ohne Rolle am Team,
-- 4 Gruenderin Team Eins, 5 Gruenderin Team Zwei (anderes Startup derselben Organisation).
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ed000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'pextra' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.profiles(user_id, roles) select ('ed000000-0000-4000-8000-00000000000' || n)::uuid, array['founder'] from generate_series(4, 5) n on conflict (user_id) do nothing;
insert into public.advisor_orgs(id, name) values ('ed000000-0000-4000-8000-0000000000a0', 'Extras Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000001','owner','active'),
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000002','advisor','active'),
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000003','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('ed000000-0000-4000-8000-0000000000b0', 'Eins', 'existing_team'),
('ed000000-0000-4000-8000-0000000000b1', 'Zwei', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ed000000-0000-4000-8000-0000000000b0','ed000000-0000-4000-8000-000000000004'),
('ed000000-0000-4000-8000-0000000000b1','ed000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-0000000000b0','active', now(), now()),
('ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-0000000000b1','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000004'),
('ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-000000000005');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000002');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

-- Die Ansprechperson (2) legt eine Aufgabe mit Checkliste an; die Gruenderin (4) hakt einen Punkt ab.
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('t', public.save_program_task(null, 'ed000000-0000-4000-8000-0000000000c0', 'Pitch-Deck', null, 'open', null, 'ed000000-0000-4000-8000-000000000004', 'shared', '[{"text":"Folien","done":false},{"text":"Zahlen","done":false}]'));
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.check_program_task_item((select id from ids where key = 't'), 1, true);
select extensions.is((select checklist->1->>'done' from public.team_program_tasks where id = (select id from ids where key = 't')), 'true', 'the founder ticks a checklist item');
select extensions.throws_ok($$select public.check_program_task_item((select id from ids where key = 't'), 9, true)$$, '22023', 'program_task_invalid', 'a missing item is refused');
insert into ids values ('mine', public.save_program_task(null, 'ed000000-0000-4000-8000-0000000000c0', 'Privat', null, 'open', null, null, 'private', '[{"text":"A","done":false}]'));

-- Kommentare: beide Seiten, Hinweis an die andere Seite, nie an sich selbst.
select public.add_program_task_comment((select id from ids where key = 't'), 'Folien kommen heute Abend.');
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'program_task_comment' and recipient_user_id = 'ed000000-0000-4000-8000-000000000002'), 1, 'the other side is told about a comment');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'program_task_comment' and recipient_user_id = 'ed000000-0000-4000-8000-000000000004'), 0, 'but not the author');
set local role authenticated;
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_program_task_comments), 1, 'the advisor reads the comment');
select public.add_program_task_comment((select id from ids where key = 't'), 'Super, danke.');
select extensions.is((select count(*)::int from public.team_program_task_comments), 2, 'and answers');
select extensions.throws_ok($$select public.add_program_task_comment((select id from ids where key = 'mine'), 'Mitlesen')$$, '42501', 'program_task_not_yours', 'nobody comments on a private task of someone else');
select extensions.throws_ok($$select public.check_program_task_item((select id from ids where key = 'mine'), 0, true)$$, '42501', 'program_task_not_yours', 'or ticks its checklist');

set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_program_task_comments), 0, 'another startup reads no comment');
select extensions.throws_ok($$select public.add_program_task_comment((select id from ids where key = 't'), 'Hallo')$$, '42501', 'program_task_not_yours', 'and cannot add one');

-- Ziele: beide Seiten legen an, bearbeiten und haken ab.
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('goal', public.save_program_goal(null, 'ed000000-0000-4000-8000-0000000000c0', 'Erste zahlende Kunden', 'Bis Jahresende', current_date + 60));
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select title from public.team_program_goals), 'Erste zahlende Kunden', 'the startup sees the goal');
select public.save_program_goal((select id from ids where key = 'goal'), null, 'Erste drei zahlende Kunden', 'Bis Jahresende', current_date + 60);
select public.set_program_goal_status((select id from ids where key = 'goal'), 'reached');
select extensions.is((select status || ':' || (reached_at is not null)::text from public.team_program_goals), 'reached:true', 'the startup edits and ticks it off');
select extensions.throws_ok($$select public.delete_program_goal((select id from ids where key = 'goal'))$$, '42501', 'program_goal_not_yours', 'but cannot delete what the advisor set');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_program_goals), 0, 'another advisor sees no goals');
select extensions.throws_ok($$select public.set_program_goal_status((select id from ids where key = 'goal'), 'open')$$, '42501', 'program_goal_not_yours', 'and cannot change them');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.delete_program_goal((select id from ids where key = 'goal'));
select extensions.is((select count(*)::int from public.team_program_goals), 0, 'the owner deletes a goal');

-- Das Programm endet: Ziele gehen mit.
insert into ids values ('goal2', public.save_program_goal(null, 'ed000000-0000-4000-8000-0000000000c0', 'Noch ein Ziel', null, null));
reset role;
update public.team_programs set status = 'ended', ended_at = now() where id = 'ed000000-0000-4000-8000-0000000000c0';
select extensions.is((select count(*)::int from public.team_program_goals), 0, 'when the program ends the goals go with it');

select * from extensions.finish();
rollback;
