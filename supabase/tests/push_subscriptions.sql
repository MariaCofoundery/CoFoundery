\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- ---------------------------------------------------------------------------
-- Zwei Menschen, ein geteiltes Geraet
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','aa000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','aa000000-0000-4000-8000-000000000002','authenticated','authenticated','ben@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"aa000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.isnt(
  public.register_push_subscription(
    'https://web.push.apple.com/anna-telefon',
    'BOe1uZ2Qx9c0000000000000000000000000000000',
    'c2VjcmV0MTIz',
    'Mozilla/5.0 (iPhone)'
  ),
  null,
  'a device registers and gets a row'
);

select extensions.is(
  (select count(*)::int from public.push_subscriptions),
  1,
  'exactly one row for one device'
);

-- ---------------------------------------------------------------------------
-- Die eigene Zeile ist lesbar, die fremde nicht
-- ---------------------------------------------------------------------------
select extensions.is(
  (select count(*)::int from public.push_subscriptions where user_id = 'aa000000-0000-4000-8000-000000000001'),
  1,
  'the own device is visible'
);

-- Eine Zeile direkt einzufuegen ist nicht vorgesehen - es gibt keine
-- insert-Policy, alles laeuft ueber die Funktion.
select extensions.throws_ok(
  $$insert into public.push_subscriptions(user_id, endpoint, p256dh, auth)
    values ('aa000000-0000-4000-8000-000000000001','https://web.push.apple.com/direkt','BOe1uZ2Qx9c0000000000000000000000000000000','c2VjcmV0MTIz')$$,
  '42501',
  null,
  'no one writes to the table directly'
);

-- ---------------------------------------------------------------------------
-- Der Fall, um den es geht: dasselbe Geraet, ein anderes Konto
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.lives_ok(
  $$select public.register_push_subscription(
      'https://web.push.apple.com/anna-telefon',
      'BOe1uZ2Qx9c0000000000000000000000000000000',
      'YW5kZXJlcw==',
      'Mozilla/5.0 (iPhone)'
    )$$,
  'the same device registers under the other account'
);

select extensions.is(
  (select count(*)::int from public.push_subscriptions),
  1,
  'the endpoint did not multiply - one device, one row'
);

-- UND DAS IST DER PUNKT: Die Mitteilungen gehen jetzt an Ben, nicht mehr an
-- Anna. Bliebe Annas Zeile stehen, bekaeme sie auf einem geteilten Geraet die
-- Mitteilungen der Person, die sich nach ihr angemeldet hat.
set local role postgres;
select extensions.is(
  (select user_id from public.push_subscriptions where endpoint = 'https://web.push.apple.com/anna-telefon'),
  'aa000000-0000-4000-8000-000000000002'::uuid,
  'the device now belongs to the account that registered last'
);

-- ---------------------------------------------------------------------------
-- Abmelden betrifft nur das eigene Geraet
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aa000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.is(
  public.unregister_push_subscription('https://web.push.apple.com/anna-telefon'),
  false,
  'signing off a device that is not yours does nothing'
);

set local request.jwt.claims = '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  public.unregister_push_subscription('https://web.push.apple.com/anna-telefon'),
  true,
  'the own device signs off'
);

select extensions.is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'and the address is gone, not just marked'
);

-- ---------------------------------------------------------------------------
-- Ein geloeschtes Konto nimmt seine Adressen mit
-- ---------------------------------------------------------------------------
select public.register_push_subscription(
  'https://fcm.googleapis.com/ben-rechner',
  'BOe1uZ2Qx9c0000000000000000000000000000000',
  'YW5kZXJlcw=='
);

set local role postgres;
delete from auth.users where id = 'aa000000-0000-4000-8000-000000000002';

select extensions.is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'deleting the account removes the delivery addresses'
);

select * from extensions.finish();
rollback;
