\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a4000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'conf-a@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('a4000001-0001-4001-8001-000000000001', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.founder_teams (id, name, team_context)
values ('a4000100-0100-4100-8100-000000000100', 'Projekt Z', 'pre_founder');

insert into public.assessments (id, user_id, module, instrument_id, venture_id)
values ('a4000200-0200-4200-8200-000000000200',
        'a4000001-0001-4001-8001-000000000001',
        'venture_alignment', 'venture-alignment-v1',
        'a4000100-0100-4100-8100-000000000100');

-- ---------------------------------------------------------------------------
-- 1. Leer heisst "noch nicht angesehen", nicht "ungueltig"
-- ---------------------------------------------------------------------------

select extensions.is(
  (select answers_confirmed_at from public.assessments
    where id = 'a4000200-0200-4200-8200-000000000200'),
  null,
  'frisch angelegt heisst: noch nicht angesehen');

-- AUSDRUECKLICHE ZEITSTEMPEL, NICHT now().
--
-- now() ist in Postgres die Transaktionszeit: Bestaetigung und Beitritt
-- haetten in diesem Test dieselbe Sekunde, und der Vergleich wuerde die Uhr
-- pruefen statt die Regel.
select extensions.lives_ok(
  $$update public.assessments
       set answers_confirmed_at = timestamptz '2026-09-29 12:00:00+00'
     where id = 'a4000200-0200-4200-8200-000000000200'$$,
  'bestaetigen geht');

-- ---------------------------------------------------------------------------
-- 2. Ein Arbeitsprofil hat nichts zu bestaetigen
-- ---------------------------------------------------------------------------
--
-- Es gehoert zur Person. Dort kommt niemand dazu, und es gibt keinen Moment,
-- in dem sich die Lage aendert.

select extensions.throws_ok(
  $$insert into public.assessments
      (user_id, module, instrument_id, answers_confirmed_at)
    values ('a4000001-0001-4001-8001-000000000001',
            'founder_profile', 'founder-profile-v1', now())$$,
  '23514',
  null,
  'ein Arbeitsprofil kann nicht bestaetigt werden - es gehoert zu keinem Vorhaben');

-- ---------------------------------------------------------------------------
-- 3. Erneut fragen, wenn jemand SPAETER dazukommt
-- ---------------------------------------------------------------------------
--
-- Die Regel braucht keine eigene Spalte: Ein Beitritt nach der letzten
-- Bestaetigung ist der Moment, in dem sich die Lage geaendert hat.

insert into public.founder_team_members (team_id, user_id, created_at)
values ('a4000100-0100-4100-8100-000000000100',
        'a4000001-0001-4001-8001-000000000001',
        timestamptz '2026-09-27 09:00:00+00');

select extensions.ok(
  (select a.answers_confirmed_at > max(member.created_at)
     from public.assessments a
     join public.founder_team_members member on member.team_id = a.venture_id
    where a.id = 'a4000200-0200-4200-8200-000000000200'
    group by a.answers_confirmed_at),
  'wer vor der Bestaetigung beigetreten ist, loest keine neue Frage aus');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a4000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'conf-b@example.com', '', now(), '{}', '{}', now(), now());
insert into public.profiles (user_id, roles)
values ('a4000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.founder_team_members (team_id, user_id, created_at)
values ('a4000100-0100-4100-8100-000000000100',
        'a4000002-0002-4002-8002-000000000002',
        timestamptz '2026-09-30 08:00:00+00');

select extensions.ok(
  (select a.answers_confirmed_at < max(member.created_at)
     from public.assessments a
     join public.founder_team_members member on member.team_id = a.venture_id
    where a.id = 'a4000200-0200-4200-8200-000000000200'
    group by a.answers_confirmed_at),
  'wer NACH der Bestaetigung dazukommt, loest eine neue Frage aus');

rollback;
