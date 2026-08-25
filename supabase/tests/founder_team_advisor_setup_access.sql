\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_access(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'advisor founder setup assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'founder-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'founder-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'founder-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'founder-d@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a5555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'founder-e@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a6666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'founder-f@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'aa111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'advisor-one@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'aa222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'advisor-two@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.founder_teams (id, team_context) values
  ('ab111111-1111-4111-8111-111111111111', 'existing_team'),
  ('ab222222-2222-4222-8222-222222222222', 'existing_team'),
  ('ab333333-3333-4333-8333-333333333333', 'existing_team');

insert into public.founder_team_members (team_id, user_id) values
  ('ab111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111'),
  ('ab111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222'),
  ('ab222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111'),
  ('ab222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222'),
  ('ab222222-2222-4222-8222-222222222222', 'a3333333-3333-4333-8333-333333333333'),
  ('ab333333-3333-4333-8333-333333333333', 'a4444444-4444-4444-8444-444444444444'),
  ('ab333333-3333-4333-8333-333333333333', 'a5555555-5555-4555-8555-555555555555');

insert into public.relationships (id, user_a_id, user_b_id, founder_team_id) values
  ('ac111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222', 'ab111111-1111-4111-8111-111111111111'),
  ('ac222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333', 'ab222222-2222-4222-8222-222222222222'),
  ('ac333333-3333-4333-8333-333333333333', 'a4444444-4444-4444-8444-444444444444', 'a5555555-5555-4555-8555-555555555555', 'ab333333-3333-4333-8333-333333333333');

insert into public.relationship_advisors (
  id, relationship_id, advisor_user_id, advisor_name, advisor_email, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values
  ('ad111111-1111-4111-8111-111111111111', 'ac111111-1111-4111-8111-111111111111', 'aa111111-1111-4111-8111-111111111111', 'Advisor One', 'advisor-one@example.com', 'linked', true, true, now(), now()),
  ('ad122222-2222-4222-8222-222222222222', 'ac111111-1111-4111-8111-111111111111', 'aa222222-2222-4222-8222-222222222222', 'Advisor Two', 'advisor-two@example.com', 'linked', true, true, now(), now()),
  ('ad222222-2222-4222-8222-222222222222', 'ac222222-2222-4222-8222-222222222222', 'aa111111-1111-4111-8111-111111111111', 'Advisor One', 'advisor-one@example.com', 'linked', true, true, now(), now()),
  ('ad333333-3333-4333-8333-333333333333', 'ac333333-3333-4333-8333-333333333333', 'aa111111-1111-4111-8111-111111111111', 'Advisor One', 'advisor-one@example.com', 'linked', true, true, now(), now());

-- Seed a confirmed current revision alongside private working, pending, and superseded content.
insert into public.founder_team_setup_items (
  id, team_id, item_key, work_status, working_note, updated_by_user_id
) values
  ('ae111111-1111-4111-8111-111111111111', 'ab111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'discussing', 'PRIVATE_WORKING_NOTE', 'a1111111-1111-4111-8111-111111111111'),
  ('ae222222-2222-4222-8222-222222222222', 'ab222222-2222-4222-8222-222222222222', 'decision_rights', 'open', 'PRIVATE_TEAM_THREE_WORKING', 'a1111111-1111-4111-8111-111111111111'),
  ('ae333333-3333-4333-8333-333333333333', 'ab333333-3333-4333-8333-333333333333', 'founder_exit', 'open', 'PRIVATE_GROWING_WORKING', 'a4444444-4444-4444-8444-444444444444');

insert into public.founder_team_setup_revisions (
  id, setup_item_id, resolution_status, note, documentation_reference,
  proposed_by_user_id, confirmed_at, superseded_at
) values
  ('af111111-1111-4111-8111-111111111111', 'ae111111-1111-4111-8111-111111111111', 'documented', 'CONFIRMED_CURRENT_NOTE', 'https://example.com/confirmed', 'a1111111-1111-4111-8111-111111111111', now(), null),
  ('af122222-2222-4222-8222-222222222222', 'ae111111-1111-4111-8111-111111111111', 'clarified', 'PRIVATE_PENDING_NOTE', null, 'a1111111-1111-4111-8111-111111111111', null, null),
  ('af133333-3333-4333-8333-333333333333', 'ae111111-1111-4111-8111-111111111111', 'clarified', 'PRIVATE_SUPERSEDED_NOTE', null, 'a1111111-1111-4111-8111-111111111111', null, now()),
  ('af222222-2222-4222-8222-222222222222', 'ae222222-2222-4222-8222-222222222222', 'clarified', 'TEAM_THREE_CONFIRMED', null, 'a1111111-1111-4111-8111-111111111111', now(), null),
  ('af333333-3333-4333-8333-333333333333', 'ae333333-3333-4333-8333-333333333333', 'not_relevant', 'GROWING_TEAM_CONFIRMED', null, 'a4444444-4444-4444-8444-444444444444', now(), null);

update public.founder_team_setup_items set
  current_confirmed_revision_id = 'af111111-1111-4111-8111-111111111111',
  pending_revision_id = 'af122222-2222-4222-8222-222222222222'
where id = 'ae111111-1111-4111-8111-111111111111';
update public.founder_team_setup_items set current_confirmed_revision_id = 'af222222-2222-4222-8222-222222222222'
where id = 'ae222222-2222-4222-8222-222222222222';
update public.founder_team_setup_items set current_confirmed_revision_id = 'af333333-3333-4333-8333-333333333333'
where id = 'ae333333-3333-4333-8333-333333333333';

-- A relationship advisor receives nothing before a separate team-level grant exists.
select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access(
  (select count(*) = 0 from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111')),
  'relationship advisor received implicit Founder Setup access'
);
select pg_temp.assert_access(
  (select access_status = 'not_granted' and confirmed_item_count = 0
   from public.get_advisor_founder_setup_access_status('ac111111-1111-4111-8111-111111111111')),
  'advisor status did not report a missing separate grant'
);
reset role;

-- Membership and source relationship boundaries prevent arbitrary team-level grants.
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.propose_founder_team_advisor_setup_grant(
      'ab111111-1111-4111-8111-111111111111',
      'ad222222-2222-4222-8222-222222222222'
    );
    raise exception 'advisor source from another team unexpectedly accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims', '{"sub":"a6666666-6666-4666-8666-666666666666","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin
    perform public.propose_founder_team_advisor_setup_grant(
      'ab111111-1111-4111-8111-111111111111',
      'ad111111-1111-4111-8111-111111111111'
    );
    raise exception 'nonmember unexpectedly proposed team advisor access';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Proposal creator A auto-consents, but 1/2 remains inaccessible.
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.propose_founder_team_advisor_setup_grant(
  'ab111111-1111-4111-8111-111111111111', 'ad111111-1111-4111-8111-111111111111'
);
select pg_temp.assert_access(
  (select grant_status = 'pending' and cardinality(consented_founder_user_ids) = 1 and not access_active
   from public.get_founder_team_advisor_setup_access('ab111111-1111-4111-8111-111111111111')
   where source_relationship_advisor_id = 'ad111111-1111-4111-8111-111111111111'),
  '1/2 consent did not remain pending'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access(
  (select count(*) = 0 from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111')),
  'advisor read setup at 1/2 consent'
);
select pg_temp.assert_access(
  (select access_status = 'pending' and consent_count = 1 and member_count = 2
   from public.get_advisor_founder_setup_access_status('ac111111-1111-4111-8111-111111111111')),
  'advisor status did not report pending 1/2 consent'
);
reset role;

-- Founder B completes 2/2. Only the current confirmed snapshot and five projected fields appear.
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_advisor_setup_grant(
  (select grant_id from public.get_founder_team_advisor_setup_access('ab111111-1111-4111-8111-111111111111') where grant_id is not null limit 1)
);
reset role;

select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access(
  (select count(*) = 1 from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111')),
  '2/2 did not activate confirmed-only read access'
);
select pg_temp.assert_access(
  (select access_status = 'active' and consent_count = 2 and member_count = 2 and confirmed_item_count = 1
   from public.get_advisor_founder_setup_access_status('ac111111-1111-4111-8111-111111111111')),
  'advisor status did not report active confirmed-only content'
);
select pg_temp.assert_access(
  (select note = 'CONFIRMED_CURRENT_NOTE'
      and documentation_reference = 'https://example.com/confirmed'
      and resolution_status = 'documented'
      and confirmed_at is not null
   from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111')
   where item_key = 'roles_responsibilities'),
  'current confirmed content or documentation reference is missing'
);
select pg_temp.assert_access(
  (select bool_and(
     to_jsonb(projected) ?& array['item_key','resolution_status','note','documentation_reference','confirmed_at']
     and not (to_jsonb(projected) ?| array['working_note','pending_revision_id','proposed_by_user_id','confirmations'])
   ) from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111') projected),
  'advisor read model exposes working or confirmation details'
);
select pg_temp.assert_access(
  not exists (
    select 1 from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111')
    where note in ('PRIVATE_WORKING_NOTE', 'PRIVATE_PENDING_NOTE', 'PRIVATE_SUPERSEDED_NOTE')
  ),
  'private working, pending, or superseded content leaked'
);
do $$ begin
  begin
    perform public.save_founder_team_setup_working_state(
      'ab111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'open', 'advisor edit'
    );
    raise exception 'advisor unexpectedly mutated Founder Setup';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Another advisor on the relationship has no team grant.
select set_config('request.jwt.claims', '{"sub":"aa222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access(
  (select count(*) = 0 from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111')),
  'foreign advisor inherited another advisor grant'
);
reset role;

-- Any current founder can revoke immediately.
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select public.revoke_founder_team_advisor_setup_grant(
  (select grant_id from public.get_founder_team_advisor_setup_access('ab111111-1111-4111-8111-111111111111') where grant_id is not null limit 1)
);
reset role;
select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access(
  (select count(*) = 0 from public.get_advisor_confirmed_founder_setup('ac111111-1111-4111-8111-111111111111')),
  'revocation did not immediately remove access'
);
select pg_temp.assert_access(
  (select access_status = 'revoked' and confirmed_item_count = 0
   from public.get_advisor_founder_setup_access_status('ac111111-1111-4111-8111-111111111111')),
  'advisor status did not fail closed after grant revocation'
);
reset role;

-- A+B consent is insufficient for A+B+C; C activates 3/3, then source revocation fails closed.
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select * from public.propose_founder_team_advisor_setup_grant('ab222222-2222-4222-8222-222222222222', 'ad222222-2222-4222-8222-222222222222');
reset role;
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_advisor_setup_grant((select grant_id from public.get_founder_team_advisor_setup_access('ab222222-2222-4222-8222-222222222222') where grant_id is not null limit 1));
reset role;
select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access((select count(*) = 0 from public.get_advisor_confirmed_founder_setup('ac222222-2222-4222-8222-222222222222')), '3-founder access activated at 2/3');
reset role;
select set_config('request.jwt.claims', '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_advisor_setup_grant((select grant_id from public.get_founder_team_advisor_setup_access('ab222222-2222-4222-8222-222222222222') where grant_id is not null limit 1));
reset role;
select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access((select count(*) = 1 from public.get_advisor_confirmed_founder_setup('ac222222-2222-4222-8222-222222222222')), '3/3 did not activate access');
reset role;
update public.relationship_advisors set status = 'revoked', revoked_at = now() where id = 'ad222222-2222-4222-8222-222222222222';
select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access((select count(*) = 0 from public.get_advisor_confirmed_founder_setup('ac222222-2222-4222-8222-222222222222')), 'revoked source advisor access remained effective');
reset role;

-- A new third founder immediately pauses a previously active 2/2 grant until that founder consents.
select set_config('request.jwt.claims', '{"sub":"a4444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
set local role authenticated;
select * from public.propose_founder_team_advisor_setup_grant('ab333333-3333-4333-8333-333333333333', 'ad333333-3333-4333-8333-333333333333');
reset role;
select set_config('request.jwt.claims', '{"sub":"a5555555-5555-4555-8555-555555555555","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_advisor_setup_grant((select grant_id from public.get_founder_team_advisor_setup_access('ab333333-3333-4333-8333-333333333333') where grant_id is not null limit 1));
reset role;
select pg_temp.assert_access((select status = 'active' from public.founder_team_advisor_setup_grants where team_id = 'ab333333-3333-4333-8333-333333333333'), '2/2 growing-team grant did not activate');
insert into public.founder_team_members(team_id, user_id) values ('ab333333-3333-4333-8333-333333333333', 'a6666666-6666-4666-8666-666666666666');
select pg_temp.assert_access((select status = 'pending' and activated_at is not null from public.founder_team_advisor_setup_grants where team_id = 'ab333333-3333-4333-8333-333333333333'), 'new founder did not pause existing access while preserving activation history');
select set_config('request.jwt.claims', '{"sub":"aa111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
select pg_temp.assert_access((select count(*) = 0 from public.get_advisor_confirmed_founder_setup('ac333333-3333-4333-8333-333333333333')), 'advisor retained access after third founder joined');
select pg_temp.assert_access(
  (select access_status = 'paused' and consent_count = 2 and member_count = 3 and confirmed_item_count = 0
   from public.get_advisor_founder_setup_access_status('ac333333-3333-4333-8333-333333333333')),
  'advisor status did not report membership-change pause'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"a6666666-6666-4666-8666-666666666666","role":"authenticated"}', true);
set local role authenticated;
select * from public.confirm_founder_team_advisor_setup_grant((select grant_id from public.get_founder_team_advisor_setup_access('ab333333-3333-4333-8333-333333333333') where grant_id is not null limit 1));
reset role;
select pg_temp.assert_access((select status = 'active' from public.founder_team_advisor_setup_grants where team_id = 'ab333333-3333-4333-8333-333333333333'), 'new founder consent did not restore 3/3 access');

select pg_temp.assert_access(
  not has_table_privilege('authenticated', 'public.founder_team_advisor_setup_grants', 'SELECT,INSERT,UPDATE,DELETE')
  and not has_table_privilege('authenticated', 'public.founder_team_advisor_setup_consents', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated clients received direct grant or consent table privileges'
);

select extensions.pass('advisor Founder Setup access is unanimous, confirmed-only, revocable, and fail-closed');
select * from extensions.finish();
rollback;
