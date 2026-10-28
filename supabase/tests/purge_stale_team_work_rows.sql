\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_pw(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'purge team work assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'pw-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'pw-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'pw-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values ('eb111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('eb111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111'),
  ('eb111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222');
insert into public.relationships(id, user_a_id, user_b_id, founder_team_id) values
  ('ea111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222', 'eb111111-1111-4111-8111-111111111111'),
  ('ea222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111', 'e3333333-3333-4333-8333-333333333333', null);

-- Testprojekte: alter Entwurf (weg), junger Entwurf mit anderem Paar (bleibt), vor 400 Tagen
-- beendetes (weg), vor 30 Tagen abgebrochenes (bleibt). Laufende werden nie angefasst (Statusfilter).
insert into public.relationship_test_projects(id, relationship_id, status, created_at, updated_at, closed_at, started_at, ends_at) values
  ('e0000001-0000-4000-8000-000000000001', 'ea111111-1111-4111-8111-111111111111', 'draft', now() - interval '200 days', now() - interval '100 days', null, null, null),
  ('e0000001-0000-4000-8000-000000000002', 'ea222222-2222-4222-8222-222222222222', 'draft', now() - interval '20 days', now() - interval '10 days', null, null, null),
  ('e0000001-0000-4000-8000-000000000003', 'ea111111-1111-4111-8111-111111111111', 'closed', now() - interval '500 days', now() - interval '400 days', now() - interval '400 days', now() - interval '450 days', now() - interval '436 days'),
  ('e0000001-0000-4000-8000-000000000004', 'ea111111-1111-4111-8111-111111111111', 'cancelled', now() - interval '60 days', now() - interval '30 days', now() - interval '30 days', now() - interval '55 days', now() - interval '41 days');
insert into public.relationship_test_project_agreements(project_id, user_id, draft_version) values
  ('e0000001-0000-4000-8000-000000000003', 'e1111111-1111-4111-8111-111111111111', 1),
  ('e0000001-0000-4000-8000-000000000004', 'e1111111-1111-4111-8111-111111111111', 1);

-- Check-ins: einer alt abgeschlossen (Antworten weg, Zeile bleibt), einer vor 200 Tagen
-- (Rueckblick weg, Antworten bleiben), einer offen (bleibt ganz).
insert into public.team_check_ins(id, team_id, status, started_at, closed_at, retro_questions, retro_offered_by_user_id) values
  ('e0000002-0000-4000-8000-000000000001', 'eb111111-1111-4111-8111-111111111111', 'closed', now() - interval '420 days', now() - interval '400 days', '[{"t":"Was lief gut?","on":true}]', 'e1111111-1111-4111-8111-111111111111'),
  ('e0000002-0000-4000-8000-000000000002', 'eb111111-1111-4111-8111-111111111111', 'closed', now() - interval '210 days', now() - interval '200 days', '[{"t":"Was lief gut?","on":true}]', 'e1111111-1111-4111-8111-111111111111'),
  ('e0000002-0000-4000-8000-000000000003', 'eb111111-1111-4111-8111-111111111111', 'skipped', now() - interval '30 days', now() - interval '30 days', '[]', null);
insert into public.team_check_ins(id, team_id, status, started_at) values
  ('e0000002-0000-4000-8000-000000000009', 'eb111111-1111-4111-8111-111111111111', 'open', now() - interval '500 days');
insert into public.team_check_in_topics(id, check_in_id, position, custom_text) values
  ('e0000003-0000-4000-8000-000000000001', 'e0000002-0000-4000-8000-000000000001', 1, 'Altes Thema'),
  ('e0000003-0000-4000-8000-000000000002', 'e0000002-0000-4000-8000-000000000002', 1, 'Thema vor 200 Tagen'),
  ('e0000003-0000-4000-8000-000000000009', 'e0000002-0000-4000-8000-000000000009', 1, 'Offenes Thema');
insert into public.team_check_in_answers(check_in_id, topic_id, user_id, answer) values
  ('e0000002-0000-4000-8000-000000000001', 'e0000003-0000-4000-8000-000000000001', 'e1111111-1111-4111-8111-111111111111', 'same'),
  ('e0000002-0000-4000-8000-000000000002', 'e0000003-0000-4000-8000-000000000002', 'e1111111-1111-4111-8111-111111111111', 'talk'),
  ('e0000002-0000-4000-8000-000000000009', 'e0000003-0000-4000-8000-000000000009', 'e1111111-1111-4111-8111-111111111111', 'partly');
insert into public.team_check_in_submissions(check_in_id, user_id) values
  ('e0000002-0000-4000-8000-000000000001', 'e1111111-1111-4111-8111-111111111111'),
  ('e0000002-0000-4000-8000-000000000002', 'e1111111-1111-4111-8111-111111111111');
insert into public.team_check_in_retro_invites(check_in_id, user_id, response) values
  ('e0000002-0000-4000-8000-000000000002', 'e2222222-2222-4222-8222-222222222222', 'in');
insert into public.team_check_in_retro_answers(check_in_id, user_id, answers) values
  ('e0000002-0000-4000-8000-000000000002', 'e1111111-1111-4111-8111-111111111111', '[{"q":"Was lief gut?","a":"Vieles"}]');
-- Stempel: alt (weg), jung (bleibt).
insert into public.team_check_in_reminders(team_id, user_id, due_on) values
  ('eb111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', current_date - 400),
  ('eb111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', current_date - 10);

-- Der Lauf.
create temp table run_result (result jsonb);
grant all on run_result to public;
set local role service_role;
insert into run_result select public.purge_stale_team_work_rows();
reset role;

-- Testprojekte
select pg_temp.assert_pw((select count(*) = 2 from public.relationship_test_projects), 'wrong number of test projects remain');
select pg_temp.assert_pw(not exists (select 1 from public.relationship_test_projects where id in ('e0000001-0000-4000-8000-000000000001', 'e0000001-0000-4000-8000-000000000003')), 'a stale draft or an old closed project survived');
select pg_temp.assert_pw((select count(*) = 0 from public.relationship_test_project_agreements where project_id = 'e0000001-0000-4000-8000-000000000003'), 'agreements of the deleted project survived');
select pg_temp.assert_pw((select count(*) = 1 from public.relationship_test_project_agreements where project_id = 'e0000001-0000-4000-8000-000000000004'), 'agreements of a recently cancelled project were deleted');

-- Check-in: alter Abschluss, Antworten/Themen/Abgaben weg, Zeile bleibt (fuer die Faelligkeit).
select pg_temp.assert_pw((select count(*) = 4 from public.team_check_ins), 'check-in rows must stay');
select pg_temp.assert_pw(not exists (select 1 from public.team_check_in_topics where id = 'e0000003-0000-4000-8000-000000000001'), 'old topic survived');
select pg_temp.assert_pw(not exists (select 1 from public.team_check_in_answers where check_in_id = 'e0000002-0000-4000-8000-000000000001'), 'old answers survived');
select pg_temp.assert_pw(not exists (select 1 from public.team_check_in_submissions where check_in_id = 'e0000002-0000-4000-8000-000000000001'), 'old submissions survived');
select pg_temp.assert_pw((select retro_questions = '[]'::jsonb and retro_offered_by_user_id is null from public.team_check_ins where id = 'e0000002-0000-4000-8000-000000000001'), 'old retro questions survived');
-- Vor 200 Tagen: Rueckblick weg (180), Antworten bleiben (365).
select pg_temp.assert_pw((select count(*) = 0 from public.team_check_in_retro_answers) and (select count(*) = 0 from public.team_check_in_retro_invites), 'retro answers or invites survived after 180 days');
select pg_temp.assert_pw((select count(*) = 1 from public.team_check_in_answers where check_in_id = 'e0000002-0000-4000-8000-000000000002'), 'answers were deleted before 365 days');
select pg_temp.assert_pw((select retro_questions = '[]'::jsonb from public.team_check_ins where id = 'e0000002-0000-4000-8000-000000000002'), 'retro questions after 180 days survived');
-- Offen bleibt ganz, auch wenn er alt ist.
select pg_temp.assert_pw((select count(*) = 1 from public.team_check_in_answers where check_in_id = 'e0000002-0000-4000-8000-000000000009'), 'an open check-in was touched');
-- Stempel
select pg_temp.assert_pw((select count(*) = 1 from public.team_check_in_reminders), 'old reminder stamp survived or young one was deleted');

-- Nur der Zeitplan darf.
set local role authenticated;
do $$ begin
  begin
    perform public.purge_stale_team_work_rows();
    raise exception 'authenticated could run the purge';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

select extensions.pass('team work purge: stale answers, retro, drafts and stamps go; open check-ins, running projects and check-in rows stay; only the schedule may run it');
select * from extensions.finish();
rollback;
