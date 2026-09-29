\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(33);

-- ---------------------------------------------------------------------------
-- Antworten auf das Instrument v2
-- ---------------------------------------------------------------------------
--
-- Diese Suite prueft vor allem EINS: dass ein Auslassungsgrund niemals zu
-- einem Wert werden kann. Genau das ist in v1 passiert, weil dort
-- `choice_value text NOT NULL` stand - es gab keinen anderen Platz.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a2000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'v2-owner@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'v2-stranger@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('a2000001-0001-4001-8001-000000000001', array['founder']),
       ('a2000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id)
values ('a2000010-0010-4010-8010-000000000010',
        'a2000001-0001-4001-8001-000000000001', 'base', 'founder-compatibility-v1');

-- ---------------------------------------------------------------------------
-- 1. Entweder eine Antwort oder ein Grund
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format)
    values ('a2000010-0010-4010-8010-000000000010', 'A01', 'F')$$,
  '23514',
  null,
  'weder Antwort noch Grund wird abgelehnt'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value, missing_code)
    values ('a2000010-0010-4010-8010-000000000010', 'A01', 'F', '{"scale":3}', 'prefer_not_to_say')$$,
  '23514',
  null,
  'beides zugleich wird abgelehnt'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'A01', 'F', '{"scale":3}')$$,
  'eine Antwort allein geht'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code)
    values ('a2000010-0010-4010-8010-000000000010', 'A02', 'F', 'prefer_not_to_say')$$,
  'ein Grund allein geht'
);

-- ---------------------------------------------------------------------------
-- 2. Ein Auslassungsgrund ist nie ein Wert
-- ---------------------------------------------------------------------------
--
-- DER EIGENTLICHE ZWECK DIESER TABELLE. Wer "moechte ich nicht angeben" als
-- Text speichern kann, hat wieder eine Verweigerung, die sich wie eine
-- Antwort verhaelt - und spaeter mitgerechnet wird.

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'S01', 'single_choice',
            '{"option":"möchte ich nicht angeben"}')$$,
  '23514',
  null,
  'ein Auslassungsgrund als Auswahl wird abgelehnt'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'S07', 'free_text',
            '{"text":"noch offen"}')$$,
  '23514',
  null,
  'ein Auslassungsgrund als Freitext wird abgelehnt'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code)
    values ('a2000010-0010-4010-8010-000000000010', 'S07', 'free_text', 'not_decided')$$,
  'derselbe Sachverhalt als Grund geht'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code)
    values ('a2000010-0010-4010-8010-000000000010', 'S08', 'free_text', 'erfunden')$$,
  '23514',
  null,
  'ein unbekannter Grund wird abgelehnt'
);

-- Alle sechs Gruende der Registratur sind erlaubt - auch die beiden neuen.
select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code)
    values ('a2000010-0010-4010-8010-000000000010', 'L01', 'free_text', 'confidential_first')$$,
  'vertraulich klaeren ist ein eigener Grund'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, missing_code)
    values ('a2000010-0010-4010-8010-000000000010', 'R04', 'single_choice', 'cannot_assess')$$,
  'nicht einschaetzbar bleibt daneben moeglich'
);

-- ---------------------------------------------------------------------------
-- 2b. Eine Auswahl wird ueber ihre Kennung gespeichert, nie ueber ihren Text
-- ---------------------------------------------------------------------------
--
-- Teil F7 verlangt die "urspruengliche Options-ID". Der Grund ist derselbe wie
-- bei der Instrumentversion: Der Text darf sich aendern - er hat es bereits -,
-- die Bedeutung einer gegebenen Antwort nicht.

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'S02', 'single_choice',
            '{"option":"ich moechte langfristig beteiligt bleiben"}')$$,
  '23514', null, 'der Antworttext einer Einzelauswahl wird abgelehnt'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'B05', 'multi_choice',
            '{"options":["kleiner Vorversuch"]}')$$,
  '23514', null, 'und bei der Mehrfachwahl ebenso'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'S02', 'single_choice',
            '{"optionId":"S02_o1"}')$$,
  'mit Kennung geht es'
);

-- ---------------------------------------------------------------------------
-- 3. Skalenstufen sind 1 bis 5
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'A03', 'F', '{"scale":0}')$$,
  '23514', null, 'die Null ist keine Stufe'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'A03', 'F', '{"scale":6}')$$,
  '23514', null, 'sechs auch nicht'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'A03', 'F', '{"scale":"3"}')$$,
  '23514', null, 'und eine Zeichenkette ist keine Zahl'
);

-- ---------------------------------------------------------------------------
-- 4. Einheit und Waehrung gehoeren zur Zahl
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'R01', 'number_range', '{"min":10,"max":20}')$$,
  '23514', null, 'eine Stundenzahl ohne Einheit wird abgelehnt'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'R01', 'number_range',
            '{"min":10,"max":20,"unit":"Stunden/Woche"}')$$,
  'mit Einheit geht sie'
);

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'R05', 'money_range', '{"min":2000}')$$,
  '23514', null, 'ein Betrag ohne Waehrung wird abgelehnt'
);

-- ---------------------------------------------------------------------------
-- 5. Die Wertekarte braucht beide Anliegen
-- ---------------------------------------------------------------------------
--
-- Beide duerfen sehr wichtig sein. Genau deshalb sind es zwei Felder und kein
-- Schieberegler zwischen zwei Polen.

select extensions.throws_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'W01', 'value_case',
            '{"importanceA":5,"path":"A"}')$$,
  '23514', null, 'eine Wertekarte mit nur einem Anliegen wird abgelehnt'
);

select extensions.lives_ok(
  $$insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
    values ('a2000010-0010-4010-8010-000000000010', 'W01', 'value_case',
            '{"importanceA":5,"importanceB":5,"path":"A"}')$$,
  'beide Anliegen sehr wichtig ist ein gueltiger Zustand'
);

-- ---------------------------------------------------------------------------
-- 5b. Die Gespraechsmarkierung steht neben der Antwort
-- ---------------------------------------------------------------------------
--
-- "Darueber moechte ich sprechen" ist keine Antwort auf die Frage. Deshalb
-- eine eigene Spalte: Laege sie in `value`, wuerde sie mitverglichen - und aus
-- einer freiwilligen Notiz wuerde ein Unterschied zwischen zwei Menschen.

select extensions.is(
  (select marked_for_discussion from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  false,
  'ohne Angabe ist nichts markiert'
);

-- Eine Markierung ohne Antwort muss moeglich sein: "darueber moechte ich
-- reden" gilt auch dann, wenn die Frage selbst noch offen ist.
select extensions.lives_ok(
  $$insert into public.alignment_answers
      (assessment_id, block_id, answer_format, missing_code, marked_for_discussion, change_condition)
    values ('a2000010-0010-4010-8010-000000000010', 'G01', 'single_choice', 'not_decided',
            true, 'Wenn wir die Bereiche klar aufgeteilt haben.')$$,
  'noch offen und trotzdem zur Besprechung markiert'
);

-- ---------------------------------------------------------------------------
-- 6. Nur die eigene Person, und nur vor der Abgabe
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"a2000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010'),
  0,
  'eine fremde Person sieht keine einzige Antwort'
);

set local request.jwt.claims = '{"sub":"a2000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.cmp_ok(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010'),
  '>', 0,
  'die eigene Person sieht ihre Antworten'
);

-- ---------------------------------------------------------------------------
-- UND ZWAR AUCH OHNE FOUNDER-BERECHTIGUNG.
-- ---------------------------------------------------------------------------
--
-- Am 28.09.2026 beim Durchklicken gefunden: Die Lesepolicy verlangte
-- `has_founder_assessment_access()`, die Policy fuer Freigabeempfaenger nicht.
-- Damit gab es einen Zustand, in dem ANDERE meine Antworten lesen koennen und
-- ich selbst nicht - etwa wenn eine Netzwerkmitgliedschaft sich aendert.

reset role;
update public.profiles set roles = array['advisor']
where user_id = 'a2000001-0001-4001-8001-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"a2000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.cmp_ok(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010'),
  '>', 0,
  'auch ohne Founder-Berechtigung sieht man die eigenen Antworten'
);

reset role;
update public.profiles set roles = array['founder']
where user_id = 'a2000001-0001-4001-8001-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"a2000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- GEGENPROBE. Ohne sie beweisen die beiden folgenden Pruefungen nichts: Sie
-- waeren auch dann gruen, wenn ein Update hier grundsaetzlich nie ankaeme.
update public.alignment_answers set value = '{"scale":4}'
where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01';

select extensions.is(
  (select value ->> 'scale' from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  '4',
  'vor der Abgabe laesst sich eine Antwort sehr wohl aendern'
);

update public.alignment_answers set value = '{"scale":3}'
where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01';

reset role;
update public.assessments set submitted_at = now()
where id = 'a2000010-0010-4010-8010-000000000010';

set local role authenticated;
set local request.jwt.claims = '{"sub":"a2000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- NACH DER ABGABE IST DER FRAGEBOGEN EIN DOKUMENT. Wer ihn rueckwirkend
-- aendern koennte, haette den Satz "du kannst deine alte Fassung behalten"
-- entwertet, noch bevor es eine zweite Fassung gibt.
-- SEIT DEM 28.09.2026 MIT FEHLER STATT STILL. Vorher blockierte die Policy
-- die Aenderung lautlos - die Anwendung sah einen Erfolg und die Zeile blieb,
-- wie sie war. Der Trigger sagt jetzt, dass es nicht geht, und warum.
select extensions.throws_ok(
  $$update public.alignment_answers set value = '{"scale":5}'
    where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'$$,
  '42501', null,
  'nach der Abgabe aendert sich keine Antwort mehr'
);

select extensions.is(
  (select value ->> 'scale' from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  '3',
  'und die alte Antwort steht unveraendert da'
);

delete from public.alignment_answers
where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  1,
  'und geloescht wird auch nichts mehr'
);

-- ---------------------------------------------------------------------------
-- 7. Aber die Gespraechsmarkierung darf sich noch aendern
-- ---------------------------------------------------------------------------
--
-- Sie ist keine Antwort. Sie sagt nichts darueber aus, wie jemand arbeiten
-- moechte - sie sagt "darueber moechte ich reden". Das ist eine Aussage ueber
-- das naechste Gespraech und gehoert genau dorthin, wo man den eigenen Report
-- zum ersten Mal im Zusammenhang liest: nach der Abgabe.

update public.alignment_answers
set marked_for_discussion = true, change_condition = 'Wenn wir mehr Daten haetten.'
where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01';

select extensions.is(
  (select marked_for_discussion from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  true,
  'nach der Abgabe laesst sich noch markieren'
);

select extensions.is(
  (select change_condition from public.alignment_answers
   where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  'Wenn wir mehr Daten haetten.',
  'und die freiwillige Notiz ebenfalls schreiben'
);

-- DIE ANTWORT SELBST BLEIBT EIN DOKUMENT. Nicht still, sondern mit Fehler -
-- eine stille Ablehnung saehe fuer die Anwendung aus wie ein Erfolg.
select extensions.throws_ok(
  $$update public.alignment_answers set value = '{"scale":5}'
    where assessment_id = 'a2000010-0010-4010-8010-000000000010' and block_id = 'A01'$$,
  '42501', null,
  'die Antwort selbst laesst sich nicht mehr aendern'
);

reset role;

select * from extensions.finish();

rollback;
