\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

-- 1 Admin (Inhaber), 2 Advisor (Recht people ausgeschaltet), 3 Fremde.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ef200000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'crp' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 3) n;
insert into public.advisor_orgs(id, name) values ('ef200000-0000-4000-8000-0000000000a0', 'Report Accelerator'), ('ef200000-0000-4000-8000-0000000000a1', 'Andere');
insert into public.advisor_org_members(org_id, user_id, role, status, rights) values
('ef200000-0000-4000-8000-0000000000a0','ef200000-0000-4000-8000-000000000001','owner','active', '{}'::jsonb),
('ef200000-0000-4000-8000-0000000000a0','ef200000-0000-4000-8000-000000000002','advisor','active', '{"people": false}'::jsonb),
('ef200000-0000-4000-8000-0000000000a1','ef200000-0000-4000-8000-000000000003','owner','active', '{}'::jsonb);
insert into public.advisor_org_posts(id, org_id, title, planned_on) values
('ef200000-0000-4000-8000-0000000000b0','ef200000-0000-4000-8000-0000000000a0','Erster', current_date),
('ef200000-0000-4000-8000-0000000000b1','ef200000-0000-4000-8000-0000000000a0','Zweiter', current_date),
('ef200000-0000-4000-8000-0000000000b2','ef200000-0000-4000-8000-0000000000a1','Fremder', current_date);
insert into public.advisor_org_campaigns(id, org_id, name) values ('ef200000-0000-4000-8000-0000000000c0','ef200000-0000-4000-8000-0000000000a0','Demo Day');
insert into public.advisor_org_content_items(id, org_id, kind, name) values
('ef200000-0000-4000-8000-0000000000e0','ef200000-0000-4000-8000-0000000000a0','brand','Accelerator'),
('ef200000-0000-4000-8000-0000000000e1','ef200000-0000-4000-8000-0000000000a1','brand','Fremde Marke');

select extensions.is((select array_agg(post_no order by post_no) from public.advisor_org_posts where org_id = 'ef200000-0000-4000-8000-0000000000a0'), array[1,2], 'posts are numbered per organization');
select extensions.is((select post_no from public.advisor_org_posts where id = 'ef200000-0000-4000-8000-0000000000b2'), 1, 'another organization starts at 1');
insert into public.advisor_org_posts(id, org_id, title, planned_on) values ('ef200000-0000-4000-8000-0000000000b3','ef200000-0000-4000-8000-0000000000a0','Dritter', current_date);
select extensions.is((select post_no from public.advisor_org_posts where id = 'ef200000-0000-4000-8000-0000000000b3'), 3, 'the next post gets the next number');
update public.advisor_org_posts set post_no = 99 where id = 'ef200000-0000-4000-8000-0000000000b3';
select extensions.is((select post_no from public.advisor_org_posts where id = 'ef200000-0000-4000-8000-0000000000b3'), 3, 'the number never changes');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ef200000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok($$select public.set_org_post_result('ef200000-0000-4000-8000-0000000000b0', null, 1, 1, 1, null)$$, '42501', 'org_post_not_yours', 'a stranger cannot write results');

set local request.jwt.claims = '{"sub":"ef200000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select public.set_org_post_result('ef200000-0000-4000-8000-0000000000b0', 'http://unsicher.example', null, null, null, null)$$, '22023', 'org_post_invalid', 'the post link must be https');
select extensions.throws_ok($$select public.set_org_post_result('ef200000-0000-4000-8000-0000000000b0', null, -5, null, null, null)$$, '22023', 'org_post_invalid', 'results cannot be negative');
select public.set_org_post_result('ef200000-0000-4000-8000-0000000000b0', 'https://linkedin.com/posts/1', 4200, 96, null, 'lief gut');
select extensions.is((select result_views from public.advisor_org_posts where id = 'ef200000-0000-4000-8000-0000000000b0'), 4200, 'results are stored, empty values stay empty');

select public.set_org_campaign_details('ef200000-0000-4000-8000-0000000000c0', 'ef200000-0000-4000-8000-0000000000e0', '200 Gäste', 'ef200000-0000-4000-8000-000000000001',
  '[{"on":"2027-03-12","label":"Tag des Events"},{"on":"2026-12-10","label":"Einladung"},{"on":"kaputt","label":"x"},{"on":"2027-01-01","label":""}]'::jsonb);
select extensions.is((select jsonb_array_length(key_dates) from public.advisor_org_campaigns where id = 'ef200000-0000-4000-8000-0000000000c0'), 2, 'invalid key dates fall away');
select extensions.is((select key_dates -> 0 ->> 'label' from public.advisor_org_campaigns where id = 'ef200000-0000-4000-8000-0000000000c0'), 'Einladung', 'key dates are sorted by day');
select extensions.throws_ok($$select public.set_org_campaign_details('ef200000-0000-4000-8000-0000000000c0', 'ef200000-0000-4000-8000-0000000000e1', null, null, '[]'::jsonb)$$, '22023', 'org_post_invalid', 'a brand of another organization is refused');

-- Partnerliste: nur mit dem Recht people.
select extensions.throws_ok($$select public.save_org_contact(null, 'ef200000-0000-4000-8000-0000000000a0', 'Lena Roth', array['investor'], null, null, null, null, null, 'asked', null)$$, '42501', 'contact_not_yours', 'an advisor without the people right cannot add contacts');

set local request.jwt.claims = '{"sub":"ef200000-0000-4000-8000-000000000001","role":"authenticated"}';
create temp table ids (key text primary key, id uuid);
grant select, insert on ids to authenticated;
insert into ids values ('c', public.save_org_contact(null, 'ef200000-0000-4000-8000-0000000000a0', 'Lena Roth', array['investor','speaker'], 'Nordkapital', 'lena@example.com', null, 'https://nordkapital.example', 'Notiz', 'talking', 'ef200000-0000-4000-8000-000000000001'));
select extensions.is((select count(*)::int from public.advisor_org_contacts), 1, 'the owner reads and writes the list');
select extensions.throws_ok($$select public.save_org_contact(null, 'ef200000-0000-4000-8000-0000000000a0', 'X', array['gott'], null, null, null, null, null, 'asked', null)$$, '22023', 'contact_invalid', 'only known kinds');

set local request.jwt.claims = '{"sub":"ef200000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_contacts), 0, 'members without the people right do not see the list');
set local request.jwt.claims = '{"sub":"ef200000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is((select count(*)::int from public.advisor_org_contacts), 0, 'other organizations do not see the list');

select * from extensions.finish();
rollback;
