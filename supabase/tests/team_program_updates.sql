\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e4000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4000000-0000-4000-8000-000000000002','authenticated','authenticated','kontakt@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4000000-0000-4000-8000-000000000003','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e4000000-0000-4000-8000-000000000004','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e4000000-0000-4000-8000-0000000000a0', 'Programm Drei');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-000000000001','owner','active'),
('e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-000000000002','advisor','active');
insert into public.founder_teams(id, name, team_context) values ('e4000000-0000-4000-8000-0000000000b0', 'Team Bergfest', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('e4000000-0000-4000-8000-0000000000b0','e4000000-0000-4000-8000-000000000003'),
('e4000000-0000-4000-8000-0000000000b0','e4000000-0000-4000-8000-000000000004');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-0000000000a0','e4000000-0000-4000-8000-0000000000b0','active', now() - interval '13 days');
insert into public.team_program_consents(program_id, founder_user_id) values
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-000000000003'),
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-000000000004');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('e4000000-0000-4000-8000-0000000000c0','e4000000-0000-4000-8000-000000000002');

-- Die Erinnerung: Faelligkeit in einem Tag -> ein Hinweis je Teammitglied, nur einmal.
-- Einer der beiden hat die Art abbestellt, einer hat der Mail zugestimmt.
insert into public.notification_opt_outs(user_id, kind) values ('e4000000-0000-4000-8000-000000000004', 'program_update');
insert into public.notification_opt_ins(user_id, kind) values ('e4000000-0000-4000-8000-000000000003', 'program_update_email');

create temp table due_rows as select * from public.prepare_program_update_reminders(10);
select extensions.is((select count(*)::int from due_rows), 1, 'only the person who did not opt out gets a device notification');
select extensions.ok((select wants_email from due_rows limit 1), 'the email goes only to the person who agreed to it');
select extensions.is(
  (select count(*)::int from public.in_app_notices where kind = 'program_update_due'), 2, 'every team member still gets the inbox notice');
select extensions.is((select count(*)::int from public.prepare_program_update_reminders(10)), 0, 'the same due date is never reminded twice');

set local role authenticated;

-- Fragen legen die Bezugsperson fest; das Team nicht.
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_program_update_questions('e4000000-0000-4000-8000-0000000000c0', array['x'])$$,
  '42501', null, 'the team cannot set the questions');
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.set_program_update_questions('e4000000-0000-4000-8000-0000000000c0', array['Was sind aktuelle Schwierigkeiten?', 'Wie koennen wir helfen?']);
select extensions.is(
  (select count(*)::int from public.list_program_update_questions('e4000000-0000-4000-8000-0000000000c0')), 2, 'the contact can set up to five questions');
select extensions.throws_ok(
  $$select public.set_program_update_questions('e4000000-0000-4000-8000-0000000000c0', array['1','2','3','4','5','6'])$$,
  '22023', null, 'more than five questions are refused');

-- Antworten gibt nur das Team.
select extensions.throws_ok(
  $$select public.submit_program_update('e4000000-0000-4000-8000-0000000000c0', '[{"q":"a","a":"b"}]'::jsonb)$$,
  '42501', null, 'a contact cannot answer for the team');
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.isnt(
  public.submit_program_update('e4000000-0000-4000-8000-0000000000c0', '[{"q":"Schwierigkeiten?","a":"Wenig Zeit"}]'::jsonb),
  null, 'a team member can submit an update');
select extensions.is(
  public.get_program_update_due('e4000000-0000-4000-8000-0000000000c0'), (current_date + 14), 'the next update is due 14 days after the last one');

-- Die Bezugsperson liest es.
set local request.jwt.claims = '{"sub":"e4000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.list_program_updates('e4000000-0000-4000-8000-0000000000c0')), 1, 'the contact reads the update');

select * from extensions.finish();
rollback;
