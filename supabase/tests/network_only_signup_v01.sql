\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(23);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000001','authenticated','authenticated','network-signup@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000002','authenticated','authenticated','unsupported-signup@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ea000000-0000-4000-8000-000000000003','authenticated','authenticated','suspended-signup@example.com','',now(),'{}','{}',now(),now());

insert into public.network_signup_intents(email_hash,token_hash,expires_at,created_at) values
(
  encode(extensions.digest(convert_to('network-signup@example.com','UTF8'),'sha256'),'hex'),
  encode(extensions.digest(convert_to('valid-network-token','UTF8'),'sha256'),'hex'),
  now() + interval '1 hour',
  now()
),
(
  encode(extensions.digest(convert_to('unsupported-signup@example.com','UTF8'),'sha256'),'hex'),
  encode(extensions.digest(convert_to('expired-network-token','UTF8'),'sha256'),'hex'),
  now() - interval '1 minute',
  now() - interval '1 hour'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.throws_ok(
  $$insert into public.network_memberships(user_id) values ('ea000000-0000-4000-8000-000000000001')$$,
  '42501', null,
  'client cannot self-provision Network membership'
);
select extensions.throws_ok(
  $$select public.claim_network_signup_intent('ea000000-0000-4000-8000-000000000001',repeat('a',64))$$,
  '42501', null,
  'authenticated client cannot invoke trusted claim function'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select extensions.ok(
  not public.claim_network_signup_intent(
    'ea000000-0000-4000-8000-000000000002',
    encode(extensions.digest(convert_to('valid-network-token','UTF8'),'sha256'),'hex')
  ),
  'valid proof cannot be claimed by an Auth account with another email'
);
select extensions.ok(
  public.claim_network_signup_intent(
    'ea000000-0000-4000-8000-000000000001',
    encode(extensions.digest(convert_to('valid-network-token','UTF8'),'sha256'),'hex')
  ),
  'trusted provisioning consumes an email-bound valid intent'
);
select extensions.ok(
  not public.claim_network_signup_intent(
    'ea000000-0000-4000-8000-000000000001',
    encode(extensions.digest(convert_to('valid-network-token','UTF8'),'sha256'),'hex')
  ),
  'signup intent is one-time and cannot be replayed'
);
select extensions.ok(
  not public.claim_network_signup_intent(
    'ea000000-0000-4000-8000-000000000002',
    encode(extensions.digest(convert_to('expired-network-token','UTF8'),'sha256'),'hex')
  ),
  'expired signup intent cannot provision access'
);
reset role;

select extensions.is(
  (select status from public.network_memberships where user_id='ea000000-0000-4000-8000-000000000001'),
  'active',
  'Network-only membership is active'
);
select extensions.is(
  (select count(*)::int from public.profiles where user_id='ea000000-0000-4000-8000-000000000001'),
  0,
  'Network-only signup creates no base profile or implicit Founder role'
);
select extensions.is(
  (select count(*)::int from public.network_signup_intents where token_hash=encode(extensions.digest(convert_to('valid-network-token','UTF8'),'sha256'),'hex')),
  0,
  'consumed proof is deleted'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select extensions.ok(public.is_network_member(),'provisioned Network-only account has Network access');
select extensions.ok(public.has_network_account(),'provisioned account can reach shared Account settings');
select extensions.ok(not public.is_current_user_discovery_founder(),'Network capability creates no Founder Discovery permission');
select extensions.lives_ok(
  $$insert into public.network_profiles(user_id,display_name,headline,bio,network_roles,status,published_at)
    values(auth.uid(),'Network Person','Startup ecosystem expert','A sufficiently complete member-visible Network biography.',array['business_angel','expert'],'active',now())$$,
  'Network-only member can explicitly publish a Network profile'
);
select extensions.ok(not public.is_current_user_discovery_founder(),'descriptive Business Angel and Expert roles grant no Founder permission');
select extensions.is(
  (select count(*)::int from public.profiles where user_id=auth.uid()),
  0,
  'Network profile publication still creates no base profile'
);

reset role;
insert into public.network_memberships(user_id,status) values
('ea000000-0000-4000-8000-000000000003','suspended');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ea000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select extensions.ok(not public.is_network_member(),'suspension disables all Network product access');
select extensions.ok(public.has_network_account(),'suspension preserves Account settings and self-delete entry');
select extensions.is((select count(*)::int from public.network_profiles),0,'suspended account cannot browse Network profiles');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ea000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select extensions.ok(not public.is_network_member(),'unsupported authenticated account remains outside Network');
select extensions.ok(not public.has_network_account(),'unsupported account receives no Account capability through Network');
select extensions.is((select count(*)::int from public.network_profiles),0,'unsupported account cannot browse published Network profiles');

reset role;
insert into public.profiles(user_id,display_name,roles) values
('ea000000-0000-4000-8000-000000000001','Explicit Founder Upgrade',array['founder']);
select extensions.is(
  (select roles from public.profiles where user_id='ea000000-0000-4000-8000-000000000001'),
  array['founder']::text[],
  'Founder capability appears only after explicit existing Founder profile flow'
);

delete from auth.users where id='ea000000-0000-4000-8000-000000000001';
select extensions.ok(
  not exists(select 1 from public.network_memberships where user_id='ea000000-0000-4000-8000-000000000001')
  and not exists(select 1 from public.network_profiles where user_id='ea000000-0000-4000-8000-000000000001'),
  'account deletion cascades Network-only membership and profile without orphans'
);

select * from extensions.finish();
rollback;
