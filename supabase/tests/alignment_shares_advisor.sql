\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

-- ---------------------------------------------------------------------------
-- Zwei Schluessel: Advisor-Freigabe UND Antwort-Freigabe
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'adv-subject@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'adv-advisor@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('c1000001-0001-4001-8001-000000000001', array['founder']),
  ('c1000002-0002-4002-8002-000000000002', array['founder','advisor'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('c1000010-0010-4010-8010-000000000010',
        'c1000001-0001-4001-8001-000000000001', 'base', 'founder-alignment-v2', now());

insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values ('c1000010-0010-4010-8010-000000000010', 'R05', 'money_range',
        '{"min":2400,"currency":"EUR","basis":"netto"}');

-- Eine aktive Advisor-Beziehung, aber KEINE Antwort-Freigabe.
-- Zwei Bereiche, wie im Betrieb ueblich. Die Funktion fragt nicht nach einem
-- bestimmten - sie fragt, ob die Beziehung ueberhaupt noch lebt.
insert into public.advisor_person_grants
  (subject_user_id, advisor_user_id, scope, status, approved_at, requested_by_user_id)
values ('c1000001-0001-4001-8001-000000000001',
        'c1000002-0002-4002-8002-000000000002', 'base', 'active', now(),
        'c1000001-0001-4001-8001-000000000001'),
       ('c1000001-0001-4001-8001-000000000001',
        'c1000002-0002-4002-8002-000000000002', 'strengths', 'active', now(),
        'c1000001-0001-4001-8001-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000002-0002-4002-8002-000000000002","role":"authenticated"}';

-- EINE BERATUNG ZUZULASSEN IST NICHT DASSELBE, WIE SEINE FINANZLAGE
-- OFFENZULEGEN.
select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'c1000010-0010-4010-8010-000000000010'),
  0,
  'die Advisor-Freigabe allein oeffnet die Antworten nicht'
);

reset role;
insert into public.alignment_shares (id, assessment_id, recipient_user_id)
values ('c1000020-0020-4020-8020-000000000020',
        'c1000010-0010-4010-8010-000000000010',
        'c1000002-0002-4002-8002-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'c1000010-0010-4010-8010-000000000010'),
  1,
  'mit beiden Schluesseln sieht der Advisor die Antwort'
);

select extensions.is(
  (select value ->> 'currency' from public.alignment_answers
   where assessment_id = 'c1000010-0010-4010-8010-000000000010' and block_id = 'R05'),
  'EUR',
  'und zwar vollstaendig, mit Waehrung'
);

-- ---------------------------------------------------------------------------
-- Das Loch: Beziehung beendet, Freigabe vergessen
-- ---------------------------------------------------------------------------
--
-- Niemand denkt daran, beides zu widerrufen. Man beendet eine Zusammenarbeit
-- und geht davon aus, dass sie beendet ist.

reset role;
-- approved_at muss mit zurueckgesetzt werden: Der Check
-- `advisor_person_grants_approved` verlangt (status='active') =
-- (approved_at is not null). Das ist dieselbe Aequivalenz-Falle wie bei den
-- Team-Auswertungen - hier kostet sie die Information, WANN einmal
-- zugestimmt wurde.
update public.advisor_person_grants
set status = 'revoked', revoked_at = now(), approved_at = null
where subject_user_id = 'c1000001-0001-4001-8001-000000000001'
  and advisor_user_id = 'c1000002-0002-4002-8002-000000000002';

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'c1000010-0010-4010-8010-000000000010'),
  0,
  'wer die Beratung beendet, entzieht damit auch die Antworten'
);

select extensions.is(
  (select count(*)::int from public.assessments
   where id = 'c1000010-0010-4010-8010-000000000010'),
  0,
  'und der Fragebogen ist nicht einmal mehr auffindbar'
);

-- ---------------------------------------------------------------------------
-- Aber ein Gruenderpaar ohne Advisor-Beziehung bleibt unberuehrt
-- ---------------------------------------------------------------------------
--
-- GEGENPROBE. Ohne sie koennte die neue Bedingung alles blockieren, und die
-- vier Pruefungen oben waeren gruen, ohne etwas zu zeigen.

reset role;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c1000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'adv-peer@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.profiles (user_id, roles)
values ('c1000003-0003-4003-8003-000000000003', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.alignment_shares (assessment_id, recipient_user_id)
values ('c1000010-0010-4010-8010-000000000010', 'c1000003-0003-4003-8003-000000000003');

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000003-0003-4003-8003-000000000003","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'c1000010-0010-4010-8010-000000000010'),
  1,
  'ein Gruenderpaar ohne Advisor-Beziehung teilt weiterhin'
);

reset role;

select * from extensions.finish();

rollback;
