\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams(id, team_context) values
('d2000000-0000-4000-8000-000000000001','pre_founder');
insert into public.founder_team_members(team_id, user_id) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001'),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select public.rename_founder_team('d2000000-0000-4000-8000-000000000001', '  Nordlicht  ');
select extensions.is(
  (select name from public.founder_teams where id = 'd2000000-0000-4000-8000-000000000001'),
  'Nordlicht',
  'a member can name the team (trimmed)'
);

-- Das andere Mitglied darf es auch - es gibt keine Rollenhierarchie.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.rename_founder_team('d2000000-0000-4000-8000-000000000001', 'Polarstern');
select extensions.is(
  (select name from public.founder_teams where id = 'd2000000-0000-4000-8000-000000000001'),
  'Polarstern',
  'every member can rename, there is no team hierarchy'
);

-- Wer nicht Mitglied ist, erfaehrt nichts ueber das Team.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.rename_founder_team('d2000000-0000-4000-8000-000000000001', 'Gekapert')$$,
  'P0002', 'team_not_found',
  'a non-member gets the same error as for a team that does not exist'
);

set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.rename_founder_team('d2000000-0000-4000-8000-000000000001', repeat('x', 61))$$,
  '22001', 'team_name_too_long',
  'a name is at most 60 characters'
);

-- Leer nimmt den Namen zurueck.
select public.rename_founder_team('d2000000-0000-4000-8000-000000000001', '   ');
select extensions.is(
  (select name from public.founder_teams where id = 'd2000000-0000-4000-8000-000000000001'),
  null,
  'an empty name removes it again'
);

-- Archivierte Teams werden nicht umbenannt.
set local role postgres;
update public.founder_teams set archived_at = now() where id = 'd2000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.rename_founder_team('d2000000-0000-4000-8000-000000000001', 'Zu spaet')$$,
  'P0002', 'team_not_found',
  'an archived team is not renamed'
);

select * from extensions.finish();
rollback;
