\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Das Modell schlaegt vor - die Datenbank rechnet nach
-- ---------------------------------------------------------------------------
--
-- SCHRITT S4. Der Unterschied zu den Faehigkeitsvorschlaegen ist der Grund
-- fuer jede Regel hier: Dort waehlt ein Modell aus 48 geschlossenen Begriffen,
-- hier SCHREIBT es einen Satz ueber einen Menschen.
--
-- Die Pruefung liegt in der DATENBANK und nicht im Prompt: Sie haelt auch
-- dann, wenn der Prompt schlecht formuliert ist, das Modell schwach antwortet
-- oder die Anwendung einen Fehler hat.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','71000000-0000-4000-8000-000000000001','authenticated','authenticated','erzaehlerin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-4000-8000-000000000002','authenticated','authenticated','fremde@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-4000-8000-000000000003','authenticated','authenticated','arbeiter@example.com','',now(),'{}','{}',now(),now());

insert into public.ai_workers(user_id, label) values
('71000000-0000-4000-8000-000000000003','Testarbeiter');

insert into public.capability_interview_sessions(id, user_id, kind)
values ('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','direction');

insert into public.capability_interview_turns(
  id, session_id, kind, sort_order, question_source, question_id, answer, answered_at
) values (
  '73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',
  'direction', 1,'catalogue','more_of_this',
  'Ich habe dem Verein das Anmeldeverfahren so umgebaut, dass die Leute es ohne Rueckfragen schaffen.',
  now()
);

-- Eine Capability-Antwort derselben Person - sie darf hier NICHT hineinrutschen.
insert into public.capability_interview_sessions(id, user_id)
values ('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001');
insert into public.capability_interview_turns(
  id, session_id, sort_order, question_source, question_id, answer, answered_at
) values (
  '73000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002',
  1,'catalogue','owned_last','Ich habe ein Projekt bis zum Abschluss gefuehrt.', now()
);

-- ---------------------------------------------------------------------------
-- Die Person fragt - und nur fuer ihre eigene Richtungs-Antwort
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.isnt(
  public.request_direction_statement_proposals('73000000-0000-4000-8000-000000000001'),
  null,
  'the person can ask for proposals about their own direction answer'
);

-- Eine Capability-Antwort ist keine Richtungs-Antwort. Ohne diese Grenze
-- entstuenden Richtungs-Aussagen aus einer Erzaehlung ueber Faehigkeiten.
select extensions.throws_ok(
  $$select public.request_direction_statement_proposals('73000000-0000-4000-8000-000000000002')$$,
  '42501', null,
  'a capability answer cannot be read as a direction answer'
);

set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.request_direction_statement_proposals('73000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'nobody asks a model to read a foreign answer'
);

-- ---------------------------------------------------------------------------
-- Der Arbeiter schreibt nur mit Beleg
-- ---------------------------------------------------------------------------
set local role postgres;
update public.ai_jobs set status = 'running', claimed_at = now()
where job_type = 'direction_statement_proposal';

-- DIE AUFTRAGS-ID WIRD HIER GEHOLT, nicht unten in einer Unterabfrage: Der
-- Arbeiter darf die Warteschlange NICHT LESEN - er holt sich Arbeit
-- ausschliesslich ueber `claim_ai_job()`. Eine Unterabfrage auf `ai_jobs` als
-- Arbeiter liefert deshalb NULL, und dann prueft der Test nichts mehr, obwohl
-- er gruen aussehen koennte.
create temp table job_ref as
select id from public.ai_jobs where job_type = 'direction_statement_proposal';
grant select on job_ref to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}';

-- Ein erfundenes Zitat kommt nicht hinein. DAS IST DIE ZUSAGE.
select extensions.ok(
  not public.insert_ai_direction_proposal(
    (select id from job_ref),
    'preferred_contribution',
    'Dir ist wichtig, dass andere selbststaendig handeln koennen',
    'das hat sie nie geschrieben und steht nirgends',
    'qwen3.5:4b', 'direction-v1'
  ),
  'an invented quote never becomes a proposal'
);

-- Ein einzelnes Wort ist kein Beleg - das findet sich immer.
select extensions.ok(
  not public.insert_ai_direction_proposal(
    (select id from job_ref),
    'preferred_contribution', 'Ein Satz ueber die Person', 'Verein',
    'qwen3.5:4b', 'direction-v1'
  ),
  'a single word is not evidence'
);

-- Eine erfundene Rubrik wird abgelehnt - als false, nicht als Ausnahme: Ein
-- misslungener Vorschlag darf die uebrigen derselben Antwort nicht mitnehmen.
select extensions.ok(
  not public.insert_ai_direction_proposal(
    (select id from job_ref),
    'erfundene_rubrik', 'Ein Satz',
    'so umgebaut, dass die Leute es ohne Rueckfragen schaffen',
    'qwen3.5:4b', 'direction-v1'
  ),
  'an invented facet is refused quietly'
);

-- Und ein belegter Vorschlag geht durch.
select extensions.ok(
  public.insert_ai_direction_proposal(
    (select id from job_ref),
    'preferred_contribution',
    'Dir ist wichtig, dass andere ohne Rueckfragen zurechtkommen',
    'so umgebaut, dass die Leute es ohne Rueckfragen schaffen',
    'qwen3.5:4b', 'direction-v1'
  ),
  'a quoted proposal goes through'
);

-- ---------------------------------------------------------------------------
-- Der Mensch entscheidet, und die Herkunft ist eine Tatsache
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- DIE FUNKTION LAEUFT ZUERST UND STEHT NICHT IN EINER BEDINGUNG: In einer
-- `where`-Bedingung ueber einer noch leeren Tabelle wird sie nie ausgewertet -
-- der Test waere dann gruen, ohne etwas geprueft zu haben.
create temp table confirmed as
select public.confirm_direction_proposal(
  (select id from public.direction_statement_proposals where status = 'pending' limit 1), null
) as statement_id;

-- Unveraendert bestaetigt: 'confirmed_proposal'.
select extensions.is(
  (select origin from public.direction_statements
   where id = (select statement_id from confirmed)),
  'confirmed_proposal',
  'confirming unchanged records it as a confirmed proposal'
);

-- Die Stufe ist `one_example`: Der Beleg ist EINE Antwort. `recurring` waere
-- eine Behauptung ueber mehrere, und die gibt es noch nicht.
select extensions.is(
  (select confidence from public.direction_statements limit 1),
  'one_example',
  'one answer is one example, not a pattern'
);

-- Und derselbe Vorschlag laesst sich nicht zweimal bestaetigen.
create temp table decided as
select id from public.direction_statement_proposals where status = 'accepted' limit 1;

select extensions.is(
  public.confirm_direction_proposal((select id from decided), null),
  null,
  'a decided proposal cannot be confirmed twice'
);

-- ---------------------------------------------------------------------------
-- Umformuliert heisst umformuliert
-- ---------------------------------------------------------------------------
set local role postgres;
insert into public.direction_statement_proposals(
  id, turn_id, facet, statement, evidence_quote)
values ('75000000-0000-4000-8000-000000000002','73000000-0000-4000-8000-000000000001',
  'recurring_theme','Ein Satz des Modells',
  'so umgebaut, dass die Leute es ohne Rueckfragen schaffen');
set local role authenticated;

create temp table rewritten as
select public.confirm_direction_proposal(
  '75000000-0000-4000-8000-000000000002', 'Meine eigenen Worte dazu'
) as statement_id;

select extensions.is(
  (select origin from public.direction_statements
   where id = (select statement_id from rewritten)),
  'edited_proposal',
  'rewriting it records whose words these are'
);

-- Und niemand bestaetigt einen fremden Vorschlag.
set local request.jwt.claims = '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role postgres;
insert into public.direction_statement_proposals(
  id, turn_id, facet, statement, evidence_quote)
values ('75000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000001',
  'desired_change','Noch ein Satz',
  'so umgebaut, dass die Leute es ohne Rueckfragen schaffen');
set local role authenticated;

select extensions.throws_ok(
  $$select public.confirm_direction_proposal('75000000-0000-4000-8000-000000000003', null)$$,
  '42501', null,
  'nobody confirms a proposal about somebody else'
);

select * from extensions.finish();
rollback;
