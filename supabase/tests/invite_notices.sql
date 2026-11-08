\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- ---------------------------------------------------------------------------
-- Hinweise bei Einladungen (20270328120000): 1 Einladende/Inhaberin, 2 Eingeladene (bestaetigt), 3 Eingeladene
-- (Adresse unbestaetigt), 4 Unbeteiligte.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ea100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'inv' || n || '@example.com', '',
       case when n = 3 then null else now() end, '{}', '{}', now(), now()
from generate_series(1, 4) n;
insert into public.advisor_orgs(id, name) values ('ea100000-0000-4000-8000-0000000000a0', 'Einladungs Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ea100000-0000-4000-8000-0000000000a0','ea100000-0000-4000-8000-000000000001','owner','active');

insert into public.advisor_org_invites(org_id, invited_by_user_id, invitee_email, token_hash, role) values
('ea100000-0000-4000-8000-0000000000a0','ea100000-0000-4000-8000-000000000001','inv2@example.com', repeat('a', 64), 'advisor'),
('ea100000-0000-4000-8000-0000000000a0','ea100000-0000-4000-8000-000000000001','inv3@example.com', repeat('b', 64), 'advisor'),
('ea100000-0000-4000-8000-0000000000a0','ea100000-0000-4000-8000-000000000001','niemand@example.com', repeat('c', 64), 'advisor');

create temp table ids (key text primary key, id uuid);
grant select on ids to authenticated;
insert into ids select 'org2', id from public.advisor_org_invites where invitee_email = 'inv2@example.com';
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'advisor_org_invited' and recipient_user_id = 'ea100000-0000-4000-8000-000000000002'), 1, 'a confirmed account with that address gets a notice');
select extensions.is((select path from public.in_app_notices where kind = 'advisor_org_invited' and recipient_user_id = 'ea100000-0000-4000-8000-000000000002'), '/einladungen', 'it leads to the invitations page');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'advisor_org_invited' and recipient_user_id = 'ea100000-0000-4000-8000-000000000003'), 0, 'an unconfirmed address gets none');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'advisor_org_invited'), 1, 'an address without an account creates nothing and no error');
select extensions.is((select count(*)::int from public.in_app_notices where recipient_user_id = 'ea100000-0000-4000-8000-000000000001'), 0, 'the inviter gets none');

-- Die Liste: nur nach der eigenen bestaetigten Adresse.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ea100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.list_my_invites()), 1, 'my invitations are listed by my confirmed address');
select extensions.is((select org_name from public.list_my_invites()), 'Einladungs Accelerator', 'with the organisation name');
set local request.jwt.claims = '{"sub":"ea100000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is((select count(*)::int from public.list_my_invites()), 0, 'someone else sees none');
select extensions.throws_ok($$select public.claim_advisor_org_invite_by_id((select id from ids where key = 'org2'))$$, '42501', 'invite_unknown', 'and cannot take it');
select extensions.throws_ok($$select public.decline_my_invite('org', (select id from ids where key = 'org2'))$$, '42501', 'invite_not_open', 'or decline it');

-- Annehmen ueber die Kennung: Mitglied, Hinweis weg.
set local request.jwt.claims = '{"sub":"ea100000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.claim_advisor_org_invite_by_id((select id from ids where key = 'org2'));
select extensions.is((select status from public.advisor_org_members where user_id = 'ea100000-0000-4000-8000-000000000002'), 'active', 'accepting by id makes me a member');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'advisor_org_invited' and recipient_user_id = 'ea100000-0000-4000-8000-000000000002'), 0, 'and the notice is gone');

-- Eine Bitte um Einblick: Hinweis, ablehnen setzt "abgelehnt" und nimmt den Hinweis weg.
reset role;
insert into public.advisor_person_invites(advisor_user_id, invitee_email, token_hash, scopes) values
('ea100000-0000-4000-8000-000000000001','inv4@example.com', repeat('d', 64), array['base']);
insert into ids select 'person4', id from public.advisor_person_invites where invitee_email = 'inv4@example.com';
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'advisor_person_invited' and recipient_user_id = 'ea100000-0000-4000-8000-000000000004'), 1, 'a request for insight gets a notice too');
set local role authenticated;
set local request.jwt.claims = '{"sub":"ea100000-0000-4000-8000-000000000004","role":"authenticated"}';
select public.decline_my_invite('person', (select id from ids where key = 'person4'));
reset role;
select extensions.is((select status from public.advisor_person_invites where invitee_email = 'inv4@example.com'), 'declined', 'declining is remembered as declined');
select extensions.is((select count(*)::int from public.in_app_notices where kind = 'advisor_person_invited'), 0, 'and the notice is gone');

-- Eine Einladung von einer Mitgruenderin.
insert into public.invitations(inviter_user_id, invitee_email, token_hash, expires_at) values
('ea100000-0000-4000-8000-000000000001','inv4@example.com', repeat('e', 64), now() + interval '7 days');
select extensions.is((select path from public.in_app_notices where kind = 'founder_invited' and recipient_user_id = 'ea100000-0000-4000-8000-000000000004'), '/dashboard', 'a co-founder invitation notifies and leads to the dashboard');

select * from extensions.finish();
rollback;
