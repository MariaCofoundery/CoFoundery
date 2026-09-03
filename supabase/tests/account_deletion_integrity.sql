\set ON_ERROR_STOP on

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

create or replace function pg_temp.assert_account_delete(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'account deletion integrity assertion failed: %', message;
  end if;
end;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'e1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'delete-a@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'delete-b@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'delete-c@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'e4444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'delete-advisor@example.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles(user_id, display_name, avatar_url) values
  ('e1111111-1111-4111-8111-111111111111', 'Founder A', 'avatars/e1111111-1111-4111-8111-111111111111/profile.webp'),
  ('e2222222-2222-4222-8222-222222222222', 'Founder B', null),
  ('e3333333-3333-4333-8333-333333333333', 'Founder C', null),
  ('e4444444-4444-4444-8444-444444444444', 'Advisor', null);

insert into public.assessments(id, user_id, module, submitted_at) values
  ('e5111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 'base', now()),
  ('e5222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111', 'values', now()),
  ('e5333333-3333-4333-8333-333333333333', 'e2222222-2222-4222-8222-222222222222', 'base', now());
insert into public.assessment_answers(assessment_id, question_id, choice_value) values
  ('e5111111-1111-4111-8111-111111111111', 'D1_Q1', '1'),
  ('e5222222-2222-4222-8222-222222222222', 'D1_Q1', '1'),
  ('e5333333-3333-4333-8333-333333333333', 'D1_Q1', '1');

insert into public.founder_teams(id, name, team_context) values
  ('ea111111-1111-4111-8111-111111111111', 'Delete Pair', 'existing_team'),
  ('ea222222-2222-4222-8222-222222222222', 'Delete Trio', 'existing_team'),
  ('ea333333-3333-4333-8333-333333333333', 'Delete Last Member', 'existing_team');
insert into public.founder_team_members(team_id, user_id) values
  ('ea111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111'),
  ('ea111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222'),
  ('ea222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111'),
  ('ea222222-2222-4222-8222-222222222222', 'e2222222-2222-4222-8222-222222222222'),
  ('ea222222-2222-4222-8222-222222222222', 'e3333333-3333-4333-8333-333333333333'),
  ('ea333333-3333-4333-8333-333333333333', 'e1111111-1111-4111-8111-111111111111');

insert into public.relationships(id, user_a_id, user_b_id, founder_team_id) values
  ('eb111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222', 'ea111111-1111-4111-8111-111111111111'),
  ('eb222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111', 'e3333333-3333-4333-8333-333333333333', 'ea222222-2222-4222-8222-222222222222'),
  ('eb333333-3333-4333-8333-333333333333', 'e2222222-2222-4222-8222-222222222222', 'e3333333-3333-4333-8333-333333333333', 'ea222222-2222-4222-8222-222222222222');

insert into public.invitations(
  id, inviter_user_id, invitee_email, invitee_user_id, status, token_hash,
  accepted_at, expires_at
) values (
  'ec111111-1111-4111-8111-111111111111',
  'e1111111-1111-4111-8111-111111111111',
  'delete-b@example.com',
  'e2222222-2222-4222-8222-222222222222',
  'accepted', repeat('a', 64), now(), now() + interval '30 days'
);
insert into public.report_runs(
  id, relationship_id, invitation_id, modules, input_assessment_ids, payload
) values (
  'ed111111-1111-4111-8111-111111111111',
  'eb111111-1111-4111-8111-111111111111',
  'ec111111-1111-4111-8111-111111111111',
  array['base']::public.assessment_module[],
  array['e5111111-1111-4111-8111-111111111111'::uuid, 'e5333333-3333-4333-8333-333333333333'::uuid],
  '{}'::jsonb
);
insert into public.founder_alignment_workbooks(
  invitation_id, team_context, payload, created_by, updated_by
) values (
  'ec111111-1111-4111-8111-111111111111', 'existing_team', '{}'::jsonb,
  'e1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111'
);

insert into public.founder_team_setup_items(
  id, team_id, item_key, work_status, working_note, updated_by_user_id
) values
  ('ee111111-1111-4111-8111-111111111111', 'ea111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'discussing', 'Shared pair setup', 'e1111111-1111-4111-8111-111111111111'),
  ('ee222222-2222-4222-8222-222222222222', 'ea222222-2222-4222-8222-222222222222', 'decision_rights', 'discussing', 'Shared trio setup', 'e1111111-1111-4111-8111-111111111111'),
  ('ee333333-3333-4333-8333-333333333333', 'ea333333-3333-4333-8333-333333333333', 'founder_exit', 'discussing', 'Last member setup', 'e1111111-1111-4111-8111-111111111111');
insert into public.founder_team_setup_revisions(
  id, setup_item_id, resolution_status, note, proposed_by_user_id, confirmed_at
) values
  ('ef111111-1111-4111-8111-111111111111', 'ee111111-1111-4111-8111-111111111111', 'clarified', 'Pair agreement', 'e1111111-1111-4111-8111-111111111111', now()),
  ('ef222222-2222-4222-8222-222222222222', 'ee222222-2222-4222-8222-222222222222', 'clarified', 'Trio agreement', 'e1111111-1111-4111-8111-111111111111', now()),
  ('ef333333-3333-4333-8333-333333333333', 'ee333333-3333-4333-8333-333333333333', 'clarified', 'Last member agreement', 'e1111111-1111-4111-8111-111111111111', now());
update public.founder_team_setup_items set current_confirmed_revision_id =
  case id
    when 'ee111111-1111-4111-8111-111111111111' then 'ef111111-1111-4111-8111-111111111111'::uuid
    when 'ee222222-2222-4222-8222-222222222222' then 'ef222222-2222-4222-8222-222222222222'::uuid
    else 'ef333333-3333-4333-8333-333333333333'::uuid
  end;
insert into public.founder_team_setup_confirmations(revision_id, user_id) values
  ('ef111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111'),
  ('ef111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222'),
  ('ef222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111'),
  ('ef222222-2222-4222-8222-222222222222', 'e2222222-2222-4222-8222-222222222222'),
  ('ef222222-2222-4222-8222-222222222222', 'e3333333-3333-4333-8333-333333333333'),
  ('ef333333-3333-4333-8333-333333333333', 'e1111111-1111-4111-8111-111111111111');
insert into public.founder_team_setup_discussion_entries(
  id, team_id, item_key, author_user_id, body
) values
  ('f0111111-1111-4111-8111-111111111111', 'ea111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'e1111111-1111-4111-8111-111111111111', 'Founder A free text'),
  ('f0222222-2222-4222-8222-222222222222', 'ea111111-1111-4111-8111-111111111111', 'roles_responsibilities', 'e2222222-2222-4222-8222-222222222222', 'Founder B free text'),
  ('f0333333-3333-4333-8333-333333333333', 'ea333333-3333-4333-8333-333333333333', 'founder_exit', 'e1111111-1111-4111-8111-111111111111', 'Last member free text');

insert into public.commitment_labs(relationship_id, shared_reflection)
values ('eb111111-1111-4111-8111-111111111111', 'Shared commitment');
insert into public.commitment_lab_founder_entries(relationship_id, user_id, change_note) values
  ('eb111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 'A commitment'),
  ('eb111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222', 'B commitment');
insert into public.commitment_lab_discussion_entries(relationship_id, author_user_id, body) values
  ('eb111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 'A discussion');

insert into public.relationship_advisors(
  id, relationship_id, advisor_user_id, advisor_name, advisor_email, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at,
  requested_by_user_id
) values (
  'f1111111-1111-4111-8111-111111111111', 'eb333333-3333-4333-8333-333333333333',
  'e4444444-4444-4444-8444-444444444444', 'Advisor', 'delete-advisor@example.com',
  'linked', true, true, now(), now(), 'e1111111-1111-4111-8111-111111111111'
);
insert into public.advisor_team_invites(
  id, advisor_user_id, advisor_email, advisor_name, team_name,
  founder_a_email, founder_b_email, founder_a_user_id, founder_b_user_id,
  founder_a_token_hash, founder_b_token_hash, invitation_id, relationship_id
) values (
  'f1333333-3333-4333-8333-333333333333',
  'e4444444-4444-4444-8444-444444444444', 'delete-advisor@example.com', 'Advisor',
  'Delete Pair', 'delete-a@example.com', 'delete-b@example.com',
  'e1111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222',
  repeat('b', 64), repeat('c', 64),
  'ec111111-1111-4111-8111-111111111111', 'eb111111-1111-4111-8111-111111111111'
);
insert into public.founder_team_advisor_setup_grants(
  id, team_id, advisor_user_id, source_relationship_advisor_id,
  status, created_by_user_id, activated_at
) values (
  'f1222222-2222-4222-8222-222222222222', 'ea222222-2222-4222-8222-222222222222',
  'e4444444-4444-4444-8444-444444444444', 'f1111111-1111-4111-8111-111111111111',
  'active', 'e1111111-1111-4111-8111-111111111111', now()
);
insert into public.founder_team_advisor_setup_grants(
  id, team_id, advisor_user_id, source_relationship_advisor_id,
  status, created_by_user_id, revoked_at
) values (
  'f1444444-4444-4444-8444-444444444444', 'ea333333-3333-4333-8333-333333333333',
  'e4444444-4444-4444-8444-444444444444', 'f1111111-1111-4111-8111-111111111111',
  'revoked', 'e1111111-1111-4111-8111-111111111111', now()
);
insert into public.founder_team_advisor_setup_consents(grant_id, founder_user_id) values
  ('f1222222-2222-4222-8222-222222222222', 'e1111111-1111-4111-8111-111111111111'),
  ('f1222222-2222-4222-8222-222222222222', 'e2222222-2222-4222-8222-222222222222'),
  ('f1222222-2222-4222-8222-222222222222', 'e3333333-3333-4333-8333-333333333333'),
  ('f1444444-4444-4444-8444-444444444444', 'e1111111-1111-4111-8111-111111111111');

insert into public.founder_discovery_profiles(user_id, status, display_name, headline, bio)
values
  ('e1111111-1111-4111-8111-111111111111', 'draft', 'Founder A', 'A headline', 'A bio'),
  ('e2222222-2222-4222-8222-222222222222', 'draft', 'Founder B', 'B headline', 'B bio');
update public.founder_discovery_profiles
set status = 'active', own_roles = array['product'], seeking_roles = array['tech'],
    availability_hours_per_week = 20, commitment_level = 'part_time',
    venture_stage = 'idea_validating', venture_goal = 'venture_scale', published_at = now()
where user_id in (
  'e1111111-1111-4111-8111-111111111111',
  'e2222222-2222-4222-8222-222222222222'
);
insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
select 'e1111111-1111-4111-8111-111111111111', id
from public.founder_discovery_profiles
where user_id = 'e2222222-2222-4222-8222-222222222222';
insert into public.founder_discovery_saves(owner_user_id, saved_profile_id)
select 'e2222222-2222-4222-8222-222222222222', id
from public.founder_discovery_profiles
where user_id = 'e1111111-1111-4111-8111-111111111111';
insert into public.discovery_intro_requests(
  requester_user_id, recipient_user_id, message
) values (
  'e1111111-1111-4111-8111-111111111111',
  'e2222222-2222-4222-8222-222222222222',
  'Founder A intro message'
);

insert into public.events(id, slug, name, status, ends_at)
values ('f3111111-1111-4111-8111-111111111111', 'delete-fixture', 'Delete Fixture', 'live', now() + interval '1 day');
insert into public.event_participants(
  id, event_id, display_name, email, participant_token
) values (
  'f3222222-2222-4222-8222-222222222222', 'f3111111-1111-4111-8111-111111111111',
  'Founder A', 'delete-a@example.com', 'delete-fixture-participant-token'
);
insert into public.event_answers(
  event_id, participant_id, question_key, answer_type, answer_value
) values (
  'f3111111-1111-4111-8111-111111111111', 'f3222222-2222-4222-8222-222222222222',
  'D1_Q1', 'core', 50
);

insert into public.product_feedback(user_id, source, q1_value, q2_value, q3_value, q5_text)
values ('e1111111-1111-4111-8111-111111111111', 'nav', '1', '2', '3', 'A feedback');
insert into public.product_analytics_events(event_name, module, question_id)
values ('account_delete_fixture', 'base', 'D1_Q1');

insert into public.research_consent_preferences(
  user_id, state, research_subject_id, accepted_at
) values (
  'e1111111-1111-4111-8111-111111111111', 'accepted',
  'f2111111-1111-4111-8111-111111111111', now()
);
insert into public.research_events(
  event_name, subject_hash, module, question_id, instrument_version,
  properties, research_consent_version
) values (
  'answer_saved',
  encode(extensions.digest('f2111111-1111-4111-8111-111111111111', 'sha256'), 'hex'),
  'base', 'D1_Q1', 'base-v1', '{"choiceValue":"1"}'::jsonb,
  'research_consent_v1'
);

create temporary table account_delete_rounds(id uuid primary key, kind text not null);
grant all on table account_delete_rounds to authenticated;
select set_config('request.jwt.claims', '{"sub":"e1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
insert into account_delete_rounds(id, kind)
select public.create_collaboration_experience_round(
  'ea111111-1111-4111-8111-111111111111', 'easy_start', 1
), 'completed';
reset role;
update public.collaboration_experience_rounds
set status = 'completed', activated_at = now(), completed_at = now()
where id = (select id from account_delete_rounds where kind = 'completed');
set local role authenticated;
insert into account_delete_rounds(id, kind)
select public.create_collaboration_experience_round(
  'ea111111-1111-4111-8111-111111111111', 'how_we_work', 1
), 'forming';
reset role;

insert into public.collaboration_experience_reveal_receipts(
  round_id, round_prompt_id, participant_user_id
)
select round_row.id, prompt.id, 'e1111111-1111-4111-8111-111111111111'
from account_delete_rounds round_row
join public.collaboration_experience_round_prompts prompt on prompt.round_id = round_row.id
where round_row.kind = 'completed'
order by prompt.position
limit 1;
insert into public.collaboration_experience_conversation_markers(
  round_id, round_prompt_id, participant_user_id
)
select round_row.id, prompt.id, 'e1111111-1111-4111-8111-111111111111'
from account_delete_rounds round_row
join public.collaboration_experience_round_prompts prompt on prompt.round_id = round_row.id
where round_row.kind = 'completed'
order by prompt.position
limit 1;

-- A stale one-member team still exercises the team-bound Read My Mind cascade.
insert into public.collaboration_experience_rounds(
  id, founder_team_id, experience_key, pack_key, pack_version,
  created_by_user_id, status, rotation_offset
) values (
  'f4111111-1111-4111-8111-111111111111', 'ea333333-3333-4333-8333-333333333333',
  'read_my_mind', 'easy_start', 1,
  'e1111111-1111-4111-8111-111111111111', 'forming', 0
);
insert into public.collaboration_experience_round_participants(
  round_id, founder_user_id, position, state, joined_at
) values (
  'f4111111-1111-4111-8111-111111111111',
  'e1111111-1111-4111-8111-111111111111', 0, 'joined', now()
);

set local role service_role;
select public.delete_founder_account_data(
  'e1111111-1111-4111-8111-111111111111', 'test-research-salt'
);
reset role;

select pg_temp.assert_account_delete(
  not exists (select 1 from auth.users where id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.profiles where user_id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.assessments where user_id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.research_consent_preferences where user_id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.research_events where research_consent_version = 'research_consent_v1')
  and not exists (select 1 from public.product_feedback where user_id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.founder_discovery_profiles where user_id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.founder_discovery_saves where owner_user_id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.founder_discovery_saves where owner_user_id = 'e2222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.discovery_intro_requests where requester_user_id = 'e1111111-1111-4111-8111-111111111111' or recipient_user_id = 'e1111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.event_participants where email = 'delete-a@example.com')
  and not exists (select 1 from public.event_answers where participant_id = 'f3222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.advisor_team_invites where founder_a_user_id = 'e1111111-1111-4111-8111-111111111111' or founder_a_email = 'delete-a@example.com')
  and not exists (select 1 from public.relationships where user_a_id = 'e1111111-1111-4111-8111-111111111111' or user_b_id = 'e1111111-1111-4111-8111-111111111111')
  and exists (select 1 from public.relationships where id = 'eb333333-3333-4333-8333-333333333333')
  and exists (select 1 from public.founder_teams where id = 'ea111111-1111-4111-8111-111111111111')
  and exists (select 1 from public.founder_teams where id = 'ea222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.founder_teams where id = 'ea333333-3333-4333-8333-333333333333')
  and (select count(*) = 1 from public.founder_team_members where team_id = 'ea111111-1111-4111-8111-111111111111' and user_id = 'e2222222-2222-4222-8222-222222222222')
  and (select count(*) = 2 from public.founder_team_members where team_id = 'ea222222-2222-4222-8222-222222222222' and user_id in ('e2222222-2222-4222-8222-222222222222','e3333333-3333-4333-8333-333333333333'))
  and (select count(*) = 2 from public.founder_team_setup_items where updated_by_user_id is null)
  and (select count(*) = 2 from public.founder_team_setup_revisions where proposed_by_user_id is null and confirmed_at is not null)
  and not exists (select 1 from public.founder_team_setup_confirmations where user_id = 'e1111111-1111-4111-8111-111111111111')
  and (select count(*) = 3 from public.founder_team_setup_confirmations)
  and not exists (select 1 from public.founder_team_setup_items where team_id = 'ea333333-3333-4333-8333-333333333333')
  and not exists (select 1 from public.founder_team_setup_revisions where setup_item_id = 'ee333333-3333-4333-8333-333333333333')
  and not exists (select 1 from public.founder_team_setup_discussion_entries where author_user_id = 'e1111111-1111-4111-8111-111111111111')
  and exists (select 1 from public.founder_team_setup_discussion_entries where author_user_id = 'e2222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.commitment_labs where relationship_id = 'eb111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.collaboration_experience_rounds where founder_team_id = 'ea111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.collaboration_experience_rounds where founder_team_id = 'ea333333-3333-4333-8333-333333333333')
  and not exists (select 1 from public.collaboration_experience_conversation_markers where participant_user_id = 'e1111111-1111-4111-8111-111111111111')
  and (select created_by_user_id is null and status = 'active' from public.founder_team_advisor_setup_grants where id = 'f1222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.founder_team_advisor_setup_consents where founder_user_id = 'e1111111-1111-4111-8111-111111111111')
  and (select count(*) = 2 from public.founder_team_advisor_setup_consents where grant_id = 'f1222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.founder_team_advisor_setup_grants where team_id = 'ea333333-3333-4333-8333-333333333333')
  and (select count(*) = 1 from public.product_analytics_events where event_name = 'account_delete_fixture')
  and exists (select 1 from auth.users where id = 'e2222222-2222-4222-8222-222222222222')
  and exists (select 1 from public.profiles where user_id = 'e2222222-2222-4222-8222-222222222222')
  and exists (select 1 from public.assessments where user_id = 'e2222222-2222-4222-8222-222222222222'),
  'current modules were not fully cleaned or surviving founder/team data became inconsistent'
);

-- Sequential cleanup: after A left the pair shell with B, deleting B removes the
-- now-empty pair team while the trio shell and C remain consistent.
set local role service_role;
select public.delete_founder_account_data(
  'e2222222-2222-4222-8222-222222222222', 'test-research-salt'
);
reset role;

select pg_temp.assert_account_delete(
  not exists (select 1 from auth.users where id = 'e2222222-2222-4222-8222-222222222222')
  and not exists (select 1 from public.founder_teams where id = 'ea111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.founder_team_setup_items where team_id = 'ea111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.founder_team_setup_revisions where setup_item_id = 'ee111111-1111-4111-8111-111111111111')
  and not exists (select 1 from public.founder_team_setup_discussion_entries where team_id = 'ea111111-1111-4111-8111-111111111111')
  and exists (select 1 from public.founder_teams where id = 'ea222222-2222-4222-8222-222222222222')
  and (select count(*) = 1 from public.founder_team_members where team_id = 'ea222222-2222-4222-8222-222222222222' and user_id = 'e3333333-3333-4333-8333-333333333333')
  and exists (select 1 from public.founder_team_setup_items where team_id = 'ea222222-2222-4222-8222-222222222222')
  and (select count(*) = 1 from public.founder_team_setup_confirmations where revision_id = 'ef222222-2222-4222-8222-222222222222' and user_id = 'e3333333-3333-4333-8333-333333333333')
  and exists (select 1 from auth.users where id = 'e3333333-3333-4333-8333-333333333333'),
  'sequential last-member cleanup removed the surviving trio or retained the empty pair shell'
);

select extensions.pass('account deletion cleans current modules while preserving consistent pair and trio survivors');
select * from extensions.finish();

rollback;
