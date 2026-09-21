\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Drei Menschen: zwei mit Profil, eine mit Entwurf
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a9000000-0000-4000-8000-000000000001','authenticated','authenticated','anna@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a9000000-0000-4000-8000-000000000002','authenticated','authenticated','ben@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a9000000-0000-4000-8000-000000000003','authenticated','authenticated','still@example.com','',now(),'{}','{}',now(),now());

insert into public.network_memberships(user_id, status)
select id, 'active' from auth.users where id in (
  'a9000000-0000-4000-8000-000000000001',
  'a9000000-0000-4000-8000-000000000002',
  'a9000000-0000-4000-8000-000000000003'
)
on conflict (user_id) do update set status = 'active';

insert into public.network_profiles(
  user_id, display_name, headline, bio, network_roles, status, published_at
) values
('a9000000-0000-4000-8000-000000000001','Anna','Baut Diagnostik','Arbeitet seit Jahren an Diagnostik fuer Kliniken.',array['founder'],'active',now()),
('a9000000-0000-4000-8000-000000000002','Ben','Vertrieb im Klinikumfeld','Kennt die Einkaufsseite von Kliniken aus zehn Jahren.',array['founder'],'active',now()),
-- Bleibt Entwurf: "Ich bin hier, aber still."
('a9000000-0000-4000-8000-000000000003','Still','','',array['founder'],'draft',null)
on conflict (user_id) do update set status = excluded.status;

-- ---------------------------------------------------------------------------
-- Ohne eigenes Profil schreibt niemand an
-- ---------------------------------------------------------------------------
-- DIE ENTSCHEIDUNG VOM 21.09.2026, und sie steht in der Datenbank: Wer sein
-- Profil im Entwurf laesst, ist unsichtbar UND schreibt nicht an. Eine
-- Bedingung, die nur ein Formular kennt, ist keine Bedingung.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a9000000-0000-4000-8000-000000000003","role":"authenticated"}';

select extensions.throws_ok(
  $$select public.request_network_person_contact(
      'a9000000-0000-4000-8000-000000000001',
      'Hallo Anna, ich wuerde mich gerne austauschen.'
    )$$,
  '23514',
  null,
  'without a published profile of your own you cannot write to anyone'
);

-- ---------------------------------------------------------------------------
-- Und niemand schreibt an einen Entwurf
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.throws_ok(
  $$select public.request_network_person_contact(
      'a9000000-0000-4000-8000-000000000003',
      'Hallo, ich habe dich in der Liste gesehen.'
    )$$,
  '42501',
  null,
  'a draft is nobody address'
);

-- ---------------------------------------------------------------------------
-- Der eigentliche Fall
-- ---------------------------------------------------------------------------
select extensions.isnt(
  public.request_network_person_contact(
    'a9000000-0000-4000-8000-000000000002',
    'Hallo Ben, du kennst die Einkaufsseite - darueber wuerde ich gerne sprechen.'
  ),
  null,
  'with a profile of your own you can write to a member without a listing'
);

set local role postgres;
select extensions.is(
  (select listing_id from public.network_contact_requests),
  null,
  'the request hangs on the person, not on a listing'
);

select extensions.is(
  (select listing_title_snapshot from public.network_contact_requests),
  null,
  'and carries no listing title - there was none'
);

select extensions.is(
  (select sender_display_name_snapshot from public.network_contact_requests),
  'Anna',
  'the recipient can see who is writing'
);

-- ---------------------------------------------------------------------------
-- Hoechstens eine offene je Paar
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.network_contact_requests),
  1,
  'the same person twice stays one request'
);

select public.request_network_person_contact(
  'a9000000-0000-4000-8000-000000000002',
  'Hallo Ben, du kennst die Einkaufsseite - darueber wuerde ich gerne sprechen.'
);

set local role postgres;
select extensions.is(
  (select count(*)::int from public.network_contact_requests),
  1,
  'a double click does not fill the inbox'
);

-- Eine ABGELEHNTE verhindert kein spaeteres zweites Ansprechen: Menschen und
-- Umstaende aendern sich, und ein Nein von damals ist keine Sperre fuer immer.
update public.network_contact_requests
set status = 'declined', responded_at = now();

set local role authenticated;
set local request.jwt.claims = '{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.lives_ok(
  $$select public.request_network_person_contact(
      'a9000000-0000-4000-8000-000000000002',
      'Hallo Ben, ich versuche es nochmal - inzwischen ist mehr zu sehen.'
    )$$,
  'after a no, asking again later is possible'
);

-- ---------------------------------------------------------------------------
-- Sich selbst, und Blockierte
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$select public.request_network_person_contact(
      'a9000000-0000-4000-8000-000000000001',
      'Hallo ich, wie geht es mir?'
    )$$,
  '23514',
  null,
  'nobody writes to themselves'
);

set local role postgres;
insert into public.network_blocks(blocker_user_id, blocked_user_id)
values ('a9000000-0000-4000-8000-000000000002', 'a9000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.request_network_person_contact(
      'a9000000-0000-4000-8000-000000000002',
      'Hallo Ben, noch ein Versuch von meiner Seite.'
    )$$,
  '42501',
  null,
  'a block holds here too - in both directions'
);

-- ---------------------------------------------------------------------------
-- Der Weg ueber die Anzeige bleibt, wie er war
-- ---------------------------------------------------------------------------
-- Eine eigene Funktion statt eines Umbaus: Der bestehende Weg wird taeglich
-- benutzt, und die Pflicht zum eigenen Profil galt dort schon.
select extensions.has_function(
  'public'::name,
  'request_network_contact'::name,
  array['uuid', 'text'],
  'the listing path is untouched'
);

select * from extensions.finish();
rollback;
