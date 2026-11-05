\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Teamraum-Hinweise (20270316120000)
-- 1 Inhaberin, 2 Advisor, 3 Advisor (hat Aufgaben-Mitteilungen abbestellt).
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e6000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'notice' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('e6000000-0000-4000-8000-0000000000a0', 'Hinweis Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000001','owner','active'),
('e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000002','advisor','active'),
('e6000000-0000-4000-8000-0000000000a0','e6000000-0000-4000-8000-000000000003','advisor','active');
insert into public.notification_opt_outs(user_id, kind) values ('e6000000-0000-4000-8000-000000000003', 'org_tasks');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

-- Pia (1) teilt Ben (2) eine Aufgabe zu, und sich selbst eine.
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('t', public.save_org_task(null, 'e6000000-0000-4000-8000-0000000000a0', 'Raum buchen', null, 'open', 'e6000000-0000-4000-8000-000000000002', current_date, null, null, '[]'));
insert into ids values ('mine', public.save_org_task(null, 'e6000000-0000-4000-8000-0000000000a0', 'Selbst', null, 'open', 'e6000000-0000-4000-8000-000000000001', current_date, null, null, '[]'));
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'org_task_assigned' and recipient_user_id = 'e6000000-0000-4000-8000-000000000002'), 1, 'the assignee is told');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'org_task_assigned' and recipient_user_id = 'e6000000-0000-4000-8000-000000000001'), 0, 'nobody is told about their own assignment');
select extensions.ok((select path from public.in_app_notices where kind = 'org_task_assigned') like '/advisor/teamraum/aufgaben?org=%&task=%', 'the notice leads to the task');
set local role authenticated;
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.org_task_push_recipients((select id from ids where key = 't'), 'org_task_assigned')), 1, 'the person who assigned gets the push recipient');

-- Ben kommentiert: Pia (angelegt) bekommt einen Hinweis, Ben selbst nicht.
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.add_org_task_comment((select id from ids where key = 't'), 'Erledige ich morgen');
select extensions.is((select count(*)::int from public.org_task_push_recipients((select id from ids where key = 't'), 'org_task_comment')), 1, 'a comment notifies the creator');
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'org_task_comment' and recipient_user_id = 'e6000000-0000-4000-8000-000000000002'), 0, 'not the one who commented');

-- Wer Aufgaben-Mitteilungen abbestellt hat, bekommt den Hinweis, aber keine Mitteilung aufs Geraet.
set local role authenticated;
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('opt', public.save_org_task(null, 'e6000000-0000-4000-8000-0000000000a0', 'Jury', null, 'open', 'e6000000-0000-4000-8000-000000000003', null, null, null, '[]'));
select extensions.is((select count(*)::int from public.org_task_push_recipients((select id from ids where key = 'opt'), 'org_task_assigned')), 0, 'an opt-out stops the push');
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where recipient_user_id = 'e6000000-0000-4000-8000-000000000003'), 1, 'but the in-app notice is there');

-- Faellig heute: einmal je Aufgabe.
select extensions.is((select count(*)::int from public.prepare_org_task_due_notices(100) where task_id in ((select id from ids where key = 't'), (select id from ids where key = 'mine'))), 2, 'tasks due today are announced to whoever is responsible');
select extensions.is((select count(*)::int from public.prepare_org_task_due_notices(100) where task_id in ((select id from ids where key = 't'), (select id from ids where key = 'mine'))), 0, 'only once');

-- Geloescht: die Hinweise gehen mit.
set local role authenticated;
set local request.jwt.claims = '{"sub":"e6000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.delete_org_task((select id from ids where key = 't'));
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where subject_id = (select id from ids where key = 't')), 0, 'deleting a task deletes its notices');
set local role authenticated;
select extensions.throws_ok($$select public.prepare_org_task_due_notices(10)$$, '42501', null, 'the daily run is not for signed-in people');

select * from extensions.finish();
rollback;
