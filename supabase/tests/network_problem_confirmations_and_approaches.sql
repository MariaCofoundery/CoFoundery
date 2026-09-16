begin;
select plan(21);

-- ---------------------------------------------------------------------------
-- Aufbau: Autorin, zwei Mitglieder, ein Nichtmitglied
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autorin@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pflegerin@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'entwickler@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('d4444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'draussen@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active'),
  ('c3333333-3333-4333-8333-333333333333', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Autorin', 'Sieht ein Problem',
   'Arbeitet in der Pflege und beobachtet dort seit Jahren dieselbe Luecke.', array['founder'], 'active', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Pflegerin', 'Kennt das von innen',
   'Leitet eine Station und telefoniert selbst regelmaessig Vertretungslisten ab.', array['expert'], 'active', now()),
  ('c3333333-3333-4333-8333-333333333333', 'Entwickler', 'Baut Software',
   'Entwickelt seit zehn Jahren Anwendungen fuer kleine Organisationen und Teams.', array['expert'], 'active', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

insert into public.network_problems (id, author_user_id, title, description, author_intent, topics, status, published_at)
values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
        'Pflegedienste in laendlichen Regionen finden keine Vertretung',
        'Wenn jemand kurzfristig ausfaellt, telefonieren Leitungen stundenlang Listen ab. Es gibt keine gemeinsame Uebersicht, wer wann einspringen koennte.',
        'observation', array['Pflege'], 'active', now());

-- Ein zweites, das noch nicht veroeffentlicht ist.
insert into public.network_problems (id, author_user_id, title, description, status)
values ('e6666666-6666-4666-8666-666666666666', 'a1111111-1111-4111-8111-111111111111',
        'Noch nicht veroeffentlicht',
        'Diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen sicher zu ueberschreiten.',
        'draft');

select is(
  (select confirmation_count from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  0,
  'ein neues Problem hat null Bestaetigungen'
);

-- Das eigene Problem zu bestaetigen waere eine Zahl, die nichts bedeutet.
select throws_ok(
  $$insert into public.network_problem_confirmations (problem_id, user_id, perspective)
    values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111', 'affected')$$,
  '42501',
  null,
  'die einstellende Person kann ihr eigenes Problem nicht bestaetigen'
);

-- ---------------------------------------------------------------------------
-- Kenne ich auch
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

insert into public.network_problem_confirmations (problem_id, user_id, perspective)
values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222', 'professional');

select is(
  (select confirmation_count from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  1,
  'die Zahl wird vom Trigger gepflegt'
);

select throws_ok(
  $$insert into public.network_problem_confirmations (problem_id, user_id, perspective)
    values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222', 'affected')$$,
  '23505',
  null,
  'hoechstens eine Bestaetigung je Person und Problem'
);

select throws_ok(
  $$insert into public.network_problem_confirmations (problem_id, user_id, perspective)
    values ('e6666666-6666-4666-8666-666666666666', 'b2222222-2222-4222-8222-222222222222', 'observed')$$,
  '42501',
  null,
  'ein Entwurf laesst sich nicht bestaetigen'
);

set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

select throws_ok(
  $$insert into public.network_problem_confirmations (problem_id, user_id, perspective)
    values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333', 'gehoert_davon')$$,
  '23514',
  null,
  'nur die drei vorgesehenen Perspektiven - Freitext ist hier keine Option'
);

insert into public.network_problem_confirmations (problem_id, user_id, perspective)
values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333', 'observed');

-- ---------------------------------------------------------------------------
-- Die Namen sieht niemand - auch die einstellende Person nicht
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.network_problem_confirmations
   where problem_id = 'e5555555-5555-4555-8555-555555555555'),
  1::bigint,
  'wer bestaetigt hat, sieht nur die eigene Zeile'
);

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.network_problem_confirmations
   where problem_id = 'e5555555-5555-4555-8555-555555555555'),
  0::bigint,
  'auch die einstellende Person sieht keine einzige Bestaetigung namentlich'
);

-- Das ist der Unterschied zum Interesse: Dort sieht die einstellende Person
-- sehr wohl, wer sich gemeldet hat.
select is(
  (select confirmation_count from public.network_problems
   where id = 'e5555555-5555-4555-8555-555555555555'),
  2,
  'die Zahl steht ihr trotzdem zur Verfuegung'
);

select is(
  (select confirmations from public.get_network_problem_confirmations('e5555555-5555-4555-8555-555555555555')
   where perspective = 'professional'),
  1::bigint,
  'die Aufteilung nach Perspektive kommt aus der Funktion'
);

select is(
  (select count(*) from public.get_network_problem_confirmations('e5555555-5555-4555-8555-555555555555')),
  2::bigint,
  'zwei Perspektiven, weil zwei verschiedene bestaetigt haben'
);

-- ---------------------------------------------------------------------------
-- Die Funktion ist kein Weg an der Sichtbarkeit vorbei
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"d4444444-4444-4444-8444-444444444444","role":"authenticated"}';

select throws_ok(
  $$select * from public.get_network_problem_confirmations('e5555555-5555-4555-8555-555555555555')$$,
  '42501',
  null,
  'wer nicht Mitglied ist, bekommt auch keine Zahlen'
);

set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

select throws_ok(
  $$select * from public.get_network_problem_confirmations('e6666666-6666-4666-8666-666666666666')$$,
  'P0002',
  null,
  'zu einem fremden Entwurf gibt es keine Zahlen'
);

-- ---------------------------------------------------------------------------
-- Zuruecknehmen
-- ---------------------------------------------------------------------------
delete from public.network_problem_confirmations
where problem_id = 'e5555555-5555-4555-8555-555555555555'
  and user_id = 'c3333333-3333-4333-8333-333333333333';

select is(
  (select confirmation_count from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  1,
  'nach dem Zuruecknehmen stimmt die Zahl wieder'
);

-- ---------------------------------------------------------------------------
-- Der Ansatz
-- ---------------------------------------------------------------------------
insert into public.network_problem_approaches (id, problem_id, author_user_id, summary, audience, needs)
values ('f7777777-7777-4777-8777-777777777777', 'e5555555-5555-4555-8555-555555555555',
        'c3333333-3333-4333-8333-333333333333',
        'Eine gemeinsame Verfuegbarkeitsliste fuer mehrere Dienste in einer Region, in die Pflegekraefte selbst eintragen, wann sie einspringen wuerden.',
        'Ambulante Pflegedienste mit zehn bis fuenfzig Mitarbeitenden',
        'Jemanden, der die Ablaeufe in der Pflege von innen kennt.');

select throws_ok(
  $$insert into public.network_problem_approaches (problem_id, author_user_id, summary, audience, needs)
    values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333',
            'Zu kurz gedacht.', 'Irgendwer', 'Irgendwas')$$,
  '23514',
  null,
  'ein Ansatz unter 50 Zeichen wird abgelehnt - das waere eine Ueberschrift'
);

select throws_ok(
  $$insert into public.network_problem_approaches (problem_id, author_user_id, summary, audience, needs)
    values ('e5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-333333333333',
            'Eine zweite, hinreichend lange Beschreibung desselben Ansatzes, die die Mindestlaenge sicher ueberschreitet.',
            'Dieselbe Zielgruppe', 'Dieselben Leute')$$,
  '23505',
  null,
  'ein Ansatz je Person und Problem - wer umdenkt, aendert seinen'
);

-- ---------------------------------------------------------------------------
-- Ein Ansatz ist oeffentlich gemeint - das ist sein Zweck
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*) from public.network_problem_approaches
   where problem_id = 'e5555555-5555-4555-8555-555555555555'),
  1::bigint,
  'andere Mitglieder sehen den Ansatz - sonst haette er keinen Sinn'
);

-- Und jeder kann einen eigenen daneben stellen. Genau darum geht es: Zwei
-- Menschen sollen VOR dem gemeinsamen Gruenden sehen, ob sie dasselbe bauen.
insert into public.network_problem_approaches (problem_id, author_user_id, summary, audience, needs)
values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222',
        'Kein eigenes Werkzeug, sondern eine Vermittlungsstelle mit Menschen am Telefon, die die Dienste einer Region kennt und Ausfaelle sofort weitergibt.',
        'Dieselben Dienste, aber ueber eine Person statt ueber Software',
        'Jemanden, der Vermittlung organisieren kann.');

select is(
  (select count(*) from public.network_problem_approaches
   where problem_id = 'e5555555-5555-4555-8555-555555555555'),
  2::bigint,
  'zwei Ansaetze stehen nebeneinander, ohne Rangfolge'
);

-- Fremde Ansaetze aendert niemand.
update public.network_problem_approaches
set summary = 'Ein fremder Ansatz, der hier heimlich umgeschrieben werden soll und lang genug dafuer ist.'
where id = 'f7777777-7777-4777-8777-777777777777';

select is(
  (select author_user_id from public.network_problem_approaches where id = 'f7777777-7777-4777-8777-777777777777'),
  'c3333333-3333-4333-8333-333333333333'::uuid,
  'der fremde Ansatz gehoert weiter seiner Verfasserin'
);

select alike(
  (select summary from public.network_problem_approaches where id = 'f7777777-7777-4777-8777-777777777777'),
  '%Verfuegbarkeitsliste%',
  'und ist unveraendert - die Aenderung hat keine Zeile getroffen'
);

-- ---------------------------------------------------------------------------
-- Zurueckgezogen heisst unsichtbar
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

update public.network_problem_approaches
set status = 'withdrawn'
where id = 'f7777777-7777-4777-8777-777777777777';

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*) from public.network_problem_approaches
   where id = 'f7777777-7777-4777-8777-777777777777'),
  0::bigint,
  'ein zurueckgezogener Ansatz verschwindet fuer alle anderen'
);

select * from finish();
rollback;
