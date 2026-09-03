\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(33);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','cross-founder@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','cross-network@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','cross-unsupported@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000004','authenticated','authenticated','cross-legacy-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000005','authenticated','authenticated','cross-legacy-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000006','authenticated','authenticated','cross-sent@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000007','authenticated','authenticated','cross-expired@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000008','authenticated','authenticated','cross-revoked@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000009','authenticated','authenticated','cross-outsider@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-00000000000a','authenticated','authenticated','cross-delete@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-00000000000b','authenticated','authenticated','cross-advisor@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-00000000000c','authenticated','authenticated','cross-both@example.com','',now(),'{}','{}',now(),now());

insert into public.profiles(user_id,display_name,roles) values
('d1000000-0000-4000-8000-000000000001','Cross Founder',array['founder']),
('d1000000-0000-4000-8000-000000000002','Cross Network','{}'),
('d1000000-0000-4000-8000-000000000003','Cross Unsupported','{}'),
('d1000000-0000-4000-8000-00000000000b','Cross Advisor',array['advisor']),
('d1000000-0000-4000-8000-00000000000c','Cross Both',array['founder','advisor']);

insert into public.network_memberships(user_id) values
('d1000000-0000-4000-8000-000000000002'),
('d1000000-0000-4000-8000-00000000000a');

insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at) values
('d1000000-0000-4000-8000-000000000002','Cross Network','Network-only member','A deliberately published Network-only biography.',array['expert'],'active',now()),
('d1000000-0000-4000-8000-00000000000a','Cross Delete','Deletion fixture','A Network-only account deletion test biography.',array['business_angel'],'active',now());

insert into public.network_listings(id,owner_user_id,direction,category,title,summary,status,published_at,expires_at) values
('e1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','offering','expertise','Network expertise','A sufficiently concrete current Network-only listing.','active',now(),now()+interval '60 days'),
('e1000000-0000-4000-8000-00000000000a','d1000000-0000-4000-8000-00000000000a','seeking','investment','Deletion listing','A sufficiently concrete listing for account deletion.','active',now(),now()+interval '60 days');

insert into public.invitations(
  id,inviter_user_id,invitee_email,invitee_user_id,status,token_hash,expires_at,accepted_at,revoked_at
) values
('f1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000004','cross-legacy-b@example.com','d1000000-0000-4000-8000-000000000005','accepted',repeat('1',64),now()+interval '1 day',now(),null),
('f1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000006','cross-legacy-b@example.com','d1000000-0000-4000-8000-000000000005','sent',repeat('2',64),now()+interval '1 day',null,null),
('f1000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000007','cross-legacy-b@example.com','d1000000-0000-4000-8000-000000000005','accepted',repeat('3',64),now()-interval '1 day',now()-interval '2 days',null),
('f1000000-0000-4000-8000-000000000004','d1000000-0000-4000-8000-000000000008','cross-legacy-b@example.com','d1000000-0000-4000-8000-000000000005','revoked',repeat('4',64),now()+interval '1 day',null,now()),
('f1000000-0000-4000-8000-000000000005','d1000000-0000-4000-8000-000000000001','cross-legacy-b@example.com','d1000000-0000-4000-8000-000000000005','accepted',repeat('5',64),now()+interval '1 day',now(),null);

insert into public.assessments(id,user_id,module,submitted_at) values
('a2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','base',now()),
('a2000000-0000-4000-8000-000000000004','d1000000-0000-4000-8000-000000000004','base',now()),
('a2000000-0000-4000-8000-000000000005','d1000000-0000-4000-8000-000000000005','base',now());

insert into public.assessment_answers(assessment_id,question_id,choice_value) values
('a2000000-0000-4000-8000-000000000004','D1_Q1','1'),
('a2000000-0000-4000-8000-000000000005','D1_Q1','4');

select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(public.has_founder_assessment_access(),'Founder retains assessment access');
select extensions.is((select count(*)::int from public.assessments where user_id=auth.uid()),1,'Founder reads own base assessment');

reset role;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.has_founder_assessment_access(),'Network-only has no Founder assessment capability');
select extensions.is((select count(*)::int from public.assessments),0,'Network-only reads no Founder assessments');
select extensions.throws_ok($$insert into public.assessments(user_id,module) values(auth.uid(),'base')$$,'42501',null,'Network-only cannot create Founder assessment');

reset role;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.has_founder_assessment_access(),'Unsupported roleless account has no Founder assessment capability');
select extensions.is((select count(*)::int from public.assessments),0,'Unsupported roleless account reads no assessments');
select extensions.throws_ok($$insert into public.assessments(user_id,module) values(auth.uid(),'base')$$,'42501',null,'Unsupported roleless account cannot create assessment');

reset role;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(public.has_founder_assessment_access(),'Accepted unexpired legacy invitation participant keeps scoped assessment capability');
select extensions.is((select count(*)::int from public.assessments),2,'Legacy participant sees only the two submitted assessments in own accepted invitation');
select extensions.is((select count(*)::int from public.assessment_answers),1,'Legacy participant sees only own raw answer');
select extensions.is((select count(*)::int from public.assessment_answers where assessment_id='a2000000-0000-4000-8000-000000000005'),0,'Foreign invitation raw answer remains denied');

reset role;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.has_founder_assessment_access(),'Sent or pending-equivalent invitation grants no assessment exception');
select extensions.is((select count(*)::int from public.assessments),0,'Sent invitation participant reads no assessments');

reset role;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000007","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.has_founder_assessment_access(),'Expired invitation grants no assessment exception');

reset role;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000008","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.has_founder_assessment_access(),'Revoked invitation grants no assessment exception');

reset role;
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000009","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.has_founder_assessment_access(),'Unrelated account gains nothing from a foreign accepted invitation');
select extensions.is((select count(*)::int from public.assessments),0,'Unrelated account reads no foreign assessment');

reset role;
select extensions.ok(exists(select 1 from public.network_memberships where user_id='d1000000-0000-4000-8000-000000000001'),'Founder role granted Network membership');
update public.network_memberships set status='suspended' where user_id='d1000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.is_network_member(),'Explicit Network revoke removes Founder Network access');
select extensions.ok(public.is_current_user_discovery_founder(),'Explicit Network revoke does not remove Founder rights');
reset role;
update public.network_memberships set status='active' where user_id='d1000000-0000-4000-8000-000000000001';
update public.profiles set roles='{}' where user_id='d1000000-0000-4000-8000-000000000001';
select extensions.ok(exists(select 1 from public.network_memberships where user_id='d1000000-0000-4000-8000-000000000001' and status='active'),'Founder role removal preserves independent Network membership');
select extensions.ok(exists(select 1 from public.network_memberships where user_id='d1000000-0000-4000-8000-00000000000b'),'Advisor role granted Network membership');
update public.profiles set roles='{}' where user_id='d1000000-0000-4000-8000-00000000000b';
select extensions.ok(exists(select 1 from public.network_memberships where user_id='d1000000-0000-4000-8000-00000000000b' and status='active'),'Advisor role removal preserves independent Network membership');
update public.profiles set roles=array['advisor'] where user_id='d1000000-0000-4000-8000-00000000000c';
select extensions.ok(exists(select 1 from public.network_memberships where user_id='d1000000-0000-4000-8000-00000000000c' and status='active'),'Founder removal from combined account preserves membership');
update public.profiles set roles='{}' where user_id='d1000000-0000-4000-8000-00000000000c';
select extensions.ok(exists(select 1 from public.network_memberships where user_id='d1000000-0000-4000-8000-00000000000c' and status='active'),'Removal of both product roles preserves membership');

update public.network_memberships set status='suspended' where user_id='d1000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims','{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select extensions.ok(not public.is_network_member(),'Explicit Network suspension revokes access immediately');
select extensions.is((select count(*)::int from public.network_profiles),0,'Suspended member cannot browse or read own Network profile');
select extensions.is((select count(*)::int from public.network_listings),0,'Suspended member cannot browse or read own listing');
select extensions.is_empty($$update public.network_listings set title='Denied mutation' where owner_user_id=auth.uid() returning id$$,'Suspended member cannot mutate own listing');

reset role;
select extensions.ok(exists(select 1 from public.network_profiles where user_id='d1000000-0000-4000-8000-000000000002') and exists(select 1 from public.network_listings where owner_user_id='d1000000-0000-4000-8000-000000000002'),'Suspension retains Network profile and listings for possible reactivation');

create temporary table deletion_result(payload jsonb);
insert into deletion_result(payload)
select public.delete_founder_account_data('d1000000-0000-4000-8000-00000000000a',null);
select extensions.is((select (payload->>'deletedAuthUsers')::int from deletion_result),1,'Existing privileged account deletion removes Network-only auth user without base profile');
select extensions.ok(
  not exists(select 1 from auth.users where id='d1000000-0000-4000-8000-00000000000a')
  and not exists(select 1 from public.profiles where user_id='d1000000-0000-4000-8000-00000000000a')
  and not exists(select 1 from public.network_memberships where user_id='d1000000-0000-4000-8000-00000000000a')
  and not exists(select 1 from public.network_profiles where user_id='d1000000-0000-4000-8000-00000000000a')
  and not exists(select 1 from public.network_listings where owner_user_id='d1000000-0000-4000-8000-00000000000a'),
  'Network-only deletion leaves no Network orphan or FK blocker'
);

select * from extensions.finish();
rollback;
