\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_td(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'team departure assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.expect_error(stmt text, expected_state text, message text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'team departure assertion failed: % (got %, expected %)', message, sqlstate, expected_state;
  end;
  raise exception 'team departure assertion failed: % (no error)', message;
end;
$$;

create or replace function pg_temp.as_user(uid text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function pg_temp.open_departure(team uuid)
returns uuid language sql stable as $$
  select id from public.team_departures where team_id = team and status = 'open' order by left_at desc limit 1;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'f1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'td-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'td-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'td-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'td-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values
  ('fb111111-1111-4111-8111-111111111111', 'existing_team'),
  ('fb222222-2222-4222-8222-222222222222', 'existing_team'),
  ('fb333333-3333-4333-8333-333333333333', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('fb111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111'),
  ('fb111111-1111-4111-8111-111111111111', 'f2222222-2222-4222-8222-222222222222'),
  ('fb111111-1111-4111-8111-111111111111', 'f3333333-3333-4333-8333-333333333333'),
  ('fb222222-2222-4222-8222-222222222222', 'f1111111-1111-4111-8111-111111111111'),
  ('fb222222-2222-4222-8222-222222222222', 'f2222222-2222-4222-8222-222222222222'),
  ('fb222222-2222-4222-8222-222222222222', 'f3333333-3333-4333-8333-333333333333'),
  ('fb333333-3333-4333-8333-333333333333', 'f1111111-1111-4111-8111-111111111111');

set local role authenticated;

-- 1. C verlaesst Team 1: ein Eintrag fuer die Verbleibenden, ohne Namen.
select pg_temp.as_user('f3333333-3333-4333-8333-333333333333');
select public.leave_founder_team('fb111111-1111-4111-8111-111111111111');
select pg_temp.as_user('f1111111-1111-4111-8111-111111111111');
select pg_temp.assert_td((select count(*) = 1 from public.team_departures where team_id = 'fb111111-1111-4111-8111-111111111111' and status = 'open'), 'no departure entry after leaving');

-- Die gehende Person und Aussenstehende sehen ihn nicht.
select pg_temp.as_user('f3333333-3333-4333-8333-333333333333');
select pg_temp.assert_td((select count(*) = 0 from public.team_departures), 'the leaver can still read the departure');
select pg_temp.as_user('f4444444-4444-4444-8444-444444444444');
select pg_temp.assert_td((select count(*) = 0 from public.team_departures), 'an outsider can read the departure');
select pg_temp.expect_error($q$select public.choose_team_departure(pg_temp.open_departure('fb111111-1111-4111-8111-111111111111'), 'continue')$q$, '42501', 'an outsider chose');
select pg_temp.as_user('f3333333-3333-4333-8333-333333333333');
select pg_temp.expect_error($q$select public.choose_team_departure(pg_temp.open_departure('fb111111-1111-4111-8111-111111111111'), 'dissolve')$q$, '42501', 'the leaver chose');

-- 2. Uneinig bleibt offen; Einigkeit schliesst; danach keine Aenderung mehr.
select pg_temp.as_user('f1111111-1111-4111-8111-111111111111');
select pg_temp.assert_td(public.choose_team_departure(pg_temp.open_departure('fb111111-1111-4111-8111-111111111111'), 'continue') = 'open', 'one choice decided for two members');
select pg_temp.as_user('f2222222-2222-4222-8222-222222222222');
select pg_temp.assert_td(public.choose_team_departure(pg_temp.open_departure('fb111111-1111-4111-8111-111111111111'), 'dissolve') = 'open', 'disagreement did not stay open');
select pg_temp.assert_td((select count(*) = 2 from public.team_departure_choices), 'both choices are not visible to a member');
select pg_temp.expect_error($q$select public.choose_team_departure(pg_temp.open_departure('fb111111-1111-4111-8111-111111111111'), 'maybe')$q$, '22023', 'an invented choice was accepted');
select pg_temp.assert_td(public.choose_team_departure(pg_temp.open_departure('fb111111-1111-4111-8111-111111111111'), 'continue') = 'continue', 'agreement on continue did not close');
select pg_temp.assert_td((select status = 'continue' and decided_at is not null from public.team_departures where team_id = 'fb111111-1111-4111-8111-111111111111'), 'status not stored');
select pg_temp.assert_td((select archived_at is null from public.founder_teams where id = 'fb111111-1111-4111-8111-111111111111'), 'continue archived the team');

-- 3. Team 2: alle Verbleibenden waehlen "aufloesen": das Team wird archiviert.
select pg_temp.as_user('f3333333-3333-4333-8333-333333333333');
select public.leave_founder_team('fb222222-2222-4222-8222-222222222222');
select pg_temp.as_user('f1111111-1111-4111-8111-111111111111');
select pg_temp.assert_td(public.choose_team_departure(pg_temp.open_departure('fb222222-2222-4222-8222-222222222222'), 'dissolve') = 'open', 'one dissolve vote closed it');
select pg_temp.as_user('f2222222-2222-4222-8222-222222222222');
select pg_temp.assert_td(public.choose_team_departure(pg_temp.open_departure('fb222222-2222-4222-8222-222222222222'), 'dissolve') = 'dissolved', 'unanimous dissolve did not close');
reset role;
select pg_temp.assert_td((select archived_at is not null from public.founder_teams where id = 'fb222222-2222-4222-8222-222222222222'), 'dissolve did not archive the team');
select pg_temp.assert_td((select count(*) = 2 from public.founder_team_members where team_id = 'fb222222-2222-4222-8222-222222222222'), 'dissolve removed members');

-- 4. Die letzte Person geht: kein Eintrag (es gibt niemanden, der entscheidet).
set local role authenticated;
select pg_temp.as_user('f1111111-1111-4111-8111-111111111111');
select public.leave_founder_team('fb333333-3333-4333-8333-333333333333');
reset role;
select pg_temp.assert_td((select count(*) = 0 from public.team_departures where team_id = 'fb333333-3333-4333-8333-333333333333'), 'a departure was created although nobody remains');

select extensions.pass('team departure: entry for the remaining members, unanimous choice only, dissolve archives, nothing for the last person');
select * from extensions.finish();
rollback;
