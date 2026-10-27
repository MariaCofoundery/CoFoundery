\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_ci(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'check-in assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.expect_error(stmt text, expected_state text, message text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'check-in assertion failed: % (got %, expected %)', message, sqlstate, expected_state;
  end;
  raise exception 'check-in assertion failed: % (no error)', message;
end;
$$;

create or replace function pg_temp.as_user(uid text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function pg_temp.open_ci(team uuid)
returns uuid language sql stable as $$
  select id from public.team_check_ins where team_id = team and status = 'open';
$$;

create or replace function pg_temp.topic(ci uuid, key text)
returns uuid language sql stable as $$
  select id from public.team_check_in_topics where check_in_id = ci and (item_key = key or custom_text = key);
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'ci-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'ci-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'ci-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values ('ab111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('ab111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111'),
  ('ab111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222');

-- Setup: zwei von beiden bestaetigt, eines nur von A, eines "nicht relevant".
insert into public.founder_team_setup_items(id, team_id, item_key, updated_by_user_id) values
  ('a0000001-0000-4000-8000-000000000001', 'ab111111-1111-4111-8111-111111111111', 'decision_rights', 'a1111111-1111-4111-8111-111111111111'),
  ('a0000001-0000-4000-8000-000000000002', 'ab111111-1111-4111-8111-111111111111', 'time_commitment', 'a1111111-1111-4111-8111-111111111111'),
  ('a0000001-0000-4000-8000-000000000003', 'ab111111-1111-4111-8111-111111111111', 'communication', 'a1111111-1111-4111-8111-111111111111'),
  ('a0000001-0000-4000-8000-000000000004', 'ab111111-1111-4111-8111-111111111111', 'equity', 'a1111111-1111-4111-8111-111111111111');
insert into public.founder_team_setup_revisions(id, setup_item_id, resolution_status, note, proposed_by_user_id, confirmed_at) values
  ('a0000002-0000-4000-8000-000000000001', 'a0000001-0000-4000-8000-000000000001', 'clarified', 'Produkt: A', 'a1111111-1111-4111-8111-111111111111', now()),
  ('a0000002-0000-4000-8000-000000000002', 'a0000001-0000-4000-8000-000000000002', 'clarified', 'Zwanzig Stunden', 'a1111111-1111-4111-8111-111111111111', now()),
  ('a0000002-0000-4000-8000-000000000003', 'a0000001-0000-4000-8000-000000000003', 'clarified', 'Montags', 'a1111111-1111-4111-8111-111111111111', now()),
  ('a0000002-0000-4000-8000-000000000004', 'a0000001-0000-4000-8000-000000000004', 'not_relevant', '', 'a1111111-1111-4111-8111-111111111111', now());
update public.founder_team_setup_items i set current_confirmed_revision_id = r.id
from public.founder_team_setup_revisions r where r.setup_item_id = i.id;
insert into public.founder_team_setup_confirmations(revision_id, user_id) values
  ('a0000002-0000-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111'),
  ('a0000002-0000-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222'),
  ('a0000002-0000-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111'),
  ('a0000002-0000-4000-8000-000000000002', 'a2222222-2222-4222-8222-222222222222'),
  ('a0000002-0000-4000-8000-000000000003', 'a1111111-1111-4111-8111-111111111111'),
  ('a0000002-0000-4000-8000-000000000004', 'a1111111-1111-4111-8111-111111111111'),
  ('a0000002-0000-4000-8000-000000000004', 'a2222222-2222-4222-8222-222222222222');

set local role authenticated;

-- 1. Abstand ----------------------------------------------------------------------
select pg_temp.as_user('a1111111-1111-4111-8111-111111111111');
select public.set_team_check_in_interval('ab111111-1111-4111-8111-111111111111', 60::smallint);
select pg_temp.assert_ci((select interval_days = 60 from public.team_check_in_settings), 'interval not saved');
select pg_temp.expect_error($q$select public.set_team_check_in_interval('ab111111-1111-4111-8111-111111111111', 45::smallint)$q$, '22023', '45 days accepted');

-- 2. Start: nur Themen, die BEIDE bestaetigt haben, und nicht "nicht relevant" ------
select public.start_team_check_in('ab111111-1111-4111-8111-111111111111');
select pg_temp.assert_ci(
  (select count(*) = 2 from public.team_check_in_topics)
  and (select count(*) = 0 from public.team_check_in_topics where item_key in ('communication', 'equity')),
  'check-in topics are not exactly the topics confirmed by the whole team');
select pg_temp.expect_error($q$select public.start_team_check_in('ab111111-1111-4111-8111-111111111111')$q$, '23505', 'a second open check-in was started');

-- 3. Themen waehlen und eigenen Punkt ergaenzen -------------------------------------
select public.add_team_check_in_topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'Tools');
select public.set_team_check_in_topic_included(pg_temp.topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'time_commitment'), false);

-- 4. A gibt ab, B sieht es nicht, danach sind die Themen eingefroren ------------------
select public.submit_team_check_in(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), jsonb_build_array(
  jsonb_build_object('topic_id', pg_temp.topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'decision_rights'), 'answer', 'same', 'note', ''),
  jsonb_build_object('topic_id', pg_temp.topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'Tools'), 'answer', 'talk', 'note', 'Wer zahlt?')));
select pg_temp.expect_error($q$select public.submit_team_check_in(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), '[]'::jsonb)$q$, '22023', 'a second submission by A was accepted');

select pg_temp.as_user('a2222222-2222-4222-8222-222222222222');
select pg_temp.assert_ci((select count(*) = 0 from public.team_check_in_answers), 'B saw the answers of A before submitting');
select pg_temp.expect_error($q$select public.add_team_check_in_topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'Zu spaet')$q$, '22023', 'topics were editable after the first submission');
select pg_temp.expect_error($q$select public.submit_team_check_in(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), jsonb_build_array(
  jsonb_build_object('topic_id', pg_temp.topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'decision_rights'), 'answer', 'same', 'note', '')))$q$,
  '22023', 'an incomplete set of answers was accepted');
select pg_temp.assert_ci(
  public.submit_team_check_in(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), jsonb_build_array(
    jsonb_build_object('topic_id', pg_temp.topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'decision_rights'), 'answer', 'partly', 'note', 'Ab 2000 anders'),
    jsonb_build_object('topic_id', pg_temp.topic(pg_temp.open_ci('ab111111-1111-4111-8111-111111111111'), 'Tools'), 'answer', 'talk', 'note', ''))) = 'closed',
  'the last submission did not close the check-in');
select pg_temp.assert_ci((select count(*) = 4 from public.team_check_in_answers), 'B does not see all answers after everyone submitted');

-- 5. Fremde sehen nichts ------------------------------------------------------------
select pg_temp.as_user('a3333333-3333-4333-8333-333333333333');
select pg_temp.assert_ci(
  (select count(*) = 0 from public.team_check_ins) and (select count(*) = 0 from public.team_check_in_topics)
  and (select count(*) = 0 from public.team_check_in_answers) and (select count(*) = 0 from public.team_check_in_settings),
  'an outsider can read check-in rows');
select pg_temp.expect_error($q$select public.start_team_check_in('ab111111-1111-4111-8111-111111111111')$q$, '42501', 'an outsider started a check-in');

-- 6. Rueckblick: A bietet an, B sagt Gern, Antworten erst nach beiden -----------------
select pg_temp.as_user('a1111111-1111-4111-8111-111111111111');
select pg_temp.expect_error($q$select public.offer_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), '[]'::jsonb)$q$, '22023', 'a retro without active question was accepted');
select public.offer_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), '[{"t":"Was lief gut?","on":true}]'::jsonb);
select pg_temp.expect_error($q$select public.offer_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), '[{"t":"x","on":true}]'::jsonb)$q$, '22023', 'a second retro offer was accepted');
select public.submit_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), '[{"q":"Was lief gut?","a":"Die Updates"}]'::jsonb);

select pg_temp.as_user('a2222222-2222-4222-8222-222222222222');
select pg_temp.expect_error($q$select public.submit_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), '[]'::jsonb)$q$, '42501', 'B answered the retro without joining');
select public.respond_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), true);
select pg_temp.assert_ci((select count(*) = 0 from public.team_check_in_retro_answers), 'B saw the retro answer of A before answering');
select public.submit_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), '[{"q":"Was lief gut?","a":"Die Treffen"}]'::jsonb);
select pg_temp.assert_ci((select count(*) = 2 from public.team_check_in_retro_answers), 'both retro answers are not visible after both answered');
select pg_temp.expect_error($q$select public.respond_team_check_in_retro((select id from public.team_check_ins where status = 'closed'), false)$q$, '22023', 'a completed retro was left');

-- 7. Ueberspringen -----------------------------------------------------------------------
select public.skip_team_check_in('ab111111-1111-4111-8111-111111111111');
select pg_temp.assert_ci((select count(*) = 1 from public.team_check_ins where status = 'skipped'), 'skip did not record a skipped check-in');
select public.start_team_check_in('ab111111-1111-4111-8111-111111111111');
select public.skip_team_check_in('ab111111-1111-4111-8111-111111111111');
select pg_temp.assert_ci((select count(*) = 2 from public.team_check_ins where status = 'skipped')
  and (select count(*) = 0 from public.team_check_ins where status = 'open'), 'skip did not close an open check-in');
reset role;

select extensions.pass('check-in: only whole-team confirmed topics, answers hidden until all submitted, retro only for those who join, outsiders see nothing');
select * from extensions.finish();
rollback;
