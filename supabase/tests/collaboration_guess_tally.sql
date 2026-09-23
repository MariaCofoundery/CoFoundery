begin;
select plan(7);

-- ---------------------------------------------------------------------------
-- Was diese Pruefung absichert
-- ---------------------------------------------------------------------------
-- Der Tipp liegt in den beiden Labs an VERSCHIEDENEN Stellen:
--
--   Read My Mind       B raet ueber A, und dieser Tipp liegt auf der
--                      Zuordnung von A - dort, wo auch A's eigene Antwort
--                      liegt.
--   Founder in the Wild Jeder beantwortet alle Felder auf der eigenen
--                      Zuordnung, auch den Tipp ueber den anderen.
--
-- Ohne diese Unterscheidung stuenden ueberall null Treffer, und zwar ohne dass
-- irgendetwas fehlschlaegt. Genau das prueft dieser Test.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anna@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ben@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fremd@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

-- ---------------------------------------------------------------------------
-- Die Funktion existiert und ist eng vergeben
-- ---------------------------------------------------------------------------
select has_function(
  'public', 'get_collaboration_guess_tally', array['uuid'],
  'die Bilanzfunktion gibt es'
);

select is(
  (select count(*) from information_schema.routine_privileges
   where routine_schema = 'public' and routine_name = 'get_collaboration_guess_tally'
     and grantee in ('anon', 'public')),
  0::bigint,
  'sie ist nicht fuer anon freigegeben'
);

-- Sie gibt ausschliesslich Zahlen zurueck. Kaeme ein Schluessel mit, waere das
-- ein Blick in die Antworten der anderen Person.
select is(
  (select count(*) from information_schema.parameters
   where specific_schema = 'public'
     and specific_name like 'get_collaboration_guess_tally%'
     and parameter_mode = 'OUT'
     and data_type = 'ARRAY'),
  0::bigint,
  'keine Antwortschluessel in der Rueckgabe, nur Zahlen'
);

-- ---------------------------------------------------------------------------
-- Ohne Anmeldung nichts
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '';

select throws_ok(
  $$select * from public.get_collaboration_guess_tally('11111111-1111-4111-8111-111111111111')$$,
  '42501',
  null,
  'ohne Anmeldung gibt es keine Bilanz'
);

-- ---------------------------------------------------------------------------
-- Wer nicht mitspielt, sieht nichts
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

select is(
  (select count(*) from public.get_collaboration_guess_tally('11111111-1111-4111-8111-111111111111')),
  0::bigint,
  'ein fremdes Team liefert keine Zeilen'
);

-- ---------------------------------------------------------------------------
-- Beide Ablagearten sind beruecksichtigt
-- ---------------------------------------------------------------------------
-- Der Quelltext der Funktion muss beide Faelle kennen. Das ist eine Pruefung
-- am Text und keine am Verhalten - eine echte Runde aufzubauen braeuchte die
-- halbe Lab-Maschinerie. Der Fall, den sie absichert, ist aber genau der, den
-- man beim Schreiben uebersieht.
-- REPARIERT AM 23.09.2026. Beide Pruefungen lasen den Funktionstext aus
-- `information_schema.routines` - und standen zu diesem Zeitpunkt unter
-- `set local role authenticated`. Diese Sicht zeigt den Text aber NUR dem
-- Eigentuemer der Funktion; fuer alle anderen ist `routine_definition` NULL,
-- und `matches(NULL, ...)` schlaegt fehl.
--
-- Die Zeile war also nicht falsch, sondern unsichtbar. Beide Pruefungen waren
-- seit ihrer Entstehung rot, und weil pgTAP nicht in `ci:check` laeuft, hat es
-- niemand gesehen.
--
-- `pg_proc.prosrc` ist fuer jede angemeldete Rolle lesbar und enthaelt
-- denselben Text. Die Zusage bleibt unveraendert.
select matches(
  (select p.prosrc from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_collaboration_guess_tally'),
  'guess_on_target',
  'die Funktion unterscheidet, wo der Tipp liegt'
);

select matches(
  (select p.prosrc from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_collaboration_guess_tally'),
  'having count\(\*\) filter \(where paired.own_guess is not null\) > 0',
  'Packs ohne Raten erscheinen gar nicht erst - eine Bilanz "0 von 5" waere dort eine Aussage, die niemand gemacht hat'
);

select * from finish();
rollback;
