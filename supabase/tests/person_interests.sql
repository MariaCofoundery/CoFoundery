\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

select extensions.has_column('public', 'person_core', 'interests', 'person_core hat interests');
select extensions.col_not_null('public', 'person_core', 'interests', 'interests ist nie null');
select extensions.col_default_is('public', 'person_core', 'interests', '{}', 'leer heisst: noch nichts gesagt');

-- Eine Absicht ist keine Rolle: Der Kern bekommt dadurch weiter keine roles-Spalte.
select extensions.hasnt_column('public', 'person_core', 'roles', 'kein roles im Kern');

insert into auth.users(id, email) values ('ee000000-0000-4000-8000-000000000001', 'interests@example.test');

select extensions.lives_ok(
  $$update public.person_core set interests = array['align','find'] where user_id = 'ee000000-0000-4000-8000-000000000001'$$,
  'gueltige Absichten werden gespeichert'
);
select extensions.throws_ok(
  $$update public.person_core set interests = array['admin'] where user_id = 'ee000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'eine unbekannte Absicht wird abgelehnt'
);
select extensions.is(
  (select interests from public.person_core where user_id = 'ee000000-0000-4000-8000-000000000001'),
  array['align','find'],
  'die abgelehnte Aenderung hat nichts veraendert'
);

select * from extensions.finish();
rollback;
