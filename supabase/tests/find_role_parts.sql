\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'af100001-0001-4001-8001-000000000001',
   'authenticated', 'authenticated', 'teile-sucht@example.com', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'af100002-0002-4002-8002-000000000002',
   'authenticated', 'authenticated', 'teile-bietet@example.com', '', now(), '{}', '{}', now(), now());

insert into public.profiles (user_id, roles) values
  ('af100001-0001-4001-8001-000000000001', array['founder']),
  ('af100002-0002-4002-8002-000000000002', array['founder'])
on conflict (user_id) do update set roles = excluded.roles;

select extensions.has_column('public', 'founder_discovery_profiles', 'own_role_parts', 'eigene Unterbereiche gibt es');
select extensions.col_default_is('public', 'founder_discovery_profiles', 'seeking_role_parts', '{}', 'gesuchte Unterbereiche sind standardmaessig leer');

insert into public.founder_discovery_profiles
  (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
   remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal,
   expertise, own_role_parts, seeking_role_parts)
values
  ('af100002-0002-4002-8002-000000000002', 'active', 'Teile', 'Produkt', '-',
   '{product}', '{tech}', '{}', 'remote', 40, 'full_time', 'idea_validating', 'profitable_business', '{}',
   '{product.discovery,product.ux}', '{tech.software}');

select extensions.throws_ok(
  $$ insert into public.founder_discovery_profiles
       (user_id, status, display_name, headline, bio, own_roles, seeking_roles, industries,
        remote_mode, availability_hours_per_week, commitment_level, venture_stage, venture_goal, expertise, own_role_parts)
     values ('af100001-0001-4001-8001-000000000001', 'draft', 'Zuviel', 'x', '-', '{}', '{}', '{}',
        'remote', 40, 'full_time', 'idea_validating', 'profitable_business', '{}',
        array(select 'product.discovery' from generate_series(1, 17))) $$,
  '23514',
  null,
  'mehr als sechzehn Unterbereiche werden abgewiesen'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"af100001-0001-4001-8001-000000000001","role":"authenticated"}';

select extensions.is(
  (select own_role_parts from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}', '{}')
   where candidate_user_id = 'af100002-0002-4002-8002-000000000002'),
  array['product.discovery', 'product.ux'],
  'die Suche liefert die eigenen Unterbereiche mit'
);
select extensions.is(
  (select seeking_role_parts from public.search_founder_discovery_profiles_v2(
     '{}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}', '{}')
   where candidate_user_id = 'af100002-0002-4002-8002-000000000002'),
  array['tech.software'],
  'und die gesuchten');
select extensions.is(
  (select count(*)::int from public.search_founder_discovery_profiles_v2(
     '{product}', '{}', null, '{}', null, 12, 0, '{}', '{}', '{}', '{}')
   where candidate_user_id = 'af100002-0002-4002-8002-000000000002'),
  1,
  'die Rollenfilter der Suche gelten unveraendert');

select * from extensions.finish();
rollback;
