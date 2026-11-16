\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f4300000-0000-4000-8000-000000000001','authenticated','authenticated','news-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f4300000-0000-4000-8000-000000000002','authenticated','authenticated','news-b@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"f4300000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.request_newsletter('settings'), true, 'asking for the first time sends the confirmation mail');
select extensions.is((select status from public.newsletter_subscriptions where user_id = 'f4300000-0000-4000-8000-000000000001'), 'pending', 'and the state is pending, not confirmed');
select extensions.is(public.request_newsletter('settings'), false, 'asking again right away sends no second mail');
select extensions.throws_ok($$select public.request_newsletter('bogus')$$, '22023', 'newsletter_invalid', 'only known sources');
select extensions.throws_ok($$update public.newsletter_subscriptions set status = 'confirmed'$$, '42501', null, 'people cannot confirm themselves by writing the table');
select extensions.throws_ok($$select public.confirm_newsletter('f4300000-0000-4000-8000-000000000001')$$, '42501', null, 'confirming is not for members: only the service after the mail link');

set local request.jwt.claims = '{"sub":"f4300000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.newsletter_subscriptions), 0, 'nobody reads other people''s state');

reset role;
set local role service_role;
select extensions.is(public.confirm_newsletter('f4300000-0000-4000-8000-000000000001'), true, 'the link confirms');
select extensions.is(public.confirm_newsletter('f4300000-0000-4000-8000-000000000001'), false, 'a second click changes nothing');
select extensions.is(public.unsubscribe_newsletter('f4300000-0000-4000-8000-000000000001'), true, 'the mail link unsubscribes');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f4300000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.request_newsletter('dashboard'), true, 'after unsubscribing, a new yes starts again and asks for confirmation');
select extensions.is((select status from public.newsletter_subscriptions where user_id = 'f4300000-0000-4000-8000-000000000001'), 'pending', 'it is pending again, not confirmed');

select * from extensions.finish();
rollback;
