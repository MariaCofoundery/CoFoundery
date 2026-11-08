\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

-- ---------------------------------------------------------------------------
-- Aufgaben im Programm (20270329120000): 1 Inhaberin, 2 Ansprechperson (Team Eins), 3 Advisor ohne Rolle am Team,
-- 4 Gruenderin Team Eins, 5 Gruenderin Team Zwei (anderes Startup derselben Organisation).
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('eb000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'ptask' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 5) n;
insert into public.profiles(user_id, roles) select ('eb000000-0000-4000-8000-00000000000' || n)::uuid, array['founder'] from generate_series(4, 5) n on conflict (user_id) do nothing;
insert into public.advisor_orgs(id, name) values ('eb000000-0000-4000-8000-0000000000a0', 'Aufgaben Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000001','owner','active'),
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000002','advisor','active'),
('eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-000000000003','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('eb000000-0000-4000-8000-0000000000b0', 'Eins', 'existing_team'),
('eb000000-0000-4000-8000-0000000000b1', 'Zwei', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('eb000000-0000-4000-8000-0000000000b0','eb000000-0000-4000-8000-000000000004'),
('eb000000-0000-4000-8000-0000000000b1','eb000000-0000-4000-8000-000000000005');
insert into public.team_programs(id, org_id, team_id, status, activated_at, solo_confirmed_at) values
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-0000000000b0','active', now(), now()),
('eb000000-0000-4000-8000-0000000000c1','eb000000-0000-4000-8000-0000000000a0','eb000000-0000-4000-8000-0000000000b1','active', now(), now());
insert into public.team_program_consents(program_id, founder_user_id) values
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-000000000004'),
('eb000000-0000-4000-8000-0000000000c1','eb000000-0000-4000-8000-000000000005');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('eb000000-0000-4000-8000-0000000000c0','eb000000-0000-4000-8000-000000000002');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

-- Die Ansprechperson (2) stellt dem Startup eine Aufgabe; die Gruenderin (4) legt eine eigene und eine private an.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('org', public.save_program_task(null, 'eb000000-0000-4000-8000-0000000000c0', 'Pitch-Deck bis Freitag', null, 'open', current_date + 3, 'eb000000-0000-4000-8000-000000000004', 'shared'));
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000004","role":"authenticated"}';
insert into ids values ('team', public.save_program_task(null, 'eb000000-0000-4000-8000-0000000000c0', 'Zahlen vorbereiten', null, 'open', null, 'eb000000-0000-4000-8000-000000000002', 'shared'));
insert into ids values ('mine', public.save_program_task(null, 'eb000000-0000-4000-8000-0000000000c0', 'Gespraech mit Mama', null, 'open', null, 'eb000000-0000-4000-8000-000000000002', 'private'));
select extensions.is((select assignee_user_id from public.team_program_tasks where id = (select id from ids where key = 'mine')), null, 'a private task is assigned to nobody');
select extensions.is((select count(*)::int from public.team_program_tasks), 3, 'the founder sees shared and her own private task');

-- Hinweise: wer zugewiesen wird (und nicht selbst zuweist) bekommt einen.
reset role;
select extensions.is((select path from public.in_app_notices where kind = 'program_task_assigned' and recipient_user_id = 'eb000000-0000-4000-8000-000000000004'), '/programm#aufgaben', 'the founder is told, with a path to her page');
select extensions.is((select path from public.in_app_notices where kind = 'program_task_assigned' and recipient_user_id = 'eb000000-0000-4000-8000-000000000002'), '/advisor/programm/eb000000-0000-4000-8000-0000000000c0?tab=aufgaben', 'the contact is told, with a path to the team page');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'program_task_assigned'), 2, 'a private task tells nobody');
set local role authenticated;

-- Die Ansprechperson: sieht gemeinsame, nicht die private.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select array_agg(title order by title) from public.team_program_tasks), array['Pitch-Deck bis Freitag', 'Zahlen vorbereiten'], 'the contact sees the shared tasks but not the private one');
select extensions.throws_ok($$select public.move_program_task((select id from ids where key = 'mine'), 'done')$$, '42501', 'program_task_not_yours', 'and cannot change it');
-- Beide Seiten arbeiten an gemeinsamen Aufgaben.
select public.move_program_task((select id from ids where key = 'team'), 'doing');
select extensions.is((select status from public.team_program_tasks where id = (select id from ids where key = 'team')), 'doing', 'both sides move shared tasks');

-- Die Inhaberin: sieht das Programm, die private nie.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_program_tasks), 2, 'the owner sees shared tasks only');
-- Ein Advisor ohne Rolle am Team, und ein anderes Startup: nichts.
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_program_tasks), 0, 'another advisor of the organisation sees nothing');
select extensions.throws_ok($$select public.save_program_task(null, 'eb000000-0000-4000-8000-0000000000c0', 'Mitlesen', null, 'open', null, null, 'shared')$$, '42501', 'program_task_not_yours', 'and cannot add');
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.team_program_tasks), 0, 'another startup sees nothing');
select extensions.throws_ok($$select public.move_program_task((select id from ids where key = 'team'), 'done')$$, '42501', 'program_task_not_yours', 'nor changes it');

-- Zustaendige nur aus Team und Organisation (Ansprechpersonen, Inhaberin).
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok($$select public.save_program_task(null, 'eb000000-0000-4000-8000-0000000000c0', 'X', null, 'open', null, 'eb000000-0000-4000-8000-000000000003', 'shared')$$, '22023', 'program_task_assignee_invalid', 'an advisor without a role at the team cannot be assigned');

-- Loeschen: die Person, die sie angelegt hat; die Inhaberin bei gemeinsamen. Teilen und privat machen: nur die Person selbst.
select extensions.throws_ok($$select public.delete_program_task((select id from ids where key = 'org'))$$, '42501', 'program_task_not_yours', 'the founder cannot delete what the advisor wrote');
select public.set_program_task_visibility((select id from ids where key = 'mine'), 'shared');
select extensions.is((select visibility from public.team_program_tasks where id = (select id from ids where key = 'mine')), 'shared', 'the author can share a private task');
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.delete_program_task((select id from ids where key = 'mine'));
select extensions.is((select count(*)::int from public.team_program_tasks where id = (select id from ids where key = 'mine')), 0, 'the owner can delete a shared task');

-- Die Menschen, die zugewiesen werden koennen - nur fuer Berechtigte.
set local role authenticated;
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select array_agg(side || ':' || user_id::text order by side, user_id) from public.get_program_task_people('eb000000-0000-4000-8000-0000000000c0')), array['org:eb000000-0000-4000-8000-000000000001', 'org:eb000000-0000-4000-8000-000000000002', 'team:eb000000-0000-4000-8000-000000000004'], 'the people to assign: the team and the owner and contacts of the organisation');
set local request.jwt.claims = '{"sub":"eb000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_program_task_people('eb000000-0000-4000-8000-0000000000c0')), 0, 'another startup learns nobody');

-- Das Programm endet: die Aufgaben gehen mit.
reset role;
update public.team_programs set status = 'ended', ended_at = now() where id = 'eb000000-0000-4000-8000-0000000000c0';
select extensions.is((select count(*)::int from public.team_program_tasks), 0, 'when the program ends the tasks go with it');

select * from extensions.finish();
rollback;
