\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_topic(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'setup topic assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'f1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'topics-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'topics-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams(id, team_context) values
  ('fa111111-1111-4111-8111-111111111111', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('fa111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111'),
  ('fa111111-1111-4111-8111-111111111111', 'f2222222-2222-4222-8222-222222222222');

-- Die beiden neuen Themen lassen sich anlegen.
insert into public.founder_team_setup_items(team_id, item_key)
values ('fa111111-1111-4111-8111-111111111111', 'investor_dilution'),
       ('fa111111-1111-4111-8111-111111111111', 'company_sale');

-- Beitraege zu allen vier spaeter ergaenzten Themen werden angenommen.
-- Nachfolge und Wettbewerb nach dem Ausscheiden wurden bis hierhin abgelehnt.
select set_config('request.jwt.claims', '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.create_founder_team_setup_discussion_entry('fa111111-1111-4111-8111-111111111111', 'succession', 'a', null);
select public.create_founder_team_setup_discussion_entry('fa111111-1111-4111-8111-111111111111', 'post_exit_competition', 'b', null);
select public.create_founder_team_setup_discussion_entry('fa111111-1111-4111-8111-111111111111', 'investor_dilution', 'c', null);
select public.create_founder_team_setup_discussion_entry('fa111111-1111-4111-8111-111111111111', 'company_sale', 'd', null);
select pg_temp.assert_topic(
  (select count(*) = 4 from public.founder_team_setup_discussion_entries),
  'a discussion entry for one of the four later topics was not stored'
);

-- Ein erfundenes Thema wird weiter abgelehnt.
do $$ begin
  begin
    perform public.create_founder_team_setup_discussion_entry(
      'fa111111-1111-4111-8111-111111111111', 'invented_topic', 'No', null
    );
    raise exception 'invented topic was accepted';
  exception when sqlstate '22023' then null;
  end;
end $$;
reset role;

select extensions.pass('investor_dilution and company_sale exist; all four later topics accept discussion entries');
select * from extensions.finish();
rollback;
