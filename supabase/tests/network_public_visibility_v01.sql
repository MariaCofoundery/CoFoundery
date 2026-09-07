\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(29);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000001','authenticated','authenticated','public-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000002','authenticated','authenticated','public-b@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values
('ea000000-0000-4000-8000-000000000001','Public A',array['founder']),
('ea000000-0000-4000-8000-000000000002','Private B',array['founder']);
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,expertise,industries,location_region,status,published_at,photo_source,photo_avatar_id,public_slug) values
('ea000000-0000-4000-8000-000000000001','Public A','Product strategist','A sufficiently complete public biography for projection tests.',array['expert'],array['Product'],array['SaaS'],'Berlin','active',now(),'profile_avatar','avatar-01','profile-aaaaaaaaaaaaaaaaaaaaaaaa'),
('ea000000-0000-4000-8000-000000000002','Private B','Sales expert','A sufficiently complete private biography for projection tests.',array['business_angel'],array['Sales'],array['HealthTech'],'Hamburg','active',now(),'profile_avatar','avatar-02','profile-bbbbbbbbbbbbbbbbbbbbbbbb');

select extensions.is((select visibility from public.network_profiles where user_id='ea000000-0000-4000-8000-000000000001'),'members_only','profile defaults to members_only');

insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at,visibility,public_slug) values
('eb000000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000002','seeking','expertise','Public private-owner listing','A sufficiently complete summary for the independent listing projection.','active',now(),now()+interval '60 days','public','listing-111111111111111111111111'),
('eb000000-0000-4000-8000-000000000002','ea000000-0000-4000-8000-000000000001','offering','sparring','Member only listing','A sufficiently complete summary that must remain limited to members.','active',now(),now()+interval '60 days','members_only','listing-222222222222222222222222'),
('eb000000-0000-4000-8000-000000000003','ea000000-0000-4000-8000-000000000001','offering','expertise','Public profile listing','A sufficiently complete public listing shown on the public profile.','active',now(),now()+interval '60 days','public','listing-333333333333333333333333'),
('eb000000-0000-4000-8000-000000000004','ea000000-0000-4000-8000-000000000001','offering','expertise','Paused public listing','A sufficiently complete paused listing that must remain unavailable.','paused',now(),now()+interval '60 days','public','listing-444444444444444444444444'),
('eb000000-0000-4000-8000-000000000005','ea000000-0000-4000-8000-000000000001','offering','expertise','Completed public listing','A sufficiently complete completed listing that must remain unavailable.','completed',now(),now()+interval '60 days','public','listing-555555555555555555555555'),
('eb000000-0000-4000-8000-000000000006','ea000000-0000-4000-8000-000000000001','offering','expertise','Expired public listing','A sufficiently complete expired listing that must remain unavailable.','active',now()-interval '60 days',now()-interval '1 second','public','listing-666666666666666666666666');
insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status) values
('eb000000-0000-4000-8000-000000000007','ea000000-0000-4000-8000-000000000001','seeking','cooperation','Default private draft','A sufficiently complete draft used to prove the visibility default.','draft');
select extensions.is((select visibility from public.network_listings where id='eb000000-0000-4000-8000-000000000007'),'members_only','listing defaults to members_only');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.lives_ok($$update public.network_profiles set visibility='public' where user_id='ea000000-0000-4000-8000-000000000001'$$,'owner can explicitly publish profile');
select extensions.is((select count(*)::int from public.network_profiles where user_id='ea000000-0000-4000-8000-000000000002' and visibility='public'),0,'owner cannot publish another profile');
reset role;

set local role anon;
select extensions.throws_ok($$select count(*) from public.network_profiles$$,'42501',null,'anon cannot read profile table');
select extensions.throws_ok($$select count(*) from public.network_listings$$,'42501',null,'anon cannot read listing table');
select extensions.is((select count(*)::int from public.get_public_network_profile('profile-aaaaaaaaaaaaaaaaaaaaaaaa')),1,'anon sees explicitly public active profile');
select extensions.is((select count(*)::int from public.get_public_network_profile('profile-bbbbbbbbbbbbbbbbbbbbbbbb')),0,'anon cannot see members-only profile');
select extensions.ok((select not (to_jsonb(projected) ? 'user_id') from public.get_public_network_profile('profile-aaaaaaaaaaaaaaaaaaaaaaaa') projected),'profile projection has no user id');
select extensions.ok((select not (to_jsonb(projected) ?| array['email','photo_path','remote_mode','photo_available','photo_avatar_id']) from public.get_public_network_profile('profile-aaaaaaaaaaaaaaaaaaaaaaaa') projected),'profile projection excludes private fields and carries no image at all');
select extensions.ok((select not (to_jsonb(projected) ? 'owner_photo_available') from public.get_public_network_listing('listing-111111111111111111111111') projected),'listing projection carries no image either');
-- Produktentscheidung: oeffentliche Seiten zeigen niemals ein Bild. Damit
-- entfaellt der privilegierte Aufloesungspfad vollstaendig.
select extensions.hasnt_function('public','resolve_public_network_photo','the privileged public photo resolver no longer exists');
select extensions.hasnt_column('public','network_profiles','photo_visibility','the photo permission is gone - a switch that does nothing promises a choice that does not exist');
select extensions.is((select count(*)::int from public.get_public_network_listing('listing-111111111111111111111111')),1,'public listing remains visible with private owner profile');
select extensions.ok((select owner_profile_slug is null from public.get_public_network_listing('listing-111111111111111111111111')),'private profile is not linked from public listing');
select extensions.ok((select not (to_jsonb(projected) ?| array['owner_user_id','id','expires_at','status']) from public.get_public_network_listing('listing-111111111111111111111111') projected),'listing projection excludes internal identifiers and lifecycle fields');
select extensions.is((select count(*)::int from public.get_public_network_listing('listing-222222222222222222222222')),0,'members-only listing is denied anonymously');
select extensions.is((select count(*)::int from public.list_public_network_profile_listings('profile-aaaaaaaaaaaaaaaaaaaaaaaa')),1,'public profile reveals only independently public listings');
select extensions.is((select count(*)::int from public.get_public_network_listing('listing-444444444444444444444444')),0,'paused public listing is unavailable');
select extensions.is((select count(*)::int from public.get_public_network_listing('listing-555555555555555555555555')),0,'completed public listing is unavailable');
select extensions.is((select count(*)::int from public.get_public_network_listing('listing-666666666666666666666666')),0,'expired public listing is unavailable');
reset role;

select set_config('request.jwt.claims','{"role":"service_role"}',true);
select extensions.is((select count(*)::int from public.list_public_network_sitemap()),3,'sitemap includes only eligible public profile and listings');
select extensions.ok((select public_slug ~ '^profile-[a-f0-9]{24}$' from public.network_profiles where user_id='ea000000-0000-4000-8000-000000000001'),'profile public identifier is opaque and not a raw user UUID');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.is((select count(*)::int from public.network_listings where status='active'),4,'member browse still includes public and members-only active listings under the existing contract');
reset role;

update public.network_memberships set status='suspended' where user_id='ea000000-0000-4000-8000-000000000001';
select extensions.is((select count(*)::int from public.get_public_network_profile((select public_slug from public.network_profiles where user_id='ea000000-0000-4000-8000-000000000001'))),0,'suspension removes public profile');
select extensions.is((select count(*)::int from public.get_public_network_listing((select public_slug from public.network_listings where id='eb000000-0000-4000-8000-000000000003'))),0,'suspension removes public listings');
select extensions.is((select count(*)::int from public.list_public_network_sitemap()),1,'suspension removes affected entities from sitemap');
select set_config('request.jwt.claims','{"role":"service_role"}',true);

delete from auth.users where id='ea000000-0000-4000-8000-000000000002';
select extensions.is((select count(*)::int from public.get_public_network_listing((select public_slug from public.network_listings where id='eb000000-0000-4000-8000-000000000001'))),0,'account deletion leaves no public listing');
select extensions.is((select count(*)::int from public.network_profiles where user_id='ea000000-0000-4000-8000-000000000002'),0,'account deletion leaves no public profile orphan');

select * from extensions.finish();
rollback;
