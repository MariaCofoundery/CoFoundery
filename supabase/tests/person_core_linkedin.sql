\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- ---------------------------------------------------------------------------
-- Drei Menschen: A hat ein LinkedIn-Profil, B ist ein angenommener Kontakt,
-- C ist niemand Besonderes.
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ec000000-0000-4000-8000-000000000001','authenticated','authenticated','li-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ec000000-0000-4000-8000-000000000002','authenticated','authenticated','li-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ec000000-0000-4000-8000-000000000003','authenticated','authenticated','li-c@example.com','',now(),'{}','{}',now(),now());

update public.person_core
set linkedin_url = 'https://www.linkedin.com/in/person-a'
where user_id = 'ec000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Die Voreinstellung
-- ---------------------------------------------------------------------------
select extensions.is(
  (select linkedin_visibility from public.person_core where user_id='ec000000-0000-4000-8000-000000000001'),
  'private',
  'linkedin visibility defaults to private'
);

-- Eine Adresse eintragen macht sie nicht sichtbar. Das ist der ganze Sinn der
-- Voreinstellung: Uebernommene Altwerte aus dem entfernten LinkedIn-Import
-- duerfen nicht rueckwirkend jemandem angezeigt werden.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select linkedin_url from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])$$,
  'private is shown to nobody'
);

-- Die eigene Angabe sieht man immer, unabhaengig von der Stufe.
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select linkedin_url from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])),
  'https://www.linkedin.com/in/person-a',
  'own address is always visible to oneself'
);

-- ---------------------------------------------------------------------------
-- Stufe "contacts"
-- ---------------------------------------------------------------------------
reset role;
update public.person_core set linkedin_visibility = 'contacts'
where user_id = 'ec000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is_empty(
  $$select linkedin_url from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])$$,
  'contacts stays hidden without an accepted request'
);

reset role;
insert into public.network_contact_requests(id,listing_id,sender_user_id,recipient_user_id,message,status)
values ('ed000000-0000-4000-8000-000000000001',null,'ec000000-0000-4000-8000-000000000002','ec000000-0000-4000-8000-000000000001','A sufficiently long message for the contact request.','pending');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is_empty(
  $$select linkedin_url from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])$$,
  'a pending request is not yet a contact'
);

reset role;
update public.network_contact_requests set status = 'accepted'
where id = 'ed000000-0000-4000-8000-000000000001';

-- Beide Richtungen: Wer die Anfrage gestellt hat, darf keine Rolle spielen.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select linkedin_url from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])),
  'https://www.linkedin.com/in/person-a',
  'an accepted request makes the address visible to the sender'
);

set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select linkedin_url from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])$$,
  'someone else stays outside'
);

-- ---------------------------------------------------------------------------
-- Stufe "members"
-- ---------------------------------------------------------------------------
reset role;
update public.person_core set linkedin_visibility = 'members'
where user_id = 'ec000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select linkedin_url from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])),
  'https://www.linkedin.com/in/person-a',
  'members is visible to every signed-in member'
);

-- Nicht angemeldet kommt hier gar nicht durch.
reset role;
set local role anon;
select extensions.throws_ok(
  $$select * from public.list_member_linkedin_urls(array['ec000000-0000-4000-8000-000000000001']::uuid[])$$,
  '42501',
  null,
  'the member function refuses anonymous callers'
);

-- ---------------------------------------------------------------------------
-- Die öffentlichen Seiten: beide Zustimmungen nötig
-- ---------------------------------------------------------------------------
reset role;
insert into public.network_memberships(user_id,status) values ('ec000000-0000-4000-8000-000000000001','active')
on conflict (user_id) do update set status = 'active';
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,expertise,industries,location_region,status,published_at,visibility,public_slug)
values ('ec000000-0000-4000-8000-000000000001','Person A','Product strategist','A sufficiently complete public biography for the linkedin projection tests.',array['expert'],array['Product'],array['SaaS'],'Berlin','active',now(),'public','profile-cccccccccccccccccccccccc');

-- Das Netzwerkprofil ist oeffentlich, die LinkedIn-Stufe steht auf "members".
-- Ein oeffentliches Profil zu haben ist KEINE Zustimmung zur Adresse.
set local role anon;
select extensions.is(
  (select public.get_public_network_profile_linkedin('profile-cccccccccccccccccccccccc')),
  null,
  'a public page alone does not publish the address'
);

reset role;
update public.person_core set linkedin_visibility = 'public'
where user_id = 'ec000000-0000-4000-8000-000000000001';

set local role anon;
select extensions.is(
  (select public.get_public_network_profile_linkedin('profile-cccccccccccccccccccccccc')),
  'https://www.linkedin.com/in/person-a',
  'both consents together publish the address'
);

-- Und umgekehrt: Stufe "public", aber die Seite ist nicht mehr oeffentlich.
reset role;
update public.network_profiles set visibility = 'members_only'
where user_id = 'ec000000-0000-4000-8000-000000000001';

set local role anon;
select extensions.is(
  (select public.get_public_network_profile_linkedin('profile-cccccccccccccccccccccccc')),
  null,
  'a non-public page publishes nothing, whatever the level says'
);

-- ---------------------------------------------------------------------------
-- Die Tabelle bleibt zu, und die Projektion bleibt frei davon
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"ec000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select linkedin_url from public.person_core where user_id='ec000000-0000-4000-8000-000000000001'$$,
  'person_core stays owner-only – no reading other people directly'
);

reset role;
-- Die Adresse wandert NICHT in die oeffentliche Projektion. Der Schutz aus
-- network_v01_slice1 bleibt in Kraft: Was sich geaendert hat, ist nur, dass es
-- neben der Projektion eine enge Funktion mit ausdruecklicher Zustimmung gibt.
select extensions.ok(
  not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='network_profiles' and column_name='linkedin_url'
  ),
  'the public network projection still carries no linkedin_url column'
);

select * from extensions.finish(); rollback;
