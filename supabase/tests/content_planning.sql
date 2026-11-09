\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- 1 Admin, 2 Advisor (ohne plan), 3 Fremde; zweite Organisation fuer fremde Marken.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ef100000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'content' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('ef100000-0000-4000-8000-0000000000a0', 'Content Accelerator'), ('ef100000-0000-4000-8000-0000000000a1', 'Andere Organisation');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ef100000-0000-4000-8000-0000000000a0','ef100000-0000-4000-8000-000000000001','owner','active'),
('ef100000-0000-4000-8000-0000000000a0','ef100000-0000-4000-8000-000000000002','advisor','active'),
('ef100000-0000-4000-8000-0000000000a1','ef100000-0000-4000-8000-000000000003','owner','active');
insert into public.advisor_org_tasks(id, org_id, title, created_by_user_id, visibility) values
('ef100000-0000-4000-8000-0000000000d0','ef100000-0000-4000-8000-0000000000a0','Canva-Vorlage bauen','ef100000-0000-4000-8000-000000000001','team'),
('ef100000-0000-4000-8000-0000000000d1','ef100000-0000-4000-8000-0000000000a0','Nur meine','ef100000-0000-4000-8000-000000000001','private');
insert into public.advisor_org_content_items(id, org_id, kind, name) values ('ef100000-0000-4000-8000-0000000000e0','ef100000-0000-4000-8000-0000000000a1','brand','Fremde Marke');

create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub":"ef100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.save_content_item('ef100000-0000-4000-8000-0000000000a0', null, 'brand', 'Nein', 'violet')$$, '42501', 'content_not_yours', 'an advisor without the plan right cannot define brands');

set local request.jwt.claims = '{"sub":"ef100000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids values ('brand', public.save_content_item('ef100000-0000-4000-8000-0000000000a0', null, 'brand', 'Accelerator', 'violet'));
insert into ids values ('pillar', public.save_content_item('ef100000-0000-4000-8000-0000000000a0', null, 'pillar', 'Wissen teilen', null));
select extensions.throws_ok($$select public.save_content_item('ef100000-0000-4000-8000-0000000000a0', null, 'brand', ' accelerator ', null)$$, '22023', 'content_invalid', 'the same name is not created twice');
select extensions.throws_ok($$select public.save_content_item('ef100000-0000-4000-8000-0000000000a0', null, 'brand', 'X', 'pink')$$, '22023', 'content_invalid', 'only known colors');
select public.save_content_defaults('ef100000-0000-4000-8000-0000000000a0', (select id from ids where key = 'brand'), (select id from ids where key = 'pillar'), null, 'linkedin', 'ef100000-0000-4000-8000-000000000002', 'idea');
select extensions.is((select channel from public.advisor_org_content_defaults where org_id = 'ef100000-0000-4000-8000-0000000000a0'), 'linkedin', 'the defaults are stored');
select extensions.throws_ok($$select public.save_content_defaults('ef100000-0000-4000-8000-0000000000a0', 'ef100000-0000-4000-8000-0000000000e0', null, null, null, null, null)$$, '22023', 'content_invalid', 'a brand of another organization is refused');

insert into ids values ('post', public.save_org_post(null, 'ef100000-0000-4000-8000-0000000000a0', 'Panel-Rueckblick', 'Text', array['linkedin'], current_date, null, 'review', null, null, null,
  (select id from ids where key = 'brand'), (select id from ids where key = 'pillar'), null, 'https://www.canva.com/design/abc', 'ef100000-0000-4000-8000-000000000002', 'Zitat fehlt'));
select extensions.is((select status from public.advisor_org_posts where id = (select id from ids where key = 'post')), 'review', 'the new status "for approval" works');
select extensions.throws_ok($$select public.save_org_post(null, 'ef100000-0000-4000-8000-0000000000a0', 'Link', null, array['x'], current_date, null, 'idea', null, null, null, null, null, null, 'http://unsicher.example', null, null)$$, '22023', 'org_post_invalid', 'material links must be https');
select extensions.throws_ok($$select public.save_org_post(null, 'ef100000-0000-4000-8000-0000000000a0', 'Fremd', null, array['x'], current_date, null, 'idea', null, null, null, 'ef100000-0000-4000-8000-0000000000e0', null, null, null, null, null)$$, '22023', 'org_post_invalid', 'a post cannot use another organization''s brand');

select extensions.ok(public.link_org_post_task((select id from ids where key = 'post'), 'ef100000-0000-4000-8000-0000000000d0'), 'a team task can be linked to the post');
select extensions.throws_ok($$select public.link_org_post_task((select id from ids where key = 'post'), 'ef100000-0000-4000-8000-0000000000d1')$$, '22023', 'org_post_invalid', 'a private task cannot');
select extensions.is((select count(*)::int from public.advisor_org_post_tasks), 1, 'the link is readable');

set local request.jwt.claims = '{"sub":"ef100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.link_org_post_task((select id from ids where key = 'post'), 'ef100000-0000-4000-8000-0000000000d0')$$, '42501', 'org_post_not_yours', 'a stranger cannot link');
select extensions.is((select count(*)::int from public.advisor_org_post_tasks), 0, 'and does not see the links');

set local request.jwt.claims = '{"sub":"ef100000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.unlink_org_post_task((select id from ids where key = 'post'), 'ef100000-0000-4000-8000-0000000000d0');
select public.delete_content_item((select id from ids where key = 'brand'));
select extensions.ok((select brand_id is null from public.advisor_org_posts where id = (select id from ids where key = 'post')), 'deleting a brand keeps the post and clears the brand');

select * from extensions.finish();
rollback;
