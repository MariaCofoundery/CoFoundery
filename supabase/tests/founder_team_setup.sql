\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_setup(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'founder setup assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '91111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'setup-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '92222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'setup-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '93333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'setup-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '94444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'outsider@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams (id, team_context) values
  ('9a111111-1111-4111-8111-111111111111', 'existing_team'),
  ('9a222222-2222-4222-8222-222222222222', 'pre_founder');
insert into public.founder_team_members (team_id, user_id) values
  ('9a111111-1111-4111-8111-111111111111', '91111111-1111-4111-8111-111111111111'),
  ('9a111111-1111-4111-8111-111111111111', '92222222-2222-4222-8222-222222222222'),
  ('9a222222-2222-4222-8222-222222222222', '91111111-1111-4111-8111-111111111111'),
  ('9a222222-2222-4222-8222-222222222222', '92222222-2222-4222-8222-222222222222'),
  ('9a222222-2222-4222-8222-222222222222', '93333333-3333-4333-8333-333333333333');

-- Outsiders cannot see or mutate setup content.
select set_config('request.jwt.claims', '{"sub":"94444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_setup((select count(*) = 0 from public.founder_team_setup_items), 'outsider can see setup items');
do $$ begin
  begin
    perform public.save_founder_team_setup_working_state('9a111111-1111-4111-8111-111111111111', 'communication', 'open', 'foreign');
    raise exception 'outsider unexpectedly wrote setup';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Founder A saves a working note and cannot create an arbitrary item key.
select set_config('request.jwt.claims', '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.save_founder_team_setup_working_state(
  '9a111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'discussing', 'Gemeinsamer Arbeitsstand'
);
do $$ begin
  begin
    perform public.save_founder_team_setup_working_state('9a111111-1111-4111-8111-111111111111', 'custom_item', 'open', 'no');
    raise exception 'unknown setup key unexpectedly accepted';
  exception when check_violation then null; end;
end $$;
select pg_temp.assert_setup(
  (select working_note = 'Gemeinsamer Arbeitsstand' and work_status = 'discussing'
   from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111'),
  'member working note was not saved'
);
do $$
declare v_updated integer;
begin
  update public.founder_team_setup_items set working_note = 'direct write' where team_id = '9a111111-1111-4111-8111-111111111111';
  get diagnostics v_updated = row_count;
  if v_updated <> 0 then raise exception 'member directly mutated protected setup row'; end if;
end $$;
select * from public.propose_founder_team_setup_revision(
  '9a111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'clarified', 'Bisherige gemeinsame Fassung', null
);
select pg_temp.assert_setup(
  (select count(*) = 1 from public.founder_team_setup_confirmations),
  'proposer confirmation missing'
);
reset role;

-- Founder B finalizes 2/2; retries are idempotent and finalized confirmation cannot be withdrawn.
select set_config('request.jwt.claims', '{"sub":"92222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision(
  (select pending_revision_id from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111')
);
select * from public.confirm_founder_team_setup_revision(
  (select current_confirmed_revision_id from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111')
);
do $$ begin
  begin
    perform public.withdraw_founder_team_setup_confirmation(
      (select current_confirmed_revision_id from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111')
    );
    raise exception 'final confirmation unexpectedly withdrawn';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.assert_setup(
  (select pending_revision_id is null and current_confirmed_revision_id is not null
   from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111'),
  '2/2 did not finalize atomically'
);
select pg_temp.assert_setup(
  (select count(*) = 2 from public.founder_team_setup_confirmations),
  'duplicate confirmation was not idempotent'
);

-- A new proposal preserves the confirmed snapshot; own confirmation can be withdrawn while pending.
select set_config('request.jwt.claims', '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.propose_founder_team_setup_revision(
  '9a111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'documented', 'Neue Fassung', 'https://example.com/document'
);
select pg_temp.assert_setup(
  (select current_confirmed_revision_id is not null and pending_revision_id is not null
     and current_confirmed_revision_id <> pending_revision_id
   from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111'),
  'pending proposal overwrote confirmed snapshot'
);
select public.withdraw_founder_team_setup_confirmation(
  (select pending_revision_id from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111')
);
select pg_temp.assert_setup(
  (select count(*) = 0 from public.founder_team_setup_confirmations confirmation
   where confirmation.revision_id = (select pending_revision_id from public.founder_team_setup_items where team_id = '9a111111-1111-4111-8111-111111111111')),
  'pending confirmation withdraw failed'
);
reset role;

-- Three-founder team remains pending at 2/3 and finalizes only at 3/3.
select set_config('request.jwt.claims', '{"sub":"91111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.propose_founder_team_setup_revision(
  '9a222222-2222-4222-8222-222222222222', 'founder_exit', 'documented', 'Exit-Fassung', 'Vereinbarung vom 14.08.'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"92222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision(
  (select pending_revision_id from public.founder_team_setup_items where team_id = '9a222222-2222-4222-8222-222222222222')
);
reset role;
select pg_temp.assert_setup(
  (select pending_revision_id is not null and current_confirmed_revision_id is null
   from public.founder_team_setup_items where team_id = '9a222222-2222-4222-8222-222222222222'),
  'three-founder revision finalized at 2/3'
);
select set_config('request.jwt.claims', '{"sub":"93333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_setup_revision(
  (select pending_revision_id from public.founder_team_setup_items where team_id = '9a222222-2222-4222-8222-222222222222')
);
reset role;
select pg_temp.assert_setup(
  (select pending_revision_id is null and current_confirmed_revision_id is not null
   from public.founder_team_setup_items where team_id = '9a222222-2222-4222-8222-222222222222'),
  'three-founder revision did not finalize at 3/3'
);
select pg_temp.assert_setup(
  (select documentation_reference = 'Vereinbarung vom 14.08.' and confirmed_at is not null
   from public.founder_team_setup_revisions where id = (
     select current_confirmed_revision_id from public.founder_team_setup_items where team_id = '9a222222-2222-4222-8222-222222222222'
   )),
  'documented reference or confirmation missing'
);

-- Historical confirmation remains confirmed if team membership changes later.
delete from public.founder_team_members
where team_id = '9a222222-2222-4222-8222-222222222222'
  and user_id = '93333333-3333-4333-8333-333333333333';
select pg_temp.assert_setup(
  (select confirmed_at is not null from public.founder_team_setup_revisions where id = (
    select current_confirmed_revision_id from public.founder_team_setup_items where team_id = '9a222222-2222-4222-8222-222222222222'
  )),
  'membership change invalidated historical confirmation'
);

select extensions.pass('founder setup security, snapshots, confirmation, and membership behavior is valid');
select * from extensions.finish();
rollback;
