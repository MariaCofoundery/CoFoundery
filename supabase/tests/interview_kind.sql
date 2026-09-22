\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

-- ---------------------------------------------------------------------------
-- Ein Gespraech hat eine Art
-- ---------------------------------------------------------------------------
--
-- SCHRITT S1 aus `web/docs/direction-interview-technical-brief.md`: Die
-- Gespraechsmechanik wird geteilt, die Auswertung bleibt getrennt. Geprueft
-- wird hier, dass die Teilung nichts kaputt macht, was vorher galt - und dass
-- die neue Grenze haelt.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','51000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','51000000-0000-4000-8000-000000000002','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Der Vorgabewert gibt den vorhandenen Zeilen ihre Bedeutung
-- ---------------------------------------------------------------------------
-- Keine Datenwanderung: Wer die Spalte nicht nennt, bekommt 'capability' -
-- genau das, was jede vorhandene Zeile schon ist.
insert into public.capability_interview_sessions(id, user_id)
values ('52000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001');

select extensions.is(
  (select kind from public.capability_interview_sessions
   where id = '52000000-0000-4000-8000-000000000001'),
  'capability',
  'an existing row keeps the meaning it already had'
);

-- ---------------------------------------------------------------------------
-- Zwei Arten gleichzeitig - eine Art zweimal nicht
-- ---------------------------------------------------------------------------
-- Es sind zwei Perspektiven, nicht zwei Versuche derselben Sache. Der alte
-- Index liess nur EIN aktives Gespraech zu; das haette das Starten eines
-- Direction-Interviews an einem laufenden Capability-Interview scheitern
-- lassen.
insert into public.capability_interview_sessions(id, user_id, kind)
values ('52000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000001','direction');

select extensions.is(
  (select count(*)::int from public.capability_interview_sessions
   where user_id = '51000000-0000-4000-8000-000000000001' and status = 'active'),
  2,
  'capability and direction can be active at the same time'
);

-- Zwei derselben Art bleiben verboten: Zwei Verlaeufe, die sich beide als
-- "das Interview" ausgeben, und beim Fortsetzen entscheidet der Zufall.
select extensions.throws_ok(
  $$insert into public.capability_interview_sessions(user_id, kind)
    values ('51000000-0000-4000-8000-000000000001','direction')$$,
  '23505',
  null,
  'a second active interview of the same kind is refused'
);

-- Eine unbekannte Art gibt es nicht.
select extensions.throws_ok(
  $$insert into public.capability_interview_sessions(user_id, kind)
    values ('51000000-0000-4000-8000-000000000001','erfunden')$$,
  '23514',
  null,
  'an unknown kind is refused'
);

-- ---------------------------------------------------------------------------
-- Die Art der Zeile kann der Sitzung nicht widersprechen
-- ---------------------------------------------------------------------------
-- Der zusammengesetzte Fremdschluessel auf (id, kind) macht den Widerspruch
-- unmoeglich. Das ist der Unterschied zwischen einer Kopie, die
-- auseinanderlaeuft, und einer, die es nicht kann.
insert into public.capability_interview_turns(
  id, session_id, kind, sort_order, question_source, question_id, answer, answered_at)
values ('53000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000002',
  'direction', 0, 'catalogue', 'more_of_this', 'Eine Antwort, die lang genug ist.', now());

select extensions.throws_ok(
  $$insert into public.capability_interview_turns(
      session_id, kind, sort_order, question_source, question_id)
    values ('52000000-0000-4000-8000-000000000002','capability', 1, 'catalogue', 'owned_last')$$,
  '23503',
  null,
  'a turn cannot claim a kind its session does not have'
);

-- ---------------------------------------------------------------------------
-- Evidenz gehoert zu Capability
-- ---------------------------------------------------------------------------
-- Eine Direction-Antwort wird nicht zu einem Eintrag im
-- Faehigkeitsvokabular - dort gibt es keinen Bereich, auf den "mich treibt
-- an, komplizierte Systeme verstaendlicher zu machen" zeigen koennte. Ohne
-- diese Regel waere der einzige Schutz davor, dass es der Code nicht tut.
insert into public.person_capability_entries(id, user_id, area_id)
values ('54000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','other');
insert into public.person_capability_evidence(id, entry_id, narrative)
values ('55000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000001',
  'Eine Erzaehlung, die lang genug ist um die Grenze zu erfuellen.');

select extensions.throws_ok(
  $$update public.capability_interview_turns
    set evidence_id = '55000000-0000-4000-8000-000000000001'
    where id = '53000000-0000-4000-8000-000000000001'$$,
  '23514',
  null,
  'a direction answer cannot carry capability evidence'
);

-- Bei Capability geht es weiter wie bisher.
insert into public.capability_interview_turns(
  id, session_id, sort_order, question_source, question_id, answer, answered_at)
values ('53000000-0000-4000-8000-000000000002','52000000-0000-4000-8000-000000000001',
  0, 'catalogue', 'owned_last', 'Eine Antwort, die lang genug ist.', now());

update public.capability_interview_turns
set evidence_id = '55000000-0000-4000-8000-000000000001'
where id = '53000000-0000-4000-8000-000000000002';

select extensions.ok(
  (select evidence_id is not null from public.capability_interview_turns
   where id = '53000000-0000-4000-8000-000000000002'),
  'capability keeps working exactly as before'
);

-- ---------------------------------------------------------------------------
-- Und fremd bleibt fremd
-- ---------------------------------------------------------------------------
-- Die Policies wurden nicht angefasst: Sie pruefen `user_id = auth.uid()`,
-- und das gilt fuer jede Art. Ein Interview ueber die eigenen Antriebe ist
-- genauso privat wie eines ueber die eigenen Staerken.
set local request.jwt.claims = '{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.capability_interview_turns),
  0,
  'nobody reads a foreign interview, of either kind'
);

select * from extensions.finish();
rollback;
