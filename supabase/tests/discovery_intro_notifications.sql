\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Zwei Menschen in Find
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000001','authenticated','authenticated','anfragende@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c1000000-0000-4000-8000-000000000002','authenticated','authenticated','angefragte@example.com','',now(),'{}','{}',now(),now());

-- Der Anspruch verlangt eine aktive Mitgliedschaft. Fuer Find ist das keine
-- zusaetzliche Huerde: Der Trigger ensure_network_membership_for_product_role
-- macht jede Founderin zum Mitglied. Ohne diese Zeilen wuerde der Test das
-- Gegenteil von dem pruefen, was im Betrieb passiert.
insert into public.network_memberships(user_id, status)
values
  ('c1000000-0000-4000-8000-000000000001', 'active'),
  ('c1000000-0000-4000-8000-000000000002', 'active')
on conflict (user_id) do update set status = 'active';

-- ---------------------------------------------------------------------------
-- Die neuen Arten sind ueberall bekannt
-- ---------------------------------------------------------------------------
-- WENN DAS FEHLT, PASSIERT NICHTS SICHTBARES: claim_network_notification faengt
-- den Constraint-Fehler nicht ab - der Aufruf schlaegt fehl, die Anwendung
-- wertet das als "kein Anspruch" und verschickt still nichts. Genau so waere
-- approach_interest beinahe untergegangen.
select extensions.lives_ok(
  $$select public.claim_network_notification(
      'discovery_intro_request',
      'c2000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000002'
    )$$,
  'the claim knows the new kind for an intro request'
);

select extensions.is(
  public.claim_network_notification(
    'discovery_intro_accepted',
    'c2000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001'
  ),
  true,
  'and the one for an acceptance'
);

-- Hoechstens einmal je Vorgang und Empfaenger.
select extensions.is(
  public.claim_network_notification(
    'discovery_intro_accepted',
    'c2000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001'
  ),
  false,
  'the second attempt for the same thing gets nothing'
);

-- ---------------------------------------------------------------------------
-- Und sie lassen sich abbestellen
-- ---------------------------------------------------------------------------
select extensions.lives_ok(
  $$insert into public.notification_opt_outs(user_id, kind)
    values ('c1000000-0000-4000-8000-000000000002', 'discovery_intro_request')$$,
  'the new kind can be switched off - without this the switch would lie'
);

select extensions.is(
  public.wants_email_notification('c1000000-0000-4000-8000-000000000002', 'discovery_intro_request'),
  false,
  'and switching it off is respected'
);

select extensions.is(
  public.claim_network_notification(
    'discovery_intro_request',
    'c2000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000002'
  ),
  false,
  'no claim either - so a later switch-on does not hang on old rows'
);

-- Die Zusage haengt an ihrem eigenen Schalter, nicht am selben.
select extensions.is(
  public.wants_email_notification('c1000000-0000-4000-8000-000000000002', 'discovery_intro_accepted'),
  true,
  'switching off the request did not switch off the acceptance'
);

-- ---------------------------------------------------------------------------
-- Der Schalter, der nicht schaltete
-- ---------------------------------------------------------------------------
-- GEFUNDEN AM 20.09.2026: approach_interest ist eine eigene Mailart, stand aber
-- nicht in notification_opt_outs_kind_check - eine Abbestellung liess sich gar
-- nicht speichern. Wer "Interesse an einem deiner Probleme" abgewaehlt hatte,
-- bekam weiter Post, sobald sich jemand zu einem ANSATZ meldete. Der Text des
-- Schalters nennt ausdruecklich beide Faelle.
insert into public.notification_opt_outs(user_id, kind)
values ('c1000000-0000-4000-8000-000000000001', 'problem_interest');

select extensions.is(
  public.wants_email_notification('c1000000-0000-4000-8000-000000000001', 'approach_interest'),
  false,
  'the approach now hangs on the switch whose text describes it'
);

select extensions.is(
  public.wants_email_notification('c1000000-0000-4000-8000-000000000001', 'message'),
  true,
  'and it did not take the other kinds with it'
);

select * from extensions.finish();
rollback;
