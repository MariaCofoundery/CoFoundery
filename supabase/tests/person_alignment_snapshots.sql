\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Der Einzelreport fuer den Accelerator
-- ---------------------------------------------------------------------------
--
-- Der Umfang `alignment_report` war lange freigebbar und nirgends
-- darstellbar, weil die Rohantworten niemand ausser der Person selbst sieht.
-- Geteilt wird deshalb ein ABGELEITETES Abbild. Diese Suite prueft beide
-- Haelften: dass das Abbild nur mit Zustimmung herauskommt - und dass die
-- Rohantworten dabei bleiben, wo sie hingehoeren.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000001','authenticated','authenticated','founderin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000002','authenticated','authenticated','advisorin@example.com','',now(),'{}','{}',now(),now());

insert into public.person_alignment_snapshots(
  user_id, scores, values_status, basis_answered, basis_total)
values ('b1000000-0000-4000-8000-000000000001',
  '{"vision": 3.4, "tempo": 2.1}'::jsonb, 'not_started', 36, 36);

-- Ein Fragebogen mit Antworten - er darf nirgends durchscheinen.
insert into public.assessments(id, user_id, module, submitted_at)
values ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','base', now());
insert into public.assessment_answers(assessment_id, question_id, choice_value)
values ('b2000000-0000-4000-8000-000000000001','D1_Q1','4');

-- ---------------------------------------------------------------------------
-- Ohne Zustimmung: nichts
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.throws_ok(
  $$select * from public.get_advisor_person_alignment('b1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'without consent there is no report');

-- Und auch nicht ueber die Tabelle: Die Policy laesst nur die eigene Zeile zu.
select extensions.is_empty(
  $$select user_id from public.person_alignment_snapshots$$,
  'the table itself stays owner-only');

-- ---------------------------------------------------------------------------
-- Mit Zustimmung: die Zahlen, und nur die
-- ---------------------------------------------------------------------------
reset role;
insert into public.advisor_person_grants(
  subject_user_id, advisor_user_id, scope, status, requested_by_user_id, approved_at)
values ('b1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002',
  'alignment_report','active','b1000000-0000-4000-8000-000000000002', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (select scores->>'vision' from public.get_advisor_person_alignment('b1000000-0000-4000-8000-000000000001')),
  '3.4',
  'with consent the numbers are visible');
select extensions.is(
  (select basis_answered from public.get_advisor_person_alignment('b1000000-0000-4000-8000-000000000001')),
  36,
  'and what they rest on');

-- DIE ROHANTWORTEN BLEIBEN, WO SIE SIND. Das ist die Haelfte, die zaehlt:
-- Eine Freigabe des Ergebnisses ist keine Freigabe der Antworten.
select extensions.is_empty(
  $$select choice_value from public.assessment_answers
    where assessment_id = 'b2000000-0000-4000-8000-000000000001'$$,
  'a released report is not released answers');

-- Eine Zustimmung ist nicht die naechste.
select extensions.throws_ok(
  $$select * from public.get_advisor_person_capability('b1000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'the report does not bring the capabilities along');

-- ---------------------------------------------------------------------------
-- Die Funktion fasst die Antworten nicht einmal an
-- ---------------------------------------------------------------------------
-- Keine Filterung, sondern eine Abwesenheit: Was niemand lesen darf, wird am
-- besten gar nicht erst gelesen.
reset role;
select extensions.is(
  (select count(*)::int from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'get_advisor_person_alignment'
     and (p.prosrc like '%assessment_answers%' or p.prosrc like '%choices%')),
  0,
  'the reader never touches the raw answers');

-- ---------------------------------------------------------------------------
-- Ein Abbild ohne Inhalt gibt es nicht
-- ---------------------------------------------------------------------------
-- Eine Behauptung ueber einen Menschen, die auf nichts beruht, waere
-- schlimmer als gar keine.
select extensions.throws_ok(
  $$insert into public.person_alignment_snapshots(user_id, scores)
    values ('b1000000-0000-4000-8000-000000000002', '{}'::jsonb)$$,
  '23514', null, 'an empty snapshot is refused');

-- Und niemand legt ein Abbild fuer jemand anderen an.
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$insert into public.person_alignment_snapshots(user_id, scores)
    values ('b1000000-0000-4000-8000-000000000001', '{"vision": 1}'::jsonb)$$,
  '42501', null, 'nobody writes a snapshot for somebody else');

select * from extensions.finish();
rollback;
