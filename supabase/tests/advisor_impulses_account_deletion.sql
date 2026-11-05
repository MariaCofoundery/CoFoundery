\set ON_ERROR_STOP on

-- Advisor-Impulse verschwinden mit dem Konto des Advisors (Migration 20270129120000).

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','ec111111-1111-4111-8111-111111111111','authenticated','authenticated','impulse-founder-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','ec222222-2222-4222-8222-222222222222','authenticated','authenticated','impulse-founder-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','ec333333-3333-4333-8333-333333333333','authenticated','authenticated','impulse-advisor-gone@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','ec444444-4444-4444-8444-444444444444','authenticated','authenticated','impulse-advisor-stays@example.com','',now(),'{}','{}',now(),now());

insert into public.relationships (id, user_a_id, user_b_id)
values ('ec500000-0000-4000-8000-000000000001', 'ec111111-1111-4111-8111-111111111111', 'ec222222-2222-4222-8222-222222222222');

insert into public.advisor_section_impulses (relationship_id, advisor_user_id, section_key, text)
values
  ('ec500000-0000-4000-8000-000000000001', 'ec333333-3333-4333-8333-333333333333', 'report_overview', 'Impuls des gehenden Advisors'),
  ('ec500000-0000-4000-8000-000000000001', 'ec333333-3333-4333-8333-333333333333', 'top_tensions', 'Zweiter Impuls des gehenden Advisors'),
  ('ec500000-0000-4000-8000-000000000001', 'ec444444-4444-4444-8444-444444444444', 'report_overview', 'Impuls des bleibenden Advisors');

select extensions.matches(
  (select routine_definition from information_schema.routines
   where routine_schema = 'public' and routine_name = 'delete_unlinked_personal_data_for_auth_user'),
  'delete from public.advisor_section_impulses',
  'der Aufräum-Trigger kennt die Advisor-Impulse'
);

delete from auth.users where id = 'ec333333-3333-4333-8333-333333333333';

select extensions.is(
  (select count(*)::integer from public.advisor_section_impulses
   where advisor_user_id = 'ec333333-3333-4333-8333-333333333333'),
  0,
  'Impulse des gelöschten Advisors sind weg - keine verwaiste user_id bleibt'
);
select extensions.is(
  (select count(*)::integer from public.advisor_section_impulses
   where advisor_user_id = 'ec444444-4444-4444-8444-444444444444'),
  1,
  'Impulse anderer Advisors derselben Beziehung bleiben'
);
select extensions.ok(
  exists(select 1 from public.relationships where id = 'ec500000-0000-4000-8000-000000000001'),
  'die Beziehung der Founder bleibt bestehen'
);

-- Founder geht: die Impulse gehen wie bisher mit der Beziehung
delete from auth.users where id = 'ec111111-1111-4111-8111-111111111111';
select extensions.is(
  (select count(*)::integer from public.advisor_section_impulses
   where relationship_id = 'ec500000-0000-4000-8000-000000000001'),
  0,
  'löscht ein Founder sein Konto, verschwinden die Impulse mit der Beziehung'
);

-- Keine personenbezogene Spalte in public ohne Fremdschlüssel bleibt übrig.
-- Ueber die Systemkataloge statt information_schema (05.11.2026): dieselbe Pruefung, aber die korrelierte Abfrage
-- ueber information_schema brauchte bei 260+ Migrationen ueber 90 Sekunden und liess die lokale Datenbank im
-- vollen Lauf am Speicher scheitern.
select extensions.is(
  (select count(*)::integer
   from pg_catalog.pg_attribute a
   join pg_catalog.pg_class cl on cl.oid = a.attrelid and cl.relkind in ('r', 'p')
   join pg_catalog.pg_namespace n on n.oid = cl.relnamespace and n.nspname = 'public'
   where a.attnum > 0
     and not a.attisdropped
     and a.atttypid = 'uuid'::regtype
     and a.attname ~ '(user_id|author_id|advisor_id|created_by|owner_id|member_id)$'
     and not exists (
       select 1 from pg_catalog.pg_constraint co
       where co.conrelid = cl.oid and co.contype = 'f' and a.attnum = any (co.conkey))
     and (cl.relname::text, a.attname::text) not in (('advisor_section_impulses', 'advisor_user_id'))),
  0,
  'außer den Impulsen (vom Trigger abgedeckt) hat jede Personen-Spalte einen Fremdschlüssel'
);

select extensions.is(
  (select action_timing from information_schema.triggers
   where event_object_schema = 'auth' and event_object_table = 'users'
     and trigger_name = 'trg_auth_users_delete_unlinked_personal_data'
   limit 1),
  'BEFORE',
  'der Aufräum-Trigger läuft vor dem Löschen'
);

select * from extensions.finish();
rollback;
