begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.network_memberships (user_id, status) values
  ('a1111111-1111-4111-8111-111111111111', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'active');

-- ---------------------------------------------------------------------------
-- Hoechstens einmal je Vorgang
-- ---------------------------------------------------------------------------
select ok(
  public.claim_network_notification('contact_request', 'c3333333-3333-4333-8333-333333333333', 'b2222222-2222-4222-8222-222222222222'),
  'der erste Anspruch wird vergeben'
);

select ok(
  not public.claim_network_notification('contact_request', 'c3333333-3333-4333-8333-333333333333', 'b2222222-2222-4222-8222-222222222222'),
  'der zweite nicht - ein Vorgang, eine Mail'
);

select ok(
  public.claim_network_notification('message', 'c3333333-3333-4333-8333-333333333333', 'b2222222-2222-4222-8222-222222222222'),
  'eine andere Art zum selben Vorgang ist ein eigener Anspruch'
);

select ok(
  public.claim_network_notification('contact_request', 'c3333333-3333-4333-8333-333333333333', 'a1111111-1111-4111-8111-111111111111'),
  'und eine andere Person ebenfalls'
);

-- ---------------------------------------------------------------------------
-- Wer nichts will, bekommt nichts
-- ---------------------------------------------------------------------------
-- GEAENDERT am 18.09.2026: Der Schalter liegt nicht mehr als ein Boolean an
-- der Mitgliedschaft, sondern als Abbestellung je Art in
-- notification_opt_outs. Die Zusage ist dieselbe geblieben.
insert into public.notification_opt_outs(user_id, kind)
values ('b2222222-2222-4222-8222-222222222222', 'problem_interest');

select ok(
  not public.claim_network_notification('problem_interest', 'd4444444-4444-4444-8444-444444444444', 'b2222222-2222-4222-8222-222222222222'),
  'abgeschaltet heisst abgeschaltet'
);

select is(
  (select count(*)::int from public.network_notification_claims
   where kind = 'problem_interest' and subject_id = 'd4444444-4444-4444-8444-444444444444'),
  0,
  'und es bleibt auch keine Zeile zurueck, die ein spaeteres Einschalten blockieren wuerde'
);

delete from public.notification_opt_outs
where user_id = 'b2222222-2222-4222-8222-222222222222' and kind = 'problem_interest';

select ok(
  public.claim_network_notification('problem_interest', 'd4444444-4444-4444-8444-444444444444', 'b2222222-2222-4222-8222-222222222222'),
  'nach dem Einschalten geht es wieder'
);

-- ---------------------------------------------------------------------------
-- Ein ausgesetztes Konto bekommt nichts
-- ---------------------------------------------------------------------------
update public.network_memberships
set status = 'suspended'
where user_id = 'a1111111-1111-4111-8111-111111111111';

select ok(
  not public.claim_network_notification('message', 'e5555555-5555-4555-8555-555555555555', 'a1111111-1111-4111-8111-111111111111'),
  'ein ausgesetztes Konto bekommt keine Benachrichtigungen'
);

-- ---------------------------------------------------------------------------
-- Nur eine unbekannte Art laesst sich nicht eintragen
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.network_notification_claims(kind, subject_id, recipient_user_id)
    values ('newsletter', 'f6666666-6666-4666-8666-666666666666', 'b2222222-2222-4222-8222-222222222222')$$,
  '23514',
  null,
  'nur die drei dokumentierten Anlaesse - alles andere waere Verkehr, den niemand bestellt hat'
);

-- ---------------------------------------------------------------------------
-- Die Tabelle ist fuer niemanden direkt lesbar
-- ---------------------------------------------------------------------------
select ok(
  not has_table_privilege('authenticated', 'public.network_notification_claims', 'select'),
  'wer wann benachrichtigt wurde, geht niemanden direkt etwas an'
);

select * from finish();
rollback;
