\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- Social-Media-Kalender (20270319120000). 1 Inhaberin, 2 Advisor, 3 Founder im Programm.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('e9000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'post' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('e9000000-0000-4000-8000-0000000000a0', 'Posting Accelerator'), ('e9000000-0000-4000-8000-0000000000a1', 'Andere');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000001','owner','active'),
('e9000000-0000-4000-8000-0000000000a0','e9000000-0000-4000-8000-000000000002','advisor','active');
insert into public.team_program_events(id, org_id, title, kind, starts_at) values
('e9000000-0000-4000-8000-0000000000e0','e9000000-0000-4000-8000-0000000000a0','Demo Day','external', now() + interval '10 days'),
('e9000000-0000-4000-8000-0000000000e1','e9000000-0000-4000-8000-0000000000a1','Fremd','external', now() + interval '10 days');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into ids values ('camp', public.save_org_campaign(null, 'e9000000-0000-4000-8000-0000000000a0', 'Demo Day', current_date, current_date + 10, null));
insert into ids values ('post', public.save_org_post(null, 'e9000000-0000-4000-8000-0000000000a0', 'Speaker vorstellen', 'Text', array['instagram', 'linkedin', 'instagram', 'myspace'], current_date + 3, '09:00', 'draft', (select id from ids where key = 'camp'), 'e9000000-0000-4000-8000-0000000000e0', 'e9000000-0000-4000-8000-000000000001'));
select extensions.is((select channels from public.advisor_org_posts where id = (select id from ids where key = 'post')), array['linkedin', 'instagram']::text[], 'channels are cleaned: known ones, once, in a fixed order');
select extensions.is((select event_id from public.advisor_org_posts where id = (select id from ids where key = 'post')), 'e9000000-0000-4000-8000-0000000000e0'::uuid, 'a post can belong to an event');
select extensions.throws_ok(
  $$select public.save_org_post(null, 'e9000000-0000-4000-8000-0000000000a0', 'X', null, '{}', current_date, null, 'idea', null, 'e9000000-0000-4000-8000-0000000000e1', null)$$,
  '22023', 'org_post_invalid', 'not to an event of another organization');
select extensions.throws_ok(
  $$select public.save_org_post(null, 'e9000000-0000-4000-8000-0000000000a0', 'X', null, '{}', current_date, null, 'idea', null, null, 'e9000000-0000-4000-8000-000000000003')$$,
  '22023', 'org_task_assignee_not_member', 'only members are responsible');
select extensions.throws_ok(
  $$select public.save_org_post(null, 'e9000000-0000-4000-8000-0000000000a0', 'X', null, '{}', null, null, 'idea', null, null, null)$$,
  '22023', 'org_post_invalid', 'a post needs a day');
select public.move_org_post((select id from ids where key = 'post'), current_date + 4, 'planned');
select extensions.is((select planned_on || ' ' || status from public.advisor_org_posts where id = (select id from ids where key = 'post')), (current_date + 4) || ' planned', 'moving changes day and status');

-- Kampagne loeschen: Postings bleiben.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.delete_org_campaign((select id from ids where key = 'camp')), true, 'the lead deletes a campaign');
select extensions.is((select campaign_id from public.advisor_org_posts where id = (select id from ids where key = 'post')), null, 'its posts stay, without a campaign');

-- Founder und Aussen sehen nichts.
set local request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_posts), 0, 'a founder sees no post');
select extensions.throws_ok($$select public.save_org_post(null, 'e9000000-0000-4000-8000-0000000000a0', 'X', null, '{}', current_date, null, 'idea', null, null, null)$$, '42501', 'org_post_not_yours', 'and cannot plan one');
select extensions.throws_ok($$update public.advisor_org_posts set title = 'x'$$, '42501', null, 'the table cannot be written directly');

-- Mitgliedschaft endet: Zustaendigkeit geht.
reset role;
update public.advisor_org_members set status = 'revoked', revoked_at = now() where user_id = 'e9000000-0000-4000-8000-000000000001';
select extensions.is((select assignee_user_id from public.advisor_org_posts where id = (select id from ids where key = 'post')), null, 'a member who leaves is no longer responsible');

select * from extensions.finish();
rollback;
