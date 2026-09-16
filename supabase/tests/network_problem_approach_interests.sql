begin;
select plan(14);

-- ---------------------------------------------------------------------------
-- Aufbau
--   A stellt ein Problem ein.
--   B schreibt einen Ansatz dazu.
--   C liest beides.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active'),
  ('c3333333-3333-4333-8333-333333333333', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Autorin', 'Sieht ein Problem',
   'Arbeitet in der Pflege und beobachtet dort seit Jahren dieselbe Luecke.', array['founder'], 'active', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Ansatzschreiber', 'Baut Software',
   'Entwickelt seit zehn Jahren Anwendungen fuer kleine Organisationen und Teams.', array['expert'], 'active', now()),
  ('c3333333-3333-4333-8333-333333333333', 'Dritte', 'Kennt den Markt',
   'Hat jahrelang Vertrieb fuer Software im Gesundheitswesen gemacht und kennt die Kundschaft.', array['expert'], 'active', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

insert into public.network_problems (id, author_user_id, title, description, status, published_at)
values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
        'Pflegedienste finden keine Vertretung',
        'Wenn jemand kurzfristig ausfaellt, telefonieren Leitungen stundenlang Listen ab. Es gibt keine gemeinsame Uebersicht.',
        'active', now());

-- Ein zweites Problem, fuer die Pruefung, dass ein Bezug nicht quer geht.
insert into public.network_problems (id, author_user_id, title, description, status, published_at)
values ('e6666666-6666-4666-8666-666666666666', 'a1111111-1111-4111-8111-111111111111',
        'Ein zweites, ganz anderes Problem',
        'Auch diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen sicher zu ueberschreiten.',
        'active', now());

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

insert into public.network_problem_approaches (id, problem_id, author_user_id, summary, audience, needs)
values ('f7777777-7777-4777-8777-777777777777', 'e5555555-5555-4555-8555-555555555555',
        'b2222222-2222-4222-8222-222222222222',
        'Eine gemeinsame Verfuegbarkeitsliste fuer mehrere Dienste in einer Region, in die Pflegekraefte selbst eintragen, wann sie einspringen wuerden.',
        'Ambulante Dienste mit zehn bis fuenfzig Mitarbeitenden',
        'Jemanden, der die Ablaeufe in der Pflege von innen kennt.');

-- ---------------------------------------------------------------------------
-- Der Fall, um den es geht: Die einstellende Person meldet sich bei einem
-- Ansatz auf ihrem EIGENEN Problem. Vorher war das verboten.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$insert into public.network_problem_interests (problem_id, approach_id, user_id, note)
    values ('e5555555-5555-4555-8555-555555555555', 'f7777777-7777-4777-8777-777777777777',
            'a1111111-1111-4111-8111-111111111111',
            'Genau so hatte ich mir das vorgestellt. Lass uns reden.')$$,
  'die einstellende Person darf sich bei einem Ansatz auf ihrem eigenen Problem melden'
);

-- Beim Problem selbst bleibt es verboten - daran aendert sich nichts.
select throws_ok(
  $$insert into public.network_problem_interests (problem_id, user_id, note)
    values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
            'Ich fände mein eigenes Problem sehr interessant.')$$,
  '42501',
  null,
  'beim eigenen Problem bleibt es verboten'
);

-- ---------------------------------------------------------------------------
-- Die Zahl am Problem bleibt die Zahl am Problem
-- ---------------------------------------------------------------------------
select is(
  (select interest_count from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  0,
  'eine Rueckmeldung zu einem Ansatz zaehlt nicht als Interesse am Problem'
);

set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

insert into public.network_problem_interests (problem_id, user_id, note)
values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333',
        'Ich kenne die Kundschaft und wuerde daran arbeiten.');

select is(
  (select interest_count from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  1,
  'eine Meldung zum Problem zaehlt weiterhin'
);

-- Und beides nebeneinander geht: zwei verschiedene Menschen am anderen Ende.
select lives_ok(
  $$insert into public.network_problem_interests (problem_id, approach_id, user_id, note)
    values ('e5555555-5555-4555-8555-555555555555', 'f7777777-7777-4777-8777-777777777777',
            'c3333333-3333-4333-8333-333333333333',
            'Und deinen Ansatz finde ich besonders ueberzeugend.')$$,
  'wer sich beim Problem gemeldet hat, darf sich trotzdem bei einem Ansatz melden'
);

select is(
  (select interest_count from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  1,
  'und die Zahl am Problem bleibt davon unberuehrt'
);

-- ---------------------------------------------------------------------------
-- Was abgelehnt wird
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.network_problem_interests (problem_id, approach_id, user_id, note)
    values ('e6666666-6666-4666-8666-666666666666', 'f7777777-7777-4777-8777-777777777777',
            'c3333333-3333-4333-8333-333333333333',
            'Ein Bezug quer ueber zwei verschiedene Probleme hinweg.')$$,
  '23514',
  null,
  'ein Bezug muss zum selben Problem gehoeren'
);

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select throws_ok(
  $$insert into public.network_problem_interests (problem_id, approach_id, user_id, note)
    values ('e5555555-5555-4555-8555-555555555555', 'f7777777-7777-4777-8777-777777777777',
            'b2222222-2222-4222-8222-222222222222',
            'Ich finde meinen eigenen Ansatz ausgesprochen gelungen.')$$,
  '42501',
  null,
  'beim eigenen Ansatz melden geht nicht'
);

-- ---------------------------------------------------------------------------
-- Wer die Meldung sieht
-- ---------------------------------------------------------------------------
-- B hat den Ansatz geschrieben und sieht beide Rueckmeldungen dazu.
select is(
  (select count(*) from public.network_problem_interests
   where approach_id = 'f7777777-7777-4777-8777-777777777777'),
  2::bigint,
  'die Person, die den Ansatz geschrieben hat, sieht die Rueckmeldungen dazu'
);

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

-- A hat das Problem eingestellt, aber nicht den Ansatz. Sie sieht nur die
-- Meldung zum Problem und ihre eigene.
select is(
  (select count(*) from public.network_problem_interests
   where approach_id = 'f7777777-7777-4777-8777-777777777777'
     and user_id <> 'a1111111-1111-4111-8111-111111111111'),
  0::bigint,
  'die einstellende Person sieht fremde Rueckmeldungen zu einem Ansatz nicht'
);

-- ---------------------------------------------------------------------------
-- Wer annehmen darf
-- ---------------------------------------------------------------------------
select throws_ok(
  format(
    $$select public.accept_network_problem_interest(%L)$$,
    (select id from public.network_problem_interests
     where approach_id = 'f7777777-7777-4777-8777-777777777777'
       and user_id = 'a1111111-1111-4111-8111-111111111111')
  ),
  '42501',
  null,
  'die einstellende Person kann eine Meldung an einen fremden Ansatz nicht annehmen'
);

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select isnt(
  (select public.accept_network_problem_interest(
     (select id from public.network_problem_interests
      where approach_id = 'f7777777-7777-4777-8777-777777777777'
        and user_id = 'c3333333-3333-4333-8333-333333333333')
   )),
  null,
  'wer den Ansatz geschrieben hat, nimmt an - und bekommt ein Gespraech'
);

-- ---------------------------------------------------------------------------
-- Und es verbindet die richtigen beiden
-- ---------------------------------------------------------------------------
set local role postgres;

select is(
  (select participant_b_user_id from public.network_conversations conversation
   join public.network_problem_interests interest
     on interest.id = conversation.problem_interest_id
   where interest.approach_id = 'f7777777-7777-4777-8777-777777777777'
     and interest.user_id = 'c3333333-3333-4333-8333-333333333333'),
  'b2222222-2222-4222-8222-222222222222'::uuid,
  'das Gespraech fuehrt zur Person, die den Ansatz geschrieben hat - nicht zur einstellenden'
);

select is(
  (select participant_a_user_id from public.network_conversations conversation
   join public.network_problem_interests interest
     on interest.id = conversation.problem_interest_id
   where interest.approach_id = 'f7777777-7777-4777-8777-777777777777'
     and interest.user_id = 'c3333333-3333-4333-8333-333333333333'),
  'c3333333-3333-4333-8333-333333333333'::uuid,
  'und auf der anderen Seite steht, wer sich gemeldet hat'
);

select * from finish();
rollback;
