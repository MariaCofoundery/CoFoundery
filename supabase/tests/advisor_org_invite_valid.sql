\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ec000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name, status) values
('ec000000-0000-4000-8000-0000000000a0', 'Programm Fuenfzehn', 'active'),
('ec000000-0000-4000-8000-0000000000a1', 'Programm Sechzehn', 'suspended');
insert into public.advisor_org_invites(org_id, invitee_email, token_hash, status, claimed_at, expires_at) values
('ec000000-0000-4000-8000-0000000000a0', 'offen@example.com', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'sent', null, now() + interval '5 days'),
('ec000000-0000-4000-8000-0000000000a0', 'benutzt@example.com', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'claimed', now(), now() + interval '5 days'),
('ec000000-0000-4000-8000-0000000000a0', 'alt@example.com', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', 'sent', null, now() - interval '1 day'),
('ec000000-0000-4000-8000-0000000000a1', 'ausgesetzt@example.com', 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', 'sent', null, now() + interval '5 days');

set local role anon;
select extensions.is(public.is_valid_advisor_org_invite('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), true, 'an open invite is valid, also without login');
select extensions.is(public.is_valid_advisor_org_invite('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'), false, 'a used invite is not valid');
select extensions.is(public.is_valid_advisor_org_invite('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'), false, 'an expired invite is not valid');
select extensions.is(public.is_valid_advisor_org_invite('dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'), false, 'an invite of a suspended organization is not valid');
select extensions.is(public.is_valid_advisor_org_invite('e'), false, 'an unknown token is not valid');
select extensions.is(public.is_valid_advisor_org_invite(null), false, 'no token is not valid');

select * from extensions.finish();
rollback;
