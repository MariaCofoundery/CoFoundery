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
declare
  v_user_id uuid := p_user_id;
  v_user_email text := nullif(lower(btrim(coalesce(p_user_email, ''))), '');
  v_assessment_ids uuid[] := '{}'::uuid[];
  v_invitation_ids uuid[] := '{}'::uuid[];
  v_subject_hash text;
  v_deleted_research_events integer := 0;
  v_deleted_advisor_links integer := 0;
  v_deleted_invitations integer := 0;
  v_deleted_relationships integer := 0;
  v_deleted_assessments integer := 0;
  v_deleted_profiles integer := 0;
begin
  if v_user_id is null then
    raise exception 'missing_user_id';
  end if;

  perform set_config('app.allow_account_cleanup', 'on', true);

  select coalesce(array_agg(a.id), '{}'::uuid[])
    into v_assessment_ids
  from public.assessments a
  where a.user_id = v_user_id;

  select coalesce(array_agg(i.id), '{}'::uuid[])
    into v_invitation_ids
  from public.invitations i
  where i.inviter_user_id = v_user_id
     or i.invitee_user_id = v_user_id
     or (v_user_email is not null and lower(i.invitee_email) = v_user_email);

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

  delete from public.founder_alignment_workbook_advisors fa
  where fa.advisor_user_id = v_user_id
     or fa.requested_by = v_user_id
     or fa.invitation_id = any(v_invitation_ids);

  get diagnostics v_deleted_advisor_links = row_count;

  v_subject_hash := case
    when p_research_hash_salt is null or btrim(p_research_hash_salt) = '' then
      encode(digest(lower(btrim(v_user_id::text)), 'sha256'), 'hex')
    else
      encode(digest(btrim(p_research_hash_salt) || ':' || lower(btrim(v_user_id::text)), 'sha256'), 'hex')
  end;

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

  delete from public.invitations i
  where i.id = any(v_invitation_ids);

  get diagnostics v_deleted_invitations = row_count;

  delete from public.relationships r
  where r.user_a_id = v_user_id
     or r.user_b_id = v_user_id;

  get diagnostics v_deleted_relationships = row_count;

  delete from public.assessments a
  where a.user_id = v_user_id;

  get diagnostics v_deleted_assessments = row_count;

  delete from public.profiles p
  where p.user_id = v_user_id;

  get diagnostics v_deleted_profiles = row_count;

  return jsonb_build_object(
    'userId', v_user_id,
    'deletedAdvisorLinks', v_deleted_advisor_links,
    'deletedResearchEvents', v_deleted_research_events,
    'deletedInvitations', v_deleted_invitations,
    'deletedRelationships', v_deleted_relationships,
    'deletedAssessments', v_deleted_assessments,
    'deletedProfiles', v_deleted_profiles
  );
end;
$$;

revoke all on function public.delete_user_operational_data(uuid, text, text) from public;
grant execute on function public.delete_user_operational_data(uuid, text, text) to service_role;

commit;
