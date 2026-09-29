\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

-- ---------------------------------------------------------------------------
-- Ein allein begonnenes Vorhaben wird uebernommen, nicht ersetzt
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a3000001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'solo-a@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3000002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'solo-b@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3000003-0003-4003-8003-000000000003',
   'authenticated', 'authenticated', 'solo-c@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('a3000001-0001-4001-8001-000000000001', array['founder']),
  ('a3000002-0002-4002-8002-000000000002', array['founder']),
  ('a3000003-0003-4003-8003-000000000003', array['founder'])
on conflict (user_id) do update set roles = array['founder'];

-- ---------------------------------------------------------------------------
-- 1. Genau ein Solo-Vorhaben: es wird uebernommen
-- ---------------------------------------------------------------------------

insert into public.founder_teams (id, name, team_context)
values ('a3000100-0100-4100-8100-000000000100', 'Mein Vorhaben', 'pre_founder');
insert into public.founder_team_members (team_id, user_id)
values ('a3000100-0100-4100-8100-000000000100', 'a3000001-0001-4001-8001-000000000001');

insert into public.relationships (id, user_a_id, user_b_id)
values ('a3000200-0200-4200-8200-000000000200',
        'a3000001-0001-4001-8001-000000000001', 'a3000002-0002-4002-8002-000000000002');

insert into public.invitations (
  id, inviter_user_id, invitee_email, invitee_user_id, status, token_hash,
  team_context, expires_at
) values (
  'a3000300-0300-4300-8300-000000000300',
  'a3000001-0001-4001-8001-000000000001', 'solo-b@example.com',
  'a3000002-0002-4002-8002-000000000002', 'sent', repeat('b', 64),
  'pre_founder', now() + interval '30 days'
);

update public.invitations set status = 'accepted', accepted_at = now()
 where id = 'a3000300-0300-4300-8300-000000000300';

select extensions.is(
  (select founder_team_id from public.relationships
    where id = 'a3000200-0200-4200-8200-000000000200'),
  'a3000100-0100-4100-8100-000000000100',
  'das allein begonnene Vorhaben wird uebernommen, nicht ersetzt');

select extensions.is(
  (select count(*)::int from public.founder_teams),
  1,
  'und es entsteht kein zweites daneben');

select extensions.is(
  (select name from public.founder_teams where id = 'a3000100-0100-4100-8100-000000000100'),
  'Mein Vorhaben',
  'der Name bleibt - er gehoerte schon zum Vorhaben, nicht zur Einladung');

-- ---------------------------------------------------------------------------
-- 2. Zwei Solo-Vorhaben: es wird NICHT geraten
-- ---------------------------------------------------------------------------
--
-- Eine falsch gewaehlte Zusammenfuehrung haengt die Zusagen einer Person an
-- ein Vorhaben, das sie nie gemeint hat. Dann lieber ein neues Team - beide
-- Solo-Vorhaben bleiben bestehen.

insert into public.founder_teams (id, name, team_context) values
  ('a3000101-0101-4101-8101-000000000101', 'Erstes', 'pre_founder'),
  ('a3000102-0102-4102-8102-000000000102', 'Zweites', 'pre_founder');
insert into public.founder_team_members (team_id, user_id) values
  ('a3000101-0101-4101-8101-000000000101', 'a3000003-0003-4003-8003-000000000003'),
  ('a3000102-0102-4102-8102-000000000102', 'a3000003-0003-4003-8003-000000000003');

insert into public.relationships (id, user_a_id, user_b_id)
values ('a3000201-0201-4201-8201-000000000201',
        'a3000003-0003-4003-8003-000000000003', 'a3000002-0002-4002-8002-000000000002');

insert into public.invitations (
  id, inviter_user_id, invitee_email, invitee_user_id, status, token_hash,
  team_context, expires_at
) values (
  'a3000301-0301-4301-8301-000000000301',
  'a3000003-0003-4003-8003-000000000003', 'solo-b@example.com',
  'a3000002-0002-4002-8002-000000000002', 'sent', repeat('c', 64),
  'pre_founder', now() + interval '30 days'
);

update public.invitations set status = 'accepted', accepted_at = now()
 where id = 'a3000301-0301-4301-8301-000000000301';

select extensions.isnt(
  (select founder_team_id from public.relationships
    where id = 'a3000201-0201-4201-8201-000000000201'),
  'a3000101-0101-4101-8101-000000000101',
  'bei zwei Kandidaten wird keiner davon gewaehlt');

select extensions.is(
  (select count(*)::int from public.founder_teams
    where id in ('a3000101-0101-4101-8101-000000000101',
                 'a3000102-0102-4102-8102-000000000102')),
  2,
  'beide Solo-Vorhaben bleiben bestehen und gehen nicht verloren');

-- ---------------------------------------------------------------------------
-- 3. Ohne Solo-Vorhaben bleibt alles wie bisher
-- ---------------------------------------------------------------------------

select extensions.isnt(
  (select founder_team_id from public.relationships
    where id = 'a3000201-0201-4201-8201-000000000201'),
  null,
  'es entsteht weiterhin ein Team, wenn keines uebernommen werden kann');

rollback;
