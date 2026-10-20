\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000001','authenticated','authenticated','a2@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000003','authenticated','authenticated','fremd2@example.com','',now(),'{}','{}',now(),now());
insert into public.founder_teams(id, team_context) values ('e2000000-0000-4000-8000-000000000001','pre_founder');
insert into public.founder_team_members(team_id, user_id) values ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select public.set_founder_team_details('e2000000-0000-4000-8000-000000000001', ' Nordlicht ', '  Wir bauen etwas für Pflegeteams.  ');
select extensions.is(
  (select name || ' | ' || description from public.founder_teams where id = 'e2000000-0000-4000-8000-000000000001'),
  'Nordlicht | Wir bauen etwas für Pflegeteams.',
  'a member sets name and description (trimmed)'
);

select extensions.throws_ok(
  $$select public.set_founder_team_details('e2000000-0000-4000-8000-000000000001', 'x', repeat('y', 201))$$,
  '22001', 'team_description_too_long', 'a description is at most 200 characters'
);

select public.set_founder_team_details('e2000000-0000-4000-8000-000000000001', 'Nordlicht', '   ');
select extensions.is(
  (select description from public.founder_teams where id = 'e2000000-0000-4000-8000-000000000001'),
  null, 'an empty description removes it'
);

set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_founder_team_details('e2000000-0000-4000-8000-000000000001', 'Gekapert', 'Nein')$$,
  'P0002', 'team_not_found', 'a non-member gets the same error as for a team that does not exist'
);

set local role postgres;
select extensions.is(
  (select name from public.founder_teams where id = 'e2000000-0000-4000-8000-000000000001'),
  'Nordlicht', 'the failed attempt changed nothing'
);
update public.founder_teams set archived_at = now() where id = 'e2000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_founder_team_details('e2000000-0000-4000-8000-000000000001', 'Zu spaet', 'Nein')$$,
  'P0002', 'team_not_found', 'an archived team is not changed'
);

select * from extensions.finish();
rollback;
