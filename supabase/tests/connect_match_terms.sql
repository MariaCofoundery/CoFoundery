\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Was zaehlt als "meine Begriffe"?
-- ---------------------------------------------------------------------------
--
-- GEAENDERT AM 21.09.2026 (Migration 20261019120000): Vorher zaehlten nur
-- `expertise` und `industries` aus dem Profil - also das, was jemand KANN.
-- Jetzt kommen die eigenen GESUCHE und die eigenen PROBLEME dazu, weil darin
-- die deutlichste Aussage darueber steht, was jemand will.
--
-- Mara macht Podcasts (Profil) und sucht jemanden fuer die Finanzierung
-- (Gesuch) - "Finanzierung" steht nirgends in ihrem Profil, und genau darum
-- geht es hier.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000001','authenticated','authenticated','mara-terms@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000002','authenticated','authenticated','geber-terms@example.com','',now(),'{}','{}',now(),now());

insert into public.network_memberships(user_id, status)
select id, 'active' from auth.users
where id in (
  'c1000000-0000-4000-8000-000000000001',
  'c1000000-0000-4000-8000-000000000002'
)
on conflict (user_id) do update set status = 'active';

insert into public.network_profiles(
  user_id, display_name, headline, bio, network_roles, expertise, industries, status, published_at
) values
('c1000000-0000-4000-8000-000000000001','Mara','Macht Podcasts','Produziert seit Jahren Podcasts zu Wissenschaftsthemen.',
 array['founder'], array['Podcast'], array['Medien'], 'active', now()),
('c1000000-0000-4000-8000-000000000002','Fina','Hilft bei Finanzierung','Begleitet kleine Medienhaeuser bei der Finanzierung.',
 array['founder'], array['Finanzierung'], array['Beratung'], 'active', now())
on conflict (user_id) do update set status = excluded.status;

-- Nicht vorschlagbar: Dieser Test prueft die Sachvorschlaege, ein
-- Personenvorschlag wuerde die Zahlen unten verschieben.
update public.network_profiles set suggestable = false
where user_id = 'c1000000-0000-4000-8000-000000000002';

-- MARAS EIGENES GESUCH. "eu" ist zu kurz und muss herausfallen.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',
  'seeking','expertise','Suche Hilfe bei der Finanzierung',
  'Wir suchen jemanden, der sich mit Foerderungen fuer Medienprojekte auskennt.',
  array['Finanzierung','eu'], array['Foerderung'],
  'active', now(), now() + interval '30 days'
);

-- Ihr eigenes ANGEBOT. Es darf nichts beitragen: Sonst wuerde ihr
-- vorgeschlagen, was sie selbst anbietet - also Leute, die dasselbe tun.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',
  'offering','expertise','Biete Audioschnitt',
  'Ich schneide Podcasts und kuemmere mich um den Ton.',
  array['Audioschnitt'], array['Ton'],
  'active', now(), now() + interval '30 days'
);

-- Ein ausgelaufenes Gesuch: eine zurueckgezogene Bitte.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'c2000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000001',
  'seeking','expertise','Suchte mal einen Raum',
  'Wir suchten ein Studio fuer die Aufnahmen, das hat sich erledigt.',
  array['Studio'], array['Immobilien'],
  'active', now() - interval '90 days', now() - interval '30 days'
);

-- Ein Entwurf ist keine Bitte, sondern ein Gedanke.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, expires_at
) values (
  'c2000000-0000-4000-8000-000000000004','c1000000-0000-4000-8000-000000000001',
  'seeking','expertise','Vielleicht Grafik',
  'Ueberlegen noch, ob wir jemanden fuer die Gestaltung brauchen.',
  array['Grafik'], array['Design'],
  'draft', now() + interval '30 days'
);

-- Und ihr ungeloestes Problem.
insert into public.network_problems(
  id, author_user_id, title, description, topics, industries, status, published_at
) values (
  'c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',
  'Transkripte fehlen fast immer',
  'Automatische Transkripte sind zu schlecht zum Lesen, und Hand ist zu teuer.',
  array['Transkription'], array['Barrierefreiheit'], 'active', now()
);

-- ---------------------------------------------------------------------------
-- Die Begriffe
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.set_eq(
  $$select unnest(public.connect_match_terms('c1000000-0000-4000-8000-000000000001'))$$,
  $$values ('podcast'), ('medien'), ('finanzierung'), ('foerderung'), ('transkription'), ('barrierefreiheit')$$,
  'the own terms are: what I can do, what I am looking for, and what I called unsolved'
);

-- Die vier Ausschluesse einzeln, damit ein Fehlschlag sagt, WELCHER Fall
-- kaputt ist - `set_eq` allein wuerde nur melden, dass die Menge anders ist.
select extensions.ok(
  not ('audioschnitt' = any(public.connect_match_terms('c1000000-0000-4000-8000-000000000001'))),
  'my own offer adds nothing - it would suggest people who do what I already do'
);

select extensions.ok(
  not ('studio' = any(public.connect_match_terms('c1000000-0000-4000-8000-000000000001'))),
  'an expired request is a request withdrawn'
);

select extensions.ok(
  not ('grafik' = any(public.connect_match_terms('c1000000-0000-4000-8000-000000000001'))),
  'a draft is a thought, not a request'
);

select extensions.ok(
  not ('eu' = any(public.connect_match_terms('c1000000-0000-4000-8000-000000000001'))),
  'words under three letters hit everywhere and turn a suggestion into chance'
);

-- Gross geschrieben eingetragen, klein verglichen.
select extensions.ok(
  'finanzierung' = any(public.connect_match_terms('c1000000-0000-4000-8000-000000000001')),
  'the entry says "Finanzierung" and the comparison is lower case'
);

-- ---------------------------------------------------------------------------
-- Nur die eigenen
-- ---------------------------------------------------------------------------
-- Vorher gab die Funktion als `security definer` die Begriffe jeder beliebigen
-- Person heraus. Mit den Gesuchen und Problemen darin waere das eine
-- Zusammenfassung dessen, was jemanden umtreibt.
select extensions.throws_ok(
  $$select public.connect_match_terms('c1000000-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'nobody reads the terms of somebody else'
);

-- ---------------------------------------------------------------------------
-- Und der Punkt der ganzen Aenderung
-- ---------------------------------------------------------------------------
-- Fina bietet genau das an, wonach Mara gefragt hat - und "Finanzierung"
-- steht nirgends in Maras Profil. Vor dieser Migration waere dieser Vorschlag
-- nicht entstanden.
set local role postgres;
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'c2000000-0000-4000-8000-000000000005','c1000000-0000-4000-8000-000000000002',
  'offering','expertise','Begleitung bei Foerderantraegen',
  'Ich helfe bei Antraegen fuer Medienprojekte und kenne die Fristen.',
  array['finanzierung'], array['beratung'],
  'active', now(), now() + interval '30 days'
);

set local role authenticated;
select extensions.is(
  public.generate_connect_suggestions(3),
  1,
  'what I asked for finds the one who offers it'
);

set local role postgres;
select extensions.is(
  (select listing_id from public.connect_suggestions
   where recipient_user_id = 'c1000000-0000-4000-8000-000000000001'),
  'c2000000-0000-4000-8000-000000000005'::uuid,
  'and it is the funding help, found through the request rather than the profile'
);

select * from extensions.finish();
rollback;
