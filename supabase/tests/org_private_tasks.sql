\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

-- ---------------------------------------------------------------------------
-- Private Aufgaben (20270326120000): 1 Inhaberin, 2 Advisor, 3 Advisor (legt die privaten Aufgaben an).
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e8000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'private' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('e8000000-0000-4000-8000-0000000000a0', 'Privat Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000001','owner','active'),
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000002','advisor','active'),
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000003','advisor','active');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;

-- Carla (3) legt eine private und eine Team-Aufgabe an.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
set local role authenticated;
insert into ids values ('mine', public.save_org_task(null, 'e8000000-0000-4000-8000-0000000000a0', 'Gespraech vorbereiten', null, 'open', null, current_date, null, null, '[]', null, 'private'));
insert into ids values ('team', public.save_org_task(null, 'e8000000-0000-4000-8000-0000000000a0', 'Raum buchen', null, 'open', null, current_date, null, null, '[]', null));
select extensions.is((select visibility from public.advisor_org_tasks where id = (select id from ids where key = 'mine')), 'private', 'a task can be private');
select extensions.is((select visibility from public.advisor_org_tasks where id = (select id from ids where key = 'team')), 'team', 'and the default is the team');
select extensions.is((select array_agg(user_id) from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'mine')), array['e8000000-0000-4000-8000-000000000003']::uuid[], 'a private task belongs to its author alone');
select public.add_org_task_comment((select id from ids where key = 'mine'), 'Nur fuer mich');
select extensions.is((select count(*)::int from public.advisor_org_tasks), 2, 'the author sees both');
select extensions.lives_ok(
  $$select public.save_org_task(null, 'e8000000-0000-4000-8000-0000000000a0', 'Privat fuer Ben', null, 'open', 'e8000000-0000-4000-8000-000000000002', null, null, null, '[]', null, 'private')$$,
  'naming someone else on a private task does not hand it over - it stays with the author');

-- Ben (2) und die Inhaberin (1) sehen sie nicht - weder die Aufgabe noch Kommentare oder Zustaendige.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select array_agg(title) from public.advisor_org_tasks), array['Raum buchen'], 'another member sees only the team task');
select extensions.is((select count(*)::int from public.advisor_org_task_comments), 0, 'and no comment of a private task');
select extensions.is((select count(*)::int from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'mine')), 0, 'and no assignee of it');
select extensions.throws_ok($$select public.move_org_task((select id from ids where key = 'mine'), 'done')$$, '42501', 'org_task_private', 'nobody else changes it');
select extensions.throws_ok($$select public.add_org_task_comment((select id from ids where key = 'mine'), 'Hallo')$$, '42501', 'org_task_private', 'or comments on it');
select extensions.throws_ok($$select public.delete_org_task((select id from ids where key = 'mine'))$$, '42501', 'org_task_not_yours', 'or deletes it');
select extensions.throws_ok($$select public.set_org_task_visibility((select id from ids where key = 'mine'), 'team')$$, '42501', 'org_task_not_yours', 'or shares it with the team');

set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select array_agg(title) from public.advisor_org_tasks), array['Raum buchen'], 'the owner of the organisation does not see it either');
select extensions.throws_ok($$select public.set_org_task_due((select id from ids where key = 'mine'), current_date + 1)$$, '42501', 'org_task_private', 'nor changes it');

-- Teilen und wieder privat machen: nur die Person selbst; privat loest andere Zustaendige.
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.set_org_task_visibility((select id from ids where key = 'mine'), 'team');
select extensions.is((select count(*)::int from public.advisor_org_tasks where id = (select id from ids where key = 'mine')), 1, 'shared, it is a team task');
select public.save_org_task((select id from ids where key = 'team'), 'e8000000-0000-4000-8000-0000000000a0', 'Raum buchen', null, 'open', null, null, null, null, '[]',
  array['e8000000-0000-4000-8000-000000000002', 'e8000000-0000-4000-8000-000000000003']::uuid[]);
select public.set_org_task_visibility((select id from ids where key = 'team'), 'private');
select extensions.is((select count(*)::int from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'team')), 1, 'making it private releases the others');

-- Konto loeschen: private Aufgaben gehen mit.
reset role;
delete from auth.users where id = 'e8000000-0000-4000-8000-000000000003';
select extensions.is((select count(*)::int from public.advisor_org_tasks where visibility = 'private'), 0, 'deleting the account takes the private tasks along');

select * from extensions.finish();
rollback;
