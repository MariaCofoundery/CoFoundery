\set ON_ERROR_STOP on

-- NACH-AUFRAEUM-FASSUNG von supabase/tests/person_strengths.sql. Wird mit
-- 20261206120000_strength_interview_cleanup.sql nach supabase/tests/
-- verschoben und ersetzt dort die Rollout-Fassung.

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

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
           ('label'), ('created_at'), ('updated_at')$$,
  'the strength holds no number and no ranking'
);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Alte Vorschlaege bleiben gueltig - der alte Schreibweg ist weg
-- ---------------------------------------------------------------------------
--
-- NACH 20261206120000 (Aufraeum-Migration). Bis 20261205120000 schrieb die
-- Capability-Auswertung nebenbei einen Satz je Antwort (ohne Bezeichnung,
-- ohne Begruendung). Solche Zeilen gibt es; sie muessen sich weiter
-- bestaetigen lassen. Neu erzeugen kann sie niemand mehr.
set local role postgres;
insert into public.person_strength_proposals(turn_id, statement, evidence_quote, model, prompt_version)
values ('a3000000-0000-4000-8000-000000000001',
  'Bleibt ueber lange Zeitraeume an einer Sache dran',
  'drei Jahre lang jede Woche mit Kliniken telefoniert', 'qwen3.5:4b', 'v1');

select extensions.hasnt_function(
  'public', 'insert_ai_strength_proposal', array['uuid','text','text','text','text'],
  'the old write path through the capability job is gone'
);

select extensions.ok(
  (select label is null and rationale is null and session_id is null
   from public.person_strength_proposals where turn_id = 'a3000000-0000-4000-8000-000000000001'),
  'an old proposal without label, rationale and conversation is still valid'
);

-- Die alte Zusage "einer je Antwort" gilt fuer die alten Zeilen weiter.
select extensions.throws_ok(
  $$insert into public.person_strength_proposals(turn_id, statement, evidence_quote)
    values ('a3000000-0000-4000-8000-000000000001','Ein anderer Satz zur selben Antwort',
      'drei Jahre lang jede Woche mit Kliniken telefoniert')$$,
  '23505', null,
  'old-style proposals stay one per answer'
);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Der Mensch entscheidet, und die Herkunft ist eine Tatsache
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temp table confirmed as
select public.confirm_strength_proposal(
  (select id from public.person_strength_proposals where status = 'pending' limit 1),
  'Meine eigenen Worte dafuer'
) as id;

-- Ohne Bezeichnung bestaetigt, bleibt sie ohne.
select extensions.ok(
  (select label is null from public.person_strengths where id = (select id from confirmed)),
  'confirming an old proposal keeps it without a label'
);

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
