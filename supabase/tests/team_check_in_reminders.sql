\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_cr(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'check-in reminder assertion failed: %', message; end if;
end;
$$;

create or replace function pg_temp.expect_error(stmt text, expected_state text, message text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise exception 'check-in reminder assertion failed: % (got %, expected %)', message, sqlstate, expected_state;
  end;
  raise exception 'check-in reminder assertion failed: % (no error)', message;
end;
$$;

-- Der Zeitplan ruft als service_role; das Ergebnis wird in einer Temp-Tabelle festgehalten,
-- damit es sich ohne Rollenwechsel auswerten laesst.
create temp table run_result (recipient_user_id uuid, team_id uuid, wants_email boolean);
grant all on run_result to public;

create or replace function pg_temp.run_reminders()
returns integer language plpgsql as $$
declare v_count integer;
begin
  delete from run_result;
  set local role service_role;
  insert into run_result select * from public.prepare_team_check_in_reminders(50);
  reset role;
  select count(*) into v_count from run_result;
  return v_count;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'cr-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'cr-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'cr-solo@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values
  ('cb111111-1111-4111-8111-111111111111', 'existing_team'),
  ('cb222222-2222-4222-8222-222222222222', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('cb111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111'),
  ('cb111111-1111-4111-8111-111111111111', 'c2222222-2222-4222-8222-222222222222'),
  ('cb222222-2222-4222-8222-222222222222', 'c3333333-3333-4333-8333-333333333333');

-- Team 1: ein Thema, von beiden vor 100 Tagen bestaetigt. Team 2 (eine Person): ebenso.
insert into public.founder_team_setup_items(id, team_id, item_key, updated_by_user_id) values
  ('c0000001-0000-4000-8000-000000000001', 'cb111111-1111-4111-8111-111111111111', 'decision_rights', 'c1111111-1111-4111-8111-111111111111'),
  ('c0000001-0000-4000-8000-000000000002', 'cb222222-2222-4222-8222-222222222222', 'decision_rights', 'c3333333-3333-4333-8333-333333333333');
insert into public.founder_team_setup_revisions(id, setup_item_id, resolution_status, note, proposed_by_user_id, confirmed_at) values
  ('c0000002-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'clarified', 'Produkt: A', 'c1111111-1111-4111-8111-111111111111', now() - interval '100 days'),
  ('c0000002-0000-4000-8000-000000000002', 'c0000001-0000-4000-8000-000000000002', 'clarified', 'Alles ich', 'c3333333-3333-4333-8333-333333333333', now() - interval '100 days');
update public.founder_team_setup_items i set current_confirmed_revision_id = r.id
from public.founder_team_setup_revisions r where r.setup_item_id = i.id;
insert into public.founder_team_setup_confirmations(revision_id, user_id) values
  ('c0000002-0000-4000-8000-000000000001', 'c1111111-1111-4111-8111-111111111111'),
  ('c0000002-0000-4000-8000-000000000001', 'c2222222-2222-4222-8222-222222222222'),
  ('c0000002-0000-4000-8000-000000000002', 'c3333333-3333-4333-8333-333333333333');

-- 1. Faellig nach 90 Tagen: beide Mitglieder, Mail standardmaessig NICHT erlaubt; das
--    Ein-Personen-Team bekommt nichts.
select pg_temp.assert_cr(pg_temp.run_reminders() = 2, 'first run did not remind exactly the two members');
select pg_temp.assert_cr(
  (select count(*) = 2 from run_result where team_id = 'cb111111-1111-4111-8111-111111111111')
  and (select count(*) = 0 from run_result where wants_email), 'wrong recipients or mail allowed without consent');

-- 2. Hoechstens einmal je Person, Team und Faelligkeit.
select pg_temp.assert_cr(pg_temp.run_reminders() = 0, 'the same due date was reminded twice');

-- 3. Abbestellt: B bekommt nichts (auch keine Mitteilung); A mit Zustimmung bekommt die Mail.
delete from public.team_check_in_reminders;
insert into public.notification_opt_outs(user_id, kind) values ('c2222222-2222-4222-8222-222222222222', 'team_check_in');
insert into public.notification_opt_ins(user_id, kind) values ('c1111111-1111-4111-8111-111111111111', 'team_check_in_email');
select pg_temp.assert_cr(pg_temp.run_reminders() = 1, 'opted-out member was reminded');
select pg_temp.assert_cr(
  (select recipient_user_id = 'c1111111-1111-4111-8111-111111111111' and wants_email from run_result),
  'consented member did not get the mail flag');

-- 4. Zustimmung ohne allgemeinen Schalter reicht nicht, wenn die Art abbestellt ist.
delete from public.team_check_in_reminders;
insert into public.notification_opt_outs(user_id, kind) values ('c1111111-1111-4111-8111-111111111111', 'team_check_in');
select pg_temp.assert_cr(pg_temp.run_reminders() = 0, 'opt-out did not beat the mail consent');
delete from public.notification_opt_outs where kind = 'team_check_in';
delete from public.notification_opt_ins where kind = 'team_check_in_email';
delete from public.team_check_in_reminders;

-- 5. Noch nicht faellig: 40 Tage alte Bestaetigung bei 90 Tagen; bei 30 Tagen faellig.
update public.founder_team_setup_revisions set confirmed_at = now() - interval '40 days'
  where id = 'c0000002-0000-4000-8000-000000000001';
select pg_temp.assert_cr(pg_temp.run_reminders() = 0, 'reminded before the interval ran out');
insert into public.team_check_in_settings(team_id, interval_days) values ('cb111111-1111-4111-8111-111111111111', 30);
select pg_temp.assert_cr(pg_temp.run_reminders() = 2, 'the 30-day interval was ignored');
delete from public.team_check_in_reminders;

-- 6. Laeuft ein Check-in, wird nicht erinnert; nach dem Abschluss zaehlt der Abschluss.
insert into public.team_check_ins(id, team_id, status) values ('c0000003-0000-4000-8000-000000000001', 'cb111111-1111-4111-8111-111111111111', 'open');
select pg_temp.assert_cr(pg_temp.run_reminders() = 0, 'reminded while a check-in was open');
update public.team_check_ins set status = 'closed', closed_at = now() - interval '5 days' where id = 'c0000003-0000-4000-8000-000000000001';
select pg_temp.assert_cr(pg_temp.run_reminders() = 0, 'reminded although the last check-in was five days ago');

-- 7. Niemand ausser dem Zeitplan darf die Funktion aufrufen.
set local role authenticated;
select pg_temp.expect_error($q$select * from public.prepare_team_check_in_reminders(10)$q$, '42501', 'authenticated could run the reminder job');
select pg_temp.expect_error($q$select * from public.team_check_in_reminders$q$, '42501', 'authenticated could read the reminder stamps');
reset role;

select extensions.pass('check-in reminders: once per person and due date, opt-out beats consent, mail only with consent, only the schedule may run it');
select * from extensions.finish();
rollback;
