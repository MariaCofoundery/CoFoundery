\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

-- ---------------------------------------------------------------------------
-- Teamraum: nur fuer die Mitglieder der Organisation
-- ---------------------------------------------------------------------------
--
-- 1 Inhaberin, 2 Advisor (Bezugsperson von Team A), 3 Advisor ohne Team,
-- 4 Founder im Team A (im Programm), 5 von aussen.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e2000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'tr' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values ('e2000000-0000-4000-8000-0000000000a0', 'Teamraum Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e2000000-0000-4000-8000-0000000000a0','e2000000-0000-4000-8000-000000000001','owner','active'),
('e2000000-0000-4000-8000-0000000000a0','e2000000-0000-4000-8000-000000000002','advisor','active'),
('e2000000-0000-4000-8000-0000000000a0','e2000000-0000-4000-8000-000000000003','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('e2000000-0000-4000-8000-0000000000b0', 'Team A', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('e2000000-0000-4000-8000-0000000000b0','e2000000-0000-4000-8000-000000000004');
insert into public.team_programs(id, org_id, team_id, status) values ('e2000000-0000-4000-8000-0000000000c0','e2000000-0000-4000-8000-0000000000a0','e2000000-0000-4000-8000-0000000000b0','active');
insert into public.team_program_contacts(program_id, advisor_user_id) values ('e2000000-0000-4000-8000-0000000000c0','e2000000-0000-4000-8000-000000000002');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;

set local role authenticated;

-- Anlegen: jedes Mitglied.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into ids values ('plain', public.save_org_task(null, 'e2000000-0000-4000-8000-0000000000a0', 'Raum buchen', null, 'open', 'e2000000-0000-4000-8000-000000000001', current_date + 2, null, null,
  '[{"text":"Angebot vergleichen"},{"text":"  "},{"text":"Zusage schicken","done":true}, 7]'::jsonb));
select extensions.is((select count(*)::int from public.advisor_org_tasks), 1, 'a member creates a task');
select extensions.is((select checklist from public.advisor_org_tasks where id = (select id from ids where key = 'plain')),
  '[{"done": false, "text": "Angebot vergleichen"}, {"done": true, "text": "Zusage schicken"}]'::jsonb,
  'the checklist keeps only real lines');

-- Ein Team verknuepft nur, wer es sieht.
select extensions.throws_ok(
  $$select public.save_org_task(null, 'e2000000-0000-4000-8000-0000000000a0', 'Pitch-Feedback', null, 'open', null, null, 'e2000000-0000-4000-8000-0000000000c0', null, '[]')$$,
  '42501', 'org_task_program_not_visible',
  'a member who cannot see the team cannot link it');
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('linked', public.save_org_task(null, 'e2000000-0000-4000-8000-0000000000a0', 'Pitch-Feedback', null, 'open', null, null, 'e2000000-0000-4000-8000-0000000000c0', null, '[]'));
select extensions.isnt((select id from ids where key = 'linked'), null, 'the contact person can link the team');

-- Bearbeiten durch jemand anderen laesst die bestehende Verknuepfung stehen.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.save_org_task((select id from ids where key = 'linked'), null, 'Pitch-Feedback geben', null, 'doing', null, null, 'e2000000-0000-4000-8000-0000000000c0', null, '[]');
select extensions.is((select status from public.advisor_org_tasks where id = (select id from ids where key = 'linked')), 'doing', 'any member edits a shared task');

-- Zustaendig nur Mitglieder.
select extensions.throws_ok(
  $$select public.save_org_task(null, 'e2000000-0000-4000-8000-0000000000a0', 'X', null, 'open', 'e2000000-0000-4000-8000-000000000004', null, null, null, '[]')$$,
  '22023', 'org_task_assignee_not_member',
  'a founder cannot be made responsible');

-- Board: verschieben, uebernehmen, abhaken.
select public.move_org_task((select id from ids where key = 'plain'), 'done');
select extensions.ok((select done_at is not null from public.advisor_org_tasks where id = (select id from ids where key = 'plain')), 'done tasks get a date');
select public.move_org_task((select id from ids where key = 'plain'), 'open');
select extensions.ok((select done_at is null from public.advisor_org_tasks where id = (select id from ids where key = 'plain')), 'reopened tasks lose it');
select public.take_org_task((select id from ids where key = 'linked'));
select extensions.is((select assignee_user_id from public.advisor_org_tasks where id = (select id from ids where key = 'linked')), 'e2000000-0000-4000-8000-000000000003'::uuid, 'taking a task makes you responsible');
select public.check_org_task_item((select id from ids where key = 'plain'), 0, true);
select extensions.is((select checklist->0->>'done' from public.advisor_org_tasks where id = (select id from ids where key = 'plain')), 'true', 'a checklist line can be ticked');

select public.add_org_task_comment((select id from ids where key = 'plain'), 'Kulturzentrum hat auch Catering');
select extensions.is((select count(*)::int from public.advisor_org_task_comments), 1, 'members comment');

-- Lesen: Mitglieder ja, Team im Programm und Aussen nein.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_tasks), 0, 'a founder in the program sees no task');
select extensions.is((select count(*)::int from public.advisor_org_task_comments), 0, 'nor comments');
select extensions.throws_ok(
  $$select public.save_org_task(null, 'e2000000-0000-4000-8000-0000000000a0', 'X', null, 'open', null, null, null, null, '[]')$$,
  '42501', 'org_task_not_yours',
  'a founder cannot write into the team space');
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_tasks), 0, 'somebody outside sees nothing');
select extensions.throws_ok($$insert into public.advisor_org_tasks(org_id, title) values ('e2000000-0000-4000-8000-0000000000a0', 'x')$$, '42501', null, 'the table cannot be written directly');

-- Loeschen: wer angelegt hat oder die Fuehrung.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.delete_org_task((select id from ids where key = 'linked'))$$, '42501', 'org_task_not_yours', 'a member cannot delete what someone else created');

-- Wer macht was: Vertretung nur durch andere Mitglieder.
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_my_org_presence('e2000000-0000-4000-8000-0000000000a0', 'Finanzierung', current_date + 7, 'e2000000-0000-4000-8000-000000000004')$$,
  '22023', 'org_task_assignee_not_member',
  'a founder cannot stand in');
select public.set_my_org_presence('e2000000-0000-4000-8000-0000000000a0', 'Finanzierung', current_date + 7, 'e2000000-0000-4000-8000-000000000003');
select extensions.is((select team_role || ':' || stand_in_user_id from public.advisor_org_member_presence where user_id = 'e2000000-0000-4000-8000-000000000002'),
  'Finanzierung:e2000000-0000-4000-8000-000000000003', 'presence is saved with role and stand-in');

-- Ausgesetzt: lesen ja, schreiben nein.
reset role;
update public.advisor_orgs set status = 'suspended' where id = 'e2000000-0000-4000-8000-0000000000a0';
set local role authenticated;
set local request.jwt.claims = '{"sub":"e2000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.move_org_task((select id from ids where key = 'plain'), 'done')$$, '42501', 'org_task_not_yours', 'a suspended organization is read-only');
reset role;
update public.advisor_orgs set status = 'active' where id = 'e2000000-0000-4000-8000-0000000000a0';

-- Mitgliedschaft endet: Zustaendigkeit und Vertretung durch diese Person gehen, die Aufgabe bleibt.
update public.advisor_org_members set status = 'revoked', revoked_at = now() where user_id = 'e2000000-0000-4000-8000-000000000003';
select extensions.is(
  (select count(*)::int from public.advisor_org_tasks where assignee_user_id = 'e2000000-0000-4000-8000-000000000003'),
  0, 'tasks of a member who left have nobody responsible');
select extensions.is(
  (select stand_in_user_id from public.advisor_org_member_presence where user_id = 'e2000000-0000-4000-8000-000000000002'),
  null, 'and nobody is stood in for by them');

select * from extensions.finish();
rollback;
