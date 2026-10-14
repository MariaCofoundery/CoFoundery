\set ON_ERROR_STOP on

-- Advisor-Impulse verschwinden mit dem Konto des Advisors (Migration 20261126120000).

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

-- Keine personenbezogene Spalte in public ohne Fremdschlüssel bleibt übrig
select extensions.is(
  (select count(*)::integer
   from information_schema.columns c
   where c.table_schema = 'public'
     and c.data_type = 'uuid'
     and c.column_name ~ '(user_id|author_id|advisor_id|created_by|owner_id|member_id)$'
     and exists (select 1 from information_schema.tables t
                 where t.table_schema = 'public' and t.table_name = c.table_name and t.table_type = 'BASE TABLE')
     and not exists (
       select 1
       from information_schema.key_column_usage k
       join information_schema.table_constraints tc
         on tc.constraint_name = k.constraint_name and tc.table_schema = k.table_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and k.table_schema = 'public' and k.table_name = c.table_name and k.column_name = c.column_name)
     and (c.table_name, c.column_name) not in (('advisor_section_impulses', 'advisor_user_id'))),
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
