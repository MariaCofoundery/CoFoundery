begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, visibility, public_slug, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Mia', 'Fotografin und mehr',
   'Arbeitet seit Jahren mit kleinen Betrieben und kennt deren Alltag von innen.', array['founder'], 'active', 'public', 'profile-aaaaaaaaaaaaaaaaaaaaaaaa', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Andere', 'Schaut zu',
   'Eine hinreichend vollstaendige Biografie fuer diesen Test der Sichtbarkeit.', array['expert'], 'active', 'members_only', 'profile-bbbbbbbbbbbbbbbbbbbbbbbb', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

insert into public.network_ventures (id, owner_user_id, name, role_label, what_it_does, audience, motivation, website)
values ('c3333333-3333-4333-8333-333333333333', 'a1111111-1111-4111-8111-111111111111',
        'Mia fotografiert', 'Gruenderin',
        'Wir fotografieren kleine Betriebe so, dass man ihre Arbeit sieht statt eines gestellten Teambilds im Konferenzraum.',
        'Selbststaendige Hebammen, die keine Zeit fuer Marketing haben',
        'Ich habe selbst erlebt, wie viel gute Arbeit unsichtbar bleibt, weil niemand Zeit hat, sie zu zeigen.',
        'https://example.org');

select is(
  (select audience from public.network_ventures where id = 'c3333333-3333-4333-8333-333333333333'),
  'Selbststaendige Hebammen, die keine Zeit fuer Marketing haben',
  'die Zielgruppe ist ein eigenes Feld, nicht Fliesstext'
);

select alike(
  (select search_text from public.network_ventures where id = 'c3333333-3333-4333-8333-333333333333'),
  '%Hebammen%',
  'die Suchspalte traegt sie von Anfang an - die Personensuche kommt noch'
);

-- ---------------------------------------------------------------------------
-- Was abgelehnt wird
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.network_ventures (owner_user_id, name, what_it_does, audience)
    values ('a1111111-1111-4111-8111-111111111111', 'Zu kurz',
            'Zu wenig Text.', 'Auch zu kurz')$$,
  '23514',
  null,
  'eine Beschreibung unter 50 Zeichen ist keine Beschreibung'
);

select throws_ok(
  $$insert into public.network_ventures (owner_user_id, name, what_it_does, audience, website)
    values ('a1111111-1111-4111-8111-111111111111', 'Unsicher',
            'Eine hinreichend lange Beschreibung, die die Mindestlaenge von fuenfzig Zeichen sicher ueberschreitet.',
            'Eine hinreichend lange Zielgruppe', 'http://example.org')$$,
  '23514',
  null,
  'nur https - ein http-Link auf einer https-Seite ist eine Browserwarnung'
);

-- ---------------------------------------------------------------------------
-- Hoechstens fuenf
-- ---------------------------------------------------------------------------
insert into public.network_ventures (owner_user_id, name, what_it_does, audience)
select 'a1111111-1111-4111-8111-111111111111', 'Nummer ' || n,
       'Eine hinreichend lange Beschreibung, die die Mindestlaenge von fuenfzig Zeichen sicher ueberschreitet.',
       'Eine hinreichend lange Zielgruppenangabe'
from generate_series(2, 5) as n;

select is(
  (select count(*) from public.network_ventures where owner_user_id = 'a1111111-1111-4111-8111-111111111111'),
  5::bigint,
  'fuenf sind erlaubt'
);

select throws_ok(
  $$insert into public.network_ventures (owner_user_id, name, what_it_does, audience)
    values ('a1111111-1111-4111-8111-111111111111', 'Nummer 6',
            'Eine hinreichend lange Beschreibung, die die Mindestlaenge von fuenfzig Zeichen sicher ueberschreitet.',
            'Eine hinreichend lange Zielgruppenangabe')$$,
  '23514',
  'network_venture_limit_reached',
  'die sechste nicht - und die Grenze steht in der Datenbank, nicht nur in der Oberflaeche'
);

-- ---------------------------------------------------------------------------
-- Wer was sieht
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*) from public.network_ventures
   where owner_user_id = 'a1111111-1111-4111-8111-111111111111'),
  5::bigint,
  'Mitglieder sehen die Eintraege eines aktiven Profils'
);

set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
update public.network_ventures set status = 'hidden'
where id = 'c3333333-3333-4333-8333-333333333333';

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select count(*) from public.network_ventures
   where id = 'c3333333-3333-4333-8333-333333333333'),
  0::bigint,
  'ein verborgener Eintrag verschwindet fuer andere'
);

-- Ein von der Zeilensicherheit geblocktes UPDATE wirft nicht, es trifft
-- schlicht keine Zeile. Genau das gehoert geprueft.
update public.network_ventures set name = 'Heimlich umbenannt'
where owner_user_id = 'a1111111-1111-4111-8111-111111111111';

set local role postgres;
select is(
  (select count(*) from public.network_ventures where name = 'Heimlich umbenannt'),
  0::bigint,
  'und fremde Eintraege aendert niemand'
);
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Die Sichtbarkeit folgt dem Profil
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '';

select is(
  (select count(*) from public.list_public_network_profile_ventures('profile-aaaaaaaaaaaaaaaaaaaaaaaa')),
  4::bigint,
  'die oeffentliche Seite zeigt die sichtbaren vier, nicht den verborgenen'
);

select is(
  (select count(*) from public.list_public_network_profile_ventures('profile-bbbbbbbbbbbbbbbbbbbbbbbb')),
  0::bigint,
  'und bei einem nicht oeffentlichen Profil gar nichts - es gibt keinen eigenen Schalter'
);

select * from finish();
rollback;
