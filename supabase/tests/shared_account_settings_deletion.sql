\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','ac100000-0000-4000-8000-000000000001','authenticated','authenticated','account-founder@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ac100000-0000-4000-8000-000000000002','authenticated','authenticated','account-advisor@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ac100000-0000-4000-8000-000000000003','authenticated','authenticated','account-both@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ac100000-0000-4000-8000-000000000004','authenticated','authenticated','account-network@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id,display_name,roles) values
('ac100000-0000-4000-8000-000000000001','Delete Founder',array['founder']),
('ac100000-0000-4000-8000-000000000002','Delete Advisor',array['advisor']),
('ac100000-0000-4000-8000-000000000003','Delete Both',array['founder','advisor']);

insert into public.network_memberships(user_id) values
('ac100000-0000-4000-8000-000000000004');

insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at) values
('ac100000-0000-4000-8000-000000000001','Delete Founder','Founder fixture','A sufficiently complete deletion fixture biography.',array['founder'],'active',now()),
('ac100000-0000-4000-8000-000000000002','Delete Advisor','Advisor fixture','A sufficiently complete deletion fixture biography.',array['advisor_mentor'],'active',now()),
('ac100000-0000-4000-8000-000000000003','Delete Both','Combined fixture','A sufficiently complete deletion fixture biography.',array['founder','advisor_mentor'],'active',now()),
('ac100000-0000-4000-8000-000000000004','Delete Network','Network fixture','A sufficiently complete deletion fixture biography.',array['expert'],'active',now());

insert into public.network_listings(owner_user_id,direction,category,title,summary,status,published_at,expires_at)
select user_id,'offering','expertise','Deletion fixture','A sufficiently concrete listing for shared account deletion.','active',now(),now()+interval '60 days'
from public.network_profiles;

create temporary table deletion_results(user_id uuid primary key,payload jsonb);
insert into deletion_results(user_id,payload)
select fixture.user_id,public.delete_founder_account_data(fixture.user_id,null)
from (values
  ('ac100000-0000-4000-8000-000000000001'::uuid),
  ('ac100000-0000-4000-8000-000000000002'::uuid),
  ('ac100000-0000-4000-8000-000000000003'::uuid),
  ('ac100000-0000-4000-8000-000000000004'::uuid)
) fixture(user_id);

select extensions.is((select (payload->>'deletedAuthUsers')::int from deletion_results where user_id='ac100000-0000-4000-8000-000000000001'),1,'Founder shared delete removes auth account');
select extensions.is((select (payload->>'deletedAuthUsers')::int from deletion_results where user_id='ac100000-0000-4000-8000-000000000002'),1,'Advisor-only shared delete removes auth account');
select extensions.is((select (payload->>'deletedAuthUsers')::int from deletion_results where user_id='ac100000-0000-4000-8000-000000000003'),1,'Founder plus Advisor shared delete removes auth account');
select extensions.is((select (payload->>'deletedAuthUsers')::int from deletion_results where user_id='ac100000-0000-4000-8000-000000000004'),1,'Network-only shared delete removes auth account without base profile');

select extensions.is((select count(*)::int from auth.users where id::text like 'ac100000-%'),0,'All shared-delete auth users are gone');
select extensions.is((select count(*)::int from public.network_memberships where user_id::text like 'ac100000-%'),0,'All shared-delete Network memberships are gone');
select extensions.is((select count(*)::int from public.network_profiles where user_id::text like 'ac100000-%'),0,'All shared-delete Network profiles are gone');
select extensions.is((select count(*)::int from public.network_listings where owner_user_id::text like 'ac100000-%'),0,'All shared-delete Network listings are gone without orphans');

select * from extensions.finish();
rollback;
