\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'trans-veteran@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'trans-newcomer@example.com', '', now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('d1000001-0001-4001-8001-000000000001', array['founder']),
  ('d1000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

-- Der eine hat v1 abgegeben, der andere nie etwas gemacht.
insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('d1000010-0010-4010-8010-000000000010',
        'd1000001-0001-4001-8001-000000000001', 'base', 'founder-compatibility-v1', now());

-- Und ein reiner Entwurf zaehlt nicht.
insert into public.assessments (id, user_id, module, instrument_id)
values ('d1000011-0011-4011-8011-000000000011',
        'd1000002-0002-4002-8002-000000000002', 'base', 'founder-compatibility-v1');

-- ---------------------------------------------------------------------------
-- 1. Wem der Hinweis gilt
-- ---------------------------------------------------------------------------

select extensions.ok(
  public.needs_instrument_transition_notice(
    'founder-compatibility-v1', 'founder-alignment-v2',
    'd1000001-0001-4001-8001-000000000001'),
  'wer die alte Fassung abgegeben hat, bekommt den Hinweis'
);

-- WER SIE NIE AUSGEFUELLT HAT, BEKOMMT KEINEN. "Du kannst deine alte behalten"
-- waere fuer ihn sinnlos und verwirrend - er bekommt einfach die neue.
select extensions.ok(
  not public.needs_instrument_transition_notice(
    'founder-compatibility-v1', 'founder-alignment-v2',
    'd1000002-0002-4002-8002-000000000002'),
  'wer nur einen Entwurf hat, bekommt keinen Hinweis'
);

-- ---------------------------------------------------------------------------
-- 2. Die Entscheidung
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$insert into public.instrument_transitions
      (user_id, from_instrument_id, to_instrument_id, decision)
    values ('d1000002-0002-4002-8002-000000000002',
            'founder-compatibility-v1', 'founder-alignment-v2', 'keep_previous')$$,
  '42501', null,
  'niemand entscheidet fuer jemand anderen'
);

select extensions.throws_ok(
  $$insert into public.instrument_transitions
      (user_id, from_instrument_id, to_instrument_id, decision)
    values ('d1000001-0001-4001-8001-000000000001',
            'founder-compatibility-v1', 'founder-alignment-v2', 'spaeter')$$,
  '23514', null,
  'eine erfundene Entscheidung wird abgelehnt'
);

-- Eine getroffene Entscheidung braucht ein Datum.
select extensions.throws_ok(
  $$insert into public.instrument_transitions
      (user_id, from_instrument_id, to_instrument_id, decision)
    values ('d1000001-0001-4001-8001-000000000001',
            'founder-compatibility-v1', 'founder-alignment-v2', 'keep_previous')$$,
  '23514', null,
  'eine getroffene Entscheidung ohne Datum wird abgelehnt'
);

select extensions.lives_ok(
  $$insert into public.instrument_transitions
      (user_id, from_instrument_id, to_instrument_id, decision, decided_at)
    values ('d1000001-0001-4001-8001-000000000001',
            'founder-compatibility-v1', 'founder-alignment-v2', 'keep_previous', now())$$,
  'die eigene Entscheidung wird angenommen'
);

reset role;

select extensions.ok(
  not public.needs_instrument_transition_notice(
    'founder-compatibility-v1', 'founder-alignment-v2',
    'd1000001-0001-4001-8001-000000000001'),
  'nach der Entscheidung kommt der Hinweis nicht wieder'
);

-- ---------------------------------------------------------------------------
-- 3. Umentscheiden, ohne die Spur zu verlieren
-- ---------------------------------------------------------------------------
--
-- Eine Entscheidung, die man nur einmal treffen darf, wird nicht getroffen,
-- sondern aufgeschoben.

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$update public.instrument_transitions
    set decision = 'retake', decided_at = now()
    where user_id = 'd1000001-0001-4001-8001-000000000001'$$,
  'wer die alte behalten wollte, darf es sich anders ueberlegen'
);

-- DIE ALTEN ANTWORTEN BLEIBEN. "Retake" legt einen neuen Fragebogen an, es
-- loescht keinen alten - das Archiv ist ein Status, kein zweiter Speicher.
reset role;
select extensions.is(
  (select count(*)::int from public.assessments
   where id = 'd1000010-0010-4010-8010-000000000010'),
  1,
  'der alte Fragebogen ist nach der Entscheidung noch da'
);

select extensions.is(
  (select submitted_at is not null from public.assessments
   where id = 'd1000010-0010-4010-8010-000000000010'),
  true,
  'und gilt weiterhin als abgegeben'
);

-- ---------------------------------------------------------------------------
-- 4. Zurueck auf "noch nicht entschieden" verliert das Datum nicht
-- ---------------------------------------------------------------------------
--
-- Die Bedingung ist eine Implikation und keine Aequivalenz. Die
-- Aequivalenz-Falle steckt in `advisor_person_grants_approved` und kostet
-- dort die Information, wann einmal zugestimmt wurde.

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.lives_ok(
  $$update public.instrument_transitions
    set decision = 'pending'
    where user_id = 'd1000001-0001-4001-8001-000000000001'$$,
  'zurueck auf offen geht, ohne das Datum loeschen zu muessen'
);

reset role;

select * from extensions.finish();

rollback;
