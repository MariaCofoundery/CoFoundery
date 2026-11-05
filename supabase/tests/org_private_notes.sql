\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

-- ---------------------------------------------------------------------------
-- Eigene Notizen (20270315120000): privat heisst privat - auch vor der Fuehrung.
-- 1 Inhaberin, 2 Advisor, 3 Advisor.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e5000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'note' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('e5000000-0000-4000-8000-0000000000a0', 'Notizen Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e5000000-0000-4000-8000-0000000000a0','e5000000-0000-4000-8000-000000000001','owner','active'),
('e5000000-0000-4000-8000-0000000000a0','e5000000-0000-4000-8000-000000000002','advisor','active'),
('e5000000-0000-4000-8000-0000000000a0','e5000000-0000-4000-8000-000000000003','advisor','active');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('note', public.save_org_page(null, 'e5000000-0000-4000-8000-0000000000a0', null, 'Meine Gedanken', E'[ ] Pia wegen Raum fragen', null, false, null, 'private'));
insert into ids values ('team', public.save_org_page(null, 'e5000000-0000-4000-8000-0000000000a0', null, 'Handbuch', '', null, false, null));
select extensions.is((select visibility from public.advisor_org_pages where id = (select id from ids where key = 'note')), 'private', 'a member writes a private note');
select extensions.is((select visibility from public.advisor_org_pages where id = (select id from ids where key = 'team')), 'team', 'pages without a choice belong to the team');
select extensions.throws_ok(
  $$select public.save_org_page(null, 'e5000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'team'), 'Unter', '', null, false, null, 'private')$$,
  '22023', 'org_page_invalid', 'a private note does not sit under a page');
select extensions.throws_ok(
  $$select public.save_org_page(null, 'e5000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'note'), 'Unter Notiz', '', null, false, null)$$,
  '22023', 'org_page_invalid', 'nothing sits under a private note');

-- Niemand sonst sieht oder beruehrt sie - auch nicht die Fuehrung.
set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_pages where id = (select id from ids where key = 'note')), 0, 'the lead does not see a private note');
select extensions.throws_ok($$select public.delete_org_page((select id from ids where key = 'note'))$$, '42501', 'org_page_not_yours', 'the lead cannot delete it');
select extensions.throws_ok($$select public.check_org_page_item((select id from ids where key = 'note'), 0, 'Pia wegen Raum fragen', true)$$, '42501', 'org_page_not_yours', 'nor tick a line in it');
select extensions.throws_ok($$select public.set_org_page_visibility((select id from ids where key = 'note'), 'team')$$, '42501', 'org_page_not_yours', 'nor share it');
set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.save_org_page((select id from ids where key = 'note'), null, null, 'Fremd', 'x', null, false, (select updated_at from public.advisor_org_pages where id = (select id from ids where key = 'note')))$$,
  '42501', 'org_page_not_yours', 'another member cannot write into it');

-- Die Verfasserin macht daraus eine Aufgabe und teilt die Notiz.
set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.isnt(public.create_org_task_from_page_item((select id from ids where key = 'note'), 0, 'Pia wegen Raum fragen'), null, 'a line of a private note becomes a task for the team');
select public.set_org_page_visibility((select id from ids where key = 'note'), 'team');
set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_pages where id = (select id from ids where key = 'note')), 1, 'once shared, the team sees it');

-- Zurueck auf privat nicht mit Unterseiten.
insert into ids values ('child', public.save_org_page(null, 'e5000000-0000-4000-8000-0000000000a0', (select id from ids where key = 'note'), 'Unterseite', '', null, false, null));
set local request.jwt.claims = '{"sub":"e5000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.set_org_page_visibility((select id from ids where key = 'note'), 'private')$$, '55000', 'org_page_has_children', 'a page with subpages does not go back to private');
select extensions.throws_ok($$update public.advisor_org_pages set visibility = 'team'$$, '42501', null, 'visibility cannot be changed directly');

select * from extensions.finish();
rollback;
