\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(18);

-- ---------------------------------------------------------------------------
-- Eine Person, ein Arbeiter, ein Fremder
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000001','authenticated','authenticated','person@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000002','authenticated','authenticated','worker@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000003','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

insert into public.ai_workers(user_id, label) values
('e1000000-0000-4000-8000-000000000002', 'Laptop');

-- ---------------------------------------------------------------------------
-- Was nicht auf der Liste steht, kommt nicht in die Schlange
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$select public.enqueue_ai_job('profil_komplett_neu_schreiben')$$,
  '23514',
  null,
  'an unknown job type cannot be queued'
);

select extensions.isnt(
  public.enqueue_ai_job('ping'),
  null,
  'a known job type can'
);

-- Hoechstens eine offene je Art und Quelle: Ein doppelter Klick fuellt die
-- Schlange nicht.
select extensions.is(
  (select count(distinct id)::int from public.ai_jobs),
  1,
  'queueing the same thing twice yields one job'
);

select extensions.is(
  (select count(*)::int from public.ai_jobs),
  1,
  'and really only one row'
);

-- ---------------------------------------------------------------------------
-- Niemand legt Arbeit fuer jemand anderen hin
-- ---------------------------------------------------------------------------
-- Sonst koennte man die Rechenzeit eines Fremden verbrauchen oder eine
-- Auswertung ueber ihn anstossen.
set local role postgres;
select extensions.is(
  (select subject_user_id from public.ai_jobs),
  'e1000000-0000-4000-8000-000000000001'::uuid,
  'a job always belongs to whoever queued it'
);

-- Die Tabelle selbst nimmt nichts an.
set local role authenticated;
select extensions.throws_ok(
  $$insert into public.ai_jobs(job_type, subject_user_id) values ('ping','e1000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'no one writes to the queue directly'
);

-- ---------------------------------------------------------------------------
-- Abholen darf nur, wer auf der Liste steht
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}';

select extensions.throws_ok(
  $$select public.claim_ai_job()$$,
  '42501',
  null,
  'a stranger cannot take work out of the queue'
);

select extensions.throws_ok(
  $$select public.record_ai_worker_heartbeat('qwen3.5:4b')$$,
  '42501',
  null,
  'nor pretend to be a running worker'
);

-- Und niemand sieht die Aufgaben anderer.
select extensions.is(
  (select count(*)::int from public.ai_jobs),
  0,
  'a stranger sees no jobs at all'
);

-- ---------------------------------------------------------------------------
-- Der Arbeiter
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (select status from public.claim_ai_job()),
  'running',
  'the worker takes the job and it is marked running'
);

-- Ein zweiter Aufruf findet nichts: Die einzige Aufgabe ist in Arbeit.
select extensions.is(
  (select id from public.claim_ai_job()),
  null,
  'the same job is not handed out twice'
);

-- ---------------------------------------------------------------------------
-- Der Arbeiter sieht die Tabelle nicht
-- ---------------------------------------------------------------------------
-- BEIM TESTEN GEFUNDEN, und es ist die richtige Beschraenkung: Der Arbeiter
-- bekommt Aufgaben ausschliesslich ueber claim_ai_job(). Lesen darf er die
-- Tabelle nicht - er ist nicht der Gegenstand der Aufgaben, sondern nur
-- derjenige, der sie erledigt. Das Skript auf dem Laptop muss deshalb mit der
-- Kennung arbeiten, die es beim Abholen bekommen hat.
select extensions.is(
  (select count(*)::int from public.ai_jobs),
  0,
  'the worker cannot browse the queue, only take from it'
);

-- ---------------------------------------------------------------------------
-- Fehler sind Schluessel, keine Texte
-- ---------------------------------------------------------------------------
-- DAS IST DIE WICHTIGSTE ZUSAGE DIESER TABELLE: In error_code kann kein
-- Modelltext und kein Ausschnitt eines Lebenslaufs landen. Die FORM der Spalte
-- verhindert es, nicht die Sorgfalt des Aufrufers.
set local role postgres;
select extensions.throws_ok(
  $$update public.ai_jobs set error_code = 'Modell sagte: Maria K. wohnt in der Beispielstrasse 4'$$,
  '23514',
  null,
  'a message cannot be stored as an error'
);

-- ---------------------------------------------------------------------------
-- Ein Fehlschlag kommt zurueck in die Schlange
-- ---------------------------------------------------------------------------
update public.ai_jobs set status = 'pending', attempts = 0, claimed_at = null, completed_at = null, error_code = null;

set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (with claimed as (select id from public.claim_ai_job())
   select public.fail_ai_job(claimed.id, 'model_unreachable') from claimed),
  true,
  'a failure is recorded'
);

set local role postgres;
select extensions.is(
  (select status from public.ai_jobs),
  'pending',
  'and the job waits again - a laptop being off is not a permanent state'
);

-- Beim fuenften Anlauf bleibt sie liegen, statt ewig Rechenzeit zu verbrauchen.
update public.ai_jobs set status = 'pending', attempts = 4, claimed_at = null;

set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select (with claimed as (select id from public.claim_ai_job())
        select public.fail_ai_job(claimed.id, 'model_unreachable') from claimed);

set local role postgres;
select extensions.is(
  (select status from public.ai_jobs),
  'failed',
  'after five attempts it stops coming back'
);

-- ---------------------------------------------------------------------------
-- Die Anzeige
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.record_ai_worker_heartbeat('qwen3.5:4b');

set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  public.get_ai_availability(),
  true,
  'a fresh heartbeat means the model is available'
);

set local role postgres;
update public.ai_worker_heartbeats set last_seen_at = now() - interval '5 minutes';

set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  public.get_ai_availability(),
  false,
  'an old one does not - an off laptop becomes visible within a minute'
);

select * from extensions.finish();
rollback;
