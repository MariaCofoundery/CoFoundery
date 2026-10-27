\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_tp(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'test project assertion failed: %', message; end if;
end;
$$;

-- Erwartet, dass der Aufruf mit diesem SQLSTATE scheitert.
create or replace function pg_temp.expect_error(stmt text, expected_state text, message text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'test project assertion failed: % (got %, expected %)', message, sqlstate, expected_state;
  end;
  raise exception 'test project assertion failed: % (no error)', message;
end;
$$;

create or replace function pg_temp.open_project(rel uuid)
returns uuid language sql stable as $$
  select id from public.relationship_test_projects
  where relationship_id = rel and status in ('draft', 'active');
$$;

create or replace function pg_temp.as_user(uid text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'tp-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'tp-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'tp-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values
  ('db111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('db111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111'),
  ('db111111-1111-4111-8111-111111111111', 'd2222222-2222-4222-8222-222222222222');
insert into public.relationships(id, user_a_id, user_b_id, founder_team_id) values
  ('da111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111', 'd2222222-2222-4222-8222-222222222222', 'db111111-1111-4111-8111-111111111111');

set local role authenticated;

-- 1. Entwurf anlegen (Person A) -------------------------------------------------
select pg_temp.as_user('d1111111-1111-4111-8111-111111111111');
select public.save_test_project_draft(
  'da111111-1111-4111-8111-111111111111', null, 'interviews', 'Kundengespraeche', 'Zehn Gespraeche fuehren',
  2::smallint, 'Wir wechseln uns ab', 'Treffen dienstags',
  '[{"t":"Zehn Gespraeche sind gefuehrt","on":true}]'::jsonb,
  '[{"t":"Wem gehoert das Ergebnis?","on":true}]'::jsonb,
  '[{"t":"Wie war die Zusammenarbeit?","on":true},{"t":"Was hat mich ueberrascht?","on":false}]'::jsonb
);
select pg_temp.assert_tp(
  (select status = 'draft' and draft_version = 1 from public.relationship_test_projects
   where id = pg_temp.open_project('da111111-1111-4111-8111-111111111111')),
  'draft was not created');
select pg_temp.expect_error(
  $q$select public.save_test_project_draft('da111111-1111-4111-8111-111111111111', null, null, 'x', 'y', 2::smallint, '', '', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)$q$,
  '23505', 'a second open project for the same pair was accepted');
select pg_temp.expect_error(
  $q$select public.save_test_project_draft('da111111-1111-4111-8111-111111111111', pg_temp.open_project('da111111-1111-4111-8111-111111111111'), null, 'x', 'y', 5::smallint, '', '', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)$q$,
  '22023', 'five weeks were accepted');

-- 2. Person A stimmt zu, B aendert den Entwurf: beide Zustimmungen sind weg ----
select public.agree_test_project(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 1);
select pg_temp.assert_tp((select count(*) = 1 from public.relationship_test_project_agreements), 'A agreement missing');

select pg_temp.as_user('d2222222-2222-4222-8222-222222222222');
select public.save_test_project_draft(
  'da111111-1111-4111-8111-111111111111', pg_temp.open_project('da111111-1111-4111-8111-111111111111'),
  'interviews', 'Kundengespraeche', 'Zehn Gespraeche fuehren', 2::smallint, 'Wir wechseln uns ab', 'Treffen dienstags',
  '[{"t":"Zehn Gespraeche sind gefuehrt","on":true}]'::jsonb,
  '[{"t":"Wem gehoert das Ergebnis?","on":true}]'::jsonb,
  '[{"t":"Wie war die Zusammenarbeit?","on":true}]'::jsonb);
select pg_temp.assert_tp(
  (select count(*) = 0 from public.relationship_test_project_agreements)
  and (select draft_version = 2 from public.relationship_test_projects where id = pg_temp.open_project('da111111-1111-4111-8111-111111111111')),
  'a change did not reset the agreements');
select pg_temp.expect_error(
  $q$select public.agree_test_project(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 1)$q$,
  '40001', 'agreement to an outdated version was accepted');

-- 3. Beide stimmen dem aktuellen Stand zu: das Projekt startet -------------------
select pg_temp.assert_tp(public.agree_test_project(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 2) = 'draft', 'one agreement started the project');
select pg_temp.as_user('d1111111-1111-4111-8111-111111111111');
select pg_temp.assert_tp(public.agree_test_project(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 2) = 'active', 'two agreements did not start the project');
select pg_temp.assert_tp(
  (select ends_at - started_at = interval '14 days' from public.relationship_test_projects
   where id = pg_temp.open_project('da111111-1111-4111-8111-111111111111')),
  'duration is not two weeks');
select pg_temp.expect_error(
  $q$select public.save_test_project_draft('da111111-1111-4111-8111-111111111111', pg_temp.open_project('da111111-1111-4111-8111-111111111111'), null, 'x', 'y', 2::smallint, '', '', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)$q$,
  '22023', 'an active project was edited');

-- 4. Zwischenstand: die Antwort der anderen Person ist erst sichtbar, wenn beide da sind
select public.submit_test_project_response(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 'interim',
  '[{"q":"Wie laeuft es?","a":"Gut"}]'::jsonb, null);
select pg_temp.as_user('d2222222-2222-4222-8222-222222222222');
select pg_temp.assert_tp((select count(*) = 0 from public.relationship_test_project_responses), 'B saw the answer of A before answering');
select public.submit_test_project_response(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 'interim',
  '[{"q":"Wie laeuft es?","a":"Mal so mal so"}]'::jsonb, null);
select pg_temp.assert_tp((select count(*) = 2 from public.relationship_test_project_responses), 'B did not see both answers after answering');
select pg_temp.expect_error(
  $q$select public.submit_test_project_response(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 'interim', '[]'::jsonb, null)$q$,
  '22023', 'a completed phase was changed');

-- 5. Fremde sehen nichts ----------------------------------------------------------
select pg_temp.as_user('d3333333-3333-4333-8333-333333333333');
select pg_temp.assert_tp(
  (select count(*) = 0 from public.relationship_test_projects)
  and (select count(*) = 0 from public.relationship_test_project_agreements)
  and (select count(*) = 0 from public.relationship_test_project_responses),
  'an outsider can read test project rows');
select pg_temp.expect_error(
  $q$select public.save_test_project_draft('da111111-1111-4111-8111-111111111111', null, null, 'x', 'y', 2::smallint, '', '', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)$q$,
  '42501', 'an outsider created a draft for the pair');

-- 6. Abschluss: Ausgang ist Pflicht, erst nach beiden ist das Projekt beendet ------
select pg_temp.as_user('d1111111-1111-4111-8111-111111111111');
select pg_temp.expect_error(
  $q$select public.submit_test_project_response(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 'closing', '[]'::jsonb, null)$q$,
  '22023', 'a closing without outcome was accepted');
select public.submit_test_project_response(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 'closing',
  '[{"q":"Wie war es?","a":"Gut"}]'::jsonb, 'continue');
select pg_temp.assert_tp(
  (select status = 'active' from public.relationship_test_projects where relationship_id = 'da111111-1111-4111-8111-111111111111'),
  'one closing ended the project');
select pg_temp.as_user('d2222222-2222-4222-8222-222222222222');
select pg_temp.assert_tp(public.submit_test_project_response(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 'closing',
  '[{"q":"Wie war es?","a":"Ok"}]'::jsonb, 'stop') = 'closed', 'two closings did not end the project');
select pg_temp.assert_tp(
  (select count(*) = 4 from public.relationship_test_project_responses),
  'both closings and both interim answers are not visible after the end');

-- 7. Danach ist ein neues moeglich; abbrechen geht jederzeit ------------------------
select public.save_test_project_draft('da111111-1111-4111-8111-111111111111', null, null, 'Zweites', 'Aufgabe', 1::smallint, '', '',
  '[{"t":"Fertig","on":true}]'::jsonb, '[]'::jsonb, '[]'::jsonb);
select public.cancel_test_project(pg_temp.open_project('da111111-1111-4111-8111-111111111111'));
select pg_temp.assert_tp(
  (select count(*) = 1 from public.relationship_test_projects where status = 'cancelled'),
  'cancel did not work');

-- 8. Verlaesst eine Person das Team, laeuft das Paar nicht weiter -------------------
select public.save_test_project_draft('da111111-1111-4111-8111-111111111111', null, null, 'Drittes', 'Aufgabe', 1::smallint, '', '',
  '[{"t":"Fertig","on":true}]'::jsonb, '[]'::jsonb, '[]'::jsonb);
reset role;
delete from public.founder_team_members
where team_id = 'db111111-1111-4111-8111-111111111111' and user_id = 'd2222222-2222-4222-8222-222222222222';
set local role authenticated;
select pg_temp.as_user('d1111111-1111-4111-8111-111111111111');
select pg_temp.expect_error(
  $q$select public.agree_test_project(pg_temp.open_project('da111111-1111-4111-8111-111111111111'), 1)$q$,
  '42501', 'a pair with a departed member continued');
reset role;

select extensions.pass('test project: both must agree, changes reset, answers hidden until both answered, outsiders see nothing');
select * from extensions.finish();
rollback;
