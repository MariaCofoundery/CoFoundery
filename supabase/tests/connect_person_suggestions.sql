\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

-- ---------------------------------------------------------------------------
-- Zwei Menschen mit demselben Feld, einer moechte nicht vorgeschlagen werden
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','c9000000-0000-4000-8000-000000000001','authenticated','authenticated','sucht@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c9000000-0000-4000-8000-000000000002','authenticated','authenticated','offen@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','c9000000-0000-4000-8000-000000000003','authenticated','authenticated','still@example.com','',now(),'{}','{}',now(),now());

insert into public.network_memberships(user_id, status)
select id, 'active' from auth.users where id in (
  'c9000000-0000-4000-8000-000000000001',
  'c9000000-0000-4000-8000-000000000002',
  'c9000000-0000-4000-8000-000000000003')
on conflict (user_id) do update set status = 'active';

insert into public.network_profiles(
  user_id, display_name, headline, bio, network_roles, expertise, industries, status, published_at
) values
('c9000000-0000-4000-8000-000000000001','Mara','Coacht Teams','Arbeitet seit Jahren mit Gruenderteams an Zusammenarbeit.',
 array['founder'], array['Coaching'], array['Bildung'], 'active', now()),
('c9000000-0000-4000-8000-000000000002','Tom','Coacht auch','Begleitet Teams in Konflikten und bei Entscheidungen.',
 array['founder'], array['coaching'], array['bildung'], 'active', now()),
('c9000000-0000-4000-8000-000000000003','Bo','Coacht ebenfalls','Arbeitet mit Teams an Rollen und Verantwortung.',
 array['founder'], array['coaching'], array['bildung'], 'active', now())
on conflict (user_id) do update set status = excluded.status;

-- ---------------------------------------------------------------------------
-- Standardmaessig an
-- ---------------------------------------------------------------------------
-- Wer sein Profil veroeffentlicht hat, ist ohnehin auffindbar: Vorgeschlagen
-- zu werden fuegt keine neue Sichtbarkeit hinzu.
select extensions.is(
  (select bool_and(suggestable) from public.network_profiles
   where user_id in ('c9000000-0000-4000-8000-000000000002','c9000000-0000-4000-8000-000000000003')),
  true,
  'the switch is on by default'
);

-- Bo moechte nicht vorgeschlagen werden - bleibt aber auffindbar.
update public.network_profiles set suggestable = false
where user_id = 'c9000000-0000-4000-8000-000000000003';

set local role authenticated;
set local request.jwt.claims = '{"sub":"c9000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.is(
  public.generate_connect_suggestions(3),
  1,
  'only the person who allows it is suggested'
);

set local role postgres;
select extensions.is(
  (select person_user_id from public.connect_suggestions),
  'c9000000-0000-4000-8000-000000000002'::uuid,
  'and that is Tom, not Bo'
);

select extensions.is(
  (select count(*)::int from public.connect_suggestions
   where person_user_id = 'c9000000-0000-4000-8000-000000000003'),
  0,
  'whoever switched it off is never suggested'
);

-- Auffindbar bleibt Bo trotzdem - das ist der Unterschied zum Entwurf.
select extensions.is(
  (select status from public.network_profiles where user_id = 'c9000000-0000-4000-8000-000000000003'),
  'active',
  'switching it off does not hide the profile'
);

-- Der Gegenstand und der Eigentuemer muessen dieselbe Person sein, sonst zeigt
-- die Karte auf jemand anderen als der Vorschlag meint.
select extensions.throws_ok(
  $$insert into public.connect_suggestions(recipient_user_id, person_user_id, subject_owner_user_id, matched_terms)
    values ('c9000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000002','c9000000-0000-4000-8000-000000000003',array['coaching'])$$,
  '23514',
  null,
  'a person suggestion cannot point at someone else'
);

-- Und genau einer der vier Gegenstaende.
select extensions.throws_ok(
  $$insert into public.connect_suggestions(recipient_user_id, person_user_id, listing_id, subject_owner_user_id, matched_terms)
    values ('c9000000-0000-4000-8000-000000000001','c9000000-0000-4000-8000-000000000002',gen_random_uuid(),'c9000000-0000-4000-8000-000000000002',array['coaching'])$$,
  '23514',
  null,
  'two subjects at once is not a suggestion'
);

select * from extensions.finish();
rollback;
