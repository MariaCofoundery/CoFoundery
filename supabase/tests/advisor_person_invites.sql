\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

-- ---------------------------------------------------------------------------
-- Einladen - von innen
-- ---------------------------------------------------------------------------
--
-- ENTSCHIEDEN AM 23.09.2026: Ein Advisor laedt ueber die E-Mail-Adresse ein,
-- angemeldet, so wie beim Co-Founder. Keine Suche nach Adressen - die haette
-- verraten, ob es zu einer Adresse ein Konto gibt.
--
-- GEPRUEFT WIRD: dass eine Einladung KEIN Zugang ist, und dass ein
-- weitergeleiteter Link nichts bewirkt.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000001','authenticated','authenticated','advisor@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000002','authenticated','authenticated','founderin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000003','authenticated','authenticated','jemand.anderes@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temp table invite as
select public.create_advisor_person_invite(
  'Founderin@Example.com',
  repeat('a', 64),
  array['capability', 'strengths']::text[],
  'Wir begleiten dich im Programm.'
) as id;
grant select on invite to authenticated;

select extensions.isnt((select id from invite), null, 'an advisor can invite by email');

-- Die Adresse wird kleingeschrieben abgelegt - sonst laedt man dieselbe
-- Person zweimal ein.
select extensions.is(
  (select invitee_email from public.advisor_person_invites where id = (select id from invite)),
  'founderin@example.com',
  'the address is stored in one shape'
);

-- Nur der Hash liegt in der Datenbank. Wer sie liest, kann keine Einladung
-- annehmen.
select extensions.ok(
  (select token_hash ~ '^[0-9a-f]{64}$' from public.advisor_person_invites limit 1),
  'only the hash is stored'
);

-- Sich selbst einladen geht nicht.
select extensions.throws_ok(
  $$select public.create_advisor_person_invite('advisor@example.com', repeat('b', 64), array['base']::text[], null)$$,
  '22023', null,
  'nobody invites themselves'
);

-- ---------------------------------------------------------------------------
-- Ein weitergeleiteter Link bewirkt nichts
-- ---------------------------------------------------------------------------
-- Ein Token ist ein Inhaberpapier. Die Bedingung, dass die angemeldete Person
-- dieselbe Adresse hat, macht aus dem weitergeleiteten Link ein Stueck Text.
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.claim_advisor_person_invite(repeat('a', 64))$$,
  '42501', null,
  'a forwarded link does nothing for somebody else'
);

-- ---------------------------------------------------------------------------
-- Annehmen erzeugt ANFRAGEN, keine Zugaenge
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  public.claim_advisor_person_invite(repeat('a', 64)),
  2,
  'claiming creates one request per scope'
);

select extensions.is(
  (select count(*)::int from public.advisor_person_grants where status = 'requested'),
  2,
  'and they are requests'
);

-- DAS IST DER KERN: Der Token belegt, dass jemand die Adresse erreicht hat -
-- nicht, dass er einverstanden ist.
select extensions.ok(
  not public.has_advisor_person_access(
    'c1000000-0000-4000-8000-000000000002', 'capability',
    'c1000000-0000-4000-8000-000000000001'
  ),
  'an invitation is not an access'
);

-- Zweimal annehmen geht nicht.
select extensions.throws_ok(
  $$select public.claim_advisor_person_invite(repeat('a', 64))$$,
  '42501', null,
  'an invitation is claimed once'
);

-- ---------------------------------------------------------------------------
-- Und die eingeladene Person sieht die Einladungen des Advisors nicht
-- ---------------------------------------------------------------------------
-- Duerfte sie die Zeile lesen, muesste die Regel dafuer die Adresse
-- vergleichen - und damit koennte man ueber Umwege pruefen, welche Adressen
-- eingeladen wurden.
select extensions.is(
  (select count(*)::int from public.advisor_person_invites),
  0,
  'the invited person does not read the invitation rows'
);

select * from extensions.finish();
rollback;
