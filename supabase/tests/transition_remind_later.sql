\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'f1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'trans21@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles)
values ('f1000001-0001-4001-8001-000000000001', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

-- ---------------------------------------------------------------------------
-- 1. Ruhen kann nur, was offen ist
-- ---------------------------------------------------------------------------

select extensions.lives_ok(
  $$insert into public.instrument_transitions
      (user_id, from_instrument_id, to_instrument_id, decision, remind_after)
    values ('f1000001-0001-4001-8001-000000000001',
            'founder-compatibility-v1', 'founder-alignment-v2-1',
            'pending', now() + interval '30 days')$$,
  'ein offener Umstieg darf ruhen');

select extensions.throws_ok(
  $$update public.instrument_transitions
       set decision = 'retake', decided_at = now()
     where user_id = 'f1000001-0001-4001-8001-000000000001'$$,
  '23514',
  null,
  'eine getroffene Entscheidung darf keine Erinnerung mehr tragen');

-- Richtig herum geht es: erst die Erinnerung loeschen, dann entscheiden.
select extensions.lives_ok(
  $$update public.instrument_transitions
       set decision = 'retake', decided_at = now(), remind_after = null
     where user_id = 'f1000001-0001-4001-8001-000000000001'$$,
  'ohne Erinnerung laesst sich entscheiden');

-- ---------------------------------------------------------------------------
-- 2. Die Regeln von vorher gelten weiter
-- ---------------------------------------------------------------------------

select extensions.throws_ok(
  $$update public.instrument_transitions
       set decision = 'retake', decided_at = null
     where user_id = 'f1000001-0001-4001-8001-000000000001'$$,
  '23514',
  null,
  'eine getroffene Entscheidung hat weiterhin ein Datum');

-- ---------------------------------------------------------------------------
-- 3. Umentscheiden verliert das Datum nicht
-- ---------------------------------------------------------------------------
--
-- Die Bedingung ist eine Implikation und keine Aequivalenz. Genau deshalb
-- darf beim Zurueck auf 'pending' das Datum stehen bleiben - die Information,
-- wann einmal entschieden wurde, geht nicht verloren.

select extensions.lives_ok(
  $$update public.instrument_transitions
       set decision = 'pending'
     where user_id = 'f1000001-0001-4001-8001-000000000001'$$,
  'zurueck auf offen geht, ohne das Datum zu loeschen');

select extensions.isnt(
  (select decided_at from public.instrument_transitions
    where user_id = 'f1000001-0001-4001-8001-000000000001'),
  null,
  'und wann einmal entschieden wurde, steht noch da');

rollback;
