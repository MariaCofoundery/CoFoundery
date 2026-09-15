begin;
select plan(11);

-- ---------------------------------------------------------------------------
-- Aufbau
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'suche@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status)
values ('11111111-1111-4111-8111-111111111111', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, published_at)
values ('11111111-1111-4111-8111-111111111111', 'Testperson', 'Vertriebsaufbau',
        'Baut Vertriebsstrukturen auf und begleitet Teams dabei, aus ersten Abschluessen einen Prozess zu machen.',
        array['expert'], 'active', now());

insert into public.network_listings
  (id, owner_user_id, direction, category, title, summary, topics, industries, geographic_scope, status, published_at, expires_at)
values
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'offering', 'expertise',
   'Unterstuetzung beim Aufbau von Vertriebsstrukturen',
   'Ich helfe jungen Teams, ihre ersten Enterprise-Kunden zu gewinnen.',
   array['B2B Sales', 'Pipeline'], array['HealthTech'], 'germany', 'active', now(), now() + interval '30 days');

-- ---------------------------------------------------------------------------
-- Was die Suche leisten muss
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.network_listings where search_text ilike '%sales%'),
  1,
  'ein Begriff aus den Themen wird gefunden'
);

-- Der eigentliche Anlass: Der bisherige Themenfilter prueft auf exakte
-- Gleichheit. "sales" findet "B2B Sales" dort nicht.
select is(
  (select count(*)::int from public.network_listings where topics @> array['sales']),
  0,
  'der exakte Themenfilter findet Teilbegriffe nicht - deshalb gibt es die Suche'
);

select is(
  (select count(*)::int from public.network_listings where search_text ilike '%healthtech%'),
  1,
  'ein Begriff aus den Branchen wird gefunden'
);

-- Deutsche Komposita: der Grund, warum ilike hier einer Volltextsuche ohne
-- Kompositazerlegung vorgezogen wurde.
select is(
  (select count(*)::int from public.network_listings where search_text ilike '%vertrieb%'),
  1,
  'ein Wortteil findet das Kompositum (Vertrieb -> Vertriebsstrukturen)'
);

select is(
  (select count(*)::int from public.network_listings where search_text ilike '%enterprise%'),
  1,
  'ein Begriff aus der Beschreibung wird gefunden'
);

select is(
  (select count(*)::int from public.network_listings where search_text ilike '%gibtesnicht%'),
  0,
  'was nicht vorkommt, wird nicht gefunden'
);

-- ---------------------------------------------------------------------------
-- Der Trigger haelt die Spalte aktuell
-- ---------------------------------------------------------------------------
update public.network_listings
set title = 'Voellig anderer Titel ueber Buchhaltung'
where id = '22222222-2222-4222-8222-222222222222';

select is(
  (select count(*)::int from public.network_listings where search_text ilike '%buchhaltung%'),
  1,
  'ein geaenderter Titel landet in der Suchspalte'
);

select is(
  (select count(*)::int from public.network_listings where search_text ilike '%unterstuetzung%'),
  0,
  'der alte Titel ist aus der Suchspalte verschwunden'
);

update public.network_listings
set topics = array['Controlling']
where id = '22222222-2222-4222-8222-222222222222';

select is(
  (select count(*)::int from public.network_listings where search_text ilike '%controlling%'),
  1,
  'auch geaenderte Themen landen in der Suchspalte'
);

-- ---------------------------------------------------------------------------
-- Aufbau der Spalte
-- ---------------------------------------------------------------------------
select ok(
  exists (
    select 1 from pg_indexes
    where tablename = 'network_listings' and indexname = 'network_listings_search_text_trgm'
  ),
  'ohne Trigramm-Index wird ilike mit wachsender Tabelle langsam'
);

-- Die Spalte wird nie von Hand gesetzt; sie traegt deshalb einen Default und
-- ist nicht null, damit eine Zeile ohne Trigger-Durchlauf nicht null enthaelt.
select col_not_null('public', 'network_listings', 'search_text',
  'search_text ist not null - eine null-Spalte wuerde bei ilike still nichts finden');

select * from finish();
rollback;
