\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- ---------------------------------------------------------------------------
-- Der Ausfuellverlauf fuer den Pretest
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'b1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'views-owner@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'b1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'views-stranger@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('b1000001-0001-4001-8001-000000000001', array['founder']),
       ('b1000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id)
values ('b1000010-0010-4010-8010-000000000010',
        'b1000001-0001-4001-8001-000000000001', 'base', 'founder-alignment-v2-1');

-- ---------------------------------------------------------------------------
-- 1. Gesehen, aber nicht beantwortet: die Abbruchstelle
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.alignment_item_views (assessment_id, block_id)
    values ('b1000010-0010-4010-8010-000000000010', 'A01')$$,
  'eine gesehene Frage ohne Antwort wird angenommen - genau das ist eine Abbruchstelle');

select extensions.is(
  (select answered_at from public.alignment_item_views
    where assessment_id = 'b1000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  null,
  'gesehen heisst nicht beantwortet');

select extensions.is(
  (select revisions from public.alignment_item_views
    where assessment_id = 'b1000010-0010-4010-8010-000000000010' and block_id = 'A01'),
  0,
  'wer nichts geaendert hat, hat null Aenderungen');

-- ---------------------------------------------------------------------------
-- 2. Eine Antwort kann nicht vor ihrer Frage da gewesen sein
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$insert into public.alignment_item_views
      (assessment_id, block_id, first_seen_at, answered_at)
    values ('b1000010-0010-4010-8010-000000000010', 'A02',
            now(), now() - interval '5 minutes')$$,
  '23514',
  null,
  'beantwortet vor gesehen wird abgewiesen');

select extensions.throws_ok(
  $$insert into public.alignment_item_views (assessment_id, block_id, revisions)
    values ('b1000010-0010-4010-8010-000000000010', 'A02', -1)$$,
  '23514',
  null,
  'weniger als null Aenderungen gibt es nicht');

select extensions.throws_ok(
  $$insert into public.alignment_item_views (assessment_id, block_id)
    values ('b1000010-0010-4010-8010-000000000010', 'nope')$$,
  '23514',
  null,
  'eine erfundene Blockkennung wird abgewiesen');

-- G02a muss durchgehen - die geteilte Frage gibt es wirklich.
select extensions.lives_ok(
  $$insert into public.alignment_item_views (assessment_id, block_id)
    values ('b1000010-0010-4010-8010-000000000010', 'G02a')$$,
  'die geteilte Frage G02a wird angenommen');

-- ---------------------------------------------------------------------------
-- 3. Niemand sonst sieht, wie lange jemand gezoegert hat
-- ---------------------------------------------------------------------------
--
-- Auch nicht, wer die ANTWORTEN sehen darf. Eine Ausfuellzeit ist keine
-- Antwort und wird nicht mitgeteilt.

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"b1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_item_views),
  2,
  'die eigene Person sieht ihren eigenen Verlauf - A01 und G02a, die abgewiesenen zaehlen nicht');

set local request.jwt.claims =
  '{"sub":"b1000002-0002-4002-8002-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.alignment_item_views),
  0,
  'eine fremde Person sieht nichts');

select extensions.throws_ok(
  $$insert into public.alignment_item_views (assessment_id, block_id)
    values ('b1000010-0010-4010-8010-000000000010', 'A03')$$,
  '42501',
  null,
  'eine fremde Person kann auch nichts eintragen');

reset role;

-- ---------------------------------------------------------------------------
-- 4. Die Messung verschwindet mit dem Fragebogen
-- ---------------------------------------------------------------------------
--
-- Wer seine Antworten loescht, loescht auch die Aufzeichnung, wie lange er
-- dafuer gebraucht hat. Sonst bliebe von einem geloeschten Fragebogen eine
-- Spur uebrig, die niemand erwartet.

delete from public.assessments where id = 'b1000010-0010-4010-8010-000000000010';

select extensions.is(
  (select count(*)::int from public.alignment_item_views),
  0,
  'mit dem Fragebogen verschwindet auch die Messung');

rollback;
