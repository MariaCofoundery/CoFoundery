\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- ---------------------------------------------------------------------------
-- Was aus dem Richtungs-Gespraech bleibt
-- ---------------------------------------------------------------------------
--
-- SCHRITT S3. Die eine Zusage, um die es hier geht, stammt aus dem Briefing
-- vom 21.09.2026: "Nur bestaetigte Inhalte duerfen spaeter fuer andere
-- Produktbereiche genutzt werden." Sie wird nicht von der Oberflaeche
-- eingehalten, sondern davon, dass ein Vorschlag und eine bestaetigte Aussage
-- verschiedene Zeilen in verschiedenen Tabellen sind.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','61000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','61000000-0000-4000-8000-000000000002','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

-- Ein Gespraech mit einer Antwort, an der ein Vorschlag haengen kann.
insert into public.capability_interview_sessions(id, user_id, kind)
values ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','direction');
insert into public.capability_interview_turns(
  id, session_id, kind, sort_order, question_source, question_id, answer, answered_at)
values ('63000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001',
  'direction', 0, 'catalogue', 'more_of_this',
  'Ich habe einem Verein das Anmeldeverfahren so umgebaut, dass die Leute es ohne Rueckfragen schaffen.', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Eigene Worte gehen
-- ---------------------------------------------------------------------------
insert into public.direction_statements(id, user_id, facet, statement, confidence, origin)
values ('64000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001',
  'recurring_theme','Komplizierte Systeme verstaendlicher machen','stated','own_words');

select extensions.is(
  (select statement from public.direction_statements
   where id = '64000000-0000-4000-8000-000000000001'),
  'Komplizierte Systeme verstaendlicher machen',
  'somebody can write down their own direction'
);

-- ---------------------------------------------------------------------------
-- Keine erfundenen Rubriken, keine erfundenen Stufen
-- ---------------------------------------------------------------------------
-- Die Werteliste muss mit DIRECTION_FACETS im Code uebereinstimmen; waere sie
-- offen, koennte jede Zeile ihre eigene Rubrik erfinden und die Auswertung
-- haette keine Form mehr.
select extensions.throws_ok(
  $$insert into public.direction_statements(user_id, facet, statement, confidence, origin)
    values ('61000000-0000-4000-8000-000000000001','erfunden','Ein Satz','stated','own_words')$$,
  '23514', null,
  'an invented facet is refused'
);

select extensions.throws_ok(
  $$insert into public.direction_statements(user_id, facet, statement, confidence, origin)
    values ('61000000-0000-4000-8000-000000000001','recurring_theme','Ein Satz','sehr_sicher','own_words')$$,
  '23514', null,
  'an invented confidence is refused'
);

-- KEINE ZAHL. `confidence` sagt, WORAUF eine Aussage beruht, nicht wie stark
-- sie ist - und es gibt keine Spalte, in die eine Punktzahl passen wuerde.
set local role postgres;
select extensions.set_eq(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'direction_statements'$$,
  $$values ('id'), ('user_id'), ('facet'), ('statement'), ('confidence'), ('origin'),
           ('source_turn_id'), ('created_at'), ('updated_at')$$,
  'the statement holds no number and no ranking'
);
set local role authenticated;

-- Ein Absatz ist keine Richtung.
select extensions.throws_ok(
  $$insert into public.direction_statements(user_id, facet, statement, confidence, origin)
    values ('61000000-0000-4000-8000-000000000001','recurring_theme',
            repeat('a', 201),'stated','own_words')$$,
  '23514', null,
  'a paragraph is not a direction'
);

-- ---------------------------------------------------------------------------
-- Niemand legt einen Vorschlag an
-- ---------------------------------------------------------------------------
-- Ein Vorschlag entsteht ausschliesslich durch die Arbeiterfunktion in
-- Schritt S4, die das Zitat gegen die Antwort nachrechnet. Koennte die
-- Anwendung einen anlegen, waere diese Pruefung eine Hoeflichkeit.
select extensions.ok(
  not has_table_privilege('authenticated', 'public.direction_statement_proposals', 'insert'),
  'the application cannot create a proposal'
);

select extensions.ok(
  has_column_privilege('authenticated', 'public.direction_statement_proposals', 'status', 'update')
    and not has_column_privilege('authenticated', 'public.direction_statement_proposals', 'statement', 'update'),
  'a person decides about a proposal, they do not rewrite it'
);

-- ---------------------------------------------------------------------------
-- Ein Vorschlag ist keine Aussage
-- ---------------------------------------------------------------------------
set local role postgres;
insert into public.direction_statement_proposals(
  id, turn_id, facet, statement, evidence_quote, model)
values ('65000000-0000-4000-8000-000000000001','63000000-0000-4000-8000-000000000001',
  'preferred_contribution','Dinge so umbauen, dass andere sie allein schaffen',
  'so umgebaut, dass die Leute es ohne Rueckfragen schaffen','qwen3.5:4b');
set local role authenticated;

-- Die eigene Person sieht ihre Vorschlaege ...
select extensions.is(
  (select count(*)::int from public.direction_statement_proposals),
  1,
  'the person sees the proposals about their own answer'
);

-- ... aber sie stehen NICHT bei den bestaetigten Aussagen. Das ist die
-- Trennung, auf der die ganze Zusage beruht.
select extensions.is(
  (select count(*)::int from public.direction_statements),
  1,
  'a proposal does not show up among the confirmed statements'
);

-- ---------------------------------------------------------------------------
-- Und fremd bleibt fremd
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.direction_statements),
  0,
  'nobody reads a foreign direction'
);

select extensions.is(
  (select count(*)::int from public.direction_statement_proposals),
  0,
  'nobody reads a foreign proposal either'
);

select * from extensions.finish();
rollback;
