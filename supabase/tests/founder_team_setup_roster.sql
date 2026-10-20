\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

-- Prueft: Eine Setup-Bestaetigung gilt nur, solange die Person seither nicht ausgetreten ist
-- (Pruefung fuer drei und vier Gruendende, 21.10.2026). Drei Mitglieder A, B, C; C tritt aus und wieder ein.

create or replace function pg_temp.assert_roster(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'setup roster assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'roster-a@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'roster-b@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'roster-c@example.com', '', now(), '{}', '{}', now(), now());

insert into public.founder_teams (id, team_context) values ('ab111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members (team_id, user_id) values
  ('ab111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111'),
  ('ab111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222'),
  ('ab111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333');

-- 1. Alle drei bestaetigen eine Vereinbarung: 3/3, abgeschlossen.
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.propose_founder_team_setup_revision('ab111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'clarified', 'Erste Fassung', null);
reset role;
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision((select pending_revision_id from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'));
reset role;
select set_config('request.jwt.claims', '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision((select pending_revision_id from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'));
reset role;
select pg_temp.assert_roster(
  (select current_confirmed_revision_id is not null and pending_revision_id is null from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'),
  '3/3 did not finalize');

-- 2. Die Hilfsfunktion: vor dem Austritt gilt, danach nicht. (Zeitpunkte von Hand gesetzt - eine Transaktion hat nur ein now().)
update public.founder_team_setup_confirmations set confirmed_at = now() - interval '5 days';
delete from public.founder_team_members where team_id = 'ab111111-1111-4111-8111-111111111111' and user_id = 'a3333333-3333-4333-8333-333333333333';
update public.founder_team_member_exits set exited_at = now() - interval '3 days'
  where team_id = 'ab111111-1111-4111-8111-111111111111' and user_id = 'a3333333-3333-4333-8333-333333333333';
select pg_temp.assert_roster(
  (select count(*) = 1 from public.founder_team_member_exits where team_id = 'ab111111-1111-4111-8111-111111111111' and user_id = 'a3333333-3333-4333-8333-333333333333'),
  'the exit was not recorded');
select pg_temp.assert_roster(
  public.setup_confirmation_is_current('ab111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', now() - interval '5 days'),
  'a member who never left lost a confirmation');
select pg_temp.assert_roster(
  not public.setup_confirmation_is_current('ab111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333', now() - interval '5 days'),
  'a confirmation from before the exit still counts');
select pg_temp.assert_roster(
  public.setup_confirmation_is_current('ab111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333', now() - interval '1 day'),
  'a confirmation after the exit does not count');

-- 3. C tritt wieder ein. Eine neue Fassung steht an; Cs ALTE Bestaetigung (vor dem Austritt) darf sie nicht abschliessen.
insert into public.founder_team_members (team_id, user_id) values ('ab111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333');
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.propose_founder_team_setup_revision('ab111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'clarified', 'Zweite Fassung', null);
reset role;
-- Cs Zeile auf der neuen Fassung stammt von vor dem Austritt (so wie nach einem Wiedereintritt nach altem Stand).
insert into public.founder_team_setup_confirmations (revision_id, user_id, confirmed_at)
select pending_revision_id, 'a3333333-3333-4333-8333-333333333333', now() - interval '4 days'
from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'
on conflict do nothing;
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision((select pending_revision_id from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'));
reset role;
select pg_temp.assert_roster(
  (select pending_revision_id is not null from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'),
  'a stale confirmation finalized the revision without the rejoined member');

-- 4. C bestaetigt jetzt selbst: der Zeitpunkt wird erneuert, drei von drei, abgeschlossen.
select set_config('request.jwt.claims', '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision((select pending_revision_id from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'));
reset role;
select pg_temp.assert_roster(
  (select pending_revision_id is null and current_confirmed_revision_id is not null from public.founder_team_setup_items where team_id = 'ab111111-1111-4111-8111-111111111111'),
  'a fresh confirmation by the rejoined member did not finalize');

select extensions.pass('setup confirmations follow the roster across leave and rejoin');
select * from extensions.finish();
rollback;
