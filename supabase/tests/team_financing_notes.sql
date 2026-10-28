\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_tn(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'financing note assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.expect_error(stmt text, expected_state text, message text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'financing note assertion failed: % (got %, expected %)', message, sqlstate, expected_state;
  end;
  raise exception 'financing note assertion failed: % (no error)', message;
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
  ('00000000-0000-0000-0000-000000000000', 'b1111111-1111-4111-8111-bbbbbbbbbbb1', 'authenticated', 'authenticated', 'fn-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b2222222-2222-4222-8222-bbbbbbbbbbb2', 'authenticated', 'authenticated', 'fn-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b3333333-3333-4333-8333-bbbbbbbbbbb3', 'authenticated', 'authenticated', 'fn-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.founder_teams(id, team_context) values ('bc111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('bc111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-bbbbbbbbbbb1'),
  ('bc111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-bbbbbbbbbbb2');

set local role authenticated;

-- 1. A schreibt, B liest und aendert; leere Notiz loescht.
select pg_temp.as_user('b1111111-1111-4111-8111-bbbbbbbbbbb1');
select public.set_team_financing_note('bc111111-1111-4111-8111-111111111111', 'purpose', '  Produkt fertigstellen, erste zehn Kunden  ');
select pg_temp.as_user('b2222222-2222-4222-8222-bbbbbbbbbbb2');
select pg_temp.assert_tn((select note = 'Produkt fertigstellen, erste zehn Kunden' from public.team_financing_notes where question_key = 'purpose'), 'B did not see the trimmed note of A');
select public.set_team_financing_note('bc111111-1111-4111-8111-111111111111', 'purpose', 'Produkt fertigstellen');
select pg_temp.assert_tn((select updated_by_user_id = 'b2222222-2222-4222-8222-bbbbbbbbbbb2' and note = 'Produkt fertigstellen' from public.team_financing_notes), 'B could not change the note');
select public.set_team_financing_note('bc111111-1111-4111-8111-111111111111', 'sale', 'Erst nach Jahr drei');
select public.set_team_financing_note('bc111111-1111-4111-8111-111111111111', 'sale', '   ');
select pg_temp.assert_tn((select count(*) = 1 from public.team_financing_notes), 'an empty note did not remove the row');

-- 2. Aussenstehende; ungueltige Eingaben; direktes Schreiben.
select pg_temp.as_user('b3333333-3333-4333-8333-bbbbbbbbbbb3');
select pg_temp.assert_tn((select count(*) = 0 from public.team_financing_notes), 'an outsider can read notes');
select pg_temp.expect_error($q$select public.set_team_financing_note('bc111111-1111-4111-8111-111111111111', 'purpose', 'x')$q$, '42501', 'an outsider wrote a note');
select pg_temp.as_user('b1111111-1111-4111-8111-bbbbbbbbbbb1');
select pg_temp.expect_error($q$select public.set_team_financing_note('bc111111-1111-4111-8111-111111111111', 'invented', 'x')$q$, '22023', 'an invented question was accepted');
select pg_temp.expect_error($q$select public.set_team_financing_note('bc111111-1111-4111-8111-111111111111', 'purpose', repeat('a', 601))$q$, '22023', 'a 601-character note was accepted');
select pg_temp.expect_error($q$insert into public.team_financing_notes(team_id, question_key, note) values ('bc111111-1111-4111-8111-111111111111', 'sale', 'x')$q$, '42501', 'direct insert was allowed');
reset role;

-- 3. Loeschfrist: alte Notiz weg, junge bleibt; nur der Zeitplan darf.
insert into public.team_financing_notes(team_id, question_key, note, updated_at) values
  ('bc111111-1111-4111-8111-111111111111', 'reporting', 'Alt', now() - interval '400 days');
create temp table purge_result (r jsonb);
grant all on purge_result to public;
set local role service_role;
insert into purge_result select public.purge_stale_financing_notes();
reset role;
select pg_temp.assert_tn((select count(*) = 1 from public.team_financing_notes) and not exists (select 1 from public.team_financing_notes where question_key = 'reporting'), 'purge removed the wrong rows');
set local role authenticated;
select pg_temp.expect_error($q$select public.purge_stale_financing_notes()$q$, '42501', 'authenticated could run the purge');
reset role;

select extensions.pass('financing notes: members share and change, empty removes, outsiders see nothing, 600 characters, stale notes are purged by the schedule only');
select * from extensions.finish();
rollback;
