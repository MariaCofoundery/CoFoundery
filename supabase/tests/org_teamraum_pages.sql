\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(18);

-- ---------------------------------------------------------------------------
-- Teamraum-Seiten: nur Mitglieder, ein flacher Baum, niemand ueberschreibt still,
-- Haekchen-Zeilen und Aufgaben halten sich auf dem gleichen Stand.
-- 1 Inhaberin, 2 Advisor, 4 Founder im Programm, 5 von aussen.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e3000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'pg' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values ('e3000000-0000-4000-8000-0000000000a0', 'Seiten Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e3000000-0000-4000-8000-0000000000a0','e3000000-0000-4000-8000-000000000001','owner','active'),
('e3000000-0000-4000-8000-0000000000a0','e3000000-0000-4000-8000-000000000002','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('e3000000-0000-4000-8000-0000000000b0', 'Team B', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values ('e3000000-0000-4000-8000-0000000000b0','e3000000-0000-4000-8000-000000000004');
insert into public.team_programs(id, org_id, team_id, status) values ('e3000000-0000-4000-8000-0000000000c0','e3000000-0000-4000-8000-0000000000a0','e3000000-0000-4000-8000-0000000000b0','active');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('top', public.save_org_page(null, 'e3000000-0000-4000-8000-0000000000a0', null, 'Programm-Handbuch', '# Handbuch', null, false, null));
insert into ids values ('mid', public.save_org_page(null, 'e3000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'top'), 'Demo Day', E'## Vorher\n[x] Termin mit dem Kulturzentrum\n- [ ] Raum bestaetigen\n[ ] Jury anfragen\nEinlass ab 17 Uhr', null, false, null));
insert into ids values ('low', public.save_org_page(null, 'e3000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'mid'), 'Ablauf', '', null, false, null));
select extensions.is((select count(*)::int from public.advisor_org_pages), 3, 'a member writes pages in three levels');
select extensions.throws_ok(
  $$select public.save_org_page(null, 'e3000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'low'), 'Zu tief', '', null, false, null)$$,
  '22023', 'org_page_too_deep', 'a fourth level is refused');
select extensions.throws_ok(
  $$select public.save_org_page((select id from ids where key = 'top'), null, (select id from ids where key = 'low'), 'Programm-Handbuch', '', null, false, (select updated_at from public.advisor_org_pages where id = (select id from ids where key = 'top')))$$,
  '22023', 'org_page_invalid', 'a page cannot move below its own subpage');

-- Niemand ueberschreibt still.
select extensions.throws_ok(
  $$select public.save_org_page((select id from ids where key = 'top'), null, null, 'Handbuch', 'alt', null, false, '2000-01-01')$$,
  '40001', 'org_page_changed', 'saving an outdated version is refused');
select public.save_org_page((select id from ids where key = 'top'), null, null, 'Handbuch', '# Neu', null, false, (select updated_at from public.advisor_org_pages where id = (select id from ids where key = 'top')));
select extensions.is((select body from public.advisor_org_pages where id = (select id from ids where key = 'top')), '# Neu', 'saving the version you edited works');

-- Haekchen-Zeile -> Aufgabe, und beide ziehen mit.
insert into ids values ('task', public.create_org_task_from_page_item((select id from ids where key = 'mid'), 1, 'Raum bestaetigen'));
select extensions.is((select page_id from public.advisor_org_tasks where id = (select id from ids where key = 'task')), (select id from ids where key = 'mid'), 'a checklist line becomes a task linked to the page');
select extensions.is(public.create_org_task_from_page_item((select id from ids where key = 'mid'), 1, 'Raum bestaetigen'), (select id from ids where key = 'task'), 'asking twice gives the same task');
select extensions.throws_ok(
  $$select public.create_org_task_from_page_item((select id from ids where key = 'mid'), 1, 'Jury anfragen')$$,
  '40001', 'org_page_changed', 'a line that moved is not guessed');
select public.check_org_page_item((select id from ids where key = 'mid'), 1, 'Raum bestaetigen', true);
select extensions.is((select status from public.advisor_org_tasks where id = (select id from ids where key = 'task')), 'done', 'ticking the line on the page finishes the task');
select extensions.ok((select body like E'%- [x] Raum bestaetigen%' from public.advisor_org_pages where id = (select id from ids where key = 'mid')), 'and the line keeps its dash');
select public.move_org_task((select id from ids where key = 'task'), 'open');
select extensions.ok((select body like E'%- [ ] Raum bestaetigen%' from public.advisor_org_pages where id = (select id from ids where key = 'mid')), 'reopening on the board unticks the line');
select extensions.ok((select body like E'%Einlass ab 17 Uhr' from public.advisor_org_pages where id = (select id from ids where key = 'mid')), 'other lines stay as written');

-- Loeschen: nicht mit Unterseiten, nur Anlegende oder Fuehrung.
select extensions.throws_ok($$select public.delete_org_page((select id from ids where key = 'mid'))$$, '55000', 'org_page_has_children', 'a page with subpages is not deleted');
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.delete_org_page((select id from ids where key = 'low')), true, 'the lead can delete a page someone else created');

-- Lesen: nur Mitglieder.
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_pages), 0, 'a founder in the program sees no page');
select extensions.throws_ok(
  $$select public.save_org_page(null, 'e3000000-0000-4000-8000-0000000000a0', null, 'X', '', null, false, null)$$,
  '42501', 'org_page_not_yours', 'a founder cannot write a page');
set local request.jwt.claims = '{"sub":"e3000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_pages), 0, 'somebody outside sees nothing');
select extensions.throws_ok($$update public.advisor_org_pages set title = 'x'$$, '42501', null, 'the table cannot be written directly');

select * from extensions.finish();
rollback;
