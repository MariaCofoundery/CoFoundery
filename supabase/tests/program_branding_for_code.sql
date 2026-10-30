\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('ea000000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'u' || n || '@example.com', '', now(), '{}', '{}', now(), now()
from generate_series(1, 2) n;
insert into public.advisor_orgs(id, name, program_slug, program_page_published, program_accent, program_accent_b)
values ('ea000000-0000-4000-8000-0000000000a0', 'Programm Elf', 'elf', true, '#112233', '#445566'),
       ('ea000000-0000-4000-8000-0000000000a1', 'Ohne Seite', 'ohne', false, '#112233', '#445566');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('ea000000-0000-4000-8000-0000000000a0','ea000000-0000-4000-8000-000000000001','owner','active'),
('ea000000-0000-4000-8000-0000000000a1','ea000000-0000-4000-8000-000000000001','owner','active');

set local role authenticated;
set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.create_team_program_code('ea000000-0000-4000-8000-0000000000a0', 'BRAN7345', 'x', 1, 30);
select public.create_team_program_code('ea000000-0000-4000-8000-0000000000a1', 'UNPU7345', 'y', 1, 30);

set local request.jwt.claims = '{"sub":"ea000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is((select accent from public.get_program_branding_for_code(' bran7345 ')), '#112233', 'a valid code returns the colours of its organisation');
select extensions.is((select slug from public.get_program_branding_for_code('BRAN7345')), 'elf', 'and the short name for the logo');
select extensions.is((select count(*)::int from public.get_program_branding_for_code('UNPU7345')), 0, 'an unpublished page shows nothing');
select extensions.is((select count(*)::int from public.get_program_branding_for_code('XXXX7345')), 0, 'a wrong code shows nothing');
reset role;
set local role anon;
select extensions.throws_ok($$select * from public.get_program_branding_for_code('BRAN7345')$$, '42501', null, 'anonymous callers cannot ask');

select * from extensions.finish();
rollback;
