begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

-- Die Rolle "founder" ist Voraussetzung: is_current_user_discovery_founder()
-- steht in der Insert-Policy seit 20260831200000.
insert into public.profiles(user_id, display_name, roles)
values ('a1111111-1111-4111-8111-111111111111', 'A', array['founder']);

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Der Text gilt nur zusammen mit der Rolle
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.founder_discovery_profiles
      (user_id, status, display_name, headline, own_roles, own_role_other)
    values ('a1111111-1111-4111-8111-111111111111', 'draft', 'A', 'H',
            array['tech'], 'Regulatorik')$$,
  '23514',
  null,
  'ein Text ohne die Rolle "other" wird abgelehnt - er gehoerte zu nichts'
);

select lives_ok(
  $$insert into public.founder_discovery_profiles
      (user_id, status, display_name, headline, own_roles, own_role_other,
       seeking_roles, seeking_role_other)
    values ('a1111111-1111-4111-8111-111111111111', 'draft', 'A', 'H',
            array['tech','other'], 'Regulatorik',
            array['other'], 'Zulassung im Medizinbereich')$$,
  'mit der Rolle "other" darf der Text dastehen'
);

select is(
  (select own_role_other from public.founder_discovery_profiles
   where user_id = 'a1111111-1111-4111-8111-111111111111'),
  'Regulatorik',
  'und er kommt so zurueck, wie er hineingegangen ist'
);

select is(
  (select seeking_role_other from public.founder_discovery_profiles
   where user_id = 'a1111111-1111-4111-8111-111111111111'),
  'Zulassung im Medizinbereich',
  'beide Richtungen sind unabhaengig voneinander'
);

-- ---------------------------------------------------------------------------
-- Was abgelehnt wird
-- ---------------------------------------------------------------------------
select throws_ok(
  $$update public.founder_discovery_profiles
    set own_role_other = 'X'
    where user_id = 'a1111111-1111-4111-8111-111111111111'$$,
  '23514',
  null,
  'ein einzelnes Zeichen sagt so wenig wie die Rolle selbst'
);

select throws_ok(
  format(
    $$update public.founder_discovery_profiles
      set own_role_other = %L
      where user_id = 'a1111111-1111-4111-8111-111111111111'$$,
    repeat('x', 81)
  ),
  '23514',
  null,
  'und mehr als 80 Zeichen ist keine Rollenbezeichnung mehr'
);

-- Der wichtigste Fall: Wer "other" abwaehlt, darf den Text nicht stehen
-- lassen. Er waere sonst im Profil sichtbar, aber im eingeklappten Feld
-- unsichtbar fuer die Person, die ihn geschrieben hat.
select throws_ok(
  $$update public.founder_discovery_profiles
    set own_roles = array['tech']
    where user_id = 'a1111111-1111-4111-8111-111111111111'$$,
  '23514',
  null,
  'die Rolle abwaehlen und den Text stehen lassen geht nicht'
);

select lives_ok(
  $$update public.founder_discovery_profiles
    set own_roles = array['tech'], own_role_other = null
    where user_id = 'a1111111-1111-4111-8111-111111111111'$$,
  'beides zusammen schon - und genau das tut die Anwendung'
);

-- ---------------------------------------------------------------------------
-- In der Suche
-- ---------------------------------------------------------------------------
select has_column('public', 'founder_discovery_profiles', 'seeking_role_other',
  'die Spalte steht der Suchprojektion zur Verfuegung');

select * from finish();
rollback;
