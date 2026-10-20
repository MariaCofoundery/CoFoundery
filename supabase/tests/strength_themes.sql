\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Staerken-Themen: 28 Themen, Belegstaerke statt Rang, alles optional
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000001','authenticated','authenticated','tina@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000003','authenticated','authenticated','arbeiter2@example.com','',now(),'{}','{}',now(),now());

insert into public.ai_workers(user_id, label) values ('c1000000-0000-4000-8000-000000000003','Testarbeiter');

insert into public.capability_interview_sessions(id, user_id, kind, status, completed_at) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','strengths','completed', now());

insert into public.capability_interview_turns(id, session_id, kind, sort_order, question_source, question_id, answer, answered_at) values
('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','strengths',1,'catalogue','took_charge',
  'Niemand fühlte sich zuständig, also habe ich selbst einen Termin mit allen organisiert.', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';
create temp table theme_job as
select public.request_strength_proposals('c2000000-0000-4000-8000-000000000001') as id;

set local role postgres;
update public.ai_jobs set status = 'running', claimed_at = now(), attempts = 1 where job_type = 'strength_proposal';
grant select on theme_job to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';

select extensions.ok(
  public.insert_ai_strength_theme_proposal(
    (select id from theme_job), 'c3000000-0000-4000-8000-000000000001',
    'Verantwortung übernehmen', 'Du übernimmst Verantwortung, wenn etwas ungeklärt bleibt.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.',
    'habe ich selbst einen Termin mit allen organisiert', 'take_ownership', 'hint', 'qwen', 'strengths-v2'),
  'a themed proposal is stored'
);

select extensions.ok(
  not public.insert_ai_strength_theme_proposal(
    (select id from theme_job), 'c3000000-0000-4000-8000-000000000001',
    'Etwas anderes', 'Du übernimmst Verantwortung in vielen Lagen.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.',
    'habe ich selbst einen Termin mit allen organisiert', 'not_a_theme', 'hint', 'qwen', 'strengths-v2'),
  'a theme outside the 28 is refused'
);

select extensions.ok(
  not public.insert_ai_strength_theme_proposal(
    (select id from theme_job), 'c3000000-0000-4000-8000-000000000001',
    'Etwas anderes', 'Du übernimmst Verantwortung in vielen Lagen.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.',
    'habe ich selbst einen Termin mit allen organisiert', 'take_ownership', 'top5', 'qwen', 'strengths-v2'),
  'an evidence level that is not clear/shown/hint is refused (no ranks)'
);

select extensions.ok(
  not public.insert_ai_strength_theme_proposal(
    (select id from theme_job), 'c3000000-0000-4000-8000-000000000001',
    'Anderes Etikett', 'Du übernimmst Verantwortung in vielen Lagen.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.',
    'habe ich selbst einen Termin mit allen organisiert', 'take_ownership', 'shown', 'qwen', 'strengths-v2'),
  'the same theme is stored only once per conversation'
);

select extensions.ok(
  not public.insert_ai_strength_theme_proposal(
    (select id from theme_job), 'c3000000-0000-4000-8000-000000000001',
    'Aufbau', 'Du bist ein sehr strukturierter Mensch.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.',
    'habe ich selbst einen Termin mit allen organisiert', 'build_structure', 'hint', 'qwen', 'strengths-v2'),
  'a sentence about the person is still refused'
);

select extensions.ok(
  not public.insert_ai_strength_theme_proposal(
    (select id from theme_job), 'c3000000-0000-4000-8000-000000000001',
    'Aufbau', 'Du schreibst nächste Schritte auf.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.',
    'dieses Zitat steht dort nicht', 'build_structure', 'hint', 'qwen', 'strengths-v2'),
  'a quote that is not in the answer is still refused'
);

-- Der Mensch uebernimmt: Thema und Belegstaerke wandern mit.
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';
create temp table kept_theme as
select public.confirm_strength_proposal(
  (select id from public.person_strength_proposals where theme = 'take_ownership'), null, null) as id;

select extensions.is(
  (select theme || ' | ' || evidence_level from public.person_strengths where id = (select id from kept_theme)),
  'take_ownership | hint',
  'confirming carries theme and evidence level'
);

set local role postgres;
select extensions.throws_ok(
  $$insert into public.person_strengths(user_id, statement, origin, theme)
    values ('c1000000-0000-4000-8000-000000000001', 'Ein Satz', 'own_words', 'take_ownership')$$,
  '23514', null,
  'a theme without evidence level is not a valid strength'
);

select extensions.lives_ok(
  $$insert into public.person_strengths(user_id, statement, origin)
    values ('c1000000-0000-4000-8000-000000000001', 'Ein eigener Satz ohne Thema', 'own_words')$$,
  'own sentences and older strengths stay valid without a theme'
);

select * from extensions.finish();
rollback;
