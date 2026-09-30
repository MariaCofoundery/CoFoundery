\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

-- ---------------------------------------------------------------------------
-- Ein offener Entwurf je Person, Bogen und Vorhaben
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 30.09.2026: "Die Frage konnte nicht gespeichert werden, aber
-- ich konnte trotzdem weitermachen." Die Ursache war ein Wettlauf: Der
-- Autospeicher feuert je Frage einzeln, zwei Aufrufe fanden beide keinen
-- Entwurf und legten beide einen an. Danach verteilten sich die Antworten auf
-- zwei Entwuerfe, und die Seite zeigte die Haelfte.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'f5000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'od-eine@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('f5000001-0001-4001-8001-000000000001', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

insert into public.assessments (id, user_id, module, instrument_id)
values ('f5a00001-0001-4001-8001-00000000000a',
        'f5000001-0001-4001-8001-000000000001', 'founder_profile', 'founder-profile-v1');

-- ---------------------------------------------------------------------------
-- 1. Ein zweiter offener Entwurf zu demselben Bogen wird abgewiesen
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id)
    values ('f5000001-0001-4001-8001-000000000001', 'founder_profile', 'founder-profile-v1')$$,
  '23505',
  null,
  'zwei offene Entwuerfe zum selben Bogen gehen nicht');

-- ---------------------------------------------------------------------------
-- 2. Ein abgegebener steht dem naechsten nicht im Weg
-- ---------------------------------------------------------------------------
--
-- Wer eine neue Fassung ausfuellt, hat neben dem alten abgegebenen wieder
-- einen offenen. Das ist richtig so.
update public.assessments set submitted_at = now()
where id = 'f5a00001-0001-4001-8001-00000000000a';
select extensions.lives_ok(
  $$insert into public.assessments (user_id, module, instrument_id)
    values ('f5000001-0001-4001-8001-000000000001', 'founder_profile', 'founder-profile-v1')$$,
  'nach dem Abgeben darf ein neuer Entwurf entstehen');

-- ---------------------------------------------------------------------------
-- 3. Zwei Vorhaben sind zwei Entwuerfe
-- ---------------------------------------------------------------------------
insert into public.founder_teams (id, team_context) values
  ('f5700001-0001-4001-8001-00000000000a', 'pre_founder'),
  ('f5700002-0002-4002-8002-00000000000b', 'pre_founder');
select extensions.lives_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id) values
      ('f5000001-0001-4001-8001-000000000001', 'venture_alignment', 'venture-alignment-v1',
       'f5700001-0001-4001-8001-00000000000a'),
      ('f5000001-0001-4001-8001-000000000001', 'venture_alignment', 'venture-alignment-v1',
       'f5700002-0002-4002-8002-00000000000b')$$,
  'zu zwei Vorhaben gehoeren zwei Entwuerfe');

-- ---------------------------------------------------------------------------
-- 4. Aber nicht zweimal zum selben Vorhaben
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$insert into public.assessments (user_id, module, instrument_id, venture_id)
    values ('f5000001-0001-4001-8001-000000000001', 'venture_alignment', 'venture-alignment-v1',
            'f5700001-0001-4001-8001-00000000000a')$$,
  '23505',
  null,
  'zweimal zum selben Vorhaben geht nicht');

select * from extensions.finish();

rollback;
