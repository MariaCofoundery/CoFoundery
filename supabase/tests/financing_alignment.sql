\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_fa(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'financing alignment assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.expect_error(stmt text, expected_state text, message text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'financing alignment assertion failed: % (got %, expected %)', message, sqlstate, expected_state;
  end;
  raise exception 'financing alignment assertion failed: % (no error)', message;
end;
$$;

create or replace function pg_temp.as_user(uid text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function pg_temp.open_round(team uuid)
returns uuid language sql stable as $$
  select id from public.team_financing_alignments where team_id = team and status = 'open';
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c1111111-1111-4111-8111-ccccccccccc1', 'authenticated', 'authenticated', 'fa-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2222222-2222-4222-8222-ccccccccccc2', 'authenticated', 'authenticated', 'fa-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3333333-3333-4333-8333-ccccccccccc3', 'authenticated', 'authenticated', 'fa-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c4444444-4444-4444-8444-ccccccccccc4', 'authenticated', 'authenticated', 'fa-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.founder_teams(id, team_context) values
  ('cd111111-1111-4111-8111-111111111111', 'existing_team'),
  ('cd222222-2222-4222-8222-222222222222', 'pre_founder');
insert into public.founder_team_members(team_id, user_id) values
  ('cd111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-ccccccccccc1'),
  ('cd111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-ccccccccccc2'),
  ('cd111111-1111-4111-8111-111111111111', 'c3333333-3333-4333-8333-ccccccccccc3'),
  ('cd222222-2222-4222-8222-222222222222', 'c4444444-4444-4444-8444-ccccccccccc4');

set local role authenticated;

-- 1. Mit einer Person gibt es nichts abzugleichen.
select pg_temp.as_user('c4444444-4444-4444-8444-ccccccccccc4');
select pg_temp.expect_error($q$select public.start_financing_alignment('cd222222-2222-4222-8222-222222222222')$q$, '22023', 'a solo team started an alignment');

-- 2. Start durch A; eine zweite offene Runde und Aussenstehende werden abgelehnt.
select pg_temp.as_user('c1111111-1111-4111-8111-ccccccccccc1');
select public.start_financing_alignment('cd111111-1111-4111-8111-111111111111');
select pg_temp.expect_error($q$select public.start_financing_alignment('cd111111-1111-4111-8111-111111111111')$q$, '23505', 'a second open round was started');
select pg_temp.as_user('c4444444-4444-4444-8444-ccccccccccc4');
select pg_temp.assert_fa((select count(*) = 0 from public.team_financing_alignments), 'an outsider can read the round');
select pg_temp.expect_error($q$select public.submit_financing_alignment(pg_temp.open_round('cd111111-1111-4111-8111-111111111111'), '{"pace":"a","control":"a","dilution":"a","exit":"a","horizon":"a","involvement":"a","time":"a"}'::jsonb)$q$, '42501', 'an outsider submitted');

-- 3. A gibt ab; B sieht A nicht; ungueltige Antworten und doppelte Abgabe werden abgelehnt.
select pg_temp.as_user('c1111111-1111-4111-8111-ccccccccccc1');
select pg_temp.assert_fa(public.submit_financing_alignment(pg_temp.open_round('cd111111-1111-4111-8111-111111111111'),
  '{"pace":"a","control":"b","dilution":"a","exit":"c","horizon":"b","involvement":"b","time":"c"}'::jsonb) = 'open', 'one submission closed the round');
select pg_temp.assert_fa((select count(*) = 7 from public.team_financing_alignment_answers), 'A cannot see her own answers');
select pg_temp.expect_error($q$select public.submit_financing_alignment(pg_temp.open_round('cd111111-1111-4111-8111-111111111111'), '{"pace":"a","control":"b","dilution":"a","exit":"c","horizon":"b","involvement":"b","time":"c"}'::jsonb)$q$, '22023', 'a second submission by A was accepted');
select pg_temp.as_user('c2222222-2222-4222-8222-ccccccccccc2');
select pg_temp.assert_fa((select count(*) = 0 from public.team_financing_alignment_answers), 'B saw the answers of A before submitting');
select pg_temp.assert_fa((select count(*) = 1 from public.team_financing_alignment_submissions), 'B cannot see who has submitted');
select pg_temp.expect_error($q$select public.submit_financing_alignment(pg_temp.open_round('cd111111-1111-4111-8111-111111111111'), '{"pace":"z","control":"b","dilution":"a","exit":"c","horizon":"b","involvement":"b","time":"c"}'::jsonb)$q$, '22023', 'an invented answer was accepted');
select pg_temp.expect_error($q$select public.submit_financing_alignment(pg_temp.open_round('cd111111-1111-4111-8111-111111111111'), '{"pace":"a"}'::jsonb)$q$, '22023', 'incomplete answers were accepted');
select pg_temp.assert_fa(public.submit_financing_alignment(pg_temp.open_round('cd111111-1111-4111-8111-111111111111'),
  '{"pace":"a","control":"unsure","dilution":"b","exit":"a","horizon":"b","involvement":"a","time":"c"}'::jsonb) = 'open', 'two of three closed the round');
select pg_temp.assert_fa((select count(*) = 7 from public.team_financing_alignment_answers), 'B sees more than his own answers while C is missing');

-- 4. C gibt ab: Runde geschlossen, alle sehen alle Antworten.
select pg_temp.as_user('c3333333-3333-4333-8333-ccccccccccc3');
select pg_temp.assert_fa(public.submit_financing_alignment(pg_temp.open_round('cd111111-1111-4111-8111-111111111111'),
  '{"pace":"c","control":"b","dilution":"a","exit":"b","horizon":"a","involvement":"b","time":"a"}'::jsonb) = 'closed', 'the last submission did not close the round');
select pg_temp.assert_fa((select count(*) = 21 from public.team_financing_alignment_answers), 'C does not see all answers after completion');
select pg_temp.as_user('c4444444-4444-4444-8444-ccccccccccc4');
select pg_temp.assert_fa((select count(*) = 0 from public.team_financing_alignment_answers), 'an outsider sees answers of a complete round');

-- 5. Danach kann eine neue Runde starten; direktes Schreiben ist nicht moeglich.
select pg_temp.as_user('c2222222-2222-4222-8222-ccccccccccc2');
select public.start_financing_alignment('cd111111-1111-4111-8111-111111111111');
select pg_temp.assert_fa((select count(*) = 2 from public.team_financing_alignments), 'a new round could not start after the old one closed');
select pg_temp.expect_error($q$insert into public.team_financing_alignment_answers(alignment_id, user_id, question_key, answer) values (pg_temp.open_round('cd111111-1111-4111-8111-111111111111'), 'c2222222-2222-4222-8222-ccccccccccc2', 'pace', 'a')$q$, '42501', 'direct insert was allowed');
reset role;

-- 6. Loeschfrist: alte abgeschlossene und alte offene Runden weg, junge bleiben.
update public.team_financing_alignments set closed_at = now() - interval '400 days', started_at = now() - interval '410 days' where status = 'closed';
create temp table purge_result (r jsonb);
grant all on purge_result to public;
set local role service_role;
insert into purge_result select public.purge_stale_financing_alignments();
reset role;
select pg_temp.assert_fa((select (r ->> 'deletedClosedAlignments')::int = 1 and (r ->> 'deletedOpenAlignments')::int = 0 from purge_result), 'purge counts are wrong');
select pg_temp.assert_fa((select count(*) = 1 from public.team_financing_alignments where status = 'open') and (select count(*) = 0 from public.team_financing_alignment_answers), 'the purge removed the wrong rounds or left answers behind');
set local role authenticated;
select pg_temp.expect_error($q$select public.purge_stale_financing_alignments()$q$, '42501', 'authenticated could run the purge');
reset role;

select extensions.pass('financing alignment: answers hidden until all submitted, two or more members, no outsiders, new round after closing, stale rounds purged by the schedule only');
select * from extensions.finish();
rollback;
