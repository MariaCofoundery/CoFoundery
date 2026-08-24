\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_handoff(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'deep-dive handoff assertion failed: %', message; end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'd1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'deep-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'deep-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'deep-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'd4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'deep-x@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams (id, team_context) values
  ('da111111-1111-4111-8111-111111111111', 'existing_team'),
  ('da222222-2222-4222-8222-222222222222', 'existing_team');
insert into public.founder_team_members (team_id, user_id) values
  ('da111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111'),
  ('da111111-1111-4111-8111-111111111111', 'd2222222-2222-4222-8222-222222222222'),
  ('da222222-2222-4222-8222-222222222222', 'd1111111-1111-4111-8111-111111111111'),
  ('da222222-2222-4222-8222-222222222222', 'd2222222-2222-4222-8222-222222222222'),
  ('da222222-2222-4222-8222-222222222222', 'd3333333-3333-4333-8333-333333333333');

select set_config('request.jwt.claims', '{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_handoff(
  public.handoff_workbook_deep_dive_note_if_empty(
    'da111111-1111-4111-8111-111111111111', 'decision_rights', 'Gemeinsame Reflexion'
  ),
  'two-founder handoff did not create the empty working note'
);
select pg_temp.assert_handoff(
  not public.handoff_workbook_deep_dive_note_if_empty(
    'da111111-1111-4111-8111-111111111111', 'decision_rights', 'Darf nicht ueberschreiben'
  ),
  'retry overwrote an existing working note'
);
select pg_temp.assert_handoff(
  (select working_note = 'Gemeinsame Reflexion'
     and work_status = 'open'
     and current_confirmed_revision_id is null
     and pending_revision_id is null
   from public.founder_team_setup_items
   where team_id = 'da111111-1111-4111-8111-111111111111'
     and item_key = 'decision_rights'),
  'handoff changed more than the open working note'
);
do $$ begin
  begin
    perform public.handoff_workbook_deep_dive_note_if_empty(
      'da222222-2222-4222-8222-222222222222', 'conflict_deadlock', 'Pair note'
    );
    raise exception 'three-founder handoff unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"d4444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.handoff_workbook_deep_dive_note_if_empty(
      'da111111-1111-4111-8111-111111111111', 'conflict_deadlock', 'Foreign note'
    );
    raise exception 'outsider handoff unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select extensions.pass('deep-dive handoff is member-only, two-founder-only, and never overwrites setup state');
select * from extensions.finish();
rollback;
