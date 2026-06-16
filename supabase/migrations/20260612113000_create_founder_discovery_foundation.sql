begin;

create table if not exists public.founder_discovery_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'draft',
  display_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  own_roles text[] not null default '{}'::text[],
  seeking_roles text[] not null default '{}'::text[],
  industries text[] not null default '{}'::text[],
  location_label text,
  remote_mode text not null default 'flexible',
  availability_hours_per_week smallint,
  commitment_level text not null default 'exploring',
  venture_stage text not null default 'undecided',
  venture_goal text not null default 'undecided',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_discovery_profiles_status_check
    check (status in ('draft', 'active', 'paused')),
  constraint founder_discovery_profiles_remote_mode_check
    check (remote_mode in ('onsite', 'hybrid', 'remote', 'flexible')),
  constraint founder_discovery_profiles_commitment_level_check
    check (commitment_level in ('exploring', 'side_project', 'part_time', 'full_time', 'all_in')),
  constraint founder_discovery_profiles_venture_stage_check
    check (venture_stage in ('undecided', 'no_idea_open_to_join', 'exploring_ideas', 'idea_validating', 'already_building')),
  constraint founder_discovery_profiles_venture_goal_check
    check (venture_goal in ('undecided', 'explore', 'side_project', 'profitable_business', 'venture_scale', 'exit_oriented')),
  constraint founder_discovery_profiles_availability_check
    check (availability_hours_per_week is null or availability_hours_per_week between 1 and 100),
  constraint founder_discovery_profiles_display_name_length_check
    check (char_length(display_name) <= 80),
  constraint founder_discovery_profiles_headline_length_check
    check (char_length(headline) <= 160),
  constraint founder_discovery_profiles_bio_length_check
    check (char_length(bio) <= 1200),
  constraint founder_discovery_profiles_active_complete_check
    check (
      status <> 'active'
      or (
        char_length(btrim(display_name)) >= 2
        and char_length(btrim(headline)) >= 3
        and cardinality(own_roles) >= 1
        and cardinality(seeking_roles) >= 1
        and availability_hours_per_week is not null
        and commitment_level <> 'exploring'
        and venture_stage <> 'undecided'
        and venture_goal <> 'undecided'
      )
    )
);

create index if not exists founder_discovery_profiles_active_status_idx
  on public.founder_discovery_profiles (status)
  where status = 'active';

create index if not exists founder_discovery_profiles_own_roles_gin_idx
  on public.founder_discovery_profiles using gin (own_roles);

create index if not exists founder_discovery_profiles_seeking_roles_gin_idx
  on public.founder_discovery_profiles using gin (seeking_roles);

create index if not exists founder_discovery_profiles_industries_gin_idx
  on public.founder_discovery_profiles using gin (industries);

create index if not exists founder_discovery_profiles_remote_mode_idx
  on public.founder_discovery_profiles (remote_mode);

create index if not exists founder_discovery_profiles_commitment_level_idx
  on public.founder_discovery_profiles (commitment_level);

create index if not exists founder_discovery_profiles_venture_stage_idx
  on public.founder_discovery_profiles (venture_stage);

create index if not exists founder_discovery_profiles_venture_goal_idx
  on public.founder_discovery_profiles (venture_goal);

create index if not exists founder_discovery_profiles_availability_idx
  on public.founder_discovery_profiles (availability_hours_per_week);

create index if not exists founder_discovery_profiles_updated_at_idx
  on public.founder_discovery_profiles (updated_at desc);

create table if not exists public.founder_search_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  priority_weights jsonb not null default '{}'::jsonb,
  must_haves jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_search_preferences_priority_weights_object_check
    check (jsonb_typeof(priority_weights) = 'object'),
  constraint founder_search_preferences_must_haves_object_check
    check (jsonb_typeof(must_haves) = 'object')
);

create or replace function public.set_founder_discovery_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_founder_discovery_profiles_set_updated_at
  on public.founder_discovery_profiles;

create trigger trg_founder_discovery_profiles_set_updated_at
before update on public.founder_discovery_profiles
for each row
execute function public.set_founder_discovery_updated_at();

drop trigger if exists trg_founder_search_preferences_set_updated_at
  on public.founder_search_preferences;

create trigger trg_founder_search_preferences_set_updated_at
before update on public.founder_search_preferences
for each row
execute function public.set_founder_discovery_updated_at();

alter table public.founder_discovery_profiles enable row level security;
alter table public.founder_search_preferences enable row level security;

drop policy if exists founder_discovery_profiles_select_owner_or_active on public.founder_discovery_profiles;
create policy founder_discovery_profiles_select_owner_or_active
on public.founder_discovery_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or status = 'active'
);

drop policy if exists founder_discovery_profiles_insert_owner on public.founder_discovery_profiles;
create policy founder_discovery_profiles_insert_owner
on public.founder_discovery_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists founder_discovery_profiles_update_owner on public.founder_discovery_profiles;
create policy founder_discovery_profiles_update_owner
on public.founder_discovery_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists founder_discovery_profiles_delete_owner on public.founder_discovery_profiles;
create policy founder_discovery_profiles_delete_owner
on public.founder_discovery_profiles
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists founder_search_preferences_select_owner on public.founder_search_preferences;
create policy founder_search_preferences_select_owner
on public.founder_search_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists founder_search_preferences_insert_owner on public.founder_search_preferences;
create policy founder_search_preferences_insert_owner
on public.founder_search_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists founder_search_preferences_update_owner on public.founder_search_preferences;
create policy founder_search_preferences_update_owner
on public.founder_search_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists founder_search_preferences_delete_owner on public.founder_search_preferences;
create policy founder_search_preferences_delete_owner
on public.founder_search_preferences
for delete
to authenticated
using (user_id = auth.uid());

comment on table public.founder_discovery_profiles is
  'Founder Discovery V1 publishable profile projection. Private public.profiles remain owner-only.';

comment on table public.founder_search_preferences is
  'Founder Discovery V1 private search priorities and must-haves. Never shown to other users directly.';

create or replace function public.delete_founder_account_data(
  p_user_id uuid,
  p_research_hash_salt text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := p_user_id;
  v_user_email text := null;
  v_assessment_ids uuid[] := '{}'::uuid[];
  v_invitation_ids uuid[] := '{}'::uuid[];
  v_relationship_ids uuid[] := '{}'::uuid[];
  v_foreign_advisor_invitation_ids uuid[] := '{}'::uuid[];
  v_subject_hash text;
  v_invitation_hashes text[] := '{}'::text[];
  v_assessment_hashes text[] := '{}'::text[];
  v_deleted_report_runs integer := 0;
  v_deleted_advisor_links integer := 0;
  v_deleted_workbooks integer := 0;
  v_scrubbed_foreign_workbooks integer := 0;
  v_deleted_invitation_modules integer := 0;
  v_deleted_invitations integer := 0;
  v_deleted_relationships integer := 0;
  v_deleted_assessments integer := 0;
  v_deleted_founder_discovery_profiles integer := 0;
  v_deleted_founder_search_preferences integer := 0;
  v_deleted_profiles integer := 0;
  v_deleted_research_events integer := 0;
  v_deleted_product_feedback integer := 0;
  v_deleted_auth_users integer := 0;
  v_remaining_invitations integer := 0;
  v_remaining_report_runs integer := 0;
  v_remaining_advisor_links integer := 0;
  v_remaining_workbooks integer := 0;
  v_remaining_advisor_payload_residues integer := 0;
  v_remaining_assessments integer := 0;
  v_remaining_founder_discovery_profiles integer := 0;
  v_remaining_founder_search_preferences integer := 0;
  v_remaining_profiles integer := 0;
  v_remaining_research_events integer := 0;
  v_remaining_product_feedback integer := 0;
  v_remaining_matching_inputs integer := 0;
begin
  if v_user_id is null then
    raise exception 'missing_user_id';
  end if;

  perform set_config('app.allow_account_cleanup', 'on', true);

  select nullif(lower(btrim(u.email)), '')
    into v_user_email
  from auth.users u
  where u.id = v_user_id
  for update;

  if not found then
    raise exception 'user_not_found';
  end if;

  select coalesce(array_agg(a.id), '{}'::uuid[])
    into v_assessment_ids
  from public.assessments a
  where a.user_id = v_user_id;

  select coalesce(array_agg(distinct i.id), '{}'::uuid[])
    into v_invitation_ids
  from public.invitations i
  where i.inviter_user_id = v_user_id
     or i.invitee_user_id = v_user_id
     or (v_user_email is not null and lower(i.invitee_email) = v_user_email);

  select coalesce(array_agg(distinct r.id), '{}'::uuid[])
    into v_relationship_ids
  from public.relationships r
  where r.user_a_id = v_user_id
     or r.user_b_id = v_user_id;

  select coalesce(array_agg(distinct source.invitation_id), '{}'::uuid[])
    into v_foreign_advisor_invitation_ids
  from (
    select fa.invitation_id
    from public.founder_alignment_workbook_advisors fa
    where fa.advisor_user_id = v_user_id
      and not (fa.invitation_id = any(v_invitation_ids))

    union

    select fw.invitation_id
    from public.founder_alignment_workbooks fw
    where coalesce(fw.payload ->> 'advisorId', '') = v_user_id::text
      and not (fw.invitation_id = any(v_invitation_ids))
  ) as source;

  update public.founder_alignment_workbooks w
  set
    payload = public.scrub_deleted_advisor_from_workbook_payload(w.payload),
    created_by = case
      when w.created_by = v_user_id then i.inviter_user_id
      else w.created_by
    end,
    updated_by = case
      when w.updated_by = v_user_id then i.inviter_user_id
      else w.updated_by
    end
  from public.invitations i
  where i.id = w.invitation_id
    and w.invitation_id = any(v_foreign_advisor_invitation_ids);

  get diagnostics v_scrubbed_foreign_workbooks = row_count;

  update public.founder_alignment_workbooks w
  set
    created_by = case
      when w.created_by = v_user_id then i.inviter_user_id
      else w.created_by
    end,
    updated_by = case
      when w.updated_by = v_user_id then i.inviter_user_id
      else w.updated_by
    end
  from public.invitations i
  where i.id = w.invitation_id
    and (w.created_by = v_user_id or w.updated_by = v_user_id)
    and not (w.invitation_id = any(v_invitation_ids))
    and not (w.invitation_id = any(v_foreign_advisor_invitation_ids));

  v_subject_hash := case
    when p_research_hash_salt is null or btrim(p_research_hash_salt) = '' then
      encode(digest(lower(btrim(v_user_id::text)), 'sha256'), 'hex')
    else
      encode(digest(btrim(p_research_hash_salt) || ':' || lower(btrim(v_user_id::text)), 'sha256'), 'hex')
  end;

  select coalesce(
    array_agg(
      case
        when p_research_hash_salt is null or btrim(p_research_hash_salt) = '' then
          encode(digest(lower(btrim(invitation_id::text)), 'sha256'), 'hex')
        else
          encode(digest(btrim(p_research_hash_salt) || ':' || lower(btrim(invitation_id::text)), 'sha256'), 'hex')
      end
    ),
    '{}'::text[]
  )
    into v_invitation_hashes
  from unnest(v_invitation_ids) as invitation_id;

  select coalesce(
    array_agg(
      case
        when p_research_hash_salt is null or btrim(p_research_hash_salt) = '' then
          encode(digest(lower(btrim(assessment_id::text)), 'sha256'), 'hex')
        else
          encode(digest(btrim(p_research_hash_salt) || ':' || lower(btrim(assessment_id::text)), 'sha256'), 'hex')
      end
    ),
    '{}'::text[]
  )
    into v_assessment_hashes
  from unnest(v_assessment_ids) as assessment_id;

  delete from public.report_runs rr
  where rr.invitation_id = any(v_invitation_ids)
     or rr.relationship_id = any(v_relationship_ids);

  get diagnostics v_deleted_report_runs = row_count;

  delete from public.founder_alignment_workbook_advisors fa
  where fa.invitation_id = any(v_invitation_ids)
     or fa.advisor_user_id = v_user_id
     or fa.requested_by = v_user_id;

  get diagnostics v_deleted_advisor_links = row_count;

  delete from public.founder_alignment_workbooks fw
  where fw.invitation_id = any(v_invitation_ids);

  get diagnostics v_deleted_workbooks = row_count;

  delete from public.invitation_modules im
  where im.invitation_id = any(v_invitation_ids);

  get diagnostics v_deleted_invitation_modules = row_count;

  delete from public.invitations i
  where i.id = any(v_invitation_ids);

  get diagnostics v_deleted_invitations = row_count;

  delete from public.relationships r
  where r.id = any(v_relationship_ids)
    and not exists (
      select 1
      from public.report_runs rr
      where rr.relationship_id = r.id
    );

  get diagnostics v_deleted_relationships = row_count;

  delete from public.assessments a
  where a.id = any(v_assessment_ids);

  get diagnostics v_deleted_assessments = row_count;

  delete from public.founder_search_preferences fsp
  where fsp.user_id = v_user_id;

  get diagnostics v_deleted_founder_search_preferences = row_count;

  delete from public.founder_discovery_profiles fdp
  where fdp.user_id = v_user_id;

  get diagnostics v_deleted_founder_discovery_profiles = row_count;

  delete from public.profiles p
  where p.user_id = v_user_id;

  get diagnostics v_deleted_profiles = row_count;

  delete from public.research_events re
  where re.subject_hash = v_subject_hash
     or re.invitation_hash = any(v_invitation_hashes)
     or re.assessment_hash = any(v_assessment_hashes);

  get diagnostics v_deleted_research_events = row_count;

  delete from public.product_feedback pf
  where pf.user_id = v_user_id
     or pf.invitation_id = any(v_invitation_ids);

  get diagnostics v_deleted_product_feedback = row_count;

  delete from auth.users u
  where u.id = v_user_id;

  get diagnostics v_deleted_auth_users = row_count;

  if v_deleted_auth_users <> 1 then
    raise exception 'auth_user_delete_failed';
  end if;

  select count(*)
    into v_remaining_invitations
  from public.invitations i
  where i.inviter_user_id = v_user_id
     or i.invitee_user_id = v_user_id
     or (v_user_email is not null and lower(i.invitee_email) = v_user_email);

  select count(*)
    into v_remaining_report_runs
  from public.report_runs rr
  where rr.invitation_id = any(v_invitation_ids)
     or rr.relationship_id = any(v_relationship_ids);

  select count(*)
    into v_remaining_workbooks
  from public.founder_alignment_workbooks fw
  where fw.invitation_id = any(v_invitation_ids);

  select count(*)
    into v_remaining_advisor_links
  from public.founder_alignment_workbook_advisors fa
  where fa.invitation_id = any(v_invitation_ids)
     or fa.advisor_user_id = v_user_id
     or fa.requested_by = v_user_id;

  select count(*)
    into v_remaining_advisor_payload_residues
  from public.founder_alignment_workbooks fw
  where fw.invitation_id = any(v_foreign_advisor_invitation_ids)
    and public.workbook_payload_has_advisor_personal_data(fw.payload, v_user_id);

  select count(*)
    into v_remaining_assessments
  from public.assessments a
  where a.user_id = v_user_id;

  select count(*)
    into v_remaining_founder_search_preferences
  from public.founder_search_preferences fsp
  where fsp.user_id = v_user_id;

  select count(*)
    into v_remaining_founder_discovery_profiles
  from public.founder_discovery_profiles fdp
  where fdp.user_id = v_user_id;

  select count(*)
    into v_remaining_profiles
  from public.profiles p
  where p.user_id = v_user_id;

  select count(*)
    into v_remaining_research_events
  from public.research_events re
  where re.subject_hash = v_subject_hash
     or re.invitation_hash = any(v_invitation_hashes)
     or re.assessment_hash = any(v_assessment_hashes);

  select count(*)
    into v_remaining_product_feedback
  from public.product_feedback pf
  where pf.user_id = v_user_id
     or pf.invitation_id = any(v_invitation_ids);

  select count(*)
    into v_remaining_matching_inputs
  from public.invitation_matching_inputs imi
  where imi.invitation_id = any(v_invitation_ids)
     or imi.user_id = v_user_id
     or imi.assessment_id = any(v_assessment_ids);

  if v_remaining_invitations <> 0
     or v_remaining_report_runs <> 0
     or v_remaining_advisor_links <> 0
     or v_remaining_workbooks <> 0
     or v_remaining_advisor_payload_residues <> 0
     or v_remaining_assessments <> 0
     or v_remaining_founder_search_preferences <> 0
     or v_remaining_founder_discovery_profiles <> 0
     or v_remaining_profiles <> 0
     or v_remaining_research_events <> 0
     or v_remaining_product_feedback <> 0
     or v_remaining_matching_inputs <> 0 then
    raise exception 'account_cleanup_verification_failed';
  end if;

  return jsonb_build_object(
    'userId', v_user_id,
    'deletedReportRuns', v_deleted_report_runs,
    'deletedAdvisorLinks', v_deleted_advisor_links,
    'deletedWorkbooks', v_deleted_workbooks,
    'scrubbedForeignWorkbooks', v_scrubbed_foreign_workbooks,
    'deletedInvitationModules', v_deleted_invitation_modules,
    'deletedInvitations', v_deleted_invitations,
    'deletedRelationships', v_deleted_relationships,
    'deletedAssessments', v_deleted_assessments,
    'deletedFounderSearchPreferences', v_deleted_founder_search_preferences,
    'deletedFounderDiscoveryProfiles', v_deleted_founder_discovery_profiles,
    'deletedProfiles', v_deleted_profiles,
    'deletedResearchEvents', v_deleted_research_events,
    'deletedProductFeedback', v_deleted_product_feedback,
    'deletedAuthUsers', v_deleted_auth_users,
    'remainingInvitations', v_remaining_invitations,
    'remainingReportRuns', v_remaining_report_runs,
    'remainingAdvisorLinks', v_remaining_advisor_links,
    'remainingWorkbooks', v_remaining_workbooks,
    'remainingAdvisorPayloadResidues', v_remaining_advisor_payload_residues,
    'remainingAssessments', v_remaining_assessments,
    'remainingFounderSearchPreferences', v_remaining_founder_search_preferences,
    'remainingFounderDiscoveryProfiles', v_remaining_founder_discovery_profiles,
    'remainingProfiles', v_remaining_profiles,
    'remainingResearchEvents', v_remaining_research_events,
    'remainingProductFeedback', v_remaining_product_feedback,
    'remainingMatchingInputs', v_remaining_matching_inputs
  );
end;
$$;

-- Smoke-check notes:
-- 1) Draft and paused discovery profiles are visible only to their owner via RLS.
-- 2) Active discovery profiles are visible to authenticated users, not anon users.
-- 3) Founder search preferences remain owner-only for all operations.
-- 4) founder_discovery_profiles_active_complete_check blocks incomplete active profiles.

commit;
