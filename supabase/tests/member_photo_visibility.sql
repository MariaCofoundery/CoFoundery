begin;
select plan(9);

-- ---------------------------------------------------------------------------
-- A gibt ihr Bild frei, B nicht. C schaut zu.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zeigt@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('b2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zeigtnicht@example.com', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'schaut@example.com', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.profiles (user_id, display_name, roles, avatar_id, avatar_url) values
  ('a1111111-1111-4111-8111-111111111111', 'Zeigt', array['founder'], 'avatar-03', null),
  ('b2222222-2222-4222-8222-222222222222', 'Zeigt nicht', array['founder'], 'avatar-07', null),
  ('c3333333-3333-4333-8333-333333333333', 'Schaut', array['founder'], null, null);

-- ---------------------------------------------------------------------------
-- Die Voreinstellung
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.person_core where photo_visible_to_members),
  0::bigint,
  'niemand zeigt sein Bild, ohne es eingeschaltet zu haben'
);

update public.person_core set photo_visible_to_members = true
where user_id = 'a1111111-1111-4111-8111-111111111111';

-- ---------------------------------------------------------------------------
-- Wer was sieht
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

select is(
  (select avatar_id from public.list_member_photos(
     array['a1111111-1111-4111-8111-111111111111']::uuid[])),
  'avatar-03',
  'das freigegebene Bild kommt an'
);

select is(
  (select count(*) from public.list_member_photos(
     array['b2222222-2222-4222-8222-222222222222']::uuid[])),
  0::bigint,
  'das nicht freigegebene nicht - und zwar gar nicht, nicht als leere Zeile'
);

-- Die Funktion gibt nur Bildangaben zurueck. Ein Name kaeme sonst an der
-- Zeilensicherheit von profiles vorbei.
select is(
  (select count(*) from information_schema.routines
   where routine_schema = 'public' and routine_name = 'list_member_photos'
     and routine_definition ilike '%display_name%'),
  0::bigint,
  'sie gibt keinen Namen heraus, nur das Bild'
);

-- ---------------------------------------------------------------------------
-- Das eigene Bild sieht man immer
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}';

select is(
  (select avatar_id from public.list_member_photos(
     array['b2222222-2222-4222-8222-222222222222']::uuid[])),
  'avatar-07',
  'auch ohne Freigabe - es ist ja das eigene'
);

-- ---------------------------------------------------------------------------
-- Und beim Ausliefern dieselbe Frage
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}';

select ok(
  public.can_read_member_photo('a1111111-1111-4111-8111-111111111111'),
  'das hochgeladene Bild der freigebenden Person darf ausgeliefert werden'
);

select ok(
  not public.can_read_member_photo('b2222222-2222-4222-8222-222222222222'),
  'das der anderen nicht - ein weitergegebener Link laeuft damit ins Leere'
);

select ok(
  public.can_read_member_photo('c3333333-3333-4333-8333-333333333333'),
  'das eigene immer'
);

-- ---------------------------------------------------------------------------
-- Und ohne Anmeldung gar nichts
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '';

select throws_ok(
  $$select * from public.list_member_photos(array['a1111111-1111-4111-8111-111111111111']::uuid[])$$,
  '42501',
  null,
  'ohne Anmeldung gibt es kein Bild, auch kein freigegebenes'
);

select * from finish();
rollback;
