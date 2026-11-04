\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- ---------------------------------------------------------------------------
-- Auswertung fuer die Organisation (20270308120000)
-- ---------------------------------------------------------------------------
--
-- Dieselben Teams wie bei der Anwesenheit (Inhaber alle, Bezugsperson die
-- eigenen, Founder keine). Eine Veranstaltung zaehlt fuer ein Team erst ab dem
-- Tag, an dem sein Programm aktiv wurde. Gespraeche nur mit Erfolgen - sonst
-- null statt 0.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ed000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'report' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 7) n;
insert into public.advisor_orgs(id, name) values ('ed000000-0000-4000-8000-0000000000a0', 'Programm Bericht');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000001','owner','active'),
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000004','advisor','active'),
('ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-000000000005','advisor','active');
insert into public.founder_teams(id, name, team_context) values
('ed000000-0000-4000-8000-0000000000b0', 'Frueh', 'existing_team'),
('ed000000-0000-4000-8000-0000000000b1', 'Spaet', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
('ed000000-0000-4000-8000-0000000000b0','ed000000-0000-4000-8000-000000000002'),
('ed000000-0000-4000-8000-0000000000b0','ed000000-0000-4000-8000-000000000003'),
('ed000000-0000-4000-8000-0000000000b1','ed000000-0000-4000-8000-000000000006'),
('ed000000-0000-4000-8000-0000000000b1','ed000000-0000-4000-8000-000000000007');
-- "Frueh" ist seit zehn Tagen dabei, "Spaet" erst seit heute.
insert into public.team_programs(id, org_id, team_id, status, activated_at) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-0000000000b0','active', now() - interval '10 days'),
('ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-0000000000a0','ed000000-0000-4000-8000-0000000000b1','active', now());
insert into public.team_program_consents(program_id, founder_user_id) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000002'),
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000003'),
('ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-000000000006'),
('ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-000000000007');
insert into public.team_program_contacts(program_id, advisor_user_id) values
('ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000004');

insert into public.team_program_events(id, org_id, title, kind, starts_at) values
('ed000000-0000-4000-8000-0000000000e0','ed000000-0000-4000-8000-0000000000a0','Kickoff','education', now() - interval '5 days'),
('ed000000-0000-4000-8000-0000000000e1','ed000000-0000-4000-8000-0000000000a0','Demo Day','external', now() + interval '3 days');
insert into public.team_program_attendance(event_id, program_id, status) values
('ed000000-0000-4000-8000-0000000000e0','ed000000-0000-4000-8000-0000000000c0','present');
insert into public.team_program_event_rsvps(event_id, program_id, user_id, response, set_by_user_id) values
('ed000000-0000-4000-8000-0000000000e1','ed000000-0000-4000-8000-0000000000c0','ed000000-0000-4000-8000-000000000002','yes','ed000000-0000-4000-8000-000000000002'),
('ed000000-0000-4000-8000-0000000000e1','ed000000-0000-4000-8000-0000000000c1','ed000000-0000-4000-8000-000000000006','no','ed000000-0000-4000-8000-000000000006');
insert into public.program_check_ins(program_id, held_on, summary) values
('ed000000-0000-4000-8000-0000000000c0', current_date - 4, 'Geheim: Finanzierungsrunde'),
('ed000000-0000-4000-8000-0000000000c0', current_date - 40, 'Alt');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Inhaber: alle Teams, Veranstaltung erst ab Programmbeginn
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.get_org_report_attendance('ed000000-0000-4000-8000-0000000000a0', null, null)),
  3, 'the owner gets each event for each team that was in the program by then');
select extensions.is(
  (select count(*)::int from public.get_org_report_attendance('ed000000-0000-4000-8000-0000000000a0', null, null)
   where event_id = 'ed000000-0000-4000-8000-0000000000e0' and program_id = 'ed000000-0000-4000-8000-0000000000c1'),
  0, 'an event before a team joined does not count against it');
select extensions.results_eq(
  $$select attendance, rsvp_yes, rsvp_no from public.get_org_report_attendance('ed000000-0000-4000-8000-0000000000a0', null, null)
    where program_id = 'ed000000-0000-4000-8000-0000000000c0' order by starts_at$$,
  $$values ('present'::text, 0, 0), (null::text, 1, 0)$$,
  'attendance and replies come per event and team');
select extensions.is(
  (select count(*)::int from public.get_org_report_attendance('ed000000-0000-4000-8000-0000000000a0', current_date, null)),
  2, 'the period limits the events');

-- Gespraeche: ohne Erfolge nicht erfasst.
select extensions.is(
  (select check_ins from public.get_org_report_check_ins('ed000000-0000-4000-8000-0000000000a0', null, null)
   where program_id = 'ed000000-0000-4000-8000-0000000000c0'),
  null, 'without achievements, conversations are not recorded - null, not zero');

reset role;
update public.advisor_orgs set program_success_enabled = true where id = 'ed000000-0000-4000-8000-0000000000a0';
set local role authenticated;
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.results_eq(
  $$select check_ins, last_held_on from public.get_org_report_check_ins('ed000000-0000-4000-8000-0000000000a0', null, null) order by team_name$$,
  $$values (2, current_date - 4), (0, null::date)$$,
  'with achievements, conversations are counted per team');
select extensions.is(
  (select check_ins from public.get_org_report_check_ins('ed000000-0000-4000-8000-0000000000a0', current_date - 30, null)
   where program_id = 'ed000000-0000-4000-8000-0000000000c0'),
  1, 'and the period limits them too');

-- ---------------------------------------------------------------------------
-- Bezugsperson: nur die eigenen; andere Mitglieder und Founder: nichts
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is(
  (select count(distinct program_id)::int from public.get_org_report_check_ins('ed000000-0000-4000-8000-0000000000a0', null, null)),
  1, 'a contact sees only their own team');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000005","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.get_org_report_attendance('ed000000-0000-4000-8000-0000000000a0', null, null)),
  0, 'an org member who is no contact sees nothing');
set local request.jwt.claims = '{"sub":"ed000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.get_org_report_check_ins('ed000000-0000-4000-8000-0000000000a0', null, null)),
  0, 'a founder gets no report');

-- Der Hilfsbaustein ist fuer Konten nicht aufrufbar.
select extensions.throws_ok(
  $$select * from public.program_report_programs('ed000000-0000-4000-8000-0000000000a0')$$,
  '42501', null, 'the helper is not callable directly');

select * from extensions.finish();
rollback;
