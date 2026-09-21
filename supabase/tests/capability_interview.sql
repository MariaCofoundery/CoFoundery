\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

-- ---------------------------------------------------------------------------
-- Der Gesprächsverlauf
-- ---------------------------------------------------------------------------
--
-- GEBAUT AM 21.09.2026. Was hier geprueft wird, sind die Zusagen, die das
-- Interview gibt:
--
--   Niemand sieht das Gespraech einer anderen Person. Es enthaelt private
--   Beispiele - das ist das Gegenteil von etwas, das ein Team einsehen darf.
--
--   Ein aktives Gespraech je Person. Zwei gleichzeitig waeren zwei Verlaeufe,
--   die sich beide als "das Interview" ausgeben.
--
--   Eine Modellfrage ist nachlesbar, eine Katalogfrage hat keinen zweiten
--   Text. Sonst zeigt der Verlauf Fragen, die so nie gestellt wurden.
--
--   Nichts Verborgenes: Es gibt keine Spalte fuer einen Gedankengang.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000001','authenticated','authenticated','erzaehlt@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000002','authenticated','authenticated','neugierig@example.com','',now(),'{}','{}',now(),now());

-- ---------------------------------------------------------------------------
-- Die neue Familie
-- ---------------------------------------------------------------------------
-- Marias Beispiel "euch fehlt jemand, der praesentieren kann" liess sich
-- vorher nirgends abbilden.
select extensions.set_eq(
  $$select area_id from public.capability_areas where family_id = 'communication_representation'$$,
  $$values ('public_speaking'), ('facilitation'), ('networking'), ('difficult_conversations'), ('teaching_mentoring')$$,
  'the outward-facing areas exist'
);

-- 'other' bleibt der letzte Eintrag - es ist der Auffangwert.
select extensions.is(
  (select family_id from public.capability_families order by sort_order desc limit 1),
  'other',
  'the catch-all stays last'
);

-- ---------------------------------------------------------------------------
-- Ein aktives Gespräch
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.capability_interview_sessions(id, user_id)
values ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001');

select extensions.throws_ok(
  $$insert into public.capability_interview_sessions(user_id)
    values ('e1000000-0000-4000-8000-000000000001')$$,
  '23505',
  null,
  'a second active conversation is refused - resuming would be a coin toss'
);

-- Abgeschlossen ohne Zeitpunkt ist eine Behauptung ohne Beleg.
select extensions.throws_ok(
  $$update public.capability_interview_sessions set status = 'completed'
    where id = 'e2000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'completed without a timestamp is refused'
);

-- Und nach dem Abschliessen ist Platz fuer ein neues.
update public.capability_interview_sessions
  set status = 'completed', completed_at = now()
  where id = 'e2000000-0000-4000-8000-000000000001';

select extensions.lives_ok(
  $$insert into public.capability_interview_sessions(id, user_id)
    values ('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001')$$,
  'after finishing one, a new conversation can start'
);

-- ---------------------------------------------------------------------------
-- Frage und Antwort
-- ---------------------------------------------------------------------------
select extensions.lives_ok(
  $$insert into public.capability_interview_turns(session_id, sort_order, question_source, question_id)
    values ('e2000000-0000-4000-8000-000000000002', 1, 'catalogue', 'owned_last')$$,
  'a catalogue question needs nothing but its key'
);

-- EINE KATALOGFRAGE HAT KEINEN ZWEITEN TEXT. Der Satz steht im Sprachbundle;
-- zweimal derselbe Satz an zwei Orten laeuft auseinander.
select extensions.throws_ok(
  $$insert into public.capability_interview_turns(session_id, sort_order, question_source, question_id, question_text)
    values ('e2000000-0000-4000-8000-000000000002', 2, 'catalogue', 'went_wrong', 'Was ist dir misslungen?')$$,
  '23514',
  null,
  'a catalogue question carries no second copy of its text'
);

-- EINE MODELLFRAGE IST NACHLESBAR. Ohne Text gaebe es den Satz nirgends.
select extensions.throws_ok(
  $$insert into public.capability_interview_turns(session_id, sort_order, question_source, question_id)
    values ('e2000000-0000-4000-8000-000000000002', 3, 'model', 'model')$$,
  '23514',
  null,
  'a model question without its text is refused'
);

select extensions.lives_ok(
  $$insert into public.capability_interview_turns(session_id, sort_order, question_source, question_id, question_text)
    values ('e2000000-0000-4000-8000-000000000002', 4, 'model', 'model',
            'Du sagst, es lag am Ende bei dir - wer haette es sonst gemacht?')$$,
  'a model question with its text is kept'
);

-- Eine Antwort ohne Zeitpunkt (und umgekehrt) waere ein halber Zustand.
select extensions.throws_ok(
  $$update public.capability_interview_turns set answer = 'Ich habe den ersten Kunden begleitet.'
    where session_id = 'e2000000-0000-4000-8000-000000000002' and sort_order = 1$$,
  '23514',
  null,
  'an answer without a timestamp is refused'
);

-- Dieselbe Untergrenze wie beim Textfeld: Aus einer Antwort WIRD eine
-- Erzaehlung, sie kann also nicht laxer sein.
select extensions.throws_ok(
  $$update public.capability_interview_turns set answer = 'kurz', answered_at = now()
    where session_id = 'e2000000-0000-4000-8000-000000000002' and sort_order = 1$$,
  '23514',
  null,
  'too short an answer is refused, exactly as in the text field'
);

-- ---------------------------------------------------------------------------
-- Nichts Verborgenes
-- ---------------------------------------------------------------------------
-- Marias Vorgabe aus der KI-Architektur: "Bitte keine versteckten
-- Chain-of-Thought-Daten speichern oder anfordern." Es gibt hier keine Spalte,
-- in die so etwas passen wuerde - und das ist pruefbar.
select extensions.set_eq(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'capability_interview_turns'$$,
  $$values ('id'), ('session_id'), ('sort_order'), ('question_source'), ('question_id'),
           ('question_text'), ('answer'), ('answered_at'), ('evidence_id'), ('created_at')$$,
  'the turn holds question and answer - and nothing else'
);

-- ---------------------------------------------------------------------------
-- Niemand liest ein fremdes Gespräch
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.capability_interview_sessions),
  0,
  'nobody sees the conversation of somebody else'
);

select extensions.is(
  (select count(*)::int from public.capability_interview_turns),
  0,
  'and none of its questions and answers'
);

-- Auch nicht hineinschreiben.
select extensions.throws_ok(
  $$insert into public.capability_interview_turns(session_id, sort_order, question_source, question_id)
    values ('e2000000-0000-4000-8000-000000000002', 9, 'catalogue', 'outside_work')$$,
  '42501',
  null,
  'and nobody writes into it'
);

select * from extensions.finish();
rollback;
