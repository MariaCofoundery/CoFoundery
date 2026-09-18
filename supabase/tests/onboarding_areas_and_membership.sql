begin;
select plan(10);

-- ---------------------------------------------------------------------------
-- Drei Menschen: eine tritt bei, eine ist gesperrt, eine gruendet.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tritt.bei@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gesperrt@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gruendet@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

-- ---------------------------------------------------------------------------
-- Neu registrierte Menschen gelten als nicht eingefuehrt
-- ---------------------------------------------------------------------------
-- Der Trigger auf auth.users legt die person_core-Zeile an. Stuende dort ein
-- Zeitpunkt, bekaeme niemand je die Einfuehrung zu sehen.
select is(
  (select count(*) from public.person_core
   where user_id = 'a1111111-1111-4111-8111-111111111111'
     and onboarding_completed_at is null),
  1::bigint,
  'wer sich neu registriert, hat den Einstieg noch vor sich'
);

-- Die Spalte darf keinen Default bekommen.
--
-- Der Backfill beim Ausrollen ist einmalig und hier nicht pruefbar - in einer
-- frischen Testdatenbank gibt es keine Altkonten. Pruefbar ist die Zusage,
-- die dauerhaft gilt: Traege die Spalte eines Tages `default now()`, waere
-- jeder Mensch ab Sekunde eins als eingefuehrt markiert und niemand bekaeme
-- den Einstieg je zu sehen - ohne dass irgendetwas fehlschlaegt.
select is(
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'person_core'
     and column_name = 'onboarding_completed_at'),
  null,
  'kein Default - sonst gilt jeder sofort als eingefuehrt'
);

-- ---------------------------------------------------------------------------
-- Beitreten, ohne Founder zu werden
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select ok(public.join_network_as_member(), 'der Beitritt gelingt');

select is(
  (select status from public.network_memberships
   where user_id = 'a1111111-1111-4111-8111-111111111111'),
  'active',
  'und die Mitgliedschaft ist aktiv'
);

-- Der springende Punkt: profiles.roles hat `default '{founder}'`. Wuerde der
-- Beitritt dort eine Zeile anlegen, waere die Person ungefragt Founderin -
-- mit Align und Find, die sie nie gewaehlt hat.
select is(
  (select count(*) from public.profiles
   where user_id = 'a1111111-1111-4111-8111-111111111111'),
  0::bigint,
  'ohne dabei eine Produktrolle zu bekommen'
);

-- Zweimal aufrufen darf nichts kaputt machen - der Einstieg kann abbrechen
-- und neu beginnen.
select lives_ok(
  $$select public.join_network_as_member()$$,
  'ein zweiter Aufruf ist folgenlos'
);

select is(
  (select count(*) from public.network_memberships
   where user_id = 'a1111111-1111-4111-8111-111111111111'),
  1::bigint,
  'und legt keine zweite Mitgliedschaft an'
);

-- ---------------------------------------------------------------------------
-- Eine Sperre laesst sich nicht selbst aufheben
-- ---------------------------------------------------------------------------
set local role postgres;
insert into public.network_memberships(user_id, status)
values ('b2222222-2222-4222-8222-222222222222', 'suspended');

set local role authenticated;
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select ok(
  not public.join_network_as_member(),
  'wer gesperrt ist, kommt durch einen Beitritt nicht zurueck'
);

select is(
  (select status from public.network_memberships
   where user_id = 'b2222222-2222-4222-8222-222222222222'),
  'suspended',
  'und die Sperre bleibt stehen'
);

-- ---------------------------------------------------------------------------
-- Ohne Anmeldung gar nichts
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '';

select throws_ok(
  $$select public.join_network_as_member()$$,
  '42501',
  null,
  'ohne Anmeldung kann niemand beitreten'
);

select * from finish();
rollback;
