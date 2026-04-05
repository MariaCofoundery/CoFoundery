begin;

create or replace function public.scrub_deleted_advisor_from_workbook_payload(p_payload jsonb)
returns jsonb
language sql
immutable
as $$
  with root as (
    select
      case
        when jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) = 'object'
          then coalesce(p_payload, '{}'::jsonb)
        else '{}'::jsonb
      end as payload
  ),
  scrubbed_steps as (
    select
      coalesce(
        (
          select jsonb_object_agg(
            step_key,
            case
              when jsonb_typeof(step_value) = 'object' then
                jsonb_set(step_value, '{advisorNotes}', to_jsonb(''::text), true)
              else
                step_value
            end
          )
          from jsonb_each(coalesce(root.payload -> 'steps', '{}'::jsonb)) as step(step_key, step_value)
        ),
        coalesce(root.payload -> 'steps', '{}'::jsonb)
      ) as steps
    from root
  )
  select
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            root.payload,
            '{advisorId}',
            'null'::jsonb,
            true
          ),
          '{advisorName}',
          'null'::jsonb,
          true
        ),
        '{advisorClosing}',
        jsonb_build_object(
          'observations', '',
          'questions', '',
          'nextSteps', ''
        ),
        true
      ),
      '{steps}',
      scrubbed_steps.steps,
      true
    )
  from root, scrubbed_steps;
$$;

create or replace function public.workbook_payload_has_advisor_personal_data(
  p_payload jsonb,
  p_user_id uuid
)
returns boolean
language sql
immutable
as $$
  with root as (
    select
      case
        when jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) = 'object'
          then coalesce(p_payload, '{}'::jsonb)
        else '{}'::jsonb
      end as payload
  )
  select
    coalesce(root.payload ->> 'advisorId', '') = coalesce(p_user_id::text, '')
    or nullif(btrim(coalesce(root.payload ->> 'advisorName', '')), '') is not null
    or nullif(btrim(coalesce(root.payload #>> '{advisorClosing,observations}', '')), '') is not null
    or nullif(btrim(coalesce(root.payload #>> '{advisorClosing,questions}', '')), '') is not null
    or nullif(btrim(coalesce(root.payload #>> '{advisorClosing,nextSteps}', '')), '') is not null
    or exists (
      select 1
      from jsonb_each(coalesce(root.payload -> 'steps', '{}'::jsonb)) as step(step_key, step_value)
      where jsonb_typeof(step_value) = 'object'
        and nullif(btrim(coalesce(step_value ->> 'advisorNotes', '')), '') is not null
    )
  from root;
$$;

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
  v_remaining_profiles integer := 0;
  v_remaining_research_events integer := 0;
  v_remaining_product_feedback integer := 0;
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

  -- 8) Delete personal profile data.
  delete from public.profiles p
  where p.user_id = v_user_id;

  get diagnostics v_deleted_profiles = row_count;

  -- 9) Delete pseudonymous research rows tied to the user, invitations, or assessments.
  delete from public.research_events re
  where re.subject_hash = v_subject_hash
     or re.invitation_hash = any(v_invitation_hashes)
     or re.assessment_hash = any(v_assessment_hashes);

  get diagnostics v_deleted_research_events = row_count;

  -- 10) Delete direct and shared product feedback.
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

  if v_remaining_invitations <> 0
     or v_remaining_report_runs <> 0
     or v_remaining_advisor_links <> 0
     or v_remaining_workbooks <> 0
     or v_remaining_advisor_payload_residues <> 0
     or v_remaining_assessments <> 0
     or v_remaining_profiles <> 0
     or v_remaining_research_events <> 0
     or v_remaining_product_feedback <> 0 then
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
    'remainingProfiles', v_remaining_profiles,
    'remainingResearchEvents', v_remaining_research_events,
    'remainingProductFeedback', v_remaining_product_feedback
  );
end;
$$;

commit;
