begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'will.alles@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'will.weniger@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

-- ---------------------------------------------------------------------------
-- Die Sprache
-- ---------------------------------------------------------------------------
select is(
  (select locale from public.person_core where user_id = 'a1111111-1111-4111-8111-111111111111'),
  null,
  'ohne Entscheidung steht dort nichts - nicht "de"'
);

select throws_ok(
  $$update public.person_core set locale = 'fr' where user_id = 'a1111111-1111-4111-8111-111111111111'$$,
  '23514',
  null,
  'eine Sprache, die es nicht gibt, wird abgewiesen'
);

-- Die Person darf sie selbst setzen - dafuer gibt es keine eigene Funktion,
-- person_core traegt schon eine Update-Policy auf sich selbst.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$update public.person_core set locale = 'en' where user_id = 'a1111111-1111-4111-8111-111111111111'$$,
  'die eigene Sprache laesst sich setzen'
);

-- ---------------------------------------------------------------------------
-- Abwesenheit heisst ja
-- ---------------------------------------------------------------------------
select ok(
  public.wants_email_notification('a1111111-1111-4111-8111-111111111111', 'message'),
  'ohne Abbestellung bekommt man Post'
);

-- Der eigentliche Grund fuer "nur Abbestellungen speichern": Eine Art, die es
-- beim Anlegen des Kontos noch nicht gab, ist automatisch an. Bei einer
-- Tabelle mit Ja-Zeilen waere sie fuer alle Bestandsleute stumm geblieben.
select ok(
  public.wants_email_notification('a1111111-1111-4111-8111-111111111111', 'founder_in_the_wild'),
  'auch eine Art, fuer die nie jemand etwas eingetragen hat'
);

insert into public.notification_opt_outs(user_id, kind)
values ('a1111111-1111-4111-8111-111111111111', 'message');

select ok(
  not public.wants_email_notification('a1111111-1111-4111-8111-111111111111', 'message'),
  'abbestellt heisst abbestellt'
);

select ok(
  public.wants_email_notification('a1111111-1111-4111-8111-111111111111', 'contact_request'),
  'und zwar nur diese eine Art, nicht alle'
);

-- ---------------------------------------------------------------------------
-- Fremde Einstellungen bleiben fremd
-- ---------------------------------------------------------------------------
-- Als postgres angelegt, nicht aus der Sitzung heraus: Die Insert-Policy
-- wuerde das ohnehin abweisen - genau das prueft der letzte Fall dieses
-- Abschnitts. Hier geht es darum, ob eine FREMDE Zeile sichtbar ist.
set local role postgres;
insert into public.notification_opt_outs(user_id, kind)
values ('b2222222-2222-4222-8222-222222222222', 'contact_request');
set local role authenticated;

select is(
  (select count(*) from public.notification_opt_outs
   where user_id = 'b2222222-2222-4222-8222-222222222222'),
  0::bigint,
  'die Abbestellungen anderer Menschen sind nicht lesbar'
);

-- Die Funktion beantwortet trotzdem ja oder nein - security definer, damit der
-- Versand im Namen der ausloesenden Person fragen kann, ohne die Einstellungen
-- der Empfaengerin zu sehen.
select ok(
  not public.wants_email_notification('b2222222-2222-4222-8222-222222222222', 'contact_request'),
  'die Funktion antwortet trotzdem - aber nur mit ja oder nein'
);

select throws_ok(
  $$insert into public.notification_opt_outs(user_id, kind)
    values ('b2222222-2222-4222-8222-222222222222', 'message')$$,
  '42501',
  null,
  'und niemand kann fuer eine andere Person abbestellen'
);

-- ---------------------------------------------------------------------------
-- Eine Art, die es nicht gibt
-- ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.notification_opt_outs(user_id, kind)
    values ('a1111111-1111-4111-8111-111111111111', 'newsletter')$$,
  '23514',
  null,
  'eine erfundene Art wird abgewiesen, statt still zu wirken'
);

select * from finish();
rollback;
