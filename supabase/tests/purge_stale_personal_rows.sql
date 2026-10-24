\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-000000000000','b1000001-0001-4001-8001-00000000000a','authenticated','authenticated','purge-a@example.com','',now(),'{}','{}',now(),now());

-- Feedback: ein altes mit Person, ein neues mit Person.
insert into public.product_feedback (id, user_id, source, q1_value, q2_value, q3_value, q5_text, created_at) values
 ('b2000001-0000-4000-8000-000000000001','b1000001-0001-4001-8001-00000000000a','nav','4','3','5','alt', now() - interval '90 days'),
 ('b2000002-0000-4000-8000-000000000002','b1000001-0001-4001-8001-00000000000a','nav','4','3','5','neu', now() - interval '10 days');

-- Einladungen: alt und nie angenommen, alt und angenommen, frisch abgelaufen.
insert into public.invitations (id, inviter_user_id, invitee_email, token_hash, status, expires_at, accepted_at) values
 ('b3000001-0000-4000-8000-000000000001','b1000001-0001-4001-8001-00000000000a','x1@example.com','h1','expired', now() - interval '90 days', null),
 ('b3000002-0000-4000-8000-000000000002','b1000001-0001-4001-8001-00000000000a','x2@example.com','h2','accepted', now() - interval '90 days', now() - interval '95 days'),
 ('b3000003-0000-4000-8000-000000000003','b1000001-0001-4001-8001-00000000000a','x3@example.com','h3','expired', now() - interval '10 days', null);

select extensions.is((public.purge_stale_personal_rows()->>'anonymizedFeedback')::int, 1, 'one old feedback is anonymized');
select extensions.is((select user_id from public.product_feedback where id = 'b2000001-0000-4000-8000-000000000001'), null, 'the old feedback lost its person');
select extensions.is((select q5_text from public.product_feedback where id = 'b2000001-0000-4000-8000-000000000001'), 'alt', 'but keeps its text');
select extensions.isnt((select user_id from public.product_feedback where id = 'b2000002-0000-4000-8000-000000000002'), null, 'the recent feedback keeps its person');
select extensions.is((select count(*)::int from public.invitations where id = 'b3000001-0000-4000-8000-000000000001'), 0, 'the old unaccepted invitation is gone');
select extensions.is((select count(*)::int from public.invitations where id = 'b3000002-0000-4000-8000-000000000002'), 1, 'an accepted invitation stays');
select extensions.is((select count(*)::int from public.invitations where id = 'b3000003-0000-4000-8000-000000000003'), 1, 'a recently expired invitation stays');
select extensions.throws_ok($$select public.purge_stale_personal_rows(5, 60)$$, 'P0001', 'invalid_retention_days', 'too short a period is refused');
set local role authenticated;
select extensions.throws_ok($$select public.purge_stale_personal_rows()$$, '42501', null, 'signed-in users cannot run it');

select * from extensions.finish();
rollback;
