\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(2);

-- ---------------------------------------------------------------------------
-- Was sich beantworten laesst, muss sich auch zurueckhalten lassen
-- ---------------------------------------------------------------------------
--
-- Die Regeln werden MITEINANDER verglichen statt abgeschrieben. Eine
-- abgeschriebene Regel geht beim naechsten Mal auseinander, ohne dass es
-- auffaellt - genau das war hier passiert: `alignment_answers` bekam den
-- angehaengten Kleinbuchstaben fuer G02a/G02b, das Ausblenden nicht.

select extensions.is(
  (select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'alignment_share_hidden_block_shape'),
  (select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'alignment_answers_block_shape'),
  'Ausblenden erlaubt genau dieselben Kennungen wie Antworten');

-- ---------------------------------------------------------------------------
-- Und der Fall, um den es ging, wirklich durchgespielt
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'c8000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'hb-a@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'c8000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'hb-b@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('c8000001-0001-4001-8001-000000000001', array['founder']),
  ('c8000002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

insert into public.assessments (id, user_id, module, instrument_id, submitted_at)
values ('c8000100-0100-4100-8100-000000000100',
        'c8000001-0001-4001-8001-000000000001',
        'base', 'founder-alignment-v2-1', now());

insert into public.alignment_answers (assessment_id, block_id, answer_format, value)
values ('c8000100-0100-4100-8100-000000000100', 'G02a', 'single_choice',
        '{"optionId":"G02a_o1"}'::jsonb);

insert into public.alignment_shares (id, assessment_id, recipient_user_id)
values ('c8000200-0200-4200-8200-000000000200',
        'c8000100-0100-4100-8100-000000000100',
        'c8000002-0002-4002-8002-000000000002');

select extensions.lives_ok(
  $$insert into public.alignment_share_hidden_blocks (share_id, block_id)
    values ('c8000200-0200-4200-8200-000000000200', 'G02a')$$,
  'G02a laesst sich zurueckhalten - beantworten konnte man sie schon immer');

select extensions.finish();

rollback;
