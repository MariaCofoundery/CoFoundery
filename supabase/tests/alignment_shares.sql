\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- ---------------------------------------------------------------------------
-- Die Freigabe von Antworten
-- ---------------------------------------------------------------------------
--
-- Hier haengt Vertraulichkeit dran: Diese Tabelle enthaelt Gehaltsbedarf,
-- Verlustgrenzen und selbst benannte Grenzen. Jede Zeile dieser Suite prueft
-- einen Weg, auf dem jemand etwas sehen koennte, das er nicht sehen darf.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'b1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'share-owner@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'share-partner@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b1000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'share-stranger@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('b1000001-0001-4001-8001-000000000001', array['founder']),
  ('b1000002-0002-4002-8002-000000000002', array['founder']),
  ('b1000003-0003-4003-8003-000000000003', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('b1000010-0010-4010-8010-000000000010',
        'b1000001-0001-4001-8001-000000000001', 'base', 'founder-alignment-v2', now());

-- Ein Entwurf derselben Person - der darf nicht freigegeben werden.
insert into public.assessments (id, user_id, module, instrument_id)
values ('b1000011-0011-4011-8011-000000000011',
        'b1000001-0001-4001-8001-000000000001', 'values', 'founder-alignment-v2');

insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('b1000010-0010-4010-8010-000000000010', 'A01', 'F', '{"scale":4}'),
  ('b1000010-0010-4010-8010-000000000010', 'B01', 'money_range', '{"min":5000,"currency":"EUR"}');

-- ---------------------------------------------------------------------------
-- 1. Ohne Freigabe sieht niemand etwas
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'b1000010-0010-4010-8010-000000000010'),
  0,
  'ohne Freigabe sieht der Partner keine einzige Antwort'
);

select extensions.is(
  (select count(*)::int from public.assessments
   where id = 'b1000010-0010-4010-8010-000000000010'),
  0,
  'und nicht einmal, dass es den Fragebogen gibt'
);

-- ---------------------------------------------------------------------------
-- 2. Eine Freigabe legt nur die eigene Person an, und nur fuer Abgegebenes
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"b1000003-0003-4003-8003-000000000003","role":"authenticated"}';

select extensions.throws_ok(
  $$insert into public.alignment_shares (assessment_id, recipient_user_id)
    values ('b1000010-0010-4010-8010-000000000010', 'b1000003-0003-4003-8003-000000000003')$$,
  '42501', null,
  'niemand gibt sich selbst einen fremden Fragebogen frei'
);

set local request.jwt.claims = '{"sub":"b1000001-0001-4001-8001-000000000001","role":"authenticated"}';

-- EINEN ENTWURF ZU TEILEN HIESSE, dass sich das Geteilte danach noch aendert -
-- der Empfaenger haette etwas anderes gelesen, als spaeter dasteht.
select extensions.throws_ok(
  $$insert into public.alignment_shares (assessment_id, recipient_user_id)
    values ('b1000011-0011-4011-8011-000000000011', 'b1000002-0002-4002-8002-000000000002')$$,
  '42501', null,
  'ein Entwurf wird nicht freigegeben'
);

select extensions.throws_ok(
  $$insert into public.alignment_shares (assessment_id, recipient_user_id)
    values ('b1000010-0010-4010-8010-000000000010', 'b1000001-0001-4001-8001-000000000001')$$,
  '42501', null,
  'und an sich selbst auch nicht'
);

select extensions.lives_ok(
  $$insert into public.alignment_shares (id, assessment_id, recipient_user_id)
    values ('b1000020-0020-4020-8020-000000000020',
            'b1000010-0010-4010-8010-000000000010',
            'b1000002-0002-4002-8002-000000000002')$$,
  'die eigene Person gibt ihren abgegebenen Fragebogen frei'
);

-- Der Geldbetrag bleibt ausgeblendet.
select extensions.lives_ok(
  $$insert into public.alignment_share_hidden_blocks (share_id, block_id)
    values ('b1000020-0020-4020-8020-000000000020', 'B01')$$,
  'ein einzelner Block wird ausgeblendet'
);

-- ---------------------------------------------------------------------------
-- 3. Der Empfaenger sieht das Freigegebene - und nur das
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"b1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'b1000010-0010-4010-8010-000000000010'),
  1,
  'der Partner sieht die freigegebene Antwort'
);

-- DIE AUSGEBLENDETE ZEILE IST GAR NICHT DA, auch nicht leer. Waere sie da und
-- nur der Wert fehlte, koennte der Empfaenger am Vorhandensein ablesen, dass
-- etwas ausgeblendet wurde - und das ist schon eine Auskunft.
select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'b1000010-0010-4010-8010-000000000010' and block_id = 'B01'),
  0,
  'den ausgeblendeten Geldbetrag sieht er nicht, auch nicht als leere Zeile'
);

select extensions.is(
  (select count(*)::int from public.assessments
   where id = 'b1000010-0010-4010-8010-000000000010'),
  1,
  'und er findet den Fragebogen ueberhaupt'
);

-- Der Empfaenger darf nichts an der Freigabe aendern.
select extensions.is(
  (select count(*)::int from (
     select 1 from public.alignment_share_hidden_blocks
     where share_id = 'b1000020-0020-4020-8020-000000000020') visible),
  1,
  'er sieht, DASS etwas ausgeblendet ist - das ist die ehrliche Auskunft'
);

delete from public.alignment_share_hidden_blocks
where share_id = 'b1000020-0020-4020-8020-000000000020';

select extensions.is(
  (select count(*)::int from public.alignment_share_hidden_blocks
   where share_id = 'b1000020-0020-4020-8020-000000000020'),
  1,
  'aber er kann die Ausblendung nicht aufheben'
);

-- ---------------------------------------------------------------------------
-- 4. Ein Dritter sieht weiterhin nichts, und Zurueckziehen wirkt sofort
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"b1000003-0003-4003-8003-000000000003","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'b1000010-0010-4010-8010-000000000010'),
  0,
  'ein Dritter sieht nichts, auch wenn andere freigegeben haben'
);

reset role;
update public.alignment_shares set revoked_at = now()
where id = 'b1000020-0020-4020-8020-000000000020';

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers
   where assessment_id = 'b1000010-0010-4010-8010-000000000010'),
  0,
  'nach dem Zurueckziehen sieht der Partner nichts mehr'
);

reset role;

select * from extensions.finish();

rollback;
