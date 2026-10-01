\set ON_ERROR_STOP on

-- Phase 6: das eigene Basisfoto als Kontextkopie in Connect
-- (Migration 20261095120000_connect_base_photo_copy).

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','db600000-0000-4000-8000-000000000001','authenticated','authenticated','copy-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','db600000-0000-4000-8000-000000000002','authenticated','authenticated','copy-b@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values
('db600000-0000-4000-8000-000000000001','Copy A',array['founder']),
('db600000-0000-4000-8000-000000000002','Copy B',array['founder']);
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status) values
('db600000-0000-4000-8000-000000000001','Copy A','Founder A','A sufficiently complete biography for copy tests.',array['founder'],'draft'),
('db600000-0000-4000-8000-000000000002','Copy B','Founder B','A sufficiently complete biography for copy tests.',array['founder'],'draft');

select extensions.lives_ok(
  $$update public.network_profiles set photo_source='profile_avatar',photo_avatar_id=null,photo_path='db600000-0000-4000-8000-000000000001/1-copy.jpg' where user_id='db600000-0000-4000-8000-000000000001'$$,
  'ein eigenes Basisfoto darf als Kopie unter dem eigenen Praefix stehen');
select extensions.ok(
  (select photo_source='profile_avatar' and photo_avatar_id is null from public.network_profiles where user_id='db600000-0000-4000-8000-000000000001'),
  'die Kopie bleibt als Basisfoto erkennbar - nicht als eigenes Connect-Bild');
select extensions.throws_ok(
  $$update public.network_profiles set photo_source='profile_avatar',photo_avatar_id=null,photo_path='db600000-0000-4000-8000-000000000002/1-fremd.jpg' where user_id='db600000-0000-4000-8000-000000000001'$$,
  '23514', null, 'eine Kopie unter fremdem Praefix ist unzulaessig');
select extensions.throws_ok(
  $$update public.network_profiles set photo_source='profile_avatar',photo_avatar_id='avatar-03',photo_path='db600000-0000-4000-8000-000000000001/1-copy.jpg' where user_id='db600000-0000-4000-8000-000000000001'$$,
  '23514', null, 'Illustration und Datei zugleich bleiben unzulaessig - zwei Bilder');
select extensions.throws_ok(
  $$update public.network_profiles set photo_source='profile_avatar',photo_avatar_id=null,photo_path=null where user_id='db600000-0000-4000-8000-000000000001'$$,
  '23514', null, 'ein Basisfoto ohne Illustration und ohne Datei ist keins');
select extensions.throws_ok(
  $$update public.network_profiles set photo_source='profile_avatar',photo_avatar_id=null,photo_path='avatars/db600000-0000-4000-8000-000000000001/1-original.jpg' where user_id='db600000-0000-4000-8000-000000000001'$$,
  '23514', null, 'ein Verweis auf das private Original ist keine Kopie');
select extensions.lives_ok(
  $$update public.network_profiles set photo_source='profile_avatar',photo_avatar_id='avatar-07',photo_path=null where user_id='db600000-0000-4000-8000-000000000002'$$,
  'die Illustration als Kennung gilt weiter');
select extensions.ok(
  (select not public from storage.buckets where id='avatars') and (select not public from storage.buckets where id='network-profile-images'),
  'beide Eimer bleiben privat');

select * from extensions.finish();
rollback;
