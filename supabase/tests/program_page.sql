\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e8000000-0000-4000-8000-000000000002','authenticated','authenticated','advisorin@example.com','',now(),'{}','{}',now(),now());
insert into public.advisor_orgs(id, name) values ('e8000000-0000-4000-8000-0000000000a0', 'Weitblick Accelerator');
insert into public.advisor_org_members(org_id, user_id, role, status) values
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000001','owner','active'),
('e8000000-0000-4000-8000-0000000000a0','e8000000-0000-4000-8000-000000000002','advisor','active');

set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', 'weitblick', true, 'Hallo')$$,
  '42501', null, 'only the owner sets up the page');

set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', 'admin', true, 'x')$$,
  '22023', null, 'reserved words are not allowed as short names');
select extensions.throws_ok(
  $$select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', null, true, 'x')$$,
  '22023', null, 'publishing needs a short name');
select extensions.throws_ok(
  $$select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', 'Wei tblick!', false, 'x')$$,
  '23514', null, 'a badly formed short name is refused');

-- Gespeichert, aber noch nicht veroeffentlicht: oeffentlich unsichtbar.
select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', ' Weitblick ', false, 'Willkommen im Programm');
reset role;
set local role anon;
select extensions.is_empty($$select * from public.get_public_program_page('weitblick')$$, 'an unpublished page is invisible to the public');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', 'weitblick', true, 'Willkommen im Programm');
reset role;
set local role anon;
select extensions.is((select org_name from public.get_public_program_page('WEITBLICK')), 'Weitblick Accelerator', 'a published page is public, the short name is case-insensitive');
select extensions.is((select has_logo from public.get_public_program_page('weitblick')), false, 'no logo yet');

-- Logo: Pfad muss zur Organisation gehoeren.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_org_program_logo('e8000000-0000-4000-8000-0000000000a0', 'e8000000-0000-4000-8000-0000000000ff/logo-1.png')$$,
  '42501', null, 'a logo path of another organisation is refused');
select public.set_org_program_logo('e8000000-0000-4000-8000-0000000000a0', 'e8000000-0000-4000-8000-0000000000a0/logo-1.png');
reset role;
set local role anon;
select extensions.is((select has_logo from public.get_public_program_page('weitblick')), true, 'the logo shows up');

-- Akzentfarbe: nur ein gueltiger Hex-Wert, und sie steht auf der oeffentlichen Seite.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', 'weitblick', true, 'x', 'rot')$$,
  '23514', null, 'an accent that is not a hex value is refused');
select public.set_org_program_page('e8000000-0000-4000-8000-0000000000a0', 'weitblick', true, 'x', '#0A80B8', '#EC4899');
reset role;
set local role anon;
select extensions.is((select accent from public.get_public_program_page('weitblick')), '#0a80b8', 'the accent is stored lowercase and shown publicly');
select extensions.is((select accent_b from public.get_public_program_page('weitblick')), '#ec4899', 'and the second gradient colour too');

-- Pruefungen fuer die Anmeldeseite: falsche Codes sind einfach "nein".
select extensions.is(public.is_valid_team_program_code('ZZZZZZZZ'), false, 'an unknown code is not valid');

select * from extensions.finish();
rollback;
