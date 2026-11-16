\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f4400000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'nl' || n || '@example.com', '', now(), '{}', '{}', now(), now() from generate_series(1, 4) n;
insert into public.platform_admins (user_id) values ('f4400000-0000-4000-8000-000000000001');
-- 2 und 3 haben bestaetigt, 4 nur gefragt.
insert into public.newsletter_subscriptions (user_id, status, source, confirmed_at) values
 ('f4400000-0000-4000-8000-000000000002', 'confirmed', 'settings', now() - interval '2 days'),
 ('f4400000-0000-4000-8000-000000000003', 'confirmed', 'settings', now() - interval '1 day');
insert into public.newsletter_subscriptions (user_id, status, source) values ('f4400000-0000-4000-8000-000000000004', 'pending', 'settings');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, service_role;

-- Nicht-Admin: nichts.
set local role authenticated;
set local request.jwt.claims = '{"sub":"f4400000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select * from public.admin_list_newsletter_issues()$$, '42501', 'admin_required', 'members cannot list issues');
select extensions.throws_ok($$select public.admin_save_newsletter_issue(null, '{}'::jsonb)$$, '42501', 'admin_required', 'members cannot write issues');
select extensions.throws_ok($$select * from public.newsletter_issues$$, '42501', null, 'the table is closed to clients');

-- Admin.
set local request.jwt.claims = '{"sub":"f4400000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids select 'i1', public.admin_save_newsletter_issue(null, '{"title":"Ausgabe 1","subject":"Hallo","blocks":[{"type":"text","text":"Hi"}]}'::jsonb);
select extensions.is((select subject from public.admin_get_newsletter_issue((select v from ids where k = 'i1'))), 'Hallo', 'the admin saves and reads an issue');
select extensions.throws_ok($$select public.admin_save_newsletter_issue(null, '{"look":"neon"}'::jsonb)$$, '23514', null, 'unknown looks are rejected');
select extensions.throws_ok($$select public.admin_set_newsletter_status((select v from ids where k = 'i1'), 'scheduled', now() - interval '1 day')$$, '22023', 'newsletter_time', 'scheduling in the past is rejected');
select extensions.ok(public.admin_set_newsletter_status((select v from ids where k = 'i1'), 'scheduled', now() + interval '1 hour'), 'a complete draft can be scheduled');
select extensions.throws_ok($$select public.admin_save_newsletter_issue((select v from ids where k = 'i1'), '{"subject":"Neu"}'::jsonb)$$, '55000', 'newsletter_locked', 'a scheduled issue is locked');
select extensions.is((select confirmed from public.admin_newsletter_stats()), 2::bigint, 'the stats count only confirmed people');

-- Eintraege: nur mit Haekchen.
reset role;
insert into public.network_memberships(user_id, status) values ('f4400000-0000-4000-8000-000000000002', 'active');
insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at) values ('f4400000-0000-4000-8000-000000000002', 'Mara', 'Zeile zwei', 'Ein Text mit genug Zeichen drin.', array['founder'], 'active', now());
insert into public.network_listings(id, owner_user_id, direction, category, title, summary, status, published_at, expires_at)
values ('f4400000-0000-4000-8000-0000000000a1', 'f4400000-0000-4000-8000-000000000002', 'seeking', 'expertise', 'Steuerberaterin gesucht', 'Eine Zusammenfassung mit genug Zeichen fuer die Regel.', 'active', now(), now() + interval '30 days'),
       ('f4400000-0000-4000-8000-0000000000a2', 'f4400000-0000-4000-8000-000000000002', 'seeking', 'expertise', 'Ohne Haekchen', 'Eine Zusammenfassung mit genug Zeichen fuer die Regel.', 'active', now(), now() + interval '30 days');
set local role authenticated;
set local request.jwt.claims = '{"sub":"f4400000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.ok(public.set_allow_in_mails('listing', 'f4400000-0000-4000-8000-0000000000a1', true), 'the owner sets the mail permission');
set local request.jwt.claims = '{"sub":"f4400000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.set_allow_in_mails('listing', 'f4400000-0000-4000-8000-0000000000a2', true)$$, '42501', 'mails_not_yours', 'others cannot set it');
set local request.jwt.claims = '{"sub":"f4400000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.admin_newsletter_candidates(21)), 1, 'only entries with the permission are candidates');

-- Versand: Dienst.
reset role;
set local role service_role;
select extensions.is((select count(*)::int from public.due_newsletter_issues()), 0, 'a future issue is not due yet');
reset role;
update public.newsletter_issues set scheduled_for = now() - interval '1 minute' where id = (select v from ids where k = 'i1');
set local role service_role;
select extensions.is((select count(*)::int from public.due_newsletter_issues()), 1, 'a due issue switches to sending');
select extensions.is((select count(*)::int from public.claim_newsletter_batch((select v from ids where k = 'i1'), 1)), 1, 'the first batch picks one confirmed person');
select extensions.is((select count(*)::int from public.claim_newsletter_batch((select v from ids where k = 'i1'), 10)), 1, 'the next batch picks the rest - never the same person twice, never an unconfirmed one');
select extensions.ok(public.finish_newsletter_if_done((select v from ids where k = 'i1')), 'when nobody is left the issue counts as sent');

select * from extensions.finish();
rollback;
