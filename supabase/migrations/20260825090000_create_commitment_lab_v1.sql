begin;

create table public.commitment_labs (
  relationship_id uuid primary key references public.relationships(id) on delete cascade,
  shared_reflection text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commitment_labs_shared_reflection_length_check
    check (char_length(shared_reflection) <= 10000)
);

create table public.commitment_lab_founder_entries (
  relationship_id uuid not null references public.commitment_labs(relationship_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  current_hours smallint,
  difficult_week_hours smallint,
  obligation_categories text[] not null default '{}'::text[],
  change_note text not null default '',
  reality_fit text,
  commitment_meaning text not null default '',
  priority_reflection text not null default '',
  reliability_reflection text not null default '',
  transparency_reflection text not null default '',
  responsibility_reflection text not null default '',
  renegotiation_reflection text not null default '',
  scenario_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (relationship_id, user_id),
  constraint commitment_lab_hours_check check (
    (current_hours is null or current_hours between 0 and 168)
    and (difficult_week_hours is null or difficult_week_hours between 0 and 168)
  ),
  constraint commitment_lab_obligations_check check (
    obligation_categories <@ array[
      'employment', 'self_employment', 'education', 'family_care',
      'other_project', 'other_regular'
    ]::text[]
  ),
  constraint commitment_lab_reality_fit_check check (
    reality_fit is null or reality_fit in ('realistic', 'partly', 'reconsider')
  ),
  constraint commitment_lab_text_lengths_check check (
    char_length(change_note) <= 5000
    and char_length(commitment_meaning) <= 5000
    and char_length(priority_reflection) <= 5000
    and char_length(reliability_reflection) <= 5000
    and char_length(transparency_reflection) <= 5000
    and char_length(responsibility_reflection) <= 5000
    and char_length(renegotiation_reflection) <= 5000
  ),
  constraint commitment_lab_scenario_answers_shape_check check (
    jsonb_typeof(scenario_answers) = 'object'
    and octet_length(scenario_answers::text) <= 50000
  )
);

create table public.commitment_lab_discussion_entries (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.commitment_labs(relationship_id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  parent_entry_id uuid references public.commitment_lab_discussion_entries(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint commitment_lab_discussion_body_check
    check (char_length(btrim(body)) between 1 and 5000)
);

create index commitment_lab_discussion_relationship_created_idx
  on public.commitment_lab_discussion_entries(relationship_id, created_at, id);

create or replace function public.set_commitment_lab_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_commitment_labs_updated_at
before update on public.commitment_labs
for each row execute function public.set_commitment_lab_updated_at();

create trigger trg_commitment_lab_founder_entries_updated_at
before update on public.commitment_lab_founder_entries
for each row execute function public.set_commitment_lab_updated_at();

alter table public.commitment_labs enable row level security;
alter table public.commitment_lab_founder_entries enable row level security;
alter table public.commitment_lab_discussion_entries enable row level security;

create policy commitment_labs_select_relationship_founders
on public.commitment_labs for select to authenticated
using (exists (
  select 1 from public.relationships relationship
  where relationship.id = commitment_labs.relationship_id
    and auth.uid() in (relationship.user_a_id, relationship.user_b_id)
));

create policy commitment_lab_founder_entries_select_relationship_founders
on public.commitment_lab_founder_entries for select to authenticated
using (exists (
  select 1 from public.relationships relationship
  where relationship.id = commitment_lab_founder_entries.relationship_id
    and auth.uid() in (relationship.user_a_id, relationship.user_b_id)
));

create policy commitment_lab_discussion_select_relationship_founders
on public.commitment_lab_discussion_entries for select to authenticated
using (exists (
  select 1 from public.relationships relationship
  where relationship.id = commitment_lab_discussion_entries.relationship_id
    and auth.uid() in (relationship.user_a_id, relationship.user_b_id)
));

create or replace function public.save_commitment_lab_founder_entry(
  p_relationship_id uuid,
  p_current_hours smallint,
  p_difficult_week_hours smallint,
  p_obligation_categories text[],
  p_change_note text,
  p_reality_fit text,
  p_commitment_meaning text,
  p_priority_reflection text,
  p_reliability_reflection text,
  p_transparency_reflection text,
  p_responsibility_reflection text,
  p_renegotiation_reflection text,
  p_scenario_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_relationship public.relationships%rowtype;
begin
  if v_user_id is null then
    raise exception 'commitment_lab_auth_required' using errcode = '42501';
  end if;
  select * into v_relationship from public.relationships relationship
  where relationship.id = p_relationship_id;
  if not found or v_user_id not in (v_relationship.user_a_id, v_relationship.user_b_id) then
    raise exception 'commitment_lab_unavailable' using errcode = '42501';
  end if;
  if (p_current_hours is not null and p_current_hours not between 0 and 168)
     or (p_difficult_week_hours is not null and p_difficult_week_hours not between 0 and 168)
     or not (coalesce(p_obligation_categories, '{}'::text[]) <@ array[
       'employment', 'self_employment', 'education', 'family_care',
       'other_project', 'other_regular'
     ]::text[])
     or (p_reality_fit is not null and p_reality_fit not in ('realistic', 'partly', 'reconsider'))
     or jsonb_typeof(coalesce(p_scenario_answers, '{}'::jsonb)) <> 'object'
     or exists (
       select 1 from jsonb_object_keys(coalesce(p_scenario_answers, '{}'::jsonb)) scenario(key)
       where scenario.key not in (
         'motivation_progress', 'time_circumstances',
         'attractive_alternative', 'team_responsibility'
       )
     ) then
    raise exception 'commitment_lab_input_invalid' using errcode = '22023';
  end if;

  insert into public.commitment_labs(relationship_id) values (p_relationship_id)
  on conflict (relationship_id) do nothing;
  insert into public.commitment_lab_founder_entries (
    relationship_id, user_id, current_hours, difficult_week_hours,
    obligation_categories, change_note, reality_fit, commitment_meaning,
    priority_reflection, reliability_reflection, transparency_reflection,
    responsibility_reflection, renegotiation_reflection, scenario_answers
  ) values (
    p_relationship_id, v_user_id, p_current_hours, p_difficult_week_hours,
    coalesce(p_obligation_categories, '{}'::text[]), btrim(coalesce(p_change_note, '')),
    p_reality_fit, btrim(coalesce(p_commitment_meaning, '')),
    btrim(coalesce(p_priority_reflection, '')), btrim(coalesce(p_reliability_reflection, '')),
    btrim(coalesce(p_transparency_reflection, '')), btrim(coalesce(p_responsibility_reflection, '')),
    btrim(coalesce(p_renegotiation_reflection, '')), coalesce(p_scenario_answers, '{}'::jsonb)
  )
  on conflict (relationship_id, user_id) do update set
    current_hours = excluded.current_hours,
    difficult_week_hours = excluded.difficult_week_hours,
    obligation_categories = excluded.obligation_categories,
    change_note = excluded.change_note,
    reality_fit = excluded.reality_fit,
    commitment_meaning = excluded.commitment_meaning,
    priority_reflection = excluded.priority_reflection,
    reliability_reflection = excluded.reliability_reflection,
    transparency_reflection = excluded.transparency_reflection,
    responsibility_reflection = excluded.responsibility_reflection,
    renegotiation_reflection = excluded.renegotiation_reflection,
    scenario_answers = excluded.scenario_answers;
end;
$$;

create or replace function public.handoff_commitment_lab_reflection_if_empty(
  p_relationship_id uuid,
  p_team_id uuid,
  p_item_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_relationship public.relationships%rowtype;
  v_reflection text;
  v_member_count integer;
  v_affected integer := 0;
begin
  if v_user_id is null then
    raise exception 'commitment_lab_auth_required' using errcode = '42501';
  end if;
  if p_item_key not in ('time_commitment', 'changing_commitment') then
    raise exception 'commitment_lab_handoff_item_invalid' using errcode = '22023';
  end if;

  -- Membership inserts use the same team-row lock, closing the 2-to-3-founder race.
  perform 1 from public.founder_teams team where team.id = p_team_id for update;
  if not found then
    raise exception 'commitment_lab_unavailable' using errcode = '42501';
  end if;

  select * into v_relationship
  from public.relationships relationship
  where relationship.id = p_relationship_id
    and relationship.founder_team_id = p_team_id;
  if not found or v_user_id not in (v_relationship.user_a_id, v_relationship.user_b_id) then
    raise exception 'commitment_lab_unavailable' using errcode = '42501';
  end if;

  select count(*)::integer into v_member_count
  from public.founder_team_members member
  where member.team_id = p_team_id;
  if v_member_count <> 2
     or not exists (
       select 1 from public.founder_team_members member
       where member.team_id = p_team_id and member.user_id = v_relationship.user_a_id
     )
     or not exists (
       select 1 from public.founder_team_members member
       where member.team_id = p_team_id and member.user_id = v_relationship.user_b_id
     ) then
    raise exception 'commitment_lab_handoff_requires_relationship_pair' using errcode = '42501';
  end if;

  select nullif(btrim(lab.shared_reflection), '') into v_reflection
  from public.commitment_labs lab
  where lab.relationship_id = p_relationship_id;
  if v_reflection is null then
    raise exception 'commitment_lab_handoff_reflection_empty' using errcode = '22023';
  end if;

  insert into public.founder_team_setup_items (
    team_id, item_key, work_status, working_note, updated_by_user_id
  ) values (
    p_team_id, p_item_key, 'open', v_reflection, v_user_id
  )
  on conflict (team_id, item_key) do update
  set working_note = excluded.working_note,
      updated_by_user_id = excluded.updated_by_user_id
  where nullif(btrim(founder_team_setup_items.working_note), '') is null;

  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

create or replace function public.save_commitment_lab_shared_reflection(
  p_relationship_id uuid,
  p_shared_reflection text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1 from public.relationships relationship
    where relationship.id = p_relationship_id
      and v_user_id in (relationship.user_a_id, relationship.user_b_id)
  ) then
    raise exception 'commitment_lab_unavailable' using errcode = '42501';
  end if;
  if char_length(coalesce(p_shared_reflection, '')) > 10000 then
    raise exception 'commitment_lab_input_invalid' using errcode = '22023';
  end if;
  insert into public.commitment_labs(relationship_id, shared_reflection)
  values (p_relationship_id, btrim(coalesce(p_shared_reflection, '')))
  on conflict (relationship_id) do update
  set shared_reflection = excluded.shared_reflection;
end;
$$;

create or replace function public.create_commitment_lab_discussion_entry(
  p_relationship_id uuid,
  p_body text,
  p_parent_entry_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_parent public.commitment_lab_discussion_entries%rowtype;
  v_entry_id uuid;
begin
  if v_user_id is null or not exists (
    select 1 from public.relationships relationship
    where relationship.id = p_relationship_id
      and v_user_id in (relationship.user_a_id, relationship.user_b_id)
  ) then
    raise exception 'commitment_lab_unavailable' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 5000 then
    raise exception 'commitment_lab_discussion_invalid' using errcode = '22023';
  end if;
  insert into public.commitment_labs(relationship_id) values (p_relationship_id)
  on conflict (relationship_id) do nothing;
  if p_parent_entry_id is not null then
    select * into v_parent from public.commitment_lab_discussion_entries entry
    where entry.id = p_parent_entry_id;
    if not found or v_parent.relationship_id <> p_relationship_id or v_parent.parent_entry_id is not null then
      raise exception 'commitment_lab_discussion_parent_invalid' using errcode = '42501';
    end if;
  end if;
  insert into public.commitment_lab_discussion_entries(
    relationship_id, author_user_id, parent_entry_id, body
  ) values (
    p_relationship_id, v_user_id, p_parent_entry_id, btrim(p_body)
  ) returning id into v_entry_id;
  return v_entry_id;
end;
$$;

revoke all on table public.commitment_labs from public, anon, authenticated, service_role;
revoke all on table public.commitment_lab_founder_entries from public, anon, authenticated, service_role;
revoke all on table public.commitment_lab_discussion_entries from public, anon, authenticated, service_role;
grant select on table public.commitment_labs to authenticated;
grant select on table public.commitment_lab_founder_entries to authenticated;
grant select on table public.commitment_lab_discussion_entries to authenticated;

revoke all on function public.save_commitment_lab_founder_entry(
  uuid, smallint, smallint, text[], text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.save_commitment_lab_founder_entry(
  uuid, smallint, smallint, text[], text, text, text, text, text, text, text, text, jsonb
) to authenticated;
revoke all on function public.save_commitment_lab_shared_reflection(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.save_commitment_lab_shared_reflection(uuid, text)
  to authenticated;
revoke all on function public.create_commitment_lab_discussion_entry(uuid, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_commitment_lab_discussion_entry(uuid, text, uuid)
  to authenticated;
revoke all on function public.handoff_commitment_lab_reflection_if_empty(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.handoff_commitment_lab_reflection_if_empty(uuid, uuid, text)
  to authenticated;

comment on table public.commitment_labs is
  'Pairwise Founder Commitment Lab. Shared reflection is working content, never a confirmed Founder Setup agreement.';
comment on table public.commitment_lab_founder_entries is
  'Founder-owned reality, commitment, and scenario reflections. No score or diagnostic interpretation.';
comment on function public.handoff_commitment_lab_reflection_if_empty(uuid, uuid, text) is
  'Atomically transfers a pairwise Commitment Lab reflection to an empty two-founder team Setup working note. It never creates revisions or confirmations.';

commit;
