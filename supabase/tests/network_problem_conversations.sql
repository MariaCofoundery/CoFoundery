begin;
select plan(14);

-- ---------------------------------------------------------------------------
-- Aufbau: Autorin mit Problem, Interessent, Unbeteiligter
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autorin@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'interessent@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fremd@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active'),
  ('c3333333-3333-4333-8333-333333333333', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Autorin', 'Sieht ein Problem',
   'Arbeitet in der Pflege und beobachtet dort seit Jahren dieselbe Luecke.', array['founder'], 'active', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Interessent', 'Baut Software',
   'Entwickelt seit zehn Jahren Anwendungen fuer kleine Organisationen und Teams.', array['expert'], 'active', now()),
  ('c3333333-3333-4333-8333-333333333333', 'Fremd', 'Unbeteiligt',
   'Hat mit dieser Sache nichts zu tun und darf deshalb nichts davon sehen.', array['expert'], 'active', now());

-- ---------------------------------------------------------------------------
-- Ein Problem braucht ein aktives Profil, um veroeffentlicht zu werden
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('d4444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ohneprofil@example.com', crypt('x', gen_salt('bf')), now(), now(), now());
insert into public.network_memberships (user_id, status) values ('d4444444-4444-4444-8444-444444444444', 'active');

select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, published_at)
    values ('d4444444-4444-4444-8444-444444444444', 'Problem ohne erreichbare Person',
            'Eine hinreichend lange Beschreibung, die die Mindestlaenge von fuenfzig Zeichen sicher ueberschreitet.',
            'active', now())$$,
  '23514',
  null,
  'ohne aktives Connect-Profil laesst sich kein Problem veroeffentlichen - sonst kann niemand antworten'
);

-- ---------------------------------------------------------------------------
-- Der Weg: Problem, Interesse, Annahme, Gespraech
-- ---------------------------------------------------------------------------
insert into public.network_problems (id, author_user_id, title, description, status, published_at)
values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
        'Pflegedienste finden keine kurzfristige Vertretung',
        'Wenn jemand ausfaellt, telefonieren Leitungen stundenlang Listen ab. Eine gemeinsame Uebersicht fehlt vollstaendig.',
        'active', now());

insert into public.network_problem_interests (id, problem_id, user_id, note)
values ('f6666666-6666-4666-8666-666666666666', 'e5555555-5555-4555-8555-555555555555',
        'b2222222-2222-4222-8222-222222222222',
        'Ich baue solche Uebersichten seit Jahren und wuerde daran mitarbeiten.');

set local role authenticated;

-- Ein Fremder kann kein Interesse annehmen, das ihn nichts angeht.
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';
select throws_ok(
  $$select public.accept_network_problem_interest('f6666666-6666-4666-8666-666666666666')$$,
  '42501',
  null,
  'nur die einstellende Person entscheidet, mit wem sie spricht'
);

-- Auch die interessierte Person nicht - sie hat ihr Interesse schon bekundet.
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';
select throws_ok(
  $$select public.accept_network_problem_interest('f6666666-6666-4666-8666-666666666666')$$,
  '42501',
  null,
  'die interessierte Person kann sich nicht selbst annehmen'
);

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
select isnt(
  public.accept_network_problem_interest('f6666666-6666-4666-8666-666666666666'),
  null,
  'die einstellende Person nimmt an und bekommt ein Gespraech'
);

-- Zweimal annehmen ist kein Fehler, sondern dasselbe Gespraech.
-- Die Tabelle ist fuer authenticated gesperrt; alles laeuft ueber Funktionen.
-- Die Kennung kommt deshalb aus dem Rueckgabewert, nicht aus einem select.
create temp table conversation_under_test as
select public.accept_network_problem_interest('f6666666-6666-4666-8666-666666666666') as id;

select is(
  public.accept_network_problem_interest('f6666666-6666-4666-8666-666666666666'),
  (select id from conversation_under_test),
  'zweimal annehmen ergibt dasselbe Gespraech, keinen Fehler'
);

-- ---------------------------------------------------------------------------
-- Das Gespraech verhaelt sich wie jedes andere
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.list_network_conversations()),
  1,
  'die einstellende Person sieht das Gespraech in ihrer Liste'
);

select is(
  (select listing_title from public.list_network_conversations() limit 1),
  'Pflegedienste finden keine kurzfristige Vertretung',
  'als Zusammenhang steht der Titel des Problems dort'
);

select is(
  (select counterpart_display_name from public.list_network_conversations() limit 1),
  'Interessent',
  'und der Name der anderen Person'
);

select isnt(
  public.send_network_message(
    (select id from conversation_under_test),
    'Danke fuer dein Interesse - magst du kurz erzaehlen, was dir vorschwebt?'),
  null,
  'im Gespraech laesst sich schreiben'
);

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is(
  (select count(*)::int from public.list_network_messages((select id from conversation_under_test))),
  1,
  'die interessierte Person liest die Nachricht'
);

select is(
  public.get_unread_network_message_count(),
  1::bigint,
  'und sie zaehlt als ungelesen'
);

-- ---------------------------------------------------------------------------
-- Wer nicht dabei ist, kommt nicht hinein
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';
select is(
  (select count(*)::int from public.list_network_conversations()),
  0,
  'ein Fremder sieht das Gespraech nicht'
);

select throws_ok(
  $$select public.list_network_messages((select id from conversation_under_test))$$,
  '42501',
  null,
  'und kommt auch nicht an die Nachrichten'
);

-- ---------------------------------------------------------------------------
-- Zurueckgezogenes Interesse nimmt das Gespraech mit
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';
delete from public.network_problem_interests where id = 'f6666666-6666-4666-8666-666666666666';

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
select is(
  (select count(*)::int from public.list_network_conversations()),
  0,
  'wer sein Interesse zurueckzieht, nimmt das Gespraech mit - es haengt daran'
);

select * from finish();
rollback;
