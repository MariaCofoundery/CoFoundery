\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f4500000-0000-4000-8000-000000000001','authenticated','authenticated','bio1@example.com','',now(),'{}','{}',now(),now());
insert into public.network_memberships(user_id, status) values ('f4500000-0000-4000-8000-000000000001', 'active');

select extensions.lives_ok($$insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at)
  values ('f4500000-0000-4000-8000-000000000001', 'Lena Berger', 'Gründerin, Vertrieb', '', array['founder'], 'active', now())$$, 'a profile with name, line and role can be visible without a long text');
select extensions.throws_ok($$update public.network_profiles set network_roles = '{}' where user_id = 'f4500000-0000-4000-8000-000000000001'$$, '23514', null, 'but a visible profile still needs a role');
select extensions.throws_ok($$update public.network_profiles set headline = 'x' where user_id = 'f4500000-0000-4000-8000-000000000001'$$, '23514', null, 'and a line of at least 3 characters');

select * from extensions.finish();
rollback;
