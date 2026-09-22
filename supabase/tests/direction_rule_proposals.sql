\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

-- ---------------------------------------------------------------------------
-- Hinsehen ohne Modell
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 22.09.2026: "Es muss ja auch ohne KI gehen, dass der Text mal
-- ein bisschen analysiert wird."
--
-- DER UNTERSCHIED ZUM MODELLWEG steht in dieser Funktion und nicht nur im
-- Code: Ein Modell darf FORMULIEREN, der Regelweg nicht. Deshalb muss hier
-- auch der Vorschlag selbst woertlich in der Antwort stehen, nicht nur sein
-- Beleg.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','81000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-4000-8000-000000000002','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

insert into public.capability_interview_sessions(id, user_id, kind)
values ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','direction');

insert into public.capability_interview_turns(
  id, session_id, kind, sort_order, question_source, question_id, answer, answered_at
) values (
  '83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',
  'direction', 1,'catalogue','not_again',
  'Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen.',
  now()
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Ein woertlicher Fund geht durch
-- ---------------------------------------------------------------------------
select extensions.ok(
  public.insert_rule_direction_proposal(
    '83000000-0000-4000-8000-000000000001',
    'frustrating_condition',
    'Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen.',
    'Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen.'
  ),
  'a passage from the text becomes a proposal'
);

select extensions.is(
  (select source from public.direction_statement_proposals limit 1),
  'rules',
  'and it says who read it'
);

-- ---------------------------------------------------------------------------
-- Ein FORMULIERTER Vorschlag nicht
-- ---------------------------------------------------------------------------
-- Das ist der Unterschied zum Modell. Hier ist ein Beleg allein nicht genug:
-- Wenn der Regelweg formulieren duerfte, waere er genau die Begriffsliste,
-- die raet und dabei serioes aussieht.
select extensions.ok(
  not public.insert_rule_direction_proposal(
    '83000000-0000-4000-8000-000000000001',
    'frustrating_condition',
    'Dir ist wichtig, dass Menschen selbststaendig zurechtkommen',
    'Das hat mich genervt, weil die Leute dann angerufen haben'
  ),
  'a rewritten statement is refused even with a valid quote'
);

-- Und ein erfundener Beleg erst recht nicht.
select extensions.ok(
  not public.insert_rule_direction_proposal(
    '83000000-0000-4000-8000-000000000001',
    'recurring_theme',
    'Das steht so nicht im Text und ist trotzdem lang genug',
    'Das steht so nicht im Text und ist trotzdem lang genug'
  ),
  'an invented passage never becomes a proposal'
);

-- ---------------------------------------------------------------------------
-- Zweimal durchsehen gibt nicht zweimal denselben Fund
-- ---------------------------------------------------------------------------
select extensions.ok(
  not public.insert_rule_direction_proposal(
    '83000000-0000-4000-8000-000000000001',
    'frustrating_condition',
    'Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen.',
    'Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen.'
  ),
  'the same finding does not appear twice'
);

select extensions.is(
  (select count(*)::int from public.direction_statement_proposals),
  1,
  'exactly one row'
);

-- ---------------------------------------------------------------------------
-- Und fremde Antworten liest niemand durch
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.insert_rule_direction_proposal(
      '83000000-0000-4000-8000-000000000001','recurring_theme',
      'Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen.',
      'Das hat mich genervt, weil die Leute dann angerufen haben und nicht weiterkamen.')$$,
  '42501', null,
  'nobody looks through a foreign answer'
);

select * from extensions.finish();
rollback;
