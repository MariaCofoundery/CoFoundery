begin;
select plan(11);

-- ---------------------------------------------------------------------------
-- A und B schreiben sich. Dann geht B.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bleibt@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'geht@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active');

insert into public.network_profiles (user_id, display_name, headline, bio, network_roles, status, published_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Bleibt', 'Baut Software',
   'Entwickelt seit zehn Jahren Anwendungen fuer kleine Organisationen und Teams.', array['expert'], 'active', now()),
  ('b2222222-2222-4222-8222-222222222222', 'Geht', 'Sucht Mitgruender',
   'Arbeitet in der Pflege und beobachtet dort seit Jahren dieselbe Luecke.', array['founder'], 'active', now());

insert into public.network_listings (id, owner_user_id, direction, category, title, summary, status, published_at, expires_at)
values ('c3333333-3333-4333-8333-333333333333', 'b2222222-2222-4222-8222-222222222222',
        'seeking', 'expertise', 'Eine Anzeige', 'Eine hinreichend vollstaendige Zusammenfassung fuer diesen Test.',
        'active', now(), now() + interval '60 days');

insert into public.network_contact_requests
  (id, listing_id, sender_user_id, recipient_user_id, message, status,
   listing_title_snapshot, sender_display_name_snapshot, recipient_display_name_snapshot, responded_at)
values ('d4444444-4444-4444-8444-444444444444', 'c3333333-3333-4333-8333-333333333333',
        'a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222',
        'Ich wuerde gern mit dir sprechen.', 'accepted', 'Eine Anzeige', 'Bleibt', 'Geht', now());

insert into public.network_conversations (id, contact_request_id, participant_a_user_id, participant_b_user_id)
values ('e5555555-5555-4555-8555-555555555555', 'd4444444-4444-4444-8444-444444444444',
        'a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');

set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
select public.send_network_message('e5555555-5555-4555-8555-555555555555', 'Hallo, ich habe deine Anzeige gesehen.');

set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';
select public.send_network_message('e5555555-5555-4555-8555-555555555555', 'Schoen, dass du dich meldest.');

-- ---------------------------------------------------------------------------
-- B geht
-- ---------------------------------------------------------------------------
set local role postgres;
delete from auth.users where id = 'b2222222-2222-4222-8222-222222222222';

select is(
  (select count(*) from public.network_conversations where id = 'e5555555-5555-4555-8555-555555555555'),
  1::bigint,
  'die Unterhaltung besteht weiter - sie gehoert zur Haelfte der Person, die bleibt'
);

select is(
  (select count(*) from public.network_messages where conversation_id = 'e5555555-5555-4555-8555-555555555555'),
  2::bigint,
  'beide Nachrichten stehen noch, auch die der ausgetretenen Person'
);

select is(
  (select count(*) from public.network_messages
   where sender_user_id = 'b2222222-2222-4222-8222-222222222222'),
  0::bigint,
  'aber keine zeigt mehr auf sie'
);

select is(
  (select participant_b_user_id from public.network_conversations
   where id = 'e5555555-5555-4555-8555-555555555555'),
  null,
  'ihre Seite der Unterhaltung ist leer'
);

-- Der Ursprung faellt mit ihr - die Anzeige und die Anfrage gehoerten ihr.
select is(
  (select contact_request_id from public.network_conversations
   where id = 'e5555555-5555-4555-8555-555555555555'),
  null,
  'der Ursprung ist weg, ohne die Unterhaltung mitzunehmen'
);

-- ---------------------------------------------------------------------------
-- Was die verbliebene Person noch kann
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.list_network_conversations()
   where conversation_id = 'e5555555-5555-4555-8555-555555555555'),
  1::bigint,
  'sie sieht ihren Verlauf weiterhin in der Liste'
);

select is(
  (select counterpart_display_name from public.list_network_conversations()
   where conversation_id = 'e5555555-5555-4555-8555-555555555555'),
  null,
  'ohne Namen der Gegenseite - die Oberflaeche setzt dort "Ehemaliges Mitglied" ein'
);

select is(
  (select count(*) from public.list_network_messages('e5555555-5555-4555-8555-555555555555')),
  2::bigint,
  'und sie kann lesen, was geschrieben wurde'
);

-- Die ungelesene Nachricht der ausgetretenen Person zaehlt weiter mit. Mit
-- `<>` statt `is distinct from` waere sie still aus der Zahl gefallen und
-- stuende fuer immer ungelesen da.
select is(
  (select public.get_unread_network_message_count()),
  1::bigint,
  'die ungelesene Nachricht faellt nicht still aus der Zahl'
);

select is(
  (select public.mark_network_conversation_read('e5555555-5555-4555-8555-555555555555')),
  1,
  'und sie laesst sich als gelesen markieren'
);

-- ---------------------------------------------------------------------------
-- Was nicht mehr geht
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.send_network_message('e5555555-5555-4555-8555-555555555555', 'Bist du noch da?')$$,
  null,
  null,
  'geschrieben wird nicht mehr - es gaebe niemanden, der antwortet'
);

select * from finish();
rollback;
