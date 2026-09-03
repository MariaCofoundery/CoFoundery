\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','ac200000-0000-4000-8000-000000000001','authenticated','authenticated','network-ux@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values ('ac200000-0000-4000-8000-000000000001','Network UX',array['founder']);
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at)
values ('ac200000-0000-4000-8000-000000000001','Network UX','UX test profile','A sufficiently complete Network UX test biography.',array['founder'],'active',now());

select extensions.lives_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,locations,geographic_scope,remote_mode,starts_on,status)
  values ('ac200000-0000-4000-8000-000000000001','seeking','expertise','Expertise in Berlin','A sufficiently complete listing summary for UX tests.',array['Berlin'],'regional','hybrid','2026-10-01','draft')
$$,'one location, scope, remote mode, and start-only content date are accepted');

select extensions.lives_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,locations,geographic_scope,starts_on,ends_on,status)
  values ('ac200000-0000-4000-8000-000000000001','offering','investment','Investment across Europe','A sufficiently complete investment listing summary.',array['Berlin','Hamburg','Paris'],'europe','2026-10-01','2026-12-31','draft')
$$,'three locations, investment scope, and valid date range are accepted');

select extensions.throws_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,locations,status)
  values ('ac200000-0000-4000-8000-000000000001','seeking','cooperation','Too many locations','A sufficiently complete listing summary for UX tests.',array['Berlin','Hamburg','Köln','München'],'draft')
$$,'23514',null,'more than three locations are rejected');

select extensions.throws_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,starts_on,ends_on,status)
  values ('ac200000-0000-4000-8000-000000000001','seeking','sparring','Invalid content dates','A sufficiently complete listing summary for UX tests.','2026-12-01','2026-10-01','draft')
$$,'23514',null,'content end before content start is rejected');

select extensions.throws_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,remote_mode,status)
  values ('ac200000-0000-4000-8000-000000000001','offering','investment','Remote investment','A sufficiently complete listing summary for UX tests.','remote','draft')
$$,'23514',null,'investment rejects irrelevant remote work mode');

select extensions.throws_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,remote_mode,status)
  values ('ac200000-0000-4000-8000-000000000001','offering','succession','Remote succession','A sufficiently complete listing summary for UX tests.','hybrid','draft')
$$,'23514',null,'succession rejects irrelevant remote work mode');

select extensions.lives_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,geographic_scope,status)
  values ('ac200000-0000-4000-8000-000000000001','offering','succession','Global succession','A sufficiently complete listing summary for UX tests.','global','draft')
$$,'succession supports geographic scope without remote mode');

select extensions.throws_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,geographic_scope,status)
  values ('ac200000-0000-4000-8000-000000000001','seeking','expertise','Invalid scope value','A sufficiently complete listing summary for UX tests.','worldwide','draft')
$$,'23514',null,'unknown geographic scope is rejected');

select extensions.lives_ok($$
  insert into public.network_listings(owner_user_id,direction,category,title,summary,starts_on,ends_on,status,published_at,expires_at)
  values ('ac200000-0000-4000-8000-000000000001','offering','cooperation','Independent expiry','A sufficiently complete listing summary for UX tests.','2027-01-01','2027-12-31','active',now(),now()+interval '60 days')
$$,'content timeframe is independent from the 60-day listing expiry');

select extensions.ok(not exists (
  select 1 from information_schema.columns where table_schema='public' and table_name='network_listings' and column_name in ('location_region','timeframe')
),'legacy ambiguous listing location and timeframe columns are absent');

select extensions.ok(exists (
  select 1 from information_schema.columns where table_schema='public' and table_name='network_listings' and column_name='expires_at' and data_type='timestamp with time zone'
) and exists (
  select 1 from information_schema.columns where table_schema='public' and table_name='network_listings' and column_name='starts_on' and data_type='date'
),'publication expiry and content dates remain distinct types');

select * from extensions.finish();
rollback;
