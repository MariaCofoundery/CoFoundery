\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(42);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000001','authenticated','authenticated','network-a@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000002','authenticated','authenticated','network-b@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000003','authenticated','authenticated','network-c@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000004','authenticated','authenticated','network-d@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000005','authenticated','authenticated','network-e@example.com','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.profiles(user_id,display_name,roles,linkedin_url,intention) values
('a1000000-0000-4000-8000-000000000001','Founder A',array['founder'],'https://private.example/a','Private intention'),
('a1000000-0000-4000-8000-000000000002','Advisor B',array['advisor'],'https://private.example/b','Private advisor note'),
('a1000000-0000-4000-8000-000000000003','Network C','{}','https://private.example/c','Private network-only note'),
('a1000000-0000-4000-8000-000000000004','Unsupported D','{}','https://private.example/d','Private unsupported note'),
('a1000000-0000-4000-8000-000000000005','Founder Advisor E',array['founder','advisor'],'https://private.example/e','Private combined-role note');
insert into public.network_memberships(user_id) values ('a1000000-0000-4000-8000-000000000003');
insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at) values
('a1000000-0000-4000-8000-000000000001','Founder A','Builds climate products','Long enough explicitly published network biography.',array['founder'],'active',now()),
('a1000000-0000-4000-8000-000000000002','Advisor B','Advises early teams','Long enough private draft network biography.',array['advisor_mentor'],'draft',null),
('a1000000-0000-4000-8000-000000000003','Network C','Angel by description','Long enough explicit network-only biography.',array['business_angel'],'active',now());
insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at) values
('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','seeking','expertise','Active current help','A sufficiently long and concrete active summary.','active',now(),now()+interval '60 days'),
('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','offering','sparring','Private draft offer','A sufficiently long and concrete draft summary.','draft',null,null),
('b1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','seeking','cooperation','Paused cooperation','A sufficiently long and concrete paused summary.','paused',now(),now()+interval '20 days'),
('b1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000001','offering','succession','Expired succession','A sufficiently long and concrete expired summary.','active',now()-interval '70 days',now()-interval '10 days'),
('b1000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000001','offering','investment','Completed interest','A sufficiently long and concrete completed summary.','completed',now(),now()+interval '20 days');
insert into public.assessments(id,user_id,module,submitted_at) values
('c1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','base',now());

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true); set local role authenticated;
select extensions.ok(public.is_network_member(), 'founder is eligible');
select extensions.ok(public.is_current_user_discovery_founder(), 'founder rights remain explicit and available');
select extensions.is((select count(*)::int from public.assessments),1,'founder retains access to own assessment');
select extensions.is((select count(*)::int from public.network_profiles where user_id=auth.uid()),1,'owner reads profile');
select extensions.lives_ok($$update public.network_profiles set headline='Updated founder headline' where user_id=auth.uid()$$,'owner updates profile');
select extensions.is((select count(*)::int from public.network_listings),5,'owner reads every listing lifecycle state including expired');
select extensions.lives_ok($$update public.network_listings set status='paused' where id='b1000000-0000-4000-8000-000000000001'$$,'owner pauses');
select extensions.lives_ok($$update public.network_listings set status='completed' where id='b1000000-0000-4000-8000-000000000003'$$,'owner completes');
select extensions.lives_ok($$update public.network_listings set status='active',published_at=now(),expires_at=now()+interval '60 days' where id='b1000000-0000-4000-8000-000000000002'$$,'owner publishes or renews');
select extensions.is((select category from public.network_listings where id='b1000000-0000-4000-8000-000000000002'),'sparring','listing category remains generic and excludes co-founder');

reset role; select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000005","role":"authenticated"}',true); set local role authenticated;
select extensions.ok(public.is_network_member(), 'founder plus advisor is a Network member');
select extensions.ok(public.is_current_user_discovery_founder(), 'founder plus advisor keeps founder access');
select extensions.is((select roles from public.profiles where user_id=auth.uid()),array['founder','advisor']::text[],'combined technical roles remain unchanged');

reset role; select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true); set local role authenticated;
select extensions.ok(public.is_network_member(), 'advisor-only is eligible');
select extensions.ok(not public.is_current_user_discovery_founder(), 'advisor-only receives no Founder Discovery right');
select extensions.is((select count(*)::int from public.network_profiles),3,'advisor member reads own draft and published Network projections only');
select extensions.is((select count(*)::int from public.network_listings),1,'other member reads only active unexpired listing');
select extensions.is((select count(*)::int from public.network_listings where status='draft'),0,'other member cannot read draft');
select extensions.is((select count(*)::int from public.network_listings where status='paused'),0,'other member cannot read paused');
select extensions.is((select count(*)::int from public.network_listings where status='completed'),0,'other member cannot read completed');
select extensions.is((select count(*)::int from public.network_listings where expires_at<=now()),0,'other member cannot read expired');
select extensions.is_empty($$update public.network_listings set title='Foreign mutation' where owner_user_id='a1000000-0000-4000-8000-000000000001' returning id$$,'other member cannot modify listing');
select extensions.throws_ok($$insert into public.network_listings(owner_user_id,direction,category,title,summary) values('a1000000-0000-4000-8000-000000000001','seeking','expertise','Foreign listing','A sufficiently long unauthorized summary.')$$,'42501',null,'other member cannot create for owner');

reset role; select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}',true); set local role authenticated;
select extensions.ok(public.is_network_member(), 'independently provisioned Network-only account has Network access');
select extensions.ok(not public.is_current_user_discovery_founder(), 'Network-only account has no Founder Discovery access');
select extensions.is((select count(*)::int from public.network_profiles),2,'Network-only member can browse published profiles');
select extensions.is((select count(*)::int from public.network_listings),1,'Network-only member can browse current listings');
select extensions.is((select count(*)::int from public.assessments),0,'Network-only member cannot read Founder assessments');
select extensions.throws_ok($$insert into public.assessments(user_id,module) values('a1000000-0000-4000-8000-000000000003','base')$$,'42501',null,'Network-only member cannot create a Founder assessment');
select extensions.is((select roles from public.profiles where user_id=auth.uid()),'{}'::text[],'business angel identity grants no technical Founder or Advisor role');
select extensions.lives_ok($$update public.network_profiles set network_roles=array['expert'] where user_id=auth.uid()$$,'Network-only identity can describe expert role');
select extensions.ok(not public.is_current_user_discovery_founder(), 'expert identity grants no Founder access');
select extensions.lives_ok($$update public.network_profiles set network_roles=array['company_representative'] where user_id=auth.uid()$$,'Network-only identity can describe company representative role');
select extensions.ok(not public.is_current_user_discovery_founder(), 'company representative identity grants no Founder access');

reset role; select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated"}',true); set local role authenticated;
select extensions.ok(not public.is_network_member(), 'unsupported authenticated account has no Network capability');
select extensions.is((select count(*)::int from public.network_profiles),0,'unsupported authenticated account is fail-closed');
select extensions.is((select count(*)::int from public.network_listings),0,'unsupported authenticated account cannot browse');
select extensions.throws_ok($$insert into public.assessments(user_id,module) values('a1000000-0000-4000-8000-000000000004','base')$$,'42501',null,'unsupported account cannot create a Founder assessment');

reset role; set local role anon;
select extensions.throws_ok($$select count(*) from public.network_profiles$$,'42501',null,'unauthenticated profile read denied');
select extensions.throws_ok($$select count(*) from public.network_listings$$,'42501',null,'unauthenticated listing read denied');

reset role;
select extensions.ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='network_profiles' and column_name in ('email','linkedin_url','intention','assessment_answers')),'network projection has no private base or assessment fields');
delete from auth.users where id='a1000000-0000-4000-8000-000000000001';
select extensions.ok(not exists(select 1 from public.network_memberships where user_id='a1000000-0000-4000-8000-000000000001') and not exists(select 1 from public.network_profiles where user_id='a1000000-0000-4000-8000-000000000001') and not exists(select 1 from public.network_listings where owner_user_id='a1000000-0000-4000-8000-000000000001'),'auth deletion cascades membership, profile, and listings without orphans');

select * from extensions.finish(); rollback;
