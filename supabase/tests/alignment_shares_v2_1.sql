\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

-- ---------------------------------------------------------------------------
-- Was eine Freigabe zeigt - und was sie nicht zeigt
-- ---------------------------------------------------------------------------
--
-- Die entscheidende Frage: Haelt die DATENBANK die ausgeblendeten Fragen
-- zurueck, oder nur die Anzeige? Nur die Anzeige waere kein Ausblenden,
-- sondern ein Versteck.
--
-- Und seit es alignment_item_views gibt, kommt eine zweite dazu: Wie lange
-- jemand bei einer Frage gezoegert hat, ist keine Antwort - das darf auch
-- nicht sehen, wer die Antworten sehen darf.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'share21-owner@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'share21-partner@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('d1000001-0001-4001-8001-000000000001', array['founder']),
       ('d1000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('d1000010-0010-4010-8010-000000000010',
        'd1000001-0001-4001-8001-000000000001', 'base', 'founder-alignment-v2-1', now());

insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values ('d1000010-0010-4010-8010-000000000010', 'A01', 'ordinal_choice',
        '{"optionId": "A01_o4"}'::jsonb),
       ('d1000010-0010-4010-8010-000000000010', 'L01', 'free_text_repeatable',
        '{"entries": [{"entryId": "e1", "text": "ohne Absprache Geld ausgeben"}]}'::jsonb);

insert into public.alignment_item_views (assessment_id, block_id, answered_at, revisions)
values ('d1000010-0010-4010-8010-000000000010', 'A01', now(), 3);

insert into public.alignment_shares (id, assessment_id, recipient_user_id)
values ('d1000020-0020-4020-8020-000000000020',
        'd1000010-0010-4010-8010-000000000010',
        'd1000002-0002-4002-8002-000000000002');

-- L01 bleibt bei der eigenen Person. Eine persoenliche Grenze ist genau die
-- Sorte Antwort, die jemand teilen koennen MUSS - und nicht muessen darf.
insert into public.alignment_share_hidden_blocks (share_id, block_id)
values ('d1000020-0020-4020-8020-000000000020', 'L01');

-- ---------------------------------------------------------------------------
-- Aus Sicht der Person, der freigegeben wurde
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"d1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'A01'),
  1,
  'die freigegebene Antwort ist sichtbar');

select extensions.is(
  (select count(*)::int from public.alignment_answers where block_id = 'L01'),
  0,
  'die ausgeblendete Antwort haelt die DATENBANK zurueck, nicht erst die Anzeige');

select extensions.is(
  (select count(*)::int from public.alignment_item_views),
  0,
  'wie lange jemand gezoegert hat, sieht auch die freigegebene Person nicht');

-- ---------------------------------------------------------------------------
-- Aus Sicht der eigenen Person
-- ---------------------------------------------------------------------------

set local request.jwt.claims =
  '{"sub":"d1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers),
  2,
  'die eigene Person sieht beide Antworten - auch die ausgeblendete');

select extensions.is(
  (select revisions from public.alignment_item_views where block_id = 'A01'),
  3,
  'und ihren eigenen Ausfuellverlauf');

-- ---------------------------------------------------------------------------
-- Zurueckziehen
-- ---------------------------------------------------------------------------

update public.alignment_shares
   set revoked_at = now()
 where id = 'd1000020-0020-4020-8020-000000000020';

set local request.jwt.claims =
  '{"sub":"d1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers),
  0,
  'nach dem Zurueckziehen ist nichts mehr sichtbar');

-- ---------------------------------------------------------------------------
-- Eine fremde Person ohne jede Freigabe
-- ---------------------------------------------------------------------------

reset role;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'share21-stranger@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());
insert into public.profiles (user_id, roles)
values ('d1000003-0003-4003-8003-000000000003', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"d1000003-0003-4003-8003-000000000003","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_answers),
  0,
  'wer keine Freigabe hat, sieht nichts');

select extensions.is(
  (select count(*)::int from public.alignment_shares),
  0,
  'und sieht auch nicht, DASS es eine Freigabe gibt');

rollback;
