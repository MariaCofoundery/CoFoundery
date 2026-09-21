\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Vorschläge aus der eigenen Erzählung - und die Prüfung des Belegs
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 21.09.2026: "Das Tool hat schon rausgefiltert, ey, das könnte
-- das und das sein."
--
-- WAS HIER GEPRUEFT WIRD, ist die eine Sicherung, auf die es ankommt: Ein
-- Modell, das etwas hinzudichtet, kann es nicht belegen - und was es nicht
-- belegen kann, kommt nicht hinein. Die Pruefung liegt in der DATENBANK und
-- nicht im Prompt: Sie haelt auch dann, wenn der Prompt schlecht formuliert
-- ist, das Modell schwach antwortet oder die Anwendung einen Fehler hat.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','31000000-0000-4000-8000-000000000001','authenticated','authenticated','erzaehlerin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','31000000-0000-4000-8000-000000000002','authenticated','authenticated','fremde@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','31000000-0000-4000-8000-000000000003','authenticated','authenticated','arbeiter@example.com','',now(),'{}','{}',now(),now());

insert into public.ai_workers(user_id, label) values
('31000000-0000-4000-8000-000000000003','Testarbeiter');

insert into public.capability_interview_sessions(id, user_id)
values ('32000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001');

insert into public.capability_interview_turns(
  id, session_id, sort_order, question_source, question_id, answer, answered_at
) values (
  '33000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001',
  1,'catalogue','in_front_of_group',
  'Ich habe den Vortrag auf der Konferenz gehalten und danach die Diskussion moderiert.',
  now()
);

-- ---------------------------------------------------------------------------
-- Nur die eigene Antwort, und nur auf Anforderung
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"31000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.throws_ok(
  $$select public.request_capability_area_proposals('33000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'nobody has a foreign answer read by a model'
);

set local request.jwt.claims = '{"sub":"31000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- Die Anforderung kommt von einem Menschen. Eine Interview-Antwort ist das
-- Gegenteil einer veroeffentlichten Anzeige - Frage 3 fragt nach dem Privaten.
select extensions.isnt(
  public.request_capability_area_proposals('33000000-0000-4000-8000-000000000001'),
  null,
  'the person can ask for their own answer to be read'
);

-- Und niemand kann Vorschlaege selbst hineinschreiben: Sie entstehen
-- ausschliesslich in der Funktion, die das Zitat prueft.
select extensions.ok(
  not has_table_privilege('authenticated', 'public.capability_area_proposals', 'insert'),
  'the application cannot invent proposals no model ever made'
);

-- ---------------------------------------------------------------------------
-- Der Arbeiter holt die Aufgabe und den Text
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"31000000-0000-4000-8000-000000000003","role":"authenticated"}';

-- `claim_ai_job` gibt die ganze Zeile zurueck, nicht die Kennung - deshalb
-- ueber die Spalte und nicht mit einer Umwandlung.
create temporary table job_ids as
select (public.claim_ai_job()).id as id;
grant select on job_ids to authenticated;

select extensions.isnt(
  (select id from job_ids),
  null,
  'the worker can claim the job'
);

-- ER BEKOMMT NUR DIE ANTWORT, nicht die Frage: Sonst koennte ein Modell Teile
-- der FRAGE als Beleg ausgeben, und die Zitatpruefung waere aufgeweicht.
select extensions.is(
  public.get_ai_job_source_text((select id from job_ids)),
  'Ich habe den Vortrag auf der Konferenz gehalten und danach die Diskussion moderiert.',
  'the worker gets the answer and nothing else'
);

-- ---------------------------------------------------------------------------
-- Die Prüfung des Belegs
-- ---------------------------------------------------------------------------
-- Ein wörtliches Zitat traegt.
select extensions.ok(
  public.insert_ai_capability_proposal(
    (select id from job_ids), 'public_speaking',
    'den Vortrag auf der Konferenz gehalten', 'qwen-test', 1::smallint
  ),
  'a verbatim quote carries the proposal'
);

-- ERFUNDEN TRAEGT NICHT. Das ist der Fall, um den es hier geht: Das Modell
-- behauptet etwas, das in der Antwort nicht steht.
select extensions.ok(
  not public.insert_ai_capability_proposal(
    (select id from job_ids), 'fundraising',
    'ich habe eine Finanzierungsrunde abgeschlossen', 'qwen-test', 1::smallint
  ),
  'an invented quote is refused - and that is the whole point'
);

-- Ein einzelnes Wort ist kein Beleg: Es findet sich in jedem Text.
select extensions.ok(
  not public.insert_ai_capability_proposal(
    (select id from job_ids), 'facilitation', 'habe', 'qwen-test', 1::smallint
  ),
  'a single word is no evidence'
);

-- Ein Bereich, den das Vokabular nicht kennt, faellt still durch - und nimmt
-- die uebrigen Vorschlaege derselben Antwort nicht mit.
select extensions.ok(
  not public.insert_ai_capability_proposal(
    (select id from job_ids), 'kommunikationsstaerke',
    'danach die Diskussion moderiert', 'qwen-test', 1::smallint
  ),
  'an area outside the vocabulary is refused without an error'
);

-- Gross- und Kleinschreibung sowie Leerraum duerfen nicht ueber einen Beleg
-- entscheiden.
select extensions.ok(
  public.insert_ai_capability_proposal(
    (select id from job_ids), 'facilitation',
    '  DANACH   die Diskussion   MODERIERT  ', 'qwen-test', 1::smallint
  ),
  'case and whitespace do not decide whether a quote carries'
);

set local role postgres;
select extensions.set_eq(
  $$select area_id from public.capability_area_proposals$$,
  $$values ('public_speaking'), ('facilitation')$$,
  'exactly the two provable proposals are stored'
);

-- ---------------------------------------------------------------------------
-- Niemand sonst sieht sie
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"31000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.capability_area_proposals),
  0,
  'nobody sees what a model read out of somebody else story'
);

select * from extensions.finish();
rollback;
