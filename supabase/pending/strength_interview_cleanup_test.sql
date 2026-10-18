\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

-- ---------------------------------------------------------------------------
-- Nach dem Aufraeumen (20261206120000): nur noch der Staerken-Weg
-- ---------------------------------------------------------------------------
--
-- Gehoert zu `supabase/pending/20261206120000_strength_interview_cleanup.sql`
-- und wird mit ihr nach `supabase/tests/` verschoben. Vorher wuerde er
-- scheitern - die alte Funktion gibt es waehrend des Rollouts mit Absicht noch.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','cleanup@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','arbeiter@example.com','',now(),'{}','{}',now(),now());
insert into public.ai_workers(user_id, label) values ('d1000000-0000-4000-8000-000000000003','Testarbeiter');

insert into public.capability_interview_sessions(id, user_id, kind, status, completed_at) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','capability','active', null),
('d2000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','strengths','completed', now());
insert into public.capability_interview_turns(id, session_id, kind, sort_order, question_source, question_id, answer, answered_at) values
('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','capability',1,'catalogue','owned_last',
  'Ich habe drei Jahre lang jede Woche mit Kliniken telefoniert, bis endlich eine zugesagt hat.', now()),
('d3000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','strengths',1,'catalogue','hard_won',
  'Ich habe drei Jahre lang jede Woche mit Kliniken telefoniert, bis endlich eine zugesagt hat.', now());

-- Ein alter Vorschlag aus der Zeit davor.
insert into public.person_strength_proposals(turn_id, statement, evidence_quote)
values ('d3000000-0000-4000-8000-000000000001','Bleibt lange an einer Sache dran',
  'drei Jahre lang jede Woche mit Kliniken telefoniert');

insert into public.ai_jobs(id, job_type, subject_user_id, source_table, source_id, status, claimed_at) values
('d5000000-0000-4000-8000-000000000001','strength_proposal','d1000000-0000-4000-8000-000000000001',
  'capability_interview_sessions','d2000000-0000-4000-8000-000000000002','running', now());

select extensions.hasnt_function(
  'public', 'insert_ai_strength_proposal', array['uuid','text','text','text','text'],
  'the old capability-to-strengths write path is gone'
);

select extensions.has_function(
  'public', 'insert_ai_strength_proposal', array['uuid','uuid','text','text','text','text','text','text'],
  'the strengths write path stays'
);

select extensions.is(
  (select count(*)::int from public.person_strength_proposals
   where label is null and turn_id = 'd3000000-0000-4000-8000-000000000001'),
  1,
  'old proposals are kept'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.ok(
  public.insert_ai_strength_proposal(
    'd5000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000002',
    'Beharrlichkeit', 'Du bleibst dran, auch wenn es lange dauert.',
    'Du hast drei Jahre lang jede Woche angerufen, bis eine Klinik zugesagt hat.',
    'drei Jahre lang jede Woche mit Kliniken telefoniert', 'qwen', 'strengths-v1'),
  'a strengths job still writes after the cleanup'
);

-- Und ein alter Vorschlag laesst sich weiter bestaetigen.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.ok(
  public.confirm_strength_proposal(
    (select id from public.person_strength_proposals
     where label is null and turn_id = 'd3000000-0000-4000-8000-000000000001')
  ) is not null,
  'an old proposal can still be confirmed'
);

select * from extensions.finish();
rollback;
