\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- ---------------------------------------------------------------------------
-- Zusagen zu Programm-Veranstaltungen (20270307120000)
-- ---------------------------------------------------------------------------
--
-- Je Person "ich komme / ich kann nicht", dazu ein Knopf fuer das ganze Team,
-- der niemanden ueberschreibt, der selbst geantwortet hat. Sichtbar fuer das
-- eigene Team und fuer die, die die Anwesenheit sehen. Weg mit dem Verlassen
-- des Teams und dem Ende des Programms.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ef000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'rsvp' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 8) n;
insert into public.advisor_orgs(id, name) values ('ef000000-0000-4000-8000-0000000000a0', 'Programm Zusagen');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-000000000001','owner','active'),
('ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-000000000004','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('ef000000-0000-4000-8000-0000000000b0', 'Drei', 'existing_team'),
('ef000000-0000-4000-8000-0000000000b1', 'Zwei', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ef000000-0000-4000-8000-0000000000b0','ef000000-0000-4000-8000-000000000002'),
('ef000000-0000-4000-8000-0000000000b0','ef000000-0000-4000-8000-000000000003'),
('ef000000-0000-4000-8000-0000000000b0','ef000000-0000-4000-8000-000000000008'),
('ef000000-0000-4000-8000-0000000000b1','ef000000-0000-4000-8000-000000000006'),
('ef000000-0000-4000-8000-0000000000b1','ef000000-0000-4000-8000-000000000007');
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-0000000000b0','active', now()),
('ef000000-0000-4000-8000-0000000000c1','ef000000-0000-4000-8000-0000000000a0','ef000000-0000-4000-8000-0000000000b1','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-000000000002'),
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-000000000003'),
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-000000000008'),
('ef000000-0000-4000-8000-0000000000c1','ef000000-0000-4000-8000-000000000006'),
('ef000000-0000-4000-8000-0000000000c1','ef000000-0000-4000-8000-000000000007');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('ef000000-0000-4000-8000-0000000000c0','ef000000-0000-4000-8000-000000000004');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000001","role":"authenticated"}';
create temp table ev as select
  public.save_program_event('ef000000-0000-4000-8000-0000000000a0', null, 'Demo Day', 'education', now() + interval '3 days', null, null, null) as future,
  public.save_program_event('ef000000-0000-4000-8000-0000000000a0', null, 'Kickoff', 'education', now() - interval '1 hour', null, null, null) as past;
grant select on ev to authenticated;

-- Hilfsfunktion: die Antwort einer Person zur kommenden Veranstaltung (als Superuser gelesen).
create function pg_temp.answer(p_user text) returns text language sql as $$
  select response from public.team_program_event_rsvps
  where event_id = (select future from ev) and user_id = p_user::uuid
$$;

-- ---------------------------------------------------------------------------
-- Je Person
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.set_program_event_rsvp((select future from ev), 'ef000000-0000-4000-8000-0000000000c0', 'no', false);

reset role;
select extensions.is(pg_temp.answer('ef000000-0000-4000-8000-000000000002'), 'no', 'a member answers for themselves');

-- ---------------------------------------------------------------------------
-- Fuers ganze Team: nur wer noch nicht selbst geantwortet hat
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000003","role":"authenticated"}';
select public.set_program_event_rsvp((select future from ev), 'ef000000-0000-4000-8000-0000000000c0', 'yes', true);

reset role;
select extensions.is(pg_temp.answer('ef000000-0000-4000-8000-000000000003'), 'yes', 'the whole-team button answers for the person pressing it');
select extensions.is(pg_temp.answer('ef000000-0000-4000-8000-000000000008'), 'yes', 'and for everyone who has not answered');
select extensions.is(pg_temp.answer('ef000000-0000-4000-8000-000000000002'), 'no', 'but never overwrites somebody who answered themselves');

-- Wer fuer sich eingetragen wurde, aendert es selbst - und ist danach geschuetzt.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000008","role":"authenticated"}';
select public.set_program_event_rsvp((select future from ev), 'ef000000-0000-4000-8000-0000000000c0', 'no', false);
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.set_program_event_rsvp((select future from ev), 'ef000000-0000-4000-8000-0000000000c0', 'yes', true);

reset role;
select extensions.is(pg_temp.answer('ef000000-0000-4000-8000-000000000008'), 'no', 'an answer changed by the person stays theirs');
select extensions.is(pg_temp.answer('ef000000-0000-4000-8000-000000000002'), 'yes', 'the person pressing the team button changes their own answer');

-- ---------------------------------------------------------------------------
-- Grenzen
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000006","role":"authenticated"}';
select extensions.throws_ok($$select public.set_program_event_rsvp((select future from ev), 'ef000000-0000-4000-8000-0000000000c0', 'yes', true)$$, '42501', null, 'somebody from another team cannot answer');
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.set_program_event_rsvp((select past from ev), 'ef000000-0000-4000-8000-0000000000c0', 'yes', false)$$, '55000', null, 'an event that has started takes no replies');
select extensions.throws_ok($$select public.set_program_event_rsvp((select future from ev), 'ef000000-0000-4000-8000-0000000000c0', 'maybe', false)$$, '22023', null, 'only yes or no');
select extensions.throws_ok($$select count(*) from public.team_program_event_rsvps$$, '42501', null, 'the table itself stays closed');

-- ---------------------------------------------------------------------------
-- Wer was sieht
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.get_my_program_event_rsvps() where event_id = (select future from ev)),
  3, 'the team sees every current member, answered or not');
select extensions.is((select count(*)::int from public.get_event_rsvps((select future from ev))), 0, 'the organisation list is not served to a founder');

set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_event_rsvps((select future from ev))), 3, 'a contact sees the members of their own team');
set local request.jwt.claims = '{"sub":"ef000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.get_event_rsvps((select future from ev))), 5, 'the owner sees every active team');

-- ---------------------------------------------------------------------------
-- Aufraeumen
-- ---------------------------------------------------------------------------
reset role;
delete from public.founder_team_members
where team_id = 'ef000000-0000-4000-8000-0000000000b0' and user_id = 'ef000000-0000-4000-8000-000000000008';
select extensions.is(pg_temp.answer('ef000000-0000-4000-8000-000000000008'), null, 'leaving the team takes the replies along');

update public.team_programs set status = 'ended', ended_at = now() where id = 'ef000000-0000-4000-8000-0000000000c0';
select extensions.is(
  (select count(*)::int from public.team_program_event_rsvps where program_id = 'ef000000-0000-4000-8000-0000000000c0'),
  0, 'ending the program deletes its replies');

select * from extensions.finish();
rollback;
