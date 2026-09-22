\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Staerken und zwei Blickrichtungen
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 22.09.2026: "Dass die Einzelperson ein bisschen was ueber sich
-- erfaehrt und das auch noch mal ein bisschen selbst einschaetzen soll.
-- Vielleicht auch mit so einem Perspektivwechsel: was glaubst du, was deine
-- alten Kolleginnen sagen wuerden."
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000002','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000003','authenticated','authenticated','arbeiter@example.com','',now(),'{}','{}',now(),now());

insert into public.ai_workers(user_id, label) values
('a1000000-0000-4000-8000-000000000003','Testarbeiter');

insert into public.capability_interview_sessions(id, user_id)
values ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001');
insert into public.capability_interview_turns(
  id, session_id, sort_order, question_source, question_id, answer, answered_at)
values ('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  1,'catalogue','owned_last',
  'Ich habe drei Jahre lang jede Woche mit Kliniken telefoniert, bis endlich eine zugesagt hat.',
  now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Eigene Worte, und dann die zwei Blicke
-- ---------------------------------------------------------------------------
insert into public.person_strengths(id, user_id, statement, origin)
values ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',
  'Bleibt dran, auch wenn es lange dauert','own_words');

update public.person_strengths
set self_frequency = 'sometimes', reflected_frequency = 'often',
    reflected_who = 'former_colleagues'
where id = 'a4000000-0000-4000-8000-000000000001';

select extensions.is(
  (select self_frequency||' / '||reflected_frequency||' / '||reflected_who
   from public.person_strengths where id = 'a4000000-0000-4000-8000-000000000001'),
  'sometimes / often / former_colleagues',
  'both views are kept, and it says whose'
);

-- ---------------------------------------------------------------------------
-- Eine Aussensicht ohne Angabe, wessen, ist keine Aussensicht
-- ---------------------------------------------------------------------------
-- "Was wuerden meine Geschwister sagen" und "was wuerde mein letzter Chef
-- sagen" sind zwei verschiedene Fragen. Ohne die Gruppe waere die Antwort eine
-- Behauptung ueber alle, die einen kennen.
select extensions.throws_ok(
  $$update public.person_strengths set reflected_frequency = 'often', reflected_who = null
    where id = 'a4000000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'an outside view without saying whose is refused'
);

-- Und keine erfundenen Stufen.
select extensions.throws_ok(
  $$update public.person_strengths set self_frequency = 'sehr_oft'
    where id = 'a4000000-0000-4000-8000-000000000001'$$,
  '23514', null,
  'an invented frequency is refused'
);

-- ---------------------------------------------------------------------------
-- KEINE ZAHL
-- ---------------------------------------------------------------------------
-- Es gibt keine Spalte, in die eine Punktzahl passen wuerde, und nichts wird
-- verrechnet. Vier benannte Haeufigkeiten - "Staerke 7,4" waere
-- Scheinpraezision auf einem Selbstbericht.
set local role postgres;
select extensions.set_eq(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'person_strengths'$$,
  $$values ('id'), ('user_id'), ('statement'), ('origin'), ('source_turn_id'),
           ('self_frequency'), ('reflected_frequency'), ('reflected_who'),
           ('created_at'), ('updated_at')$$,
  'the strength holds no number and no ranking'
);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Der Vorschlag braucht einen Beleg
-- ---------------------------------------------------------------------------
set local role postgres;
insert into public.ai_jobs(id, job_type, subject_user_id, source_table, source_id, status, claimed_at)
values ('a5000000-0000-4000-8000-000000000001','capability_area_proposal',
  'a1000000-0000-4000-8000-000000000001','capability_interview_turns',
  'a3000000-0000-4000-8000-000000000001','running', now());
create temp table job_ref as select 'a5000000-0000-4000-8000-000000000001'::uuid as id;
grant select on job_ref to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}';

select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from job_ref),
    'Bleibt ueber lange Zeitraeume an einer Sache dran',
    'das steht so nicht in der Antwort drin',
    'qwen3.5:4b','v1'
  ),
  'an invented quote never becomes a strength'
);

select extensions.ok(
  public.insert_ai_strength_proposal(
    (select id from job_ref),
    'Bleibt ueber lange Zeitraeume an einer Sache dran',
    'drei Jahre lang jede Woche mit Kliniken telefoniert',
    'qwen3.5:4b','v1'
  ),
  'a quoted strength becomes a proposal'
);

-- Zweimal lesen lassen gibt nicht denselben Satz doppelt.
select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from job_ref),
    'Ein anderer Satz zur selben Antwort',
    'drei Jahre lang jede Woche mit Kliniken telefoniert',
    'qwen3.5:4b','v1'
  ),
  'one strength per answer, not one per run'
);

-- ---------------------------------------------------------------------------
-- Der Mensch entscheidet, und die Herkunft ist eine Tatsache
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temp table confirmed as
select public.confirm_strength_proposal(
  (select id from public.person_strength_proposals where status = 'pending' limit 1),
  'Meine eigenen Worte dafuer'
) as id;

select extensions.is(
  (select origin from public.person_strengths where id = (select id from confirmed)),
  'edited_proposal',
  'rewriting it records whose words these are'
);

-- Und fremde Staerken sieht niemand.
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.person_strengths),
  0,
  'nobody reads a foreign strength'
);

select * from extensions.finish();
rollback;
