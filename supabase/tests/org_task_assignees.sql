\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- ---------------------------------------------------------------------------
-- Mehrere Zustaendige je Aufgabe (20270322120000)
-- 1 Inhaberin, 2 und 3 Advisor, 4 Advisor in einer anderen Organisation, 5 frueheres Mitglied.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e7000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'assignee' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.advisor_orgs(id, name) values
('e7000000-0000-4000-8000-0000000000a0', 'Zwei-Personen Accelerator'),
('e7000000-0000-4000-8000-0000000000b0', 'Andere Organisation');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e7000000-0000-4000-8000-0000000000a0','e7000000-0000-4000-8000-000000000001','owner','active'),
('e7000000-0000-4000-8000-0000000000a0','e7000000-0000-4000-8000-000000000002','advisor','active'),
('e7000000-0000-4000-8000-0000000000a0','e7000000-0000-4000-8000-000000000003','advisor','active'),
('e7000000-0000-4000-8000-0000000000b0','e7000000-0000-4000-8000-000000000004','owner','active');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;

-- Pia (1) gibt eine Aufgabe an Ben (2) und Carla (3).
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
insert into ids values ('two', public.save_org_task(null, 'e7000000-0000-4000-8000-0000000000a0', 'Demo Day planen', null, 'open', null, current_date, null, null, '[]',
  array['e7000000-0000-4000-8000-000000000002', 'e7000000-0000-4000-8000-000000000003']::uuid[]));
select extensions.is((select count(*)::int from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'two')), 2, 'a task can have two people');
select extensions.is((select assignee_user_id from public.advisor_org_tasks where id = (select id from ids where key = 'two')), 'e7000000-0000-4000-8000-000000000002'::uuid, 'the old field mirrors the first person');
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'org_task_assigned' and subject_id = (select id from ids where key = 'two')), 2, 'both are told');
set local role authenticated;

-- Nur aktive Mitglieder dieser Organisation, hoechstens sechs, jede Person einmal.
select extensions.throws_ok(
  $$select public.save_org_task(null, 'e7000000-0000-4000-8000-0000000000a0', 'X', null, 'open', null, null, null, null, '[]', array['e7000000-0000-4000-8000-000000000004']::uuid[])$$,
  '22023', 'org_task_assignee_not_member', 'nobody from another organisation');
select extensions.throws_ok(
  $$select public.save_org_task(null, 'e7000000-0000-4000-8000-0000000000a0', 'X', null, 'open', null, null, null, null, '[]',
    array['e7000000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000002','e7000000-0000-4000-8000-000000000003',
          gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()]::uuid[])$$,
  '22023', 'org_task_too_many_assignees', 'at most six people');
insert into ids values ('dup', public.save_org_task(null, 'e7000000-0000-4000-8000-0000000000a0', 'Doppelt', null, 'open', null, null, null, null, '[]',
  array['e7000000-0000-4000-8000-000000000002', 'e7000000-0000-4000-8000-000000000002']::uuid[]));
select extensions.is((select count(*)::int from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'dup')), 1, 'a person counts once');

-- Ein Aufruf mit einer Person (Diktat, alter Code) gilt weiter.
insert into ids values ('one', public.save_org_task(null, 'e7000000-0000-4000-8000-0000000000a0', 'Allein', null, 'open', 'e7000000-0000-4000-8000-000000000003', null, null, null, '[]'));
select extensions.is((select array_agg(user_id) from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'one')), array['e7000000-0000-4000-8000-000000000003']::uuid[], 'one person still works');

-- Bearbeiten: Ben raus, Pia rein. Bens ungelesener Hinweis geht mit.
select public.save_org_task((select id from ids where key = 'two'), null, 'Demo Day planen', null, 'open', null, current_date, null, null, '[]',
  array['e7000000-0000-4000-8000-000000000003', 'e7000000-0000-4000-8000-000000000001']::uuid[]);
select extensions.is(
  (select array_agg(user_id order by user_id) from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'two')),
  array['e7000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000003']::uuid[], 'editing replaces the people');
select extensions.is((select assignee_user_id from public.advisor_org_tasks where id = (select id from ids where key = 'two')), 'e7000000-0000-4000-8000-000000000003'::uuid, 'the mirror follows');
reset role;
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'org_task_assigned' and recipient_user_id = 'e7000000-0000-4000-8000-000000000002' and subject_id = (select id from ids where key = 'two')), 0, 'whoever is taken off loses the unread notice');

-- Ben (2) schreibt sich bei "Allein" dazu und kommentiert: Carla (zustaendig) und Pia (angelegt) hoeren davon.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;
select public.take_org_task((select id from ids where key = 'one'));
select extensions.is((select count(*)::int from public.advisor_org_task_assignees where task_id = (select id from ids where key = 'one')), 2, 'taking a task adds you, nobody is pushed out');
select public.add_org_task_comment((select id from ids where key = 'one'), 'Ich helfe mit');
reset role;
select extensions.is(
  (select array_agg(recipient_user_id order by recipient_user_id) from public.in_app_notices where kind = 'org_task_comment' and subject_id = (select id from ids where key = 'one')),
  array['e7000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000003']::uuid[], 'a comment reaches everyone responsible and the creator, never the writer');

-- Heute faellig: jede zustaendige Person einmal.
select extensions.is(
  (select count(*)::int from public.prepare_org_task_due_notices(50) d where d.task_id = (select id from ids where key = 'two')), 2,
  'due today reaches each person responsible');

-- Lesen nur in der Organisation.
set local request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000004","role":"authenticated"}';
set local role authenticated;
select extensions.is((select count(*)::int from public.advisor_org_task_assignees where org_id = 'e7000000-0000-4000-8000-0000000000a0'), 0, 'another organisation sees nothing');
select extensions.throws_ok($$insert into public.advisor_org_task_assignees (task_id, user_id, org_id) values (gen_random_uuid(), auth.uid(), 'e7000000-0000-4000-8000-0000000000b0')$$, '42501', null, 'nobody writes the table directly');
reset role;

-- Carla verlaesst die Organisation: sie ist nirgends mehr zustaendig.
update public.advisor_org_members set status = 'revoked', revoked_at = now()
where org_id = 'e7000000-0000-4000-8000-0000000000a0' and user_id = 'e7000000-0000-4000-8000-000000000003';
select extensions.is((select count(*)::int from public.advisor_org_task_assignees where user_id = 'e7000000-0000-4000-8000-000000000003'), 0, 'leaving the organisation ends every assignment');

select * from extensions.finish();
rollback;
