\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Der Rollout: alter und neuer Arbeiter nebeneinander
-- ---------------------------------------------------------------------------
--
-- Zwischen dem Einspielen von 20261205120000 und der Aufraeum-Migration
-- (`supabase/pending/20261206120000_strength_interview_cleanup.sql`) koennen
-- beide Fassungen des Arbeiters laufen. Hier steht, dass beide Wege
-- funktionieren - und dass jeder nur dorthin schreibt, wohin er gehoert.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000001','authenticated','authenticated','rollout@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000003','authenticated','authenticated','arbeiter@example.com','',now(),'{}','{}',now(),now());
insert into public.ai_workers(user_id, label) values ('c1000000-0000-4000-8000-000000000003','Testarbeiter');

insert into public.capability_interview_sessions(id, user_id, kind, status, completed_at) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','capability','active', null),
('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','strengths','completed', now());

insert into public.capability_interview_turns(id, session_id, kind, sort_order, question_source, question_id, answer, answered_at) values
('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','capability',1,'catalogue','owned_last',
  'Ich habe den Vertrieb an Kliniken aufgebaut und drei Jahre lang jede Woche telefoniert, bis eine zugesagt hat.', now()),
('c3000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','strengths',1,'catalogue','took_charge',
  'Als niemand die Übergabe organisiert hat, habe ich selbst alle Beteiligten eingeladen und die Aufgaben verteilt.', now());

insert into public.ai_jobs(id, job_type, subject_user_id, source_table, source_id, status, claimed_at) values
('c5000000-0000-4000-8000-000000000001','capability_area_proposal','c1000000-0000-4000-8000-000000000001',
  'capability_interview_turns','c3000000-0000-4000-8000-000000000001','running', now()),
('c5000000-0000-4000-8000-000000000002','strength_proposal','c1000000-0000-4000-8000-000000000001',
  'capability_interview_sessions','c2000000-0000-4000-8000-000000000002','running', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Der ALTE Arbeiter: Capability-Job, alter Aufruf
-- ---------------------------------------------------------------------------
select extensions.ok(
  public.insert_ai_capability_proposal(
    'c5000000-0000-4000-8000-000000000001', 'b2b_sales',
    'drei Jahre lang jede Woche telefoniert', 'qwen', 1::smallint),
  'old worker: the capability proposal still works'
);

select extensions.ok(
  public.insert_ai_strength_proposal(
    'c5000000-0000-4000-8000-000000000001',
    'Bleibt dran, wenn es lange dauert',
    'drei Jahre lang jede Woche telefoniert', 'qwen', 'v1'),
  'old worker: the old strength call still works during the rollout'
);

-- Der alte Aufruf mit einem NEUEN Job geht nicht - er kennt nur Capability.
select extensions.ok(
  not public.insert_ai_strength_proposal(
    'c5000000-0000-4000-8000-000000000002',
    'Organisiert, wenn niemand zustaendig ist',
    'habe ich selbst alle Beteiligten eingeladen', 'qwen', 'v1'),
  'the old call does not accept a strengths job'
);

-- ---------------------------------------------------------------------------
-- Der NEUE Arbeiter: Staerken-Job, neuer Aufruf
-- ---------------------------------------------------------------------------
select extensions.ok(
  public.insert_ai_strength_proposal(
    'c5000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000002',
    'Verantwortung übernehmen', 'Du übernimmst Verantwortung, wenn etwas ungeklärt bleibt.',
    'In deinem Beispiel hast du die Übergabe selbst organisiert, obwohl niemand zuständig war.',
    'habe ich selbst alle Beteiligten eingeladen', 'qwen', 'strengths-v1'),
  'new worker: the strengths job works'
);

-- Der neue Aufruf mit dem Capability-Job geht nicht ...
select extensions.ok(
  not public.insert_ai_strength_proposal(
    'c5000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001',
    'Beharrlichkeit', 'Du bleibst dran, wenn es lange dauert.',
    'Du hast drei Jahre lang jede Woche telefoniert.',
    'drei Jahre lang jede Woche telefoniert', 'qwen', 'strengths-v1'),
  'the new call does not accept a capability job'
);

-- ... und der Staerken-Job erzeugt keine Bereiche.
select extensions.ok(
  not public.insert_ai_capability_proposal(
    'c5000000-0000-4000-8000-000000000002', 'b2b_sales',
    'habe ich selbst alle Beteiligten eingeladen', 'qwen', 1::smallint),
  'the strengths job cannot create capability proposals'
);

-- ---------------------------------------------------------------------------
-- Wer wohin geschrieben hat
-- ---------------------------------------------------------------------------
set local role postgres;

select extensions.is(
  (select count(*)::int from public.capability_area_proposals),
  1,
  'exactly one capability proposal - from the capability job'
);
select extensions.is(
  (select turn_id::text from public.capability_area_proposals),
  'c3000000-0000-4000-8000-000000000001',
  'the capability proposal belongs to the capability answer'
);

select extensions.is(
  (select count(*)::int from public.person_strength_proposals),
  2,
  'two strength proposals - one per path'
);
select extensions.ok(
  (select label is null and rationale is null and session_id is null
     and turn_id = 'c3000000-0000-4000-8000-000000000001'
   from public.person_strength_proposals where statement = 'Bleibt dran, wenn es lange dauert'),
  'the old path writes an old-style proposal on the capability answer'
);
select extensions.ok(
  (select label = 'Verantwortung übernehmen' and rationale is not null
     and session_id = 'c2000000-0000-4000-8000-000000000002'
     and turn_id = 'c3000000-0000-4000-8000-000000000002'
   from public.person_strength_proposals where label is not null),
  'the new path writes a labelled proposal on the strengths conversation'
);

select extensions.is(
  (select count(*)::int from public.person_strengths),
  0,
  'neither path writes a strength - only a person confirming does'
);

select * from extensions.finish();
rollback;
