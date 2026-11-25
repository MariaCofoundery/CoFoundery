\set ON_ERROR_STOP on

begin;
-- Closed-beta-Sichtbarkeit steht in connect_closed_beta_710b.sql; hier geht es nur um die Kurzprofil-Regeln.
alter table public.network_profiles disable trigger a0_connect_beta_visibility;

create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ec000000-0000-4000-8000-000000000001','authenticated','authenticated','sp-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ec000000-0000-4000-8000-000000000002','authenticated','authenticated','sp-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ec000000-0000-4000-8000-000000000003','authenticated','authenticated','sp-c@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values
('ec000000-0000-4000-8000-000000000001','Sharer A',array['founder']),
('ec000000-0000-4000-8000-000000000002','Member B',array['founder']),
('ec000000-0000-4000-8000-000000000003','Draft C',array['founder']);
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,expertise,industries,location_region,status,published_at,photo_source,photo_avatar_id,public_slug) values
('ec000000-0000-4000-8000-000000000001','Sharer A','Product strategist','A sufficiently complete public biography for projection tests.',array['expert'],array['Product'],array['SaaS'],'Berlin','active',now(),'profile_avatar','avatar-01','profile-cccccccccccccccccccccccc'),
('ec000000-0000-4000-8000-000000000002','Member B','Sales expert','A sufficiently complete private biography for projection tests.',array['expert'],array['Sales'],array['SaaS'],'Berlin','active',now(),'profile_avatar','avatar-01','profile-dddddddddddddddddddddddd');
-- C hat ein Netzwerkprofil nur im Entwurf.
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,expertise,industries,location_region,status,photo_source,photo_avatar_id) values
('ec000000-0000-4000-8000-000000000003','Draft C','Designer','A sufficiently complete draft biography for projection tests.',array['expert'],array['Design'],array['SaaS'],'Berlin','draft','profile_avatar','avatar-01');

-- Voreinstellung: aus.
insert into public.person_short_profiles(user_id,tagline) values
('ec000000-0000-4000-8000-000000000001','Ich bringe Dinge ins Rollen.'),
('ec000000-0000-4000-8000-000000000003','Entwurf');
select extensions.is((select shared_in_network from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000001'),false,'sharing is off by default');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000001'),0,'a member sees nothing while sharing is off');

-- A schaltet an.
select set_config('request.jwt.claims','{"sub":"ec000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000001'),1,'the owner always sees their own card');
select extensions.lives_ok($$update public.person_short_profiles set shared_in_network = true, strengths = '[{"theme":"kick_off","label":"Anstoßen"}]'::jsonb where user_id='ec000000-0000-4000-8000-000000000001'$$,'owner can switch sharing on');

select set_config('request.jwt.claims','{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000001'),1,'an active network member sees a shared card');
update public.person_short_profiles set tagline = 'gekapert' where user_id='ec000000-0000-4000-8000-000000000001'; -- fremde Zeile: für Update unsichtbar, 0 Zeilen
select extensions.is((select tagline from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000001'),'Ich bringe Dinge ins Rollen.','a member cannot change someone else''s card');
select extensions.throws_ok($$insert into public.person_short_profiles(user_id,tagline) values ('ec000000-0000-4000-8000-000000000001','doppelt')$$,'42501',null,'a member cannot write a card for someone else');

-- Mitglied ohne aktives Netzwerkprofil der geteilten Person: C teilt, ist aber nur im Entwurf.
reset role;
update public.person_short_profiles set shared_in_network = true where user_id='ec000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000003'),0,'a shared card without an active network profile stays hidden');

-- Form: höchstens fünf Stärken, kein Objekt.
select set_config('request.jwt.claims','{"sub":"ec000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.throws_ok($$update public.person_short_profiles set strengths = '[1,2,3,4,5,6]'::jsonb where user_id='ec000000-0000-4000-8000-000000000001'$$,'23514',null,'more than five strengths are refused');
select extensions.throws_ok($$update public.person_short_profiles set strengths = '{}'::jsonb where user_id='ec000000-0000-4000-8000-000000000001'$$,'23514',null,'strengths must be a list');

-- Anonym: nichts.
reset role;
set local role anon;
select extensions.throws_ok($$select count(*) from public.person_short_profiles$$,'42501',null,'anon cannot read the table');

-- Ein Mitglied ohne Netzwerk-Mitgliedschaft sieht nichts.
reset role;
update public.network_memberships set status='suspended' where user_id='ec000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000001'),0,'a suspended member sees no cards');

-- Abschalten nimmt die Karte sofort wieder weg.
reset role;
update public.network_memberships set status='active' where user_id='ec000000-0000-4000-8000-000000000002';
update public.person_short_profiles set shared_in_network = false where user_id='ec000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ec000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.person_short_profiles where user_id='ec000000-0000-4000-8000-000000000001'),0,'switching sharing off hides the card again');

select * from extensions.finish();
rollback;
