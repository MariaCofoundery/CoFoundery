begin;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mitglied@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('d4444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'draussen@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values ('a1111111-1111-4111-8111-111111111111', 'active');
insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, published_at)
values ('a1111111-1111-4111-8111-111111111111', 'Mitglied', 'Gruendet gerade', 'Liest das Problembrett und probiert die Bestaetigung aus.', array['founder'], 'active', now());

-- Der Dienst (hier die Datenbankrolle) spielt einen Eintrag aus einer Quelle ein.
insert into public.network_problems
  (id, author_user_id, title, description, author_intent, geographic_scope, status, published_at,
   origin, seed_key, source_name, source_url, source_year, source_note)
values
  ('f1111111-1111-4111-8111-111111111111', null,
   'Menschen gehen zum Amt, weil es den Antrag nicht online gibt',
   'Wer 2025 persoenlich zur Behoerde ging, tat das laut Befragung zu 66 Prozent, weil es den Antrag nicht online gab oder Anwesenheit vorgeschrieben war.',
   'observation', 'germany', 'active', now(),
   'public_source', 'test-amt-online', 'Bitkom Research im Auftrag von Bitkom',
   'https://www.bitkom.org/Presse/Presseinformation/Bitkom-Analyse-60-Prozent-der-Verwaltungsleistungen-sind-online-verfuegbar',
   '2025', 'Verbandsumfrage, 1.005 Personen ab 18');

-- Die Herkunft haengt an der Quelle: ohne sie, oder mit Verfasser, geht es nicht.
select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, published_at, origin, seed_key, source_name, source_url, source_year)
    values ('a1111111-1111-4111-8111-111111111111', 'Eintrag mit Verfasser und Quelle',
            'Diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen zu ueberschreiten.',
            'active', now(), 'public_source', 'test-mit-verfasser', 'Eine Quelle', 'https://example.org/a', '2025')$$,
  '23514', null, 'eine Quelle mit Verfasser ist nicht erlaubt'
);
select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, published_at, origin, seed_key, source_name, source_year)
    values (null, 'Eintrag ohne Link zur Quelle',
            'Diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen zu ueberschreiten.',
            'active', now(), 'public_source', 'test-ohne-link', 'Eine Quelle', '2025')$$,
  '23514', null, 'ohne Link zur Quelle geht es nicht'
);
select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, published_at, origin, seed_key, source_name, source_url, source_year)
    values (null, 'Eintrag mit unsicherem Link',
            'Diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen zu ueberschreiten.',
            'active', now(), 'public_source', 'test-http', 'Eine Quelle', 'http://example.org/a', '2025')$$,
  '23514', null, 'der Link muss https sein'
);
select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, source_name)
    values ('a1111111-1111-4111-8111-111111111111', 'Mitgliedseintrag mit Quellenfeld',
            'Diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen zu ueberschreiten.',
            'draft', 'Eine Quelle')$$,
  '23514', null, 'ein Eintrag von einer Person hat keine Quellenfelder'
);
select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, published_at, origin, seed_key, source_name, source_url, source_year)
    values (null, 'Zweiter Eintrag mit demselben Schluessel',
            'Diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen zu ueberschreiten.',
            'active', now(), 'public_source', 'test-amt-online', 'Eine Quelle', 'https://example.org/a', '2025')$$,
  '23505', null, 'derselbe Schluessel steht nur einmal da'
);

-- Als Mitglied.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.connect_discovery_problems where origin = 'public_source' and source_year = '2025'),
  1,
  'ein Mitglied sieht den Eintrag mit Quelle auf dem Brett'
);

select throws_ok(
  $$insert into public.network_problems (author_user_id, title, description, status, published_at, origin, seed_key, source_name, source_url, source_year)
    values (null, 'Ein Mitglied legt einen Quelleneintrag an',
            'Diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen zu ueberschreiten.',
            'active', now(), 'public_source', 'test-mitglied', 'Eine Quelle', 'https://example.org/a', '2025')$$,
  '42501', null, 'ein Mitglied kann keinen Quelleneintrag anlegen'
);

update public.network_problems set title = 'Ein Mitglied aendert den Eintrag aus der Quelle'
where id = 'f1111111-1111-4111-8111-111111111111';
select is(
  (select title from public.network_problems where id = 'f1111111-1111-4111-8111-111111111111'),
  'Menschen gehen zum Amt, weil es den Antrag nicht online gibt',
  'ein Mitglied kann einen Quelleneintrag nicht aendern'
);

delete from public.network_problems where id = 'f1111111-1111-4111-8111-111111111111';
select is(
  (select count(*)::int from public.network_problems where id = 'f1111111-1111-4111-8111-111111111111'),
  1,
  'ein Mitglied kann einen Quelleneintrag nicht loeschen'
);

-- "Ich wuerde daran arbeiten" braucht jemanden, der antworten kann.
select throws_ok(
  $$insert into public.network_problem_interests (problem_id, user_id, note)
    values ('f1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111',
            'Ich arbeite seit Jahren in dem Bereich und kenne die Ablaeufe.')$$,
  '42501', null, 'Interesse an einem Quelleneintrag wird abgewiesen'
);

-- "Kenne ich auch" bleibt moeglich.
select lives_ok(
  $$insert into public.network_problem_confirmations (problem_id, user_id, perspective)
    values ('f1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'observed')$$,
  'ein Mitglied kann "Kenne ich auch" sagen'
);

reset role;
select is(
  (select confirmation_count from public.network_problems where id = 'f1111111-1111-4111-8111-111111111111'),
  1,
  'die Bestaetigung wird gezaehlt'
);

select * from finish();
rollback;
