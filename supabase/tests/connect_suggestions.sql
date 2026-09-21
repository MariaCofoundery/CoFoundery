\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Eine Podcast-Macherin, ein Stimmentool, etwas Fremdes, ein Blockierter
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000001','authenticated','authenticated','podcast@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000002','authenticated','authenticated','tool@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000003','authenticated','authenticated','geblockt@example.com','',now(),'{}','{}',now(),now());

insert into public.network_memberships(user_id, status)
select id, 'active' from auth.users
where id in (
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000003'
)
on conflict (user_id) do update set status = 'active';

-- Die Empfaengerin traegt "Podcast" GROSS geschrieben ein.
insert into public.network_profiles(
  user_id, display_name, headline, bio, network_roles, expertise, industries, status, published_at
) values
('b1000000-0000-4000-8000-000000000001','Mara','Macht Podcasts','Produziert seit Jahren Podcasts zu Wissenschaftsthemen.',
 array['founder'], array['Podcast','Audioproduktion'], array['Medien'], 'active', now()),
('b1000000-0000-4000-8000-000000000002','Tom','Baut Sprachwerkzeuge','Entwickelt Werkzeuge fuer Stimme und Sprache.',
 array['founder'], array['KI'], array['Software'], 'active', now()),
('b1000000-0000-4000-8000-000000000003','Bo','Auch Audio','Arbeitet ebenfalls mit Audio und Podcasts.',
 array['founder'], array['podcast'], array['Medien'], 'active', now())
on conflict (user_id) do update set status = excluded.status;

-- DIESER TEST PRUEFT DIE SACHVORSCHLAEGE. Seit dem 21.09.2026 koennen auch
-- Menschen vorgeschlagen werden, und Bo traegt dieselben Woerter wie Mara -
-- ohne diese Zeile wuerde hier ein Personenvorschlag mitzaehlen und die
-- Zahlen unten verschieben. Menschen haben ihren eigenen Test
-- (connect_person_suggestions.sql).
update public.network_profiles set suggestable = false
where user_id in ('b1000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000003');

-- Das Angebot, das passen soll - klein geschrieben.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002',
  'offering','expertise','Stimmenwerkzeug fuer Audio',
  'Ein Werkzeug, das Stimmen fuer Audioproduktionen nachbearbeitet.',
  array['podcast','sprache'], array['software'],
  'active', now(), now() + interval '30 days'
);

-- Ein GESUCH mit demselben Thema: Es darf nicht vorgeschlagen werden.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002',
  'seeking','expertise','Suche Hilfe beim Podcast',
  'Wir suchen jemanden, der beim Schnitt unseres Podcasts hilft.',
  array['podcast'], array['medien'],
  'active', now(), now() + interval '30 days'
);

-- Ein Angebot ohne Ueberschneidung.
insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'b2000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000002',
  'offering','expertise','Buchhaltung fuer Vereine',
  'Uebernehme die Buchhaltung fuer kleine Vereine und Initiativen.',
  array['buchhaltung'], array['verein'],
  'active', now(), now() + interval '30 days'
);

-- ---------------------------------------------------------------------------
-- Der eigentliche Fall
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- GROSS gegen klein: Ohne Kleinschreibung faende der Abgleich hier nichts, und
-- zwar still. `topics` und `industries` sind freie Kommalisten.
select extensions.set_eq(
  $$select unnest(public.connect_match_terms('b1000000-0000-4000-8000-000000000001'))$$,
  $$values ('podcast'), ('audioproduktion'), ('medien')$$,
  'the own terms come back in lower case'
);

select extensions.is(
  public.generate_connect_suggestions(3),
  1,
  'exactly the one offering that overlaps is suggested'
);

set local role postgres;
select extensions.is(
  (select listing_id from public.connect_suggestions),
  'b2000000-0000-4000-8000-000000000001'::uuid,
  'and it is the voice tool, not the accounting'
);

-- DER GRUND STEHT ALS DATEN DABEI, nicht als Prosa.
select extensions.set_eq(
  $$select unnest(matched_terms) from public.connect_suggestions$$,
  $$values ('podcast')$$,
  'the reason is the word that matched'
);

-- Ein Gesuch ist kein Vorschlag, sondern eine Bitte.
select extensions.is(
  (select count(*)::int from public.connect_suggestions
   where listing_id = 'b2000000-0000-4000-8000-000000000002'),
  0,
  'a request is never suggested, only an offer'
);

-- ---------------------------------------------------------------------------
-- Die Wochengrenze
-- ---------------------------------------------------------------------------
set local role authenticated;
select extensions.is(
  public.generate_connect_suggestions(3),
  0,
  'nothing is suggested twice'
);

set local role postgres;
-- Ein aktives Problem braucht einen Veroeffentlichungszeitpunkt (Constraint
-- aus 20260915140000).
insert into public.network_problems(
  id, author_user_id, title, description, topics, industries, status, published_at
) values (
  'b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002',
  'Podcasts sind fuer Gehoerlose unzugaenglich',
  'Transkripte fehlen fast immer, und automatische sind zu schlecht zum Lesen.',
  array['podcast'], array['medien'], 'active', now()
);
insert into public.network_ventures(
  id, owner_user_id, name, what_it_does, audience, status
) values (
  'b4000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002',
  'Stimmlabor',
  'Baut Werkzeuge, mit denen sich Stimmen fuer einen Podcast nachbearbeiten lassen.',
  'Menschen, die Podcasts und Hoerbuecher produzieren.', 'active'
);

set local role authenticated;
select extensions.is(
  public.generate_connect_suggestions(3),
  2,
  'the remaining budget of the week is filled - but no more'
);

select extensions.is(
  public.generate_connect_suggestions(3),
  0,
  'three a week, not thirty - a stream of suggestions becomes advertising'
);

-- ---------------------------------------------------------------------------
-- Was ausgeschlossen bleibt
-- ---------------------------------------------------------------------------
set local role postgres;
delete from public.connect_suggestions;

-- Blockiert: in beide Richtungen.
insert into public.network_blocks(blocker_user_id, blocked_user_id)
values ('b1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001');

insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, topics, industries,
  status, published_at, expires_at
) values (
  'b2000000-0000-4000-8000-000000000004','b1000000-0000-4000-8000-000000000003',
  'offering','expertise','Audioschnitt',
  'Ich schneide Podcasts und kuemmere mich um den Ton.',
  array['podcast'], array['medien'],
  'active', now(), now() + interval '30 days'
);

set local role authenticated;
select public.generate_connect_suggestions(3);

set local role postgres;
select extensions.is(
  (select count(*)::int from public.connect_suggestions
   where subject_owner_user_id = 'b1000000-0000-4000-8000-000000000003'),
  0,
  'a block holds here too, in both directions'
);

-- Entwuerfe und abgelaufene Anzeigen.
update public.network_listings set status = 'draft'
where id = 'b2000000-0000-4000-8000-000000000001';
delete from public.connect_suggestions;

set local role authenticated;
select public.generate_connect_suggestions(3);

set local role postgres;
select extensions.is(
  (select count(*)::int from public.connect_suggestions
   where listing_id = 'b2000000-0000-4000-8000-000000000001'),
  0,
  'a draft is suggested to nobody'
);

-- Ohne eigene Angaben gibt es nichts zu vergleichen - dann lieber nichts.
-- Leere Listen, nicht null: Die Spalten sind not null mit Standard '{}'.
update public.network_profiles set expertise = '{}', industries = '{}'
where user_id = 'b1000000-0000-4000-8000-000000000001';
delete from public.connect_suggestions;

set local role authenticated;
select extensions.is(
  public.generate_connect_suggestions(3),
  0,
  'without own entries nothing is suggested, rather than something arbitrary'
);

-- ---------------------------------------------------------------------------
-- Niemand legt sich selbst oder anderen Vorschlaege hin
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$insert into public.connect_suggestions(recipient_user_id, listing_id, subject_owner_user_id, matched_terms)
    values ('b1000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000002',array['podcast'])$$,
  '42501',
  null,
  'nobody writes into the suggestion list directly'
);

select * from extensions.finish();
rollback;
