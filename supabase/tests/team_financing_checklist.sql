\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_tf(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'financing assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.expect_error(stmt text, expected_state text, message text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'financing assertion failed: % (got %, expected %)', message, sqlstate, expected_state;
  end;
  raise exception 'financing assertion failed: % (no error)', message;
end;
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
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-aaaaaaaaaaa1', 'authenticated', 'authenticated', 'fin-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-aaaaaaaaaaa2', 'authenticated', 'authenticated', 'fin-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3333333-3333-4333-8333-aaaaaaaaaaa3', 'authenticated', 'authenticated', 'fin-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values
  ('ac111111-1111-4111-8111-111111111111', 'existing_team'),
  ('ac222222-2222-4222-8222-222222222222', 'pre_founder');
insert into public.founder_team_members(team_id, user_id) values
  ('ac111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-aaaaaaaaaaa1'),
  ('ac111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-aaaaaaaaaaa2'),
  ('ac222222-2222-4222-8222-222222222222', 'a3333333-3333-4333-8333-aaaaaaaaaaa3');

set local role authenticated;

-- 1. Mitglied A setzt einen Status; Mitglied B sieht ihn und darf ihn aendern.
select pg_temp.as_user('a1111111-1111-4111-8111-aaaaaaaaaaa1');
select public.set_team_financing_item('ac111111-1111-4111-8111-111111111111', 'split_written', 'done');
select pg_temp.as_user('a2222222-2222-4222-8222-aaaaaaaaaaa2');
select pg_temp.assert_tf((select status = 'done' from public.team_financing_items where item_key = 'split_written'), 'B did not see the status A set');
select public.set_team_financing_item('ac111111-1111-4111-8111-111111111111', 'split_written', 'progress');
select pg_temp.assert_tf(
  (select status = 'progress' and updated_by_user_id = 'a2222222-2222-4222-8222-aaaaaaaaaaa2' from public.team_financing_items where item_key = 'split_written'),
  'a member could not change the status, or the last editor is not recorded');
select pg_temp.assert_tf((select count(*) = 1 from public.team_financing_items), 'a second row was created for the same item');

-- 2. Aussenstehende sehen und aendern nichts; ein anderes Team ist getrennt.
select pg_temp.as_user('a3333333-3333-4333-8333-aaaaaaaaaaa3');
select pg_temp.assert_tf((select count(*) = 0 from public.team_financing_items where team_id = 'ac111111-1111-4111-8111-111111111111'), 'an outsider can read another team');
select pg_temp.expect_error($q$select public.set_team_financing_item('ac111111-1111-4111-8111-111111111111', 'sale_stance', 'done')$q$, '42501', 'an outsider changed the status');

-- 3. Ein Solo-Vorhaben (ein Mitglied) funktioniert genauso.
select public.set_team_financing_item('ac222222-2222-4222-8222-222222222222', 'tie_break', 'na');
select pg_temp.assert_tf((select status = 'na' from public.team_financing_items where team_id = 'ac222222-2222-4222-8222-222222222222'), 'a solo team could not set a status');

-- 4. Ungueltige Eingaben werden abgelehnt.
select pg_temp.expect_error($q$select public.set_team_financing_item('ac222222-2222-4222-8222-222222222222', 'tie_break', 'score')$q$, '22023', 'an invented status was accepted');
select pg_temp.expect_error($q$select public.set_team_financing_item('ac222222-2222-4222-8222-222222222222', 'invented_item', 'done')$q$, '22023', 'an invented item was accepted');

-- 5. Direktes Schreiben ist nicht moeglich.
select pg_temp.expect_error($q$insert into public.team_financing_items(team_id, item_key, status) values ('ac222222-2222-4222-8222-222222222222', 'sale_stance', 'done')$q$, '42501', 'direct insert was allowed');
reset role;

select extensions.pass('financing checklist: members share and change statuses, outsiders see nothing, solo works, invalid input is refused');
select * from extensions.finish();
rollback;
