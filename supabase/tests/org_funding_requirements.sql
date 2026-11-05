\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

-- ---------------------------------------------------------------------------
-- Foerderauflagen (20270314120000)
-- 1 Inhaberin, 2 Bezugsperson von "Frueh", 3 Advisor ohne Team,
-- 4/5 Founder in "Frueh", 6/8 Founder in "Spaet", 7 von aussen.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e4000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'fund' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 8) n;
insert into public.advisor_orgs(id, name) values ('e4000000-0000-4000-8000-0000000000a0', 'Gefoerderter Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-000000000001','owner','active'),
('e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-000000000002','advisor','active'),
('e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-000000000003','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('e4000000-0000-4000-8000-0000000000b0', 'Frueh', 'existing_team'),
('e4000000-0000-4000-8000-0000000000b1', 'Spaet', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e4000000-0000-4000-8000-0000000000b0','e4000000-0000-4000-8000-000000000004'),
('e4000000-0000-4000-8000-0000000000b0','e4000000-0000-4000-8000-000000000005'),
('e4000000-0000-4000-8000-0000000000b1','e4000000-0000-4000-8000-000000000006'),
('e4000000-0000-4000-8000-0000000000b1','e4000000-0000-4000-8000-000000000008');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-0000000000b0','active', now() - interval '30 days'),
('e4000000-0000-4000-8000-0000000000c1','e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-0000000000b1','active', now() - interval '30 days');
insert into public.team_program_consents(program_id, founder_user_id) values
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-000000000004'),
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-000000000005'),
('e4000000-0000-4000-8000-0000000000c1','e4000000-0000-4000-8000-000000000006'),
('e4000000-0000-4000-8000-0000000000c1','e4000000-0000-4000-8000-000000000008');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-000000000002');
insert into public.team_program_events(id, org_id, title, kind, starts_at) values
('e4000000-0000-4000-8000-0000000000e0','e4000000-0000-4000-8000-0000000000a0','Workshop 1','education', now() - interval '20 days'),
('e4000000-0000-4000-8000-0000000000e1','e4000000-0000-4000-8000-0000000000a0','Workshop 2','education', now() - interval '10 days'),
('e4000000-0000-4000-8000-0000000000e2','e4000000-0000-4000-8000-0000000000a0','Teamrunde','internal', now() - interval '5 days'),
('e4000000-0000-4000-8000-0000000000e3','e4000000-0000-4000-8000-0000000000a0','Vor der Laufzeit','education', now() - interval '400 days'),
('e4000000-0000-4000-8000-0000000000e4','e4000000-0000-4000-8000-0000000000a0','Noch nicht','education', now() + interval '10 days');
insert into public.team_program_attendance(event_id, program_id, status) values
('e4000000-0000-4000-8000-0000000000e0','e4000000-0000-4000-8000-0000000000c0','present'),
('e4000000-0000-4000-8000-0000000000e1','e4000000-0000-4000-8000-0000000000c0','present'),
('e4000000-0000-4000-8000-0000000000e1','e4000000-0000-4000-8000-0000000000c1','absent');
insert into public.program_check_ins(program_id, held_on, summary) values
('e4000000-0000-4000-8000-0000000000c0', current_date - 3, 'Gespraech');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

-- Foerderung und Auflagen: die Fuehrung.
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.save_org_grant(null, 'e4000000-0000-4000-8000-0000000000a0', 'X', null, null, current_date - 100, current_date + 100, null)$$,
  '42501', 'advisor_org_owner_required', 'an advisor does not set up a grant');
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.save_org_grant(null, 'e4000000-0000-4000-8000-0000000000a0', 'X', null, null, current_date, current_date - 1, null)$$,
  '22023', 'org_funding_invalid', 'a period that ends before it starts is refused');
insert into ids values ('grant', public.save_org_grant(null, 'e4000000-0000-4000-8000-0000000000a0', 'Landesprogramm', 'Ministerium', 'AZ-1', current_date - 100, current_date + 100, null));
insert into ids values ('workshops', public.save_org_requirement(null, (select id from ids where key = 'grant'), '8 Workshops', 'count', 'events', 'education', 8, null, null, null));
insert into ids values ('teams', public.save_org_requirement(null, (select id from ids where key = 'grant'), '10 Startups', 'count', 'teams', null, 10, null, null, null));
insert into ids values ('attend', public.save_org_requirement(null, (select id from ids where key = 'grant'), 'Teilnahme je Team', 'per_team', 'event_attendance', null, 2, null, null, null));
insert into ids values ('coaching', public.save_org_requirement(null, (select id from ids where key = 'grant'), 'Coaching je Team', 'per_team', 'manual', null, 10, 'Stunden', null, null));
insert into ids values ('talks', public.save_org_requirement(null, (select id from ids where key = 'grant'), 'Gespraeche je Team', 'per_team', 'check_ins', null, 3, null, null, null));
insert into ids values ('report', public.save_org_requirement(null, (select id from ids where key = 'grant'), 'Zwischenbericht', 'once', 'manual', null, null, null, current_date + 30, null));
select extensions.throws_ok(
  $$select public.save_org_requirement(null, (select id from ids where key = 'grant'), 'Falsch', 'once', 'events', null, null, null, null, null)$$,
  '22023', 'org_funding_invalid', 'a one-off requirement is not counted from the plan');
select extensions.is((select count(*)::int from public.advisor_org_requirements), 6, 'the lead sets up six requirements');

-- Gezaehlt wird innerhalb der Laufzeit und bis heute.
select extensions.is((select auto_value from public.get_org_funding_progress((select id from ids where key = 'grant')) where requirement_id = (select id from ids where key = 'workshops')), 2::numeric, 'only education events inside the period and up to today count');
select extensions.is((select auto_value from public.get_org_funding_progress((select id from ids where key = 'grant')) where requirement_id = (select id from ids where key = 'teams')), 2::numeric, 'teams in the program are counted');
select extensions.is(
  (select auto_value from public.get_org_funding_progress((select id from ids where key = 'grant')) where requirement_id = (select id from ids where key = 'attend') and program_id = 'e4000000-0000-4000-8000-0000000000c0'),
  2::numeric, 'attendance is counted per team');
select extensions.is(
  (select auto_value from public.get_org_funding_progress((select id from ids where key = 'grant')) where requirement_id = (select id from ids where key = 'talks') and program_id = 'e4000000-0000-4000-8000-0000000000c0'),
  1::numeric, 'check-ins are counted per team');

-- Nachweise: Bezugsperson fuer das eigene Team, nicht fuer fremde.
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.add_org_requirement_entry((select id from ids where key = 'coaching'), 'e4000000-0000-4000-8000-0000000000c0', current_date - 2, 2.5, 'Coaching Finanzplan');
select extensions.throws_ok(
  $$select public.add_org_requirement_entry((select id from ids where key = 'coaching'), 'e4000000-0000-4000-8000-0000000000c1', current_date, 1, null)$$,
  '42501', 'org_task_program_not_visible', 'nobody records evidence for a team they do not see');
select extensions.throws_ok(
  $$select public.add_org_requirement_entry((select id from ids where key = 'coaching'), null, current_date, 1, null)$$,
  '22023', 'org_funding_team_needed', 'per-team evidence needs a team');
select extensions.is(
  (select count(*)::int from public.get_org_funding_progress((select id from ids where key = 'grant')) where requirement_id = (select id from ids where key = 'coaching')),
  1, 'the contact person sees only the own team in per-team requirements');
select extensions.is(
  (select manual_value from public.get_org_funding_progress((select id from ids where key = 'grant')) where requirement_id = (select id from ids where key = 'coaching')),
  2.5, 'evidence amounts add up');

-- Ein Advisor ohne Team sieht Nachweise fuer Teams nicht und keine Teamzeilen.
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_requirement_entries), 0, 'evidence for a team stays with those who see the team');
select extensions.is((select count(*)::int from public.get_org_funding_progress((select id from ids where key = 'grant')) where program_id is not null), 0, 'and no per-team rows');
select extensions.is((select count(*)::int from public.advisor_org_requirements), 6, 'but every member reads the requirements');

-- Einmalig: als Aufgabe aufs Board, erledigt = erfuellt.
insert into ids values ('task', public.create_org_task_for_requirement((select id from ids where key = 'report')));
select extensions.is((select due_on from public.advisor_org_tasks where id = (select id from ids where key = 'task')), current_date + 30, 'the task takes the deadline');
select public.move_org_task((select id from ids where key = 'task'), 'done');
select extensions.is((select tasks_done from public.get_org_funding_progress((select id from ids where key = 'grant')) where requirement_id = (select id from ids where key = 'report')), 1, 'a done task counts for the one-off requirement');

-- Stand festhalten: nur die Fuehrung, und nur sie liest ihn.
select extensions.throws_ok($$select public.save_org_funding_snapshot((select id from ids where key = 'grant'), null, '{"x":1}')$$, '42501', 'advisor_org_owner_required', 'only the lead keeps a snapshot');
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.save_org_funding_snapshot((select id from ids where key = 'grant'), 'Zwischenbericht', '{"requirements":[]}');
select extensions.is((select count(*)::int from public.advisor_org_funding_snapshots), 1, 'the lead keeps a snapshot');

-- Teams und Aussen sehen nichts.
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_grants) + (select count(*)::int from public.advisor_org_requirements), 0, 'a founder in the program sees no grant');
select extensions.is((select count(*)::int from public.get_org_funding_progress((select id from ids where key = 'grant'))), 0, 'and no progress');
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000007","role":"authenticated"}';
select extensions.throws_ok($$insert into public.advisor_org_grants(org_id, name, starts_on, ends_on) values ('e4000000-0000-4000-8000-0000000000a0', 'x', current_date, current_date)$$, '42501', null, 'the tables cannot be written directly');

select * from extensions.finish();
rollback;
