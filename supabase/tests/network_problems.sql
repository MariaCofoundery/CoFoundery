begin;
select plan(18);

-- ---------------------------------------------------------------------------
-- Aufbau: drei Menschen - Autorin, Interessent, Unbeteiligter
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autorin@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'interessent@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unbeteiligt@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active'),
  ('c3333333-3333-4333-8333-333333333333', 'active');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Ein Problem entsteht
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

insert into public.network_problems (id, author_user_id, title, description, author_intent, topics, status, published_at)
values ('d4444444-4444-4444-8444-444444444444', 'a1111111-1111-4111-8111-111111111111',
        'Pflegedienste in laendlichen Regionen finden keine Vertretung',
        'Wenn jemand kurzfristig ausfaellt, telefonieren Leitungen stundenlang Listen ab. Es gibt keine gemeinsame Uebersicht, wer wann einspringen koennte.',
        'wants_to_build', array['Pflege','Vertretung'], 'active', now());

select is(
  (select interest_count from public.network_problems where id = 'd4444444-4444-4444-8444-444444444444'),
  0,
  'ein neues Problem hat null Interessierte'
);

select alike(
  (select search_text from public.network_problems where id = 'd4444444-4444-4444-8444-444444444444'),
  '%Vertretung%',
  'die Suchspalte enthaelt die Themen'
);

-- Ein Problem hat kein Ablaufdatum - das ist der Unterschied zur Anzeige.
select hasnt_column('public', 'network_problems', 'expires_at',
  'ein Problem laeuft nicht ab, es ist geloest oder nicht');

-- ---------------------------------------------------------------------------
-- Was das Schema ablehnt
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, published_at)
    values ('a1111111-1111-4111-8111-111111111111', 'Zu kurz', 'Auch die Beschreibung ist viel zu knapp.', 'active', now())$$,
  '23514',
  null,
  'eine Beschreibung unter 50 Zeichen wird abgelehnt - ein Satz ist keine Beobachtung'
);

select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status)
    values ('a1111111-1111-4111-8111-111111111111', 'Ein hinreichend langer Titel',
            'Eine hinreichend lange Beschreibung, die die Mindestlaenge von fuenfzig Zeichen sicher ueberschreitet.', 'active')$$,
  '23514',
  null,
  'aktiv ohne Veroeffentlichungszeitpunkt wird abgelehnt'
);

select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, author_intent, status, published_at)
    values ('a1111111-1111-4111-8111-111111111111', 'Ein hinreichend langer Titel',
            'Eine hinreichend lange Beschreibung, die die Mindestlaenge von fuenfzig Zeichen sicher ueberschreitet.',
            'vielleicht', 'active', now())$$,
  '23514',
  null,
  'nur die drei dokumentierten Absichten sind zulaessig'
);

-- ---------------------------------------------------------------------------
-- Das eine Signal
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

insert into public.network_problem_interests (problem_id, user_id, note)
values ('d4444444-4444-4444-8444-444444444444', 'b2222222-2222-4222-8222-222222222222',
        'Ich komme aus der Pflege und wuerde an einer Loesung mitarbeiten.');

select is(
  (select interest_count from public.network_problems where id = 'd4444444-4444-4444-8444-444444444444'),
  1,
  'die Zahl zaehlt mit'
);

select throws_ok(
  $$insert into public.network_problem_interests (problem_id, user_id, note)
    values ('d4444444-4444-4444-8444-444444444444', 'b2222222-2222-4222-8222-222222222222',
            'Noch einmal, damit die Zahl steigt.')$$,
  '23505',
  null,
  'hoechstens ein Signal je Person und Problem - sonst waere die Zahl beliebig'
);

select throws_ok(
  $$insert into public.network_problem_interests (problem_id, user_id, note)
    values ('d4444444-4444-4444-8444-444444444444', 'b2222222-2222-4222-8222-222222222222', 'kurz')$$,
  null,
  null,
  'ein Klick ohne Begruendung wird abgelehnt - das waere ein Like'
);

-- ---------------------------------------------------------------------------
-- Wer die Namen sieht, und wer nur die Zahl
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.network_problem_interests),
  1,
  'die interessierte Person sieht ihren eigenen Eintrag'
);

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is(
  (select count(*)::int from public.network_problem_interests),
  1,
  'die einstellende Person sieht, wer interessiert ist'
);

set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';
select is(
  (select count(*)::int from public.network_problem_interests),
  0,
  'alle anderen sehen die Namen nicht - sonst waere das Brett eine Rangliste mit Publikum'
);

select is(
  (select interest_count from public.network_problems where id = 'd4444444-4444-4444-8444-444444444444'),
  1,
  'die Zahl bleibt fuer alle sichtbar'
);

-- ---------------------------------------------------------------------------
-- Interesse am eigenen Problem, und an unveroeffentlichten
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
select throws_ok(
  $$insert into public.network_problem_interests (problem_id, user_id, note)
    values ('d4444444-4444-4444-8444-444444444444', 'a1111111-1111-4111-8111-111111111111',
            'Ich interessiere mich fuer mein eigenes Problem.')$$,
  '42501',
  null,
  'am eigenen Problem kein Interesse - das waere eine Zahl ohne Bedeutung'
);

insert into public.network_problems (id, author_user_id, title, description, status)
values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
        'Noch nicht veroeffentlichter Entwurf',
        'Eine hinreichend lange Beschreibung, die die Mindestlaenge von fuenfzig Zeichen sicher ueberschreitet.', 'draft');

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  0,
  'ein Entwurf ist fuer andere unsichtbar'
);

select throws_ok(
  $$insert into public.network_problem_interests (problem_id, user_id, note)
    values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222',
            'Ich wuerde an diesem Entwurf mitarbeiten.')$$,
  '42501',
  null,
  'kein Interesse an einem Entwurf, den man gar nicht sehen darf'
);

-- ---------------------------------------------------------------------------
-- Zuruecknehmen
-- ---------------------------------------------------------------------------
delete from public.network_problem_interests
where problem_id = 'd4444444-4444-4444-8444-444444444444'
  and user_id = 'b2222222-2222-4222-8222-222222222222';

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is(
  (select interest_count from public.network_problems where id = 'd4444444-4444-4444-8444-444444444444'),
  0,
  'zurueckgenommenes Interesse zaehlt nicht mehr mit'
);

-- Fremde Probleme bleiben unantastbar.
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';
update public.network_problems set title = 'Uebernommen' where id = 'd4444444-4444-4444-8444-444444444444';
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
select isnt(
  (select title from public.network_problems where id = 'd4444444-4444-4444-8444-444444444444'),
  'Uebernommen',
  'ein fremdes Problem laesst sich nicht aendern'
);

select * from finish();
rollback;
