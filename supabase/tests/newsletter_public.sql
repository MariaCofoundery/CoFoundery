\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(21);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f6600000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'np' || n || '@example.com', '', now(), '{}', '{}', now(), now() from generate_series(1, 3) n;
insert into public.platform_admins (user_id) values ('f6600000-0000-4000-8000-000000000001');
-- Mitglied 2 hat bestaetigt (np2@example.com).
insert into public.newsletter_subscriptions (user_id, status, source, confirmed_at) values ('f6600000-0000-4000-8000-000000000002', 'confirmed', 'settings', now() - interval '3 days');
create temp table ids (k text primary key, v uuid);
grant all on ids to service_role, authenticated;

-- Kein Browser kommt an die Liste oder die Funktionen.
set local role anon;
select extensions.throws_ok($$select * from public.newsletter_public_subscribers$$, '42501', null, 'anon cannot read the list');
select extensions.throws_ok($$select * from public.request_public_newsletter('a@example.com', 'de')$$, '42501', null, 'anon cannot request through the database');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f6600000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select * from public.confirm_public_newsletter(gen_random_uuid())$$, '42501', null, 'members cannot confirm for others');
reset role;

-- Anfragen (Dienst).
set local role service_role;
select extensions.is((select result from public.request_public_newsletter('nope', 'de')), 'invalid', 'a bad address is invalid');
insert into ids select 'a', subscriber_id from public.request_public_newsletter('  Anna@Example.COM ', 'de');
select extensions.is((select email from public.get_public_newsletter_subscriber((select v from ids where k = 'a'))), 'anna@example.com', 'addresses are stored lowercase and trimmed');
select extensions.is((select result from public.request_public_newsletter('anna@example.com', 'de')), 'wait', 'a second request within ten minutes waits');
select extensions.is((select status from public.get_public_newsletter_subscriber((select v from ids where k = 'a'))), 'pending', 'it is pending until confirmed');
select extensions.is(public.confirm_public_newsletter((select v from ids where k = 'a')), true, 'confirming counts once');
select extensions.is(public.confirm_public_newsletter((select v from ids where k = 'a')), false, 'and not twice');
select extensions.is((select result from public.request_public_newsletter('anna@example.com', 'de')), 'already', 'a confirmed address is told nothing new');
select extensions.is(public.claim_public_newsletter_welcome((select v from ids where k = 'a')), true, 'the welcome mail is claimed once');
select extensions.is(public.claim_public_newsletter_welcome((select v from ids where k = 'a')), false, 'and only once');
reset role;

-- Weitere Adressen: eine englische, eine, die auch Mitglied ist.
set local role service_role;
insert into ids select 'b', subscriber_id from public.request_public_newsletter('ben@example.com', 'en');
select public.confirm_public_newsletter((select v from ids where k = 'b'));
insert into ids select 'm', subscriber_id from public.request_public_newsletter('np2@example.com', 'de');
select public.confirm_public_newsletter((select v from ids where k = 'm'));
reset role;

-- Zielgruppen.
insert into public.newsletter_issues (id, subject, blocks, status, scheduled_for, language, audience)
values ('f6600000-0000-4000-8000-0000000000a1', 'Hallo', '[{"id":"a","type":"text","text":"Hi"}]', 'sending', now(), 'de', 'public'),
       ('f6600000-0000-4000-8000-0000000000a2', 'Hallo alle', '[{"id":"a","type":"text","text":"Hi"}]', 'sending', now(), 'de', 'all'),
       ('f6600000-0000-4000-8000-0000000000a3', 'Hello', '[{"id":"a","type":"text","text":"Hi"}]', 'sending', now(), 'en', 'public');
set local role service_role;
select extensions.is((select count(*)::int from public.claim_newsletter_batch('f6600000-0000-4000-8000-0000000000a1', 10)), 0, 'a public-only issue claims no members');
select extensions.is((select string_agg(email, ',' order by email) from public.claim_newsletter_public_batch('f6600000-0000-4000-8000-0000000000a1', 10)), 'anna@example.com,np2@example.com', 'a public issue reaches the German list, including an address that is also a member');
select extensions.is((select count(*)::int from public.claim_newsletter_public_batch('f6600000-0000-4000-8000-0000000000a1', 10)), 0, 'and never the same person twice');
select extensions.is((select string_agg(email, ',') from public.claim_newsletter_public_batch('f6600000-0000-4000-8000-0000000000a3', 10)), 'ben@example.com', 'an English issue reaches only the English list');
select extensions.is((select string_agg(email, ',' order by email) from public.claim_newsletter_public_batch('f6600000-0000-4000-8000-0000000000a2', 10)), 'anna@example.com', 'for "all" a member-and-list address gets it as a member, not twice');
select extensions.is((select count(*)::int from public.claim_newsletter_batch('f6600000-0000-4000-8000-0000000000a2', 10)), 1, 'the member gets it');
select extensions.ok(public.finish_newsletter_if_done('f6600000-0000-4000-8000-0000000000a2'), 'it is done when both groups are served');

-- Abmelden bleibt als Sperre.
select extensions.is(public.unsubscribe_public_newsletter((select v from ids where k = 'a')), true, 'unsubscribing works');
select extensions.is((select count(*)::int from public.claim_newsletter_public_batch('f6600000-0000-4000-8000-0000000000a2', 10)), 0, 'and an unsubscribed address gets nothing');
reset role;

select * from extensions.finish();
rollback;
