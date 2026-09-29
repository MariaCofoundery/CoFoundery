\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Jede Antwort weiss, wofuer sie gilt
-- ---------------------------------------------------------------------------
--
-- Der Fehler, den das verhindert: "15 Stunden" ohne Vorhaben und "15 Stunden
-- fuer Projekt X im September" sehen in der Ablage gleich aus, bedeuten aber
-- etwas anderes. Wer das spaeter auseinandernehmen will, kann es nicht mehr.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'f2000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'scope@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('f2000001-0001-4001-8001-000000000001', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.founder_teams (id, name, team_context)
values ('f2000010-0010-4010-8010-000000000010', 'Projekt X', 'pre_founder'),
       ('f2000011-0011-4011-8011-000000000011', 'Projekt Y', 'pre_founder');

-- ---------------------------------------------------------------------------
-- 1. Das Arbeitsprofil gehoert zur Person
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.assessments (id, user_id, module, instrument_id)
    values ('f2000100-0100-4100-8100-000000000100',
            'f2000001-0001-4001-8001-000000000001',
            'founder_profile', 'founder-profile-v1')$$,
  'ein Arbeitsprofil ohne Vorhaben wird angenommen');

select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('f2000001-0001-4001-8001-000000000001',
            'founder_profile', 'founder-profile-v1',
            'f2000010-0010-4010-8010-000000000010')$$,
  '23514',
  null,
  'ein Arbeitsprofil MIT Vorhaben wird abgewiesen - sonst haette dieselbe '
  'Person eins je Team, und dann waere es keins');

-- ---------------------------------------------------------------------------
-- 2. Venture-Alignment gehoert zu einem Vorhaben
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.assessments (id, user_id, module, instrument_id, venture_id)
    values ('f2000200-0200-4200-8200-000000000200',
            'f2000001-0001-4001-8001-000000000001',
            'venture_alignment', 'venture-alignment-v1',
            'f2000010-0010-4010-8010-000000000010')$$,
  'Venture-Alignment mit Vorhaben wird angenommen');

-- ---------------------------------------------------------------------------
-- 3. DASSELBE ITEM, ZWEI VORHABEN, ZWEI ANTWORTEN
-- ---------------------------------------------------------------------------
--
-- Genau das war vorher nicht moeglich, ohne dass die zweite Antwort die erste
-- ueberschrieben haette. Eine Person kann bei zwei Vorhaben verschiedene
-- Zusagen machen, ohne sich zu widersprechen.

insert into public.assessments (id, user_id, module, instrument_id, venture_id)
values ('f2000201-0201-4201-8201-000000000201',
        'f2000001-0001-4001-8001-000000000001',
        'venture_alignment', 'venture-alignment-v1',
        'f2000011-0011-4011-8011-000000000011');

insert into public.alignment_answers (assessment_id, block_id, answer_format, value) values
  ('f2000200-0200-4200-8200-000000000200', 'R01', 'number_range',
   '{"number": 15, "unit": "Stunden pro Woche"}'::jsonb),
  ('f2000201-0201-4201-8201-000000000201', 'R01', 'number_range',
   '{"number": 5, "unit": "Stunden pro Woche"}'::jsonb);

-- NUR DIE ANTWORTEN DIESER PRUEFUNG. Ein `count(*)` ueber alle R01 war
-- gruen, solange die Datenbank leer war - am 29.09.2026 beim Durchklicken
-- standen echte Antworten darin, und die Pruefung fiel um, ohne dass sich an
-- der Regel etwas geaendert haette.
select extensions.is(
  (select count(*)::int from public.alignment_answers
    where block_id = 'R01'
      and assessment_id in (
        'f2000200-0200-4200-8200-000000000200',
        'f2000201-0201-4201-8201-000000000201')),
  2,
  'dieselbe Frage, zwei Vorhaben, zwei Antworten - ohne dass eine die andere ueberschreibt');

select extensions.is(
  (select (answer.value ->> 'number')::int
     from public.alignment_answers answer
     join public.assessments a on a.id = answer.assessment_id
    where answer.block_id = 'R01' and a.venture_id = 'f2000010-0010-4010-8010-000000000010'),
  15,
  'und jede laesst sich ihrem Vorhaben zuordnen');

-- ---------------------------------------------------------------------------
-- 4. Ein aufgeloestes Vorhaben loescht keine Antworten
-- ---------------------------------------------------------------------------
--
-- `on delete set null` statt `cascade`: Wer seine Zusagen fuer ein Vorhaben
-- gemacht hat, das es nicht mehr gibt, hat sie trotzdem gemacht.

delete from public.founder_teams where id = 'f2000011-0011-4011-8011-000000000011';

select extensions.is(
  (select count(*)::int from public.alignment_answers
    where assessment_id = 'f2000201-0201-4201-8201-000000000201'),
  1,
  'die Antworten ueberleben das Ende des Vorhabens');

select extensions.is(
  (select venture_id from public.assessments
    where id = 'f2000201-0201-4201-8201-000000000201'),
  null,
  'sie verlieren nur ihren Bezug - und das ist sichtbar');

-- ---------------------------------------------------------------------------
-- 5. Die alten Werte gelten weiter
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.assessments (user_id, module, instrument_id)
    values ('f2000001-0001-4001-8001-000000000001', 'base', 'founder-compatibility-v1')$$,
  'v1 laeuft weiter - base und values bleiben gueltig');

select extensions.is(
  (select count(*)::int from public.instruments
    where id in ('founder-profile-v1', 'venture-alignment-v1') and status = 'draft'),
  2,
  'beide neuen Fassungen stehen auf draft');

rollback;
