begin;
select plan(11);

delete from public.network_problems where origin = 'public_source';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'autorin@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mitglied@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Autorin', 'Arbeitet daran', 'Arbeitet mit anderen an einem Problem und will es vom Brett nehmen.', array['founder'], 'active', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Mitglied', 'Schaut sich um', 'Liest das Problembrett und probiert aus, was man noch tun kann.', array['expert'], 'active', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

insert into public.network_problems (id, author_user_id, title, description, author_intent, status, published_at)
values ('e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111',
        'Pflegedienste finden keine kurzfristige Vertretung',
        'Wenn jemand kurzfristig ausfaellt, telefonieren Leitungen stundenlang Listen ab. Es gibt keine gemeinsame Uebersicht, wer wann einspringen koennte.',
        'already_building', 'active', now());

select lives_ok(
  $$select public.transition_connect_content('problem', 'e5555555-5555-4555-8555-555555555555', 'in_progress', 'active', true)$$,
  'die Autorin nimmt das Problem vom Brett, weil sie daran arbeitet'
);
select is(
  (select status from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  'in_progress',
  'der Zustand heisst "in Arbeit"'
);
select is(
  (select count(*)::int from public.connect_discovery_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  0,
  'es steht nicht mehr auf dem Brett'
);
select is(
  (select count(*)::int from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  1,
  'die Autorin sieht es weiter'
);

-- Ein anderes Mitglied.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*)::int from public.network_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  0,
  'ein anderes Mitglied sieht es nicht'
);
select throws_ok(
  $$insert into public.network_problem_confirmations (problem_id, user_id, perspective)
    values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222', 'observed')$$,
  '42501', null, 'es kann nichts mehr bestaetigt werden'
);
select throws_ok(
  $$insert into public.network_problem_approaches (problem_id, author_user_id, summary, audience, needs)
    values ('e5555555-5555-4555-8555-555555555555', 'b2222222-2222-4222-8222-222222222222',
            'Eine gemeinsame Verfuegbarkeitsliste fuer mehrere Dienste in einer Region, in die Pflegekraefte selbst eintragen.',
            'Ambulante Dienste', 'Jemand, der die Ablaeufe kennt')$$,
  '42501', null, 'es kommen keine neuen Ansaetze mehr dazu'
);
select throws_ok(
  $$select public.transition_connect_content('problem', 'e5555555-5555-4555-8555-555555555555', 'active', 'in_progress', true)$$,
  '40001', null, 'ein anderes Mitglied kann es nicht aufs Brett zurueckstellen (die Funktion findet nur eigene Eintraege)'
);

-- Zurueck aufs Brett, und der Weg zu "geloest".
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$select public.transition_connect_content('problem', 'e5555555-5555-4555-8555-555555555555', 'active', 'in_progress', true)$$,
  'die Autorin stellt es wieder aufs Brett'
);
select is(
  (select count(*)::int from public.connect_discovery_problems where id = 'e5555555-5555-4555-8555-555555555555'),
  1,
  'es steht wieder auf dem Brett'
);
select lives_ok(
  $$select public.transition_connect_content('problem', 'e5555555-5555-4555-8555-555555555555', 'in_progress', 'active', true);
    select public.transition_connect_content('problem', 'e5555555-5555-4555-8555-555555555555', 'resolved', 'in_progress', true)$$,
  'aus "in Arbeit" kann man es als geloest markieren'
);

select * from finish();
rollback;
