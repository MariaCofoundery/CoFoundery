begin;
select plan(12);

-- ---------------------------------------------------------------------------
-- Aufbau: eine Autorin mit oeffentlichem Profil, ein Ansatzschreiber
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, visibility, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Autorin', 'Sieht ein Problem',
   'Arbeitet in der Pflege und beobachtet dort seit Jahren dieselbe Luecke.', array['founder'], 'active', 'members_only', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Ansatzschreiber', 'Baut Software',
   'Entwickelt seit zehn Jahren Anwendungen fuer kleine Organisationen und Teams.', array['expert'], 'active', 'public', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

insert into public.network_problems (id, author_user_id, public_slug, title, description, topics, status, published_at)
values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
        'problem-aaaaaaaaaaaaaaaaaaaaaaaa',
        'Pflegedienste finden keine Vertretung',
        'Wenn jemand kurzfristig ausfaellt, telefonieren Leitungen stundenlang Listen ab. Es gibt keine gemeinsame Uebersicht.',
        array['Pflege'], 'active', now());

insert into public.network_problems (id, author_user_id, title, description, status, published_at)
values ('e6666666-6666-4666-8666-666666666666', 'a1111111-1111-4111-8111-111111111111',
        'Ein zweites Problem ohne gesetzte Adresse',
        'Auch diese Beschreibung ist lang genug, um die Mindestlaenge von fuenfzig Zeichen sicher zu ueberschreiten.',
        'active', now());

-- ---------------------------------------------------------------------------
-- Die Voreinstellung
-- ---------------------------------------------------------------------------
select is(
  (select visibility from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  'members_only',
  'ein neues Problem ist nicht oeffentlich - das ist die Voreinstellung, nicht eine Einstellung'
);

select matches(
  (select public_slug from public.network_problems where id = 'e6666666-6666-4666-8666-666666666666'),
  '^problem-[a-f0-9]{24}$',
  'die oeffentliche Adresse wird gewuerfelt, nicht aus dem Titel gebildet'
);

-- ---------------------------------------------------------------------------
-- Ohne Freigabe kommt von aussen nichts
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '';

select is(
  (select count(*) from public.get_public_network_problem(
     'problem-aaaaaaaaaaaaaaaaaaaaaaaa')),
  0::bigint,
  'ohne Freigabe gibt die oeffentliche Funktion nichts heraus'
);

-- Und die Tabelle selbst gibt anonymen Aufrufern nichts: Die Policies gelten
-- nur "to authenticated", es kommt also keine Fehlermeldung, sondern schlicht
-- keine Zeile.
select is(
  (select count(*) from public.network_problems),
  0::bigint,
  'anonyme Aufrufer sehen in der Tabelle selbst keine einzige Zeile'
);

-- ---------------------------------------------------------------------------
-- Mit Freigabe
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

update public.network_problems
set visibility = 'public'
where id = 'e5555555-5555-4555-8555-555555555555';

-- Jemand anderes schreibt einen Ansatz dazu. Diese Person hat in keine
-- Veroeffentlichung eingewilligt.
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

insert into public.network_problem_approaches (problem_id, author_user_id, summary, audience, needs)
values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222',
        'Eine gemeinsame Verfuegbarkeitsliste fuer mehrere Dienste in einer Region, in die Pflegekraefte selbst eintragen.',
        'Ambulante Dienste', 'Jemanden aus der Pflege.');

insert into public.network_problem_confirmations (problem_id, user_id, perspective)
values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222', 'professional');

set local role anon;
set local request.jwt.claims = '';

select is(
  (select title from public.get_public_network_problem(
     'problem-aaaaaaaaaaaaaaaaaaaaaaaa')),
  'Pflegedienste finden keine Vertretung',
  'mit Freigabe steht das Problem draussen'
);

select is(
  (select author_display_name from public.get_public_network_problem(
     'problem-aaaaaaaaaaaaaaaaaaaaaaaa')),
  'Autorin',
  'der Name der einstellenden Person steht dabei - wie bei einer Anzeige'
);

-- Ihr Profil ist members_only. Die Freigabe des Problems ist keine Freigabe
-- des Profils.
select is(
  (select author_profile_slug from public.get_public_network_problem(
     'problem-aaaaaaaaaaaaaaaaaaaaaaaa')),
  null,
  'verlinkt wird ihr Profil nur, wenn sie es selbst oeffentlich gestellt hat'
);

-- ---------------------------------------------------------------------------
-- Was die Einwilligung NICHT abdeckt
-- ---------------------------------------------------------------------------
-- Der wichtigste Punkt an dieser Migration: Die einstellende Person kann nur
-- ihren eigenen Text freigeben, nicht den von anderen.
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'network_problems'
      and column_name = 'approaches'
  ),
  'es gibt keine abgekuerzte Ablage fremder Texte am Problem'
);

select is(
  (select count(*) from information_schema.routines
   where routine_schema = 'public'
     and routine_name = 'get_public_network_problem'
     and routine_definition ilike '%network_problem_approaches%'),
  0::bigint,
  'die oeffentliche Funktion ruehrt die Ansaetze nicht an - dafuer liegt keine Einwilligung vor'
);

select is(
  (select count(*) from information_schema.routines
   where routine_schema = 'public'
     and routine_name = 'get_public_network_problem'
     and (routine_definition ilike '%interest_count%'
       or routine_definition ilike '%confirmation_count%')),
  0::bigint,
  'und auch keine Zahlen - draussen haetten sie nur eine Wirkung, naemlich eine Rangfolge'
);

-- ---------------------------------------------------------------------------
-- Zurueckgezogen heisst auch draussen weg
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

update public.network_problems
set status = 'resolved', resolved_at = now()
where id = 'e5555555-5555-4555-8555-555555555555';

set local role anon;
set local request.jwt.claims = '';

select is(
  (select count(*) from public.get_public_network_problem(
     'problem-aaaaaaaaaaaaaaaaaaaaaaaa')),
  0::bigint,
  'ein geloestes Problem verschwindet auch von aussen'
);

-- ---------------------------------------------------------------------------
-- Die Sitemap zeigt auf die Adressen, die es wirklich gibt
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.list_public_network_sitemap() where path like '/network/%'),
  0::bigint,
  'kein Eintrag zeigt mehr auf den alten Bereichsnamen - dort steht nur eine Weiterleitung'
);

select * from finish();
rollback;
