begin;

create table if not exists public.invitation_matching_inputs (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module public.assessment_module not null,
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invitation_id, user_id, module),
  unique (invitation_id, assessment_id)
);

create index if not exists invitation_matching_inputs_invitation_id_idx
  on public.invitation_matching_inputs (invitation_id);

create index if not exists invitation_matching_inputs_user_id_idx
  on public.invitation_matching_inputs (user_id);

create index if not exists invitation_matching_inputs_assessment_id_idx
  on public.invitation_matching_inputs (assessment_id);

create or replace function public.validate_invitation_matching_input()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invitation public.invitations%rowtype;
  v_assessment public.assessments%rowtype;
begin
  select *
    into v_invitation
  from public.invitations
  where id = new.invitation_id;

  if not found then
    raise exception 'invitation_not_found';
  end if;

  if new.user_id <> v_invitation.inviter_user_id
     and new.user_id is distinct from v_invitation.invitee_user_id then
    raise exception 'matching_input_user_not_participant';
  end if;

  select *
    into v_assessment
  from public.assessments
  where id = new.assessment_id;

  if not found then
    raise exception 'matching_input_assessment_not_found';
  end if;

  if v_assessment.user_id <> new.user_id then
    raise exception 'matching_input_assessment_user_mismatch';
  end if;

  if v_assessment.module <> new.module then
    raise exception 'matching_input_assessment_module_mismatch';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_invitation_matching_inputs_validate on public.invitation_matching_inputs;
create trigger trg_invitation_matching_inputs_validate
before insert or update on public.invitation_matching_inputs
for each row execute function public.validate_invitation_matching_input();

alter table public.invitation_matching_inputs enable row level security;

drop policy if exists invitation_matching_inputs_select_participants on public.invitation_matching_inputs;
create policy invitation_matching_inputs_select_participants
on public.invitation_matching_inputs
for select to authenticated
using (
  exists (
    select 1
    from public.invitations i
    where i.id = invitation_matching_inputs.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

drop policy if exists invitation_matching_inputs_insert_self on public.invitation_matching_inputs;
create policy invitation_matching_inputs_insert_self
on public.invitation_matching_inputs
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invitations i
    where i.id = invitation_matching_inputs.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

drop policy if exists invitation_matching_inputs_update_self on public.invitation_matching_inputs;
create policy invitation_matching_inputs_update_self
on public.invitation_matching_inputs
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invitations i
    where i.id = invitation_matching_inputs.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.invitations i
    where i.id = invitation_matching_inputs.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

drop function if exists public.finalize_invitation_if_ready(uuid, jsonb);

create function public.finalize_invitation_if_ready(
  p_invitation_id uuid,
  p_payload jsonb default null
)
returns table (
  ready boolean,
  report_run_id uuid,
  relationship_id uuid,
  modules public.assessment_module[],
  assessment_ids uuid[],
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.invitations%rowtype;
  v_required_modules public.assessment_module[];
  v_module public.assessment_module;
  v_assessment_id uuid;
  v_assessment_ids uuid[] := '{}'::uuid[];
  v_relationship_id uuid;
  v_report_run_id uuid;
begin
  select * into v_inv
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'invitation_not_found';
    return;
  end if;

  if v_inv.revoked_at is not null or v_inv.status = 'revoked' then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'revoked';
    return;
  end if;

  if v_inv.expires_at < now() then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'expired';
    return;
  end if;

  if v_inv.status <> 'accepted' then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'not_accepted';
    return;
  end if;

  if v_inv.invitee_user_id is null then
    return query select false, null::uuid, null::uuid, '{}'::public.assessment_module[], '{}'::uuid[], 'missing_invitee';
    return;
  end if;

  select coalesce(array_agg(im.module order by im.module), '{}'::public.assessment_module[])
    into v_required_modules
  from public.invitation_modules im
  where im.invitation_id = v_inv.id;

  if array_position(v_required_modules, 'base'::public.assessment_module) is null then
    v_required_modules := array_prepend('base'::public.assessment_module, v_required_modules);
  end if;

  for v_module in select unnest(v_required_modules)
  loop
    select imi.assessment_id
      into v_assessment_id
    from public.invitation_matching_inputs imi
    join public.assessments a
      on a.id = imi.assessment_id
    where imi.invitation_id = v_inv.id
      and imi.user_id = v_inv.inviter_user_id
      and imi.module = v_module
      and a.submitted_at is not null
    limit 1;

    if v_assessment_id is null then
      return query select false, null::uuid, null::uuid, v_required_modules, v_assessment_ids, 'waiting_for_answers';
      return;
    end if;

    v_assessment_ids := array_append(v_assessment_ids, v_assessment_id);
    v_assessment_id := null;

    select imi.assessment_id
      into v_assessment_id
    from public.invitation_matching_inputs imi
    join public.assessments a
      on a.id = imi.assessment_id
    where imi.invitation_id = v_inv.id
      and imi.user_id = v_inv.invitee_user_id
      and imi.module = v_module
      and a.submitted_at is not null
    limit 1;

    if v_assessment_id is null then
      return query select false, null::uuid, null::uuid, v_required_modules, v_assessment_ids, 'waiting_for_answers';
      return;
    end if;

    v_assessment_ids := array_append(v_assessment_ids, v_assessment_id);
    v_assessment_id := null;
  end loop;

  insert into public.relationships(user_a_id, user_b_id)
  values (v_inv.inviter_user_id, v_inv.invitee_user_id)
  on conflict (user_low, user_high)
  do nothing
  returning id into v_relationship_id;

  if v_relationship_id is null then
    select r.id
      into v_relationship_id
    from public.relationships r
    where r.user_low = least(v_inv.inviter_user_id, v_inv.invitee_user_id)
      and r.user_high = greatest(v_inv.inviter_user_id, v_inv.invitee_user_id)
    limit 1;
  end if;

  select rr.id
    into v_report_run_id
  from public.report_runs rr
  where rr.invitation_id = v_inv.id
  limit 1;

  if v_report_run_id is null and p_payload is not null then
    insert into public.report_runs(
      relationship_id,
      invitation_id,
      modules,
      input_assessment_ids,
      payload
    )
    values (
      v_relationship_id,
      v_inv.id,
      v_required_modules,
      v_assessment_ids,
      p_payload
    )
    on conflict (invitation_id)
    do nothing
    returning id into v_report_run_id;

    if v_report_run_id is null then
      select rr.id
        into v_report_run_id
      from public.report_runs rr
      where rr.invitation_id = v_inv.id
      limit 1;
    end if;
  end if;

  return query select true, v_report_run_id, v_relationship_id, v_required_modules, v_assessment_ids, null::text;
end;
$$;

revoke all on function public.finalize_invitation_if_ready(uuid, jsonb) from public;
grant execute on function public.finalize_invitation_if_ready(uuid, jsonb) to authenticated;
grant execute on function public.finalize_invitation_if_ready(uuid, jsonb) to service_role;

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
    'remainingProductFeedback', v_remaining_product_feedback,
    'remainingMatchingInputs', v_remaining_matching_inputs
  );
end;
$$;

commit;
