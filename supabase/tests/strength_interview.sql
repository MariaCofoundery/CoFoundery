\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(26);

-- ---------------------------------------------------------------------------
-- Das Staerken-Interview - getrennt vom Capability-Interview
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 18.10.2026: "Stärken im Interview entdecken" endete in einer
-- Einordnung nach Funktionsbereichen. Staerken waren ein Nebenprodukt des
-- Capability-Jobs. Hier steht, was die Trennung in der Datenbank zusagt.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000001','authenticated','authenticated','sina@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000002','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000003','authenticated','authenticated','arbeiter@example.com','',now(),'{}','{}',now(),now());

insert into public.ai_workers(user_id, label) values
('b1000000-0000-4000-8000-000000000003','Testarbeiter');

-- Ein abgeschlossenes Staerken-Interview mit zwei Antworten, ein offenes
-- Capability-Interview mit einer.
insert into public.capability_interview_sessions(id, user_id, kind, status, completed_at) values
('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','strengths','completed', now()),
('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','capability','active', null),
('b2000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','strengths','active', null);

insert into public.capability_interview_turns(
  id, session_id, kind, sort_order, question_source, question_id, answer, answered_at) values
('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','strengths',1,'catalogue','took_charge',
  'Niemand fühlte sich für die Übergabe zuständig, also habe ich selbst einen Termin mit allen organisiert und die nächsten Schritte aufgeschrieben.', now()),
('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','strengths',2,'catalogue','resistance',
  'Ich habe meinen Vorschlag im Vorstand dreimal vorgestellt, obwohl er beim ersten Mal abgelehnt wurde.', now()),
('b3000000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000002','capability',1,'catalogue','owned_last',
  'Ich habe die Marketingkampagne für unseren Launch geplant und die Agentur gesteuert.', now()),
('b3000000-0000-4000-8000-000000000004','b2000000-0000-4000-8000-000000000003','strengths',1,'catalogue','took_charge',
  'Ich habe den Umzug unseres Vereins organisiert, als der Vorstand ausgefallen ist.', now());

-- ---------------------------------------------------------------------------
-- Die Art und der Job-Typ gibt es
-- ---------------------------------------------------------------------------
select extensions.ok(
  (select count(*) = 2 from public.capability_interview_sessions
   where user_id = 'b1000000-0000-4000-8000-000000000001' and kind = 'strengths'),
  'a strengths interview is its own kind of conversation'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Die Person fragt - fuer ein ganzes, abgeschlossenes Staerken-Interview
-- ---------------------------------------------------------------------------
create temp table strength_job as
select public.request_strength_proposals('b2000000-0000-4000-8000-000000000001') as id;

select extensions.is(
  (select job_type || ' / ' || source_table from public.ai_jobs where id = (select id from strength_job)),
  'strength_proposal / capability_interview_sessions',
  'the strengths job reads a whole conversation, not a single answer'
);

select extensions.throws_ok(
  $$select public.request_strength_proposals('b2000000-0000-4000-8000-000000000003')$$,
  '42501', null,
  'an interview that is still running is not read'
);

select extensions.throws_ok(
  $$select public.request_strength_proposals('b2000000-0000-4000-8000-000000000002')$$,
  '42501', null,
  'a capability interview cannot be read as a strengths interview'
);

-- Und umgekehrt: Eine Staerken-Antwort laeuft nicht in die Bereichszuordnung.
select extensions.throws_ok(
  $$select public.request_capability_area_proposals('b3000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'a strengths answer cannot be sent into the capability sorting'
);

select extensions.ok(
  public.request_capability_area_proposals('b3000000-0000-4000-8000-000000000003') is not null,
  'the capability request still works for capability answers'
);

set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.request_strength_proposals('b2000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'nobody can ask for a foreign strengths interview'
);

-- ---------------------------------------------------------------------------
-- Der Arbeiter liest und schreibt
-- ---------------------------------------------------------------------------
set local role postgres;
update public.ai_jobs set status = 'running', claimed_at = now(), attempts = 1
where job_type in ('strength_proposal', 'capability_area_proposal');
create temp table capability_job as
select id from public.ai_jobs where job_type = 'capability_area_proposal';
grant select on strength_job, capability_job to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000003","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.get_ai_strength_job_answers((select id from strength_job))),
  2,
  'the worker gets the answers of exactly this conversation'
);

select extensions.is(
  (select count(*)::int from public.get_ai_strength_job_answers((select id from capability_job))),
  0,
  'a capability job gets no strengths answers'
);

-- Ein erfundenes Zitat traegt nicht.
select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000001',
    'Verantwortung übernehmen', 'Du übernimmst Verantwortung, wenn etwas ungeklärt bleibt.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert.',
    'ich bin immer der Verantwortliche gewesen', 'qwen', 'strengths-v1'),
  'an invented quote never becomes a proposal'
);

-- Ein Zitat aus einer ANDEREN Antwort als der angegebenen traegt auch nicht.
select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000001',
    'Beharrlichkeit', 'Du vertrittst eine Position weiter, wenn zunächst Widerstand entsteht.',
    'Du hast deinen Vorschlag nach der Ablehnung erneut vorgestellt.',
    'dreimal vorgestellt, obwohl er beim ersten Mal abgelehnt wurde', 'qwen', 'strengths-v1'),
  'the quote has to come from the answer it is attached to'
);

-- Eine Antwort aus einem anderen Gespraech gehoert nicht zu diesem Job.
select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000003',
    'Steuern', 'Du steuerst andere, wenn es eng wird.',
    'Du hast die Agentur gesteuert und die Kampagne geplant.',
    'die Marketingkampagne für unseren Launch geplant', 'qwen', 'strengths-v1'),
  'an answer from another conversation is not evidence for this job'
);

-- Kein Satz ueber die Person.
select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000001',
    'Verantwortung', 'Du bist ein verantwortungsvoller Mensch.',
    'In deinem Beispiel hast du selbst einen Termin organisiert.',
    'habe ich selbst einen Termin mit allen organisiert', 'qwen', 'strengths-v1'),
  'a sentence about the person instead of the behaviour is refused'
);

select extensions.ok(
  public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000001',
    'Verantwortung übernehmen', 'Du übernimmst Verantwortung, wenn etwas ungeklärt bleibt.',
    'In deinem Beispiel hast du selbst den nächsten Schritt organisiert, obwohl zunächst niemand zuständig war.',
    'habe ich selbst einen Termin mit allen organisiert', 'qwen', 'strengths-v1'),
  'a quoted strength becomes a proposal'
);

-- MEHRERE aus derselben Antwort sind moeglich - eine Situation kann mehr als
-- eine Staerke zeigen.
select extensions.ok(
  public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000001',
    'Struktur schaffen', 'Bei unklaren Situationen ordnest du zuerst die nächsten Schritte.',
    'Du hast nach dem Termin die nächsten Schritte für alle aufgeschrieben.',
    'die nächsten Schritte aufgeschrieben', 'qwen', 'strengths-v1'),
  'one answer can carry more than one strength'
);

select extensions.ok(
  public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000002',
    'Beharrlichkeit', 'Du vertrittst eine Position weiter, wenn zunächst Widerstand entsteht.',
    'Du hast deinen Vorschlag nach der Ablehnung erneut vorgestellt.',
    'dreimal vorgestellt, obwohl er beim ersten Mal abgelehnt wurde', 'qwen', 'strengths-v1'),
  'a second answer carries its own strength'
);

-- Dieselbe Bezeichnung nur einmal je Gespraech.
select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from strength_job), 'b3000000-0000-4000-8000-000000000002',
    'verantwortung übernehmen', 'Du übernimmst Verantwortung für deinen Vorschlag.',
    'Du hast den Vorschlag selbst mehrfach eingebracht.',
    'Ich habe meinen Vorschlag im Vorstand dreimal vorgestellt', 'qwen', 'strengths-v1'),
  'the same label is not proposed twice in one conversation'
);

-- Die Capability-Auswertung kann keine Staerken erzeugen ...
select extensions.ok(
  not public.insert_ai_strength_proposal(
    (select id from capability_job), 'b3000000-0000-4000-8000-000000000003',
    'Steuern', 'Du steuerst andere, wenn es eng wird.',
    'Du hast die Agentur gesteuert und die Kampagne geplant.',
    'die Marketingkampagne für unseren Launch geplant', 'qwen', 'strengths-v1'),
  'a capability job cannot create strength proposals'
);

-- ... und die Staerken-Auswertung keine Bereiche.
select extensions.ok(
  not public.insert_ai_capability_proposal(
    (select id from strength_job), 'marketing_brand',
    'habe ich selbst einen Termin mit allen organisiert', 'qwen', 1::smallint),
  'a strengths job cannot create capability proposals'
);

-- Gezaehlt als Eigentuemerin: Der Arbeiter darf schreiben, aber nicht lesen.
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.person_strength_proposals
   where session_id = 'b2000000-0000-4000-8000-000000000001'),
  3,
  'three proposals for one conversation, two of them from the same answer'
);

-- ---------------------------------------------------------------------------
-- Der Mensch entscheidet - Bezeichnung und Aussage, auch bearbeitet
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temp table kept as
select public.confirm_strength_proposal(
  (select id from public.person_strength_proposals where label = 'Verantwortung übernehmen'),
  null, null
) as id;

select extensions.is(
  (select label || ' | ' || statement || ' | ' || origin from public.person_strengths where id = (select id from kept)),
  'Verantwortung übernehmen | Du übernimmst Verantwortung, wenn etwas ungeklärt bleibt. | confirmed_proposal',
  'confirming keeps label and statement'
);

create temp table edited as
select public.confirm_strength_proposal(
  (select id from public.person_strength_proposals where label = 'Struktur schaffen'),
  'Wenn es unübersichtlich wird, schreibe ich die nächsten Schritte auf.',
  'Ordnung schaffen'
) as id;

select extensions.is(
  (select label || ' | ' || origin from public.person_strengths where id = (select id from edited)),
  'Ordnung schaffen | edited_proposal',
  'editing label or statement before confirming records it as edited'
);

-- Ablehnen: nur der Status, nichts landet bei den Staerken.
update public.person_strength_proposals set status = 'rejected', decided_at = now()
where label = 'Beharrlichkeit';
select extensions.is(
  (select count(*)::int from public.person_strengths
   where user_id = 'b1000000-0000-4000-8000-000000000001'),
  2,
  'only confirmed proposals become strengths'
);

-- Vorschlaege bleiben Vorschlaege: Niemand schreibt sie von Hand.
select extensions.throws_ok(
  $$insert into public.person_strength_proposals(turn_id, session_id, label, statement, rationale, evidence_quote)
    values ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001',
      'Selbst erfunden','Du kannst alles.','Ohne Beleg ausgedacht.','dreimal vorgestellt, obwohl')$$,
  '42501', null,
  'a person cannot write a proposal directly'
);

-- Und fremde Vorschlaege sieht niemand.
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.person_strength_proposals),
  0,
  'nobody reads foreign strength proposals'
);

-- ---------------------------------------------------------------------------
-- Ein Vorschlag ist ganz alt oder ganz neu
-- ---------------------------------------------------------------------------
set local role postgres;
select extensions.throws_ok(
  $$insert into public.person_strength_proposals(turn_id, label, statement, evidence_quote)
    values ('b3000000-0000-4000-8000-000000000002','Halb','Ein halber Vorschlag.','dreimal vorgestellt, obwohl')$$,
  '23514', null,
  'a proposal with a label but without rationale and conversation is refused'
);

select * from extensions.finish();
rollback;
