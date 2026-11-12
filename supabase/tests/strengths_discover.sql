\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Staerken entdecken: die vier neuen Felder und was sie zusagen
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000001','authenticated','authenticated','entdecken@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000002','authenticated','authenticated','fremd-entdecken@example.com','',now(),'{}','{}',now(),now());

-- Ein Gespraech ohne Angabe: gilt als Fassung 2, ohne Stichworte.
insert into public.capability_interview_sessions(id, user_id, kind, status, completed_at) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','strengths','completed', now());

select extensions.is(
  (select guide_version from public.capability_interview_sessions where id = 'c2000000-0000-4000-8000-000000000001'),
  2::smallint,
  'an existing conversation counts as version 2'
);
select extensions.is(
  (select intro_notes from public.capability_interview_sessions where id = 'c2000000-0000-4000-8000-000000000001'),
  '{}'::text[],
  'and has no intro notes'
);

select extensions.lives_ok(
  $$insert into public.capability_interview_sessions(id, user_id, kind, guide_version, intro_notes)
    values ('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','strengths',3, array['Pilotkundin gewonnen','Umzug organisiert'])$$,
  'a version 3 conversation with intro notes can be created'
);
select extensions.throws_ok(
  $$insert into public.capability_interview_sessions(user_id, kind, guide_version)
    values ('c1000000-0000-4000-8000-000000000001','strengths',9)$$,
  '23514', null, 'an unknown guide version is refused'
);
select extensions.throws_ok(
  $$update public.capability_interview_sessions set intro_notes = array['1','2','3','4','5','6','7','8','9']
    where id = 'c2000000-0000-4000-8000-000000000002'$$,
  '23514', null, 'more than eight intro notes are refused'
);

-- Eine Szene mit drei Teilen und Zeitanker; eine uebersprungene Frage.
select extensions.lives_ok(
  $$insert into public.capability_interview_turns(session_id, kind, sort_order, question_source, question_id, answer, answered_at, answer_parts, happened_when)
    values ('c2000000-0000-4000-8000-000000000002','strengths',1,'catalogue','sc_convinced',
      E'Die Einkaufsleiterin hielt unser Werkzeug fuer ueberfluessig.\n\nIch habe ihr die Zahlen aus ihrem Lager gezeigt.',
      now(), '{"situation":"Die Einkaufsleiterin hielt unser Werkzeug fuer ueberfluessig.","action":"Ich habe ihr die Zahlen aus ihrem Lager gezeigt."}', 'year'),
    ('c2000000-0000-4000-8000-000000000002','strengths',2,'catalogue','sc_order', null, null, '{"skipped": true}', null)$$,
  'a scene keeps its parts and its time anchor, and a skipped question keeps its marker'
);
select extensions.throws_ok(
  $$update public.capability_interview_turns set happened_when = 'gestern'
    where session_id = 'c2000000-0000-4000-8000-000000000002' and sort_order = 1$$,
  '23514', null, 'an unknown time anchor is refused'
);
select extensions.throws_ok(
  $$update public.capability_interview_turns set answer_parts = '["a"]'::jsonb
    where session_id = 'c2000000-0000-4000-8000-000000000002' and sort_order = 1$$,
  '23514', null, 'answer parts must be an object'
);

-- Fremde sehen nichts davon (die Policies der Tabelle gelten unveraendert).
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.capability_interview_sessions where id = 'c2000000-0000-4000-8000-000000000002'),
  0,
  'nobody else can read the intro notes of a conversation'
);

select * from extensions.finish();
rollback;
