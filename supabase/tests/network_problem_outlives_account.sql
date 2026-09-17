begin;
select plan(17);

-- ---------------------------------------------------------------------------
-- A schildert zwei Probleme, B schreibt einen Ansatz zu einem davon,
-- C schreibt einen Ansatz - und A geht.
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

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, visibility, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Autorin', 'Geht gleich',
   'Arbeitet in der Pflege und beobachtet dort seit Jahren dieselbe Luecke.', array['founder'], 'active', 'public', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Bleibt', 'Baut Software',
   'Entwickelt seit zehn Jahren Anwendungen fuer kleine Organisationen und Teams.', array['expert'], 'active', 'members_only', now()),
  ('c3333333-3333-4333-8333-333333333333', 'Dritte', 'Kennt den Markt',
   'Hat jahrelang Vertrieb fuer Software im Gesundheitswesen gemacht und kennt die Kundschaft.', array['expert'], 'active', 'members_only', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

insert into public.network_problems (id, author_user_id, public_slug, title, description, status, published_at, visibility)
values
  ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
   'problem-aaaaaaaaaaaaaaaaaaaaaaaa', 'Das Problem, das bleiben soll',
   'Wenn jemand kurzfristig ausfaellt, telefonieren Leitungen stundenlang Listen ab. Es gibt keine gemeinsame Uebersicht.',
   'active', now(), 'public'),
  ('e6666666-6666-4666-8666-666666666666', 'a1111111-1111-4111-8111-111111111111',
   'problem-bbbbbbbbbbbbbbbbbbbbbbbb', 'Das Problem, das gehen soll',
   'Auch diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen sicher zu ueberschreiten.',
   'active', now(), 'members_only');

select is(
  (select outlives_account from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  false,
  'ein neues Problem ueberdauert die Kontoloeschung nicht - das ist die Voreinstellung'
);

-- B schreibt einen Ansatz zum Problem, das bleiben soll.
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';
insert into public.network_problem_approaches (id, problem_id, author_user_id, summary, audience, needs)
values ('f7777777-7777-4777-8777-777777777777', 'e5555555-5555-4555-8555-555555555555',
        'b2222222-2222-4222-8222-222222222222',
        'Eine gemeinsame Verfuegbarkeitsliste fuer mehrere Dienste in einer Region, in die Pflegekraefte selbst eintragen.',
        'Ambulante Dienste', 'Jemanden aus der Pflege.');

-- A schreibt einen Ansatz auf einem FREMDEN Problem.
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';
insert into public.network_problems (id, author_user_id, title, description, status, published_at)
values ('e7777777-7777-4777-8777-777777777777', 'c3333333-3333-4333-8333-333333333333',
        'Ein Problem einer anderen Person',
        'Auch diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen sicher zu ueberschreiten.',
        'active', now());

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
insert into public.network_problem_approaches (id, problem_id, author_user_id, summary, audience, needs)
values ('f8888888-8888-4888-8888-888888888888', 'e7777777-7777-4777-8777-777777777777',
        'a1111111-1111-4111-8111-111111111111',
        'Mein Ansatz auf der Seite einer anderen Person, lang genug fuer die Mindestlaenge dieser Spalte.',
        'Eine Zielgruppe mit genug Zeichen', 'Etwas, das lang genug ist.');

-- A entscheidet sich: Das eine Problem darf bleiben, das andere nicht.
update public.network_problems set outlives_account = true
where id = 'e5555555-5555-4555-8555-555555555555';

-- ---------------------------------------------------------------------------
-- Die Vorbereitung ist der Dienstrolle vorbehalten
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select * from public.prepare_network_content_for_account_deletion(
      'a1111111-1111-4111-8111-111111111111', true, true)$$,
  '42501',
  null,
  'niemand kann fremde Inhalte ueber diese Funktion aufraeumen'
);

-- ---------------------------------------------------------------------------
-- Loeschen: Probleme behalten, Ansaetze auf fremden Seiten nicht
-- ---------------------------------------------------------------------------
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select is(
  (select deleted_problems from public.prepare_network_content_for_account_deletion(
     'a1111111-1111-4111-8111-111111111111', true, false)),
  0,
  'mit Zustimmung bleibt kein Problem auf der Strecke'
);

select is(
  (select count(*) from public.network_problem_approaches
   where id = 'f8888888-8888-4888-8888-888888888888'),
  0::bigint,
  'der Ansatz auf der fremden Seite ist weg - dagegen hatte sie sich entschieden'
);

select is(
  (select count(*) from public.network_problems
   where author_user_id = 'a1111111-1111-4111-8111-111111111111'),
  2::bigint,
  'beide eigenen Probleme stehen noch - erst das Loeschen trennt die Verknuepfung'
);

-- Jetzt geht die Person.
set local role postgres;
delete from auth.users where id = 'a1111111-1111-4111-8111-111111111111';

select is(
  (select author_user_id from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  null,
  'die Verknuepfung ist getrennt, nicht durch einen Platzhalter ersetzt'
);

select is(
  (select title from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  'Das Problem, das bleiben soll',
  'der Text steht weiter da'
);

select is(
  (select count(*) from public.network_problem_approaches
   where id = 'f7777777-7777-4777-8777-777777777777'),
  1::bigint,
  'und der Ansatz, den jemand anderes dazu geschrieben hat, ebenfalls'
);

-- ---------------------------------------------------------------------------
-- Was an einem verwaisten Problem noch geht - und was nicht
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

update public.network_problems set title = 'Heimlich umgeschrieben'
where id = 'e5555555-5555-4555-8555-555555555555';

select is(
  (select count(*) from public.network_problems where title = 'Heimlich umgeschrieben'),
  0::bigint,
  'aendern trifft keine Zeile - es gibt niemanden mehr, dem es gehoert'
);

select is(
  (select title from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  'Das Problem, das bleiben soll',
  'und der Titel ist unveraendert'
);

select throws_ok(
  $$insert into public.network_problem_interests (problem_id, user_id, note)
    values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333',
            'Ich wuerde daran arbeiten, aber es liest niemand mehr.')$$,
  '42501',
  null,
  'eine Meldung am Problem selbst ginge ins Leere und wird abgelehnt'
);

select lives_ok(
  $$insert into public.network_problem_confirmations (problem_id, user_id, perspective)
    values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333', 'professional')$$,
  'bestaetigen geht weiterhin - das erreicht niemanden und bleibt wahr'
);

select lives_ok(
  $$insert into public.network_problem_interests (problem_id, approach_id, user_id, note)
    values ('e5555555-5555-4555-8555-555555555555', 'f7777777-7777-4777-8777-777777777777',
            'c3333333-3333-4333-8333-333333333333',
            'Dein Ansatz interessiert mich, und dich gibt es ja noch.')$$,
  'und eine Rueckmeldung zu einem Ansatz auch, solange dessen Verfasser da ist'
);

select lives_ok(
  $$insert into public.network_problem_approaches (problem_id, author_user_id, summary, audience, needs)
    values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333',
            'Ein neuer Ansatz zu einem verwaisten Problem, lang genug fuer die Mindestlaenge dieser Spalte.',
            'Dieselben Dienste', 'Jemanden aus der Pflege.')$$,
  'ein Problem ohne Verfasser nimmt weiter Ansaetze auf - darum geht es ja'
);

-- ---------------------------------------------------------------------------
-- Die oeffentliche Seite ueberlebt die Person
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '';

select is(
  (select title from public.get_public_network_problem('problem-aaaaaaaaaaaaaaaaaaaaaaaa')),
  'Das Problem, das bleiben soll',
  'die freigegebene Seite bleibt erreichbar'
);

select is(
  (select author_display_name from public.get_public_network_problem('problem-aaaaaaaaaaaaaaaaaaaaaaaa')),
  null,
  'ohne Namen - es gibt keinen mehr'
);

select is(
  (select count(*) from public.list_public_network_sitemap()
   where path = '/connect/pr/problem-aaaaaaaaaaaaaaaaaaaaaaaa'),
  1::bigint,
  'und sie steht weiter in der Sitemap'
);

select * from finish();
rollback;
