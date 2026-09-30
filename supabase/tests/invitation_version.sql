\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

-- ---------------------------------------------------------------------------
-- Welche Fassung gilt fuer eine Einladung?
-- ---------------------------------------------------------------------------
--
-- Die Funktion gibt Auskunft ueber eine FREMDE Person: Hat die einladende
-- Person die bisherige Fassung? Deshalb wird hier nicht nur geprueft, dass
-- sie richtig antwortet, sondern auch, dass sie schweigt, wenn jemand fragt,
-- den die Einladung nichts angeht.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  -- Laedt ein und hat die bisherige Fassung.
  ('00000000-0000-0000-0000-000000000000', 'c1000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'iv-alt@example.com', '', now(), '{}', '{}', now(), now()),
  -- Laedt ein und hat sie nicht.
  ('00000000-0000-0000-0000-000000000000', 'c1000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'iv-neu@example.com', '', now(), '{}', '{}', now(), now()),
  -- Wird eingeladen.
  ('00000000-0000-0000-0000-000000000000', 'c1000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'iv-gast@example.com', '', now(), '{}', '{}', now(), now()),
  -- Geht das alles nichts an.
  ('00000000-0000-0000-0000-000000000000', 'c1000004-0004-4004-8004-000000000004',
   'authenticated', 'authenticated', 'iv-fremd@example.com', '', now(), '{}', '{}', now(), now()),
  -- Eingeladen, aber noch nicht mit der Einladung verknuepft.
  ('00000000-0000-0000-0000-000000000000', 'c1000005-0005-4005-8005-000000000005',
   'authenticated', 'authenticated', 'iv-offen@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('c1000001-0001-4001-8001-000000000001', array['founder']),
  ('c1000002-0002-4002-8002-000000000002', array['founder']),
  ('c1000003-0003-4003-8003-000000000003', array['founder']),
  ('c1000004-0004-4004-8004-000000000004', array['founder']),
  ('c1000005-0005-4005-8005-000000000005', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

-- Nur die erste Person hat die bisherige Fassung angefangen. ANGEFANGEN
-- REICHT: Wer mitten im alten Bogen steckt, hat dort etwas liegen, das zu
-- einem gemeinsamen Report fuehren soll.
insert into public.assessments (id, user_id, module, instrument_id)
values ('c1a00001-0001-4001-8001-00000000000a',
        'c1000001-0001-4001-8001-000000000001', 'base', 'founder-compatibility-v1');

insert into public.invitations (
  id, inviter_user_id, invitee_email, invitee_user_id, status, token_hash, expires_at
) values
  ('c1e00001-0001-4001-8001-00000000000e', 'c1000001-0001-4001-8001-000000000001',
   'iv-gast@example.com', 'c1000003-0003-4003-8003-000000000003', 'sent',
   'hash-alt', now() + interval '14 days'),
  ('c1e00002-0002-4002-8002-00000000000e', 'c1000002-0002-4002-8002-000000000002',
   'iv-gast@example.com', 'c1000003-0003-4003-8003-000000000003', 'sent',
   'hash-neu', now() + interval '14 days'),
  -- Noch auf eine Adresse und nicht auf ein Konto: Genau dann steht die
  -- Person davor und fragt, bevor sie verknuepft ist.
  ('c1e00003-0003-4003-8003-00000000000e', 'c1000001-0001-4001-8001-000000000001',
   'iv-offen@example.com', null, 'sent',
   'hash-offen', now() + interval '14 days');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"c1000003-0003-4003-8003-000000000003","role":"authenticated","email":"iv-gast@example.com"}';

-- ---------------------------------------------------------------------------
-- 1. Wer mit der bisherigen Fassung einlaedt, fuehrt dorthin
-- ---------------------------------------------------------------------------
select extensions.is(
  public.invitation_uses_previous_version(
    'c1e00001-0001-4001-8001-00000000000e', 'founder-compatibility-v1'),
  true,
  'die einladende Person hat die bisherige Fassung');

-- ---------------------------------------------------------------------------
-- 2. Wer sie nicht hat, fuehrt in die neuen Boegen
-- ---------------------------------------------------------------------------
select extensions.is(
  public.invitation_uses_previous_version(
    'c1e00002-0002-4002-8002-00000000000e', 'founder-compatibility-v1'),
  false,
  'die einladende Person hat die bisherige Fassung nicht');

-- ---------------------------------------------------------------------------
-- 3. Auch ohne verknuepftes Konto - ueber die Adresse
-- ---------------------------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"c1000005-0005-4005-8005-000000000005","role":"authenticated","email":"iv-offen@example.com"}';
select extensions.is(
  public.invitation_uses_previous_version(
    'c1e00003-0003-4003-8003-00000000000e', 'founder-compatibility-v1'),
  true,
  'die Einladung laeuft noch auf die Adresse und wird trotzdem beantwortet');

-- ---------------------------------------------------------------------------
-- 4. Die einladende Person darf ihre eigene Einladung auch fragen
-- ---------------------------------------------------------------------------
set local request.jwt.claims =
  '{"sub":"c1000001-0001-4001-8001-000000000001","role":"authenticated","email":"iv-alt@example.com"}';
select extensions.is(
  public.invitation_uses_previous_version(
    'c1e00001-0001-4001-8001-00000000000e', 'founder-compatibility-v1'),
  true,
  'die einladende Person bekommt dieselbe Auskunft');

-- ---------------------------------------------------------------------------
-- 5. Wen die Einladung nichts angeht, bekommt null und nicht false
-- ---------------------------------------------------------------------------
--
-- `false` waere eine Auskunft: "diese Person hat die bisherige Fassung
-- nicht". Wer die Einladung nicht sehen darf, soll auch das nicht erfahren.
set local request.jwt.claims =
  '{"sub":"c1000004-0004-4004-8004-000000000004","role":"authenticated","email":"iv-fremd@example.com"}';
select extensions.is(
  public.invitation_uses_previous_version(
    'c1e00001-0001-4001-8001-00000000000e', 'founder-compatibility-v1'),
  null,
  'fremde Einladungen werden nicht beantwortet');

-- ---------------------------------------------------------------------------
-- 6. Die Funktion liest keine fremden Antworten - nur ob es welche gibt
-- ---------------------------------------------------------------------------
--
-- Gefragt wird nach einem anderen Instrument: Dieselbe Person, dieselbe
-- Einladung, und trotzdem `false`. Die Funktion zaehlt keine Zeilen und gibt
-- keine heraus, sie beantwortet genau eine Frage.
set local request.jwt.claims =
  '{"sub":"c1000003-0003-4003-8003-000000000003","role":"authenticated","email":"iv-gast@example.com"}';
select extensions.is(
  public.invitation_uses_previous_version(
    'c1e00001-0001-4001-8001-00000000000e', 'founder-profile-v1'),
  false,
  'nach einem anderen Instrument gefragt, andere Antwort');

select * from extensions.finish();

rollback;
