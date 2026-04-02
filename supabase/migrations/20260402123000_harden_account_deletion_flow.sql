begin;

create extension if not exists pgcrypto;

create or replace function public.block_modifications()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_account_cleanup', true) = 'on' then
    return old;
  end if;

  raise exception 'immutable';
end;
$$;

create or replace function public.block_report_runs_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_account_cleanup', true) = 'on' then
    return old;
  end if;

  raise exception 'report_runs_are_immutable';
end;
$$;

create or replace function public.block_research_events_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_account_cleanup', true) = 'on' then
    return old;
  end if;

  raise exception 'research_events_are_immutable';
end;
$$;

drop trigger if exists report_runs_immutable on public.report_runs;
drop trigger if exists trg_report_runs_immutable_u on public.report_runs;
drop trigger if exists trg_report_runs_immutable_d on public.report_runs;

create trigger trg_report_runs_immutable_u
before update on public.report_runs
for each row execute function public.block_report_runs_mutation();

create trigger trg_report_runs_immutable_d
before delete on public.report_runs
for each row execute function public.block_report_runs_mutation();

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
  v_subject_hash text;
  v_deleted_report_runs integer := 0;
  v_deleted_advisor_links integer := 0;
  v_deleted_workbooks integer := 0;
  v_deleted_invitation_modules integer := 0;
  v_deleted_invitations integer := 0;
  v_deleted_relationships integer := 0;
  v_deleted_assessments integer := 0;
  v_deleted_profiles integer := 0;
  v_deleted_research_events integer := 0;
  v_deleted_auth_users integer := 0;
  v_remaining_invitations integer := 0;
  v_remaining_report_runs integer := 0;
  v_remaining_advisor_links integer := 0;
  v_remaining_workbooks integer := 0;
  v_remaining_assessments integer := 0;
  v_remaining_profiles integer := 0;
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
    and not (w.invitation_id = any(v_invitation_ids));

  v_subject_hash := case
    when p_research_hash_salt is null or btrim(p_research_hash_salt) = '' then
      encode(digest(lower(btrim(v_user_id::text)), 'sha256'), 'hex')
    else
      encode(digest(btrim(p_research_hash_salt) || ':' || lower(btrim(v_user_id::text)), 'sha256'), 'hex')
  end;

  -- 1) Delete immutable shared report snapshots first.
  delete from public.report_runs rr
  where rr.invitation_id = any(v_invitation_ids)
     or rr.relationship_id = any(v_relationship_ids);

  get diagnostics v_deleted_report_runs = row_count;

  -- 2) Delete workbook advisor rows before workbook payloads.
  delete from public.founder_alignment_workbook_advisors fa
  where fa.invitation_id = any(v_invitation_ids)
     or fa.advisor_user_id = v_user_id
     or fa.requested_by = v_user_id;

  get diagnostics v_deleted_advisor_links = row_count;

  -- 3) Delete workbook payloads tied to the user's founder invitations.
  delete from public.founder_alignment_workbooks fw
  where fw.invitation_id = any(v_invitation_ids);

  get diagnostics v_deleted_workbooks = row_count;

  -- 4) Delete invitation module rows explicitly.
  delete from public.invitation_modules im
  where im.invitation_id = any(v_invitation_ids);

  get diagnostics v_deleted_invitation_modules = row_count;

  -- 5) Delete invitations that belong to or target this user.
  delete from public.invitations i
  where i.id = any(v_invitation_ids);

  get diagnostics v_deleted_invitations = row_count;

  -- 6) Delete only orphaned relationships after report runs are gone.
  delete from public.relationships r
  where r.id = any(v_relationship_ids)
    and not exists (
      select 1
      from public.report_runs rr
      where rr.relationship_id = r.id
    );

  get diagnostics v_deleted_relationships = row_count;

  -- 7) Delete assessments; answers cascade automatically.
  delete from public.assessments a
  where a.id = any(v_assessment_ids);

  get diagnostics v_deleted_assessments = row_count;

  -- 8) Optional personal profile data.
  delete from public.profiles p
  where p.user_id = v_user_id;

  get diagnostics v_deleted_profiles = row_count;

  delete from public.research_events re
  where re.subject_hash = v_subject_hash
     or exists (
       select 1
       from unnest(v_invitation_ids) as invitation_id
       where re.invitation_hash = case
         when p_research_hash_salt is null or btrim(p_research_hash_salt) = '' then
           encode(digest(lower(btrim(invitation_id::text)), 'sha256'), 'hex')
         else
           encode(digest(btrim(p_research_hash_salt) || ':' || lower(btrim(invitation_id::text)), 'sha256'), 'hex')
       end
     )
     or exists (
       select 1
       from unnest(v_assessment_ids) as assessment_id
       where re.assessment_hash = case
         when p_research_hash_salt is null or btrim(p_research_hash_salt) = '' then
           encode(digest(lower(btrim(assessment_id::text)), 'sha256'), 'hex')
         else
           encode(digest(btrim(p_research_hash_salt) || ':' || lower(btrim(assessment_id::text)), 'sha256'), 'hex')
       end
     );

  get diagnostics v_deleted_research_events = row_count;

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
    into v_remaining_assessments
  from public.assessments a
  where a.user_id = v_user_id;

  select count(*)
    into v_remaining_profiles
  from public.profiles p
  where p.user_id = v_user_id;

  if v_remaining_invitations <> 0
     or v_remaining_report_runs <> 0
     or v_remaining_advisor_links <> 0
     or v_remaining_workbooks <> 0
     or v_remaining_assessments <> 0
     or v_remaining_profiles <> 0 then
    raise exception 'account_cleanup_verification_failed';
  end if;

  return jsonb_build_object(
    'userId', v_user_id,
    'deletedReportRuns', v_deleted_report_runs,
    'deletedAdvisorLinks', v_deleted_advisor_links,
    'deletedWorkbooks', v_deleted_workbooks,
    'deletedInvitationModules', v_deleted_invitation_modules,
    'deletedInvitations', v_deleted_invitations,
    'deletedRelationships', v_deleted_relationships,
    'deletedAssessments', v_deleted_assessments,
    'deletedProfiles', v_deleted_profiles,
    'deletedResearchEvents', v_deleted_research_events,
    'deletedAuthUsers', v_deleted_auth_users,
    'remainingInvitations', v_remaining_invitations,
    'remainingReportRuns', v_remaining_report_runs,
    'remainingAdvisorLinks', v_remaining_advisor_links,
    'remainingWorkbooks', v_remaining_workbooks,
    'remainingAssessments', v_remaining_assessments,
    'remainingProfiles', v_remaining_profiles
  );
end;
$$;

create or replace function public.delete_user_operational_data(
  p_user_id uuid,
  p_user_email text default null,
  p_research_hash_salt text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  return public.delete_founder_account_data(p_user_id, p_research_hash_salt);
end;
$$;

revoke all on function public.delete_founder_account_data(uuid, text) from public;
grant execute on function public.delete_founder_account_data(uuid, text) to service_role;

revoke all on function public.delete_user_operational_data(uuid, text, text) from public;
grant execute on function public.delete_user_operational_data(uuid, text, text) to service_role;

commit;
