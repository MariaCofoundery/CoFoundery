\set ON_ERROR_STOP on

create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

drop index if exists public.network_listings_locations_idx;
drop index if exists public.network_listings_scope_idx;
alter table public.network_listings
  drop constraint if exists network_listings_geographic_scope_check,
  drop constraint if exists network_listings_remote_category_check,
  drop constraint if exists network_listings_stage_category_check,
  drop constraint if exists network_listings_locations_check,
  drop constraint if exists network_listings_content_dates_check,
  drop column if exists locations,
  drop column if exists geographic_scope,
  drop column if exists starts_on,
  drop column if exists ends_on;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ad300000-0000-4000-8000-000000000001','authenticated','authenticated','network-repair-owner@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ad300000-0000-4000-8000-000000000002','authenticated','authenticated','network-repair-reader@example.com','',now(),'{}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles) values
('ad300000-0000-4000-8000-000000000001','Repair Owner',array['founder']),
('ad300000-0000-4000-8000-000000000002','Repair Reader',array['founder']);
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at)
values ('ad300000-0000-4000-8000-000000000001','Repair Owner','Tests the historical upgrade','A sufficiently complete Network repair biography.',array['founder'],'active',now());
insert into public.network_listings(id,owner_user_id,direction,category,title,summary,location_region,remote_mode,timeframe,venture_stage,status,published_at,expires_at) values
('ae300000-0000-4000-8000-000000000001','ad300000-0000-4000-8000-000000000001','seeking','expertise','Legacy Berlin listing','A sufficiently complete active legacy listing summary.','  Berlin  ','hybrid','Ab Oktober','early','active',now(),now()+interval '60 days'),
('ae300000-0000-4000-8000-000000000002','ad300000-0000-4000-8000-000000000001','offering','investment','Legacy investment listing','A sufficiently complete legacy investment summary.',null,'remote','Flexible','growth','draft',null,null),
('ae300000-0000-4000-8000-000000000003','ad300000-0000-4000-8000-000000000001','offering','succession','Legacy succession listing','A sufficiently complete legacy succession summary.','', 'onsite','Perspektivisch','established','paused',now(),now()+interval '20 days'),
('ae300000-0000-4000-8000-000000000004','ad300000-0000-4000-8000-000000000001','offering','sparring','Legacy sparring listing','A sufficiently complete legacy sparring summary.','Hamburg','remote','Laufend','early','draft',null,null);

-- The Supabase pgTAP runner executes test files inside its database container and
-- cannot include an unmounted migration via \ir. Reproduce the additive repair
-- here after constructing the historical schema/data shape. The app contract test
-- separately pins the migration source and these normalization statements.
alter table public.network_listings
  add column if not exists locations text[] default '{}',
  add column if not exists geographic_scope text,
  add column if not exists starts_on date,
  add column if not exists ends_on date;

update public.network_listings
set locations = '{}'
where locations is null;

update public.network_listings
set locations = array[btrim(location_region)]
where cardinality(locations) = 0
  and nullif(btrim(location_region), '') is not null;

update public.network_listings
set remote_mode = null
where category in ('investment', 'succession')
  and remote_mode is not null;

update public.network_listings
set venture_stage = null
where category not in ('expertise', 'cooperation', 'investment')
  and venture_stage is not null;

alter table public.network_listings
  alter column locations set default '{}',
  alter column locations set not null,
  add constraint network_listings_geographic_scope_check
    check (geographic_scope is null or geographic_scope in ('regional','germany','europe','global')),
  add constraint network_listings_remote_category_check
    check (remote_mode is null or category in ('expertise','cooperation','sparring')),
  add constraint network_listings_stage_category_check
    check (venture_stage is null or category in ('expertise','cooperation','investment')),
  add constraint network_listings_locations_check
    check (cardinality(locations) <= 3),
  add constraint network_listings_content_dates_check
    check (starts_on is null or ends_on is null or ends_on >= starts_on);

create index if not exists network_listings_locations_idx
  on public.network_listings using gin (locations);
create index if not exists network_listings_scope_idx
  on public.network_listings (geographic_scope, published_at desc)
  where status = 'active';

select extensions.is((select locations from public.network_listings where id='ae300000-0000-4000-8000-000000000001'),array['Berlin']::text[],'legacy location becomes one trimmed location entry');
select extensions.is((select locations from public.network_listings where id='ae300000-0000-4000-8000-000000000002'),'{}'::text[],'missing legacy location remains an empty locations array');
select extensions.is((select timeframe from public.network_listings where id='ae300000-0000-4000-8000-000000000001'),'Ab Oktober','legacy timeframe text is retained');
select extensions.ok((select starts_on is null and ends_on is null from public.network_listings where id='ae300000-0000-4000-8000-000000000001'),'legacy timeframe does not invent content dates');
select extensions.ok((select owner_user_id='ad300000-0000-4000-8000-000000000001' and status='active' from public.network_listings where id='ae300000-0000-4000-8000-000000000001'),'repair preserves listing id, owner, and lifecycle status');
select extensions.ok((select remote_mode is null and venture_stage='growth' from public.network_listings where id='ae300000-0000-4000-8000-000000000002'),'investment remote mode is cleared while its supported stage remains');
select extensions.ok((select remote_mode is null and venture_stage is null from public.network_listings where id='ae300000-0000-4000-8000-000000000003'),'succession remote mode and unsupported stage are cleared');
select extensions.ok((select remote_mode='remote' and venture_stage is null from public.network_listings where id='ae300000-0000-4000-8000-000000000004'),'sparring keeps supported remote mode and clears unsupported stage');
select extensions.ok((select count(*)=2 from information_schema.columns where table_schema='public' and table_name='network_listings' and column_name in ('location_region','timeframe')),'both legacy data columns remain present');
select extensions.lives_ok($$update public.network_listings set geographic_scope='europe' where id='ae300000-0000-4000-8000-000000000001'$$,'new geographic scope accepts the current contract');
select extensions.lives_ok($$update public.network_listings set starts_on='2026-10-01',ends_on='2026-12-31' where id='ae300000-0000-4000-8000-000000000001'$$,'new content dates accept a valid range');
select extensions.throws_ok($$update public.network_listings set starts_on='2026-12-01',ends_on='2026-10-01' where id='ae300000-0000-4000-8000-000000000001'$$,'23514',null,'content end before start is denied');
select extensions.throws_ok($$update public.network_listings set remote_mode='remote' where id='ae300000-0000-4000-8000-000000000002'$$,'23514',null,'investment rejects remote collaboration mode after repair');
select extensions.throws_ok($$update public.network_listings set venture_stage='early' where id='ae300000-0000-4000-8000-000000000003'$$,'23514',null,'succession rejects venture stage after repair');

select set_config('request.jwt.claims','{"sub":"ad300000-0000-4000-8000-000000000002","role":"authenticated"}',false); set role authenticated;
select extensions.is((select count(*)::int from public.network_listings where id='ae300000-0000-4000-8000-000000000001'),1,'another Network member can read the upgraded active legacy listing');
reset role; set role anon;
select extensions.throws_ok($$select count(*) from public.network_listings$$,'42501',null,'unauthenticated listing browse remains denied');
reset role;
select extensions.ok(
  to_regclass('public.network_listings_locations_idx') is not null
  and to_regclass('public.network_listings_scope_idx') is not null,
  'repair creates both required listing indexes'
);

delete from auth.users where id in ('ad300000-0000-4000-8000-000000000001','ad300000-0000-4000-8000-000000000002');
select * from extensions.finish();
