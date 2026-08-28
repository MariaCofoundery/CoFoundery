begin;

create table public.collaboration_experience_pack_versions (
  experience_key text not null,
  pack_key text not null,
  pack_version integer not null,
  prompt_count smallint not null,
  published_at timestamptz not null default now(),
  primary key (experience_key, pack_key, pack_version),
  constraint collaboration_pack_experience_check check (experience_key = 'read_my_mind'),
  constraint collaboration_pack_key_check check (pack_key ~ '^[a-z0-9_]+$'),
  constraint collaboration_pack_version_check check (pack_version > 0),
  constraint collaboration_pack_prompt_count_check check (prompt_count between 1 and 20)
);

create table public.collaboration_experience_prompt_versions (
  experience_key text not null,
  pack_key text not null,
  pack_version integer not null,
  prompt_key text not null,
  prompt_version integer not null,
  position smallint not null,
  need_mode text not null,
  primary key (experience_key, pack_key, pack_version, prompt_key, prompt_version),
  unique (experience_key, pack_key, pack_version, position),
  foreign key (experience_key, pack_key, pack_version)
    references public.collaboration_experience_pack_versions(experience_key, pack_key, pack_version),
  constraint collaboration_prompt_key_check check (prompt_key ~ '^[a-z0-9_]+$'),
  constraint collaboration_prompt_version_check check (prompt_version > 0),
  constraint collaboration_prompt_position_check check (position between 0 and 19),
  constraint collaboration_prompt_need_mode_check check (need_mode in ('none', 'required'))
);

create table public.collaboration_experience_prompt_response_contracts (
  experience_key text not null,
  pack_key text not null,
  pack_version integer not null,
  prompt_key text not null,
  prompt_version integer not null,
  response_type text not null,
  response_format text not null,
  allowed_choice_keys text[] not null,
  min_selections smallint not null,
  max_selections smallint not null,
  primary key (
    experience_key, pack_key, pack_version, prompt_key, prompt_version, response_type
  ),
  foreign key (experience_key, pack_key, pack_version, prompt_key, prompt_version)
    references public.collaboration_experience_prompt_versions(
      experience_key, pack_key, pack_version, prompt_key, prompt_version
    ),
  constraint collaboration_response_contract_type_check
    check (response_type in ('self', 'guess', 'need')),
  constraint collaboration_response_contract_format_check
    check (response_format in ('single_choice', 'multi_choice')),
  constraint collaboration_response_contract_choices_check
    check (
      cardinality(allowed_choice_keys) > 0
      and array_position(allowed_choice_keys, null) is null
      and array_to_string(allowed_choice_keys, ',') ~ '^[a-z0-9_]+(,[a-z0-9_]+)*$'
    ),
  constraint collaboration_response_contract_selection_check
    check (
      min_selections > 0
      and max_selections >= min_selections
      and max_selections <= cardinality(allowed_choice_keys)
      and (
        (response_format = 'single_choice' and min_selections = 1 and max_selections = 1)
        or response_format = 'multi_choice'
      )
    )
);

create or replace function public.prevent_collaboration_content_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'collaboration_content_versions_are_append_only' using errcode = '42501';
end;
$$;

create trigger trg_collaboration_pack_versions_immutable
before update or delete on public.collaboration_experience_pack_versions
for each row execute function public.prevent_collaboration_content_mutation();
create trigger trg_collaboration_prompt_versions_immutable
before update or delete on public.collaboration_experience_prompt_versions
for each row execute function public.prevent_collaboration_content_mutation();
create trigger trg_collaboration_response_contracts_immutable
before update or delete on public.collaboration_experience_prompt_response_contracts
for each row execute function public.prevent_collaboration_content_mutation();

insert into public.collaboration_experience_pack_versions
  (experience_key, pack_key, pack_version, prompt_count)
values
  ('read_my_mind', 'easy_start', 1, 5),
  ('read_my_mind', 'how_we_work', 1, 5),
  ('read_my_mind', 'when_things_get_tricky', 1, 5);

insert into public.collaboration_experience_prompt_versions
  (experience_key, pack_key, pack_version, prompt_key, prompt_version, position, need_mode)
values
  ('read_my_mind','easy_start',1,'silent_day',1,0,'none'),
  ('read_my_mind','easy_start',1,'update_frequency',1,1,'required'),
  ('read_my_mind','easy_start',1,'please_do_not_ask',1,2,'none'),
  ('read_my_mind','easy_start',1,'brief_focus_break',1,3,'required'),
  ('read_my_mind','easy_start',1,'really_bad_workday',1,4,'required'),
  ('read_my_mind','how_we_work',1,'just_do_it',1,0,'none'),
  ('read_my_mind','how_we_work',1,'when_to_involve_you',1,1,'required'),
  ('read_my_mind','how_we_work',1,'good_enough',1,2,'none'),
  ('read_my_mind','how_we_work',1,'slower_than_expected',1,3,'required'),
  ('read_my_mind','how_we_work',1,'reopen_decision',1,4,'none'),
  ('read_my_mind','when_things_get_tricky',1,'shaky_deadline',1,0,'required'),
  ('read_my_mind','when_things_get_tricky',1,'tell_me_it_is_not_good',1,1,'required'),
  ('read_my_mind','when_things_get_tricky',1,'after_the_argument',1,2,'required'),
  ('read_my_mind','when_things_get_tricky',1,'not_now',1,3,'required'),
  ('read_my_mind','when_things_get_tricky',1,'disagreeing_before_customer',1,4,'none');

-- Structural answer contracts only. Localized labels live in the versioned application registry.
with prompt_contracts(pack_key, prompt_key, response_format, choice_keys, min_count, max_count, need_keys) as (
  values
    ('easy_start','silent_day','single_choice',array['quiet_works_well','check_in_once','want_regular_contact'],1,1,null::text[]),
    ('easy_start','update_frequency','single_choice',array['only_when_needed','one_or_two_fixed','short_daily'],1,1,array['space','predictability','connection']),
    ('easy_start','please_do_not_ask','multi_choice',array['early_draft','focus_time','personal_context','every_small_decision'],1,2,null::text[]),
    ('easy_start','brief_focus_break','single_choice',array['no_message_needed','short_signal','agree_return_time'],1,1,array['autonomy','short_notice','clear_return']),
    ('easy_start','really_bad_workday','single_choice',array['reduce_coordination','sort_priorities','take_concrete_task'],1,1,array['capacity','clarity','practical_support']),
    ('how_we_work','just_do_it','single_choice',array['act_independently','quick_alignment','decide_together'],1,1,null::text[]),
    ('how_we_work','when_to_involve_you','single_choice',array['at_impact','before_commitment','from_the_start'],1,1,array['autonomy','early_context','shared_decision']),
    ('how_we_work','good_enough','single_choice',array['usable_now','agreed_criteria_met','highly_polished'],1,1,null::text[]),
    ('how_we_work','slower_than_expected','single_choice',array['name_expectation','ask_about_blockers','adjust_plan'],1,1,array['trust','transparency','support']),
    ('how_we_work','reopen_decision','single_choice',array['new_facts_only','important_concern','always_possible'],1,1,null::text[]),
    ('when_things_get_tricky','shaky_deadline','single_choice',array['reduce_scope','move_date','ask_for_help'],1,1,array['early_signal','shared_tradeoff','realistic_plan']),
    ('when_things_get_tricky','tell_me_it_is_not_good','single_choice',array['directly','with_context','privately','with_alternative'],1,1,array['clarity','respect','privacy','next_step']),
    ('when_things_get_tricky','after_the_argument','single_choice',array['pause_then_talk','talk_soon','write_first'],1,1,array['space','repair','structure']),
    ('when_things_get_tricky','not_now','single_choice',array['respect_boundary','ask_when_later','briefly_name_issue'],1,1,array['space','time_commitment','brief_context']),
    ('when_things_get_tricky','disagreeing_before_customer','single_choice',array['one_leads','brief_internal_pause','present_shared_minimum'],1,1,null::text[])
)
insert into public.collaboration_experience_prompt_response_contracts (
  experience_key, pack_key, pack_version, prompt_key, prompt_version,
  response_type, response_format, allowed_choice_keys, min_selections, max_selections
)
select 'read_my_mind', pc.pack_key, 1, pc.prompt_key, 1, rt.response_type,
       case when rt.response_type = 'need' then 'single_choice' else pc.response_format end,
       case when rt.response_type = 'need' then pc.need_keys else pc.choice_keys end,
       case when rt.response_type = 'need' then 1 else pc.min_count end,
       case when rt.response_type = 'need' then 1 else pc.max_count end
from prompt_contracts pc
cross join lateral (
  select 'self'::text response_type
  union all select 'guess'
  union all select 'need' where pc.need_keys is not null
) rt;

create table public.collaboration_experience_rounds (
  id uuid primary key default gen_random_uuid(),
  founder_team_id uuid not null references public.founder_teams(id) on delete cascade,
  experience_key text not null,
  pack_key text not null,
  pack_version integer not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'forming',
  rotation_offset smallint not null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  completed_at timestamptz,
  abandoned_at timestamptz,
  foreign key (experience_key, pack_key, pack_version)
    references public.collaboration_experience_pack_versions(experience_key, pack_key, pack_version),
  constraint collaboration_round_status_check check (status in ('forming','active','completed','abandoned')),
  constraint collaboration_round_rotation_check check (rotation_offset between 0 and 2),
  constraint collaboration_round_lifecycle_check check (
    (status = 'forming' and activated_at is null and completed_at is null and abandoned_at is null)
    or (status = 'active' and activated_at is not null and completed_at is null and abandoned_at is null)
    or (status = 'completed' and activated_at is not null and completed_at is not null and abandoned_at is null)
    or (status = 'abandoned' and completed_at is null and abandoned_at is not null)
  )
);

create unique index collaboration_experience_one_open_round_per_team_idx
  on public.collaboration_experience_rounds(founder_team_id)
  where status in ('forming','active');

create table public.collaboration_experience_round_participants (
  round_id uuid not null references public.collaboration_experience_rounds(id) on delete cascade,
  founder_user_id uuid not null references auth.users(id) on delete restrict,
  position smallint not null,
  state text not null default 'pending',
  joined_at timestamptz,
  declined_at timestamptz,
  primary key (round_id, founder_user_id),
  unique (round_id, position),
  constraint collaboration_participant_position_check check (position between 0 and 2),
  constraint collaboration_participant_state_check check (state in ('pending','joined','declined')),
  constraint collaboration_participant_lifecycle_check check (
    (state = 'pending' and joined_at is null and declined_at is null)
    or (state = 'joined' and joined_at is not null and declined_at is null)
    or (state = 'declined' and joined_at is null and declined_at is not null)
  )
);

-- One row represents the one prompt that the experience presents to users. Target assignments
-- are children because a two-founder prompt has two targets while a three-founder prompt has one.
create table public.collaboration_experience_round_prompts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.collaboration_experience_rounds(id) on delete cascade,
  experience_key text not null,
  pack_key text not null,
  pack_version integer not null,
  prompt_key text not null,
  prompt_version integer not null,
  position smallint not null,
  created_at timestamptz not null default now(),
  unique (id, round_id),
  unique (round_id, position),
  foreign key (experience_key, pack_key, pack_version, prompt_key, prompt_version)
    references public.collaboration_experience_prompt_versions(
      experience_key, pack_key, pack_version, prompt_key, prompt_version
    ),
  constraint collaboration_round_prompt_position_check check (position between 0 and 19)
);

create table public.collaboration_experience_prompt_assignments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.collaboration_experience_rounds(id) on delete cascade,
  round_prompt_id uuid not null,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  target_position smallint not null,
  created_at timestamptz not null default now(),
  unique (id, round_id),
  unique (round_prompt_id, target_user_id),
  foreign key (round_prompt_id, round_id)
    references public.collaboration_experience_round_prompts(id, round_id) on delete cascade,
  foreign key (round_id, target_user_id)
    references public.collaboration_experience_round_participants(round_id, founder_user_id),
  foreign key (round_id, target_position)
    references public.collaboration_experience_round_participants(round_id, position)
);

create table public.collaboration_experience_responses (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  prompt_assignment_id uuid not null,
  respondent_user_id uuid not null,
  response_type text not null,
  choice_keys text[] not null,
  locked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (prompt_assignment_id, respondent_user_id, response_type),
  foreign key (prompt_assignment_id, round_id)
    references public.collaboration_experience_prompt_assignments(id, round_id) on delete cascade,
  foreign key (round_id, respondent_user_id)
    references public.collaboration_experience_round_participants(round_id, founder_user_id),
  constraint collaboration_response_type_check check (response_type in ('self','guess','need')),
  constraint collaboration_response_choices_nonempty_check check (
    cardinality(choice_keys) > 0 and array_position(choice_keys, null) is null
  )
);

create table public.collaboration_experience_reveal_receipts (
  round_id uuid not null,
  round_prompt_id uuid not null,
  participant_user_id uuid not null,
  opened_at timestamptz not null default now(),
  primary key (round_prompt_id, participant_user_id),
  foreign key (round_prompt_id, round_id)
    references public.collaboration_experience_round_prompts(id, round_id) on delete cascade,
  foreign key (round_id, participant_user_id)
    references public.collaboration_experience_round_participants(round_id, founder_user_id)
);

create or replace function public.prevent_collaboration_response_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'collaboration_response_is_locked' using errcode = '42501';
end;
$$;

create trigger trg_collaboration_responses_immutable
before update or delete on public.collaboration_experience_responses
for each row execute function public.prevent_collaboration_response_mutation();

create index collaboration_round_participants_user_idx
  on public.collaboration_experience_round_participants(founder_user_id, round_id);
create index collaboration_round_prompts_round_position_idx
  on public.collaboration_experience_round_prompts(round_id, position);
create index collaboration_assignments_round_prompt_target_idx
  on public.collaboration_experience_prompt_assignments(round_prompt_id, target_position);
create index collaboration_responses_round_respondent_idx
  on public.collaboration_experience_responses(round_id, respondent_user_id);
create index collaboration_receipts_user_round_idx
  on public.collaboration_experience_reveal_receipts(participant_user_id, round_id);

alter table public.collaboration_experience_pack_versions enable row level security;
alter table public.collaboration_experience_prompt_versions enable row level security;
alter table public.collaboration_experience_prompt_response_contracts enable row level security;
alter table public.collaboration_experience_rounds enable row level security;
alter table public.collaboration_experience_round_participants enable row level security;
alter table public.collaboration_experience_round_prompts enable row level security;
alter table public.collaboration_experience_prompt_assignments enable row level security;
alter table public.collaboration_experience_responses enable row level security;
alter table public.collaboration_experience_reveal_receipts enable row level security;

create or replace function public.is_current_user_collaboration_round_participant(
  p_round_id uuid,
  p_require_joined boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.collaboration_experience_rounds round_row
    join public.collaboration_experience_round_participants participant
      on participant.round_id = round_row.id
     and participant.founder_user_id = auth.uid()
    join public.founder_team_members member
      on member.team_id = round_row.founder_team_id
     and member.user_id = auth.uid()
    where round_row.id = p_round_id
      and (not p_require_joined or participant.state = 'joined')
  );
$$;

create policy collaboration_pack_versions_select_authenticated
on public.collaboration_experience_pack_versions for select to authenticated using (true);
create policy collaboration_prompt_versions_select_authenticated
on public.collaboration_experience_prompt_versions for select to authenticated using (true);
create policy collaboration_response_contracts_select_authenticated
on public.collaboration_experience_prompt_response_contracts for select to authenticated using (true);
create policy collaboration_rounds_select_participants
on public.collaboration_experience_rounds for select to authenticated
using (public.is_current_user_collaboration_round_participant(id, false));
create policy collaboration_participants_select_round_participants
on public.collaboration_experience_round_participants for select to authenticated
using (public.is_current_user_collaboration_round_participant(round_id, false));
create policy collaboration_round_prompts_select_joined_participants
on public.collaboration_experience_round_prompts for select to authenticated
using (public.is_current_user_collaboration_round_participant(round_id, true));
create policy collaboration_assignments_select_joined_participants
on public.collaboration_experience_prompt_assignments for select to authenticated
using (public.is_current_user_collaboration_round_participant(round_id, true));
create policy collaboration_responses_select_own_locked
on public.collaboration_experience_responses for select to authenticated
using (
  respondent_user_id = auth.uid()
  and public.is_current_user_collaboration_round_participant(round_id, true)
);
create policy collaboration_receipts_select_own
on public.collaboration_experience_reveal_receipts for select to authenticated
using (
  participant_user_id = auth.uid()
  and public.is_current_user_collaboration_round_participant(round_id, true)
);

create or replace function public.create_collaboration_experience_round(
  p_founder_team_id uuid,
  p_pack_key text,
  p_pack_version integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round_id uuid;
  v_member_count integer;
  v_rotation_offset smallint;
  v_round_prompt_id uuid;
  v_prompt record;
  v_target record;
begin
  if v_user_id is null then
    raise exception 'collaboration_round_auth_required' using errcode = '42501';
  end if;

  perform 1 from public.founder_teams where id = p_founder_team_id for update;
  if not found or not exists (
    select 1 from public.founder_team_members
    where team_id = p_founder_team_id and user_id = v_user_id
  ) then
    raise exception 'collaboration_round_unavailable' using errcode = '42501';
  end if;

  select count(*) into v_member_count
  from public.founder_team_members where team_id = p_founder_team_id;
  if v_member_count not in (2, 3) then
    raise exception 'collaboration_round_requires_two_or_three_founders' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.collaboration_experience_pack_versions
    where experience_key = 'read_my_mind'
      and pack_key = p_pack_key and pack_version = p_pack_version
  ) then
    raise exception 'collaboration_pack_unavailable' using errcode = '22023';
  end if;

  select (count(*) % v_member_count)::smallint into v_rotation_offset
  from public.collaboration_experience_rounds
  where founder_team_id = p_founder_team_id and experience_key = 'read_my_mind';

  insert into public.collaboration_experience_rounds (
    founder_team_id, experience_key, pack_key, pack_version,
    created_by_user_id, rotation_offset
  ) values (
    p_founder_team_id, 'read_my_mind', p_pack_key, p_pack_version,
    v_user_id, v_rotation_offset
  ) returning id into v_round_id;

  insert into public.collaboration_experience_round_participants (
    round_id, founder_user_id, position, state, joined_at
  )
  select v_round_id, member.user_id,
         (row_number() over (order by member.created_at, member.user_id) - 1)::smallint,
         case when member.user_id = v_user_id then 'joined' else 'pending' end,
         case when member.user_id = v_user_id then now() else null end
  from public.founder_team_members member
  where member.team_id = p_founder_team_id;

  for v_prompt in
    select * from public.collaboration_experience_prompt_versions
    where experience_key = 'read_my_mind'
      and pack_key = p_pack_key and pack_version = p_pack_version
    order by position
  loop
    insert into public.collaboration_experience_round_prompts (
      round_id, experience_key, pack_key, pack_version,
      prompt_key, prompt_version, position
    ) values (
      v_round_id, 'read_my_mind', p_pack_key, p_pack_version,
      v_prompt.prompt_key, v_prompt.prompt_version, v_prompt.position
    ) returning id into v_round_prompt_id;

    if v_member_count = 2 then
      for v_target in
        select founder_user_id, position
        from public.collaboration_experience_round_participants
        where round_id = v_round_id order by position
      loop
        insert into public.collaboration_experience_prompt_assignments (
          round_id, round_prompt_id, target_user_id, target_position
        ) values (
          v_round_id, v_round_prompt_id, v_target.founder_user_id, v_target.position
        );
      end loop;
    else
      select founder_user_id, position into v_target
      from public.collaboration_experience_round_participants
      where round_id = v_round_id
        and position = ((v_rotation_offset + v_prompt.position) % v_member_count);
      insert into public.collaboration_experience_prompt_assignments (
        round_id, round_prompt_id, target_user_id, target_position
      ) values (
        v_round_id, v_round_prompt_id, v_target.founder_user_id, v_target.position
      );
    end if;
  end loop;

  return v_round_id;
exception
  when unique_violation then
    raise exception 'collaboration_round_already_open' using errcode = '23505';
end;
$$;

create or replace function public.join_collaboration_experience_round(p_round_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_status text;
begin
  if v_user_id is null then raise exception 'collaboration_round_auth_required' using errcode = '42501'; end if;
  select founder_team_id into v_team_id
  from public.collaboration_experience_rounds where id = p_round_id;
  if not found then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;
  perform 1 from public.founder_teams where id = v_team_id for update;
  select status into v_status
  from public.collaboration_experience_rounds where id = p_round_id for update;
  if v_status <> 'forming' or not exists (
    select 1 from public.founder_team_members where team_id = v_team_id and user_id = v_user_id
  ) then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;

  update public.collaboration_experience_round_participants
  set state = 'joined', joined_at = now()
  where round_id = p_round_id and founder_user_id = v_user_id and state = 'pending';
  if not found then raise exception 'collaboration_participant_not_pending' using errcode = '22023'; end if;

  if not exists (
    select 1 from public.collaboration_experience_round_participants
    where round_id = p_round_id and state <> 'joined'
  ) then
    update public.collaboration_experience_rounds
    set status = 'active', activated_at = now()
    where id = p_round_id;
    return 'active';
  end if;
  return 'forming';
end;
$$;

create or replace function public.decline_collaboration_experience_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
begin
  if v_user_id is null then raise exception 'collaboration_round_auth_required' using errcode = '42501'; end if;
  select founder_team_id into v_team_id
  from public.collaboration_experience_rounds where id = p_round_id;
  if not found then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;
  perform 1 from public.founder_teams where id = v_team_id for update;
  perform 1 from public.collaboration_experience_rounds
  where id = p_round_id and status = 'forming' for update;
  if not found or not exists (
    select 1 from public.founder_team_members where team_id = v_team_id and user_id = v_user_id
  ) then raise exception 'collaboration_round_unavailable' using errcode = '42501'; end if;
  update public.collaboration_experience_round_participants
  set state = 'declined', declined_at = now()
  where round_id = p_round_id and founder_user_id = v_user_id and state = 'pending';
  if not found then raise exception 'collaboration_participant_not_pending' using errcode = '22023'; end if;
  update public.collaboration_experience_rounds
  set status = 'abandoned', abandoned_at = now()
  where id = p_round_id;
end;
$$;

create or replace function public.lock_collaboration_response(
  p_prompt_assignment_id uuid,
  p_response_type text,
  p_choice_keys text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_assignment public.collaboration_experience_prompt_assignments%rowtype;
  v_round_prompt public.collaboration_experience_round_prompts%rowtype;
  v_round public.collaboration_experience_rounds%rowtype;
  v_contract public.collaboration_experience_prompt_response_contracts%rowtype;
  v_response_id uuid;
  v_existing public.collaboration_experience_responses%rowtype;
  v_choices text[];
begin
  if v_user_id is null then raise exception 'collaboration_response_auth_required' using errcode = '42501'; end if;
  if p_response_type not in ('self','guess','need') then
    raise exception 'collaboration_response_type_invalid' using errcode = '22023';
  end if;
  select * into v_assignment from public.collaboration_experience_prompt_assignments
  where id = p_prompt_assignment_id;
  if not found then raise exception 'collaboration_prompt_unavailable' using errcode = '42501'; end if;
  select * into v_round_prompt from public.collaboration_experience_round_prompts
  where id = v_assignment.round_prompt_id and round_id = v_assignment.round_id;
  if not found then raise exception 'collaboration_prompt_unavailable' using errcode = '42501'; end if;
  select * into v_round from public.collaboration_experience_rounds
  where id = v_assignment.round_id;
  perform 1 from public.founder_teams where id = v_round.founder_team_id for update;
  select * into v_round from public.collaboration_experience_rounds
  where id = v_assignment.round_id for update;
  if v_round.status <> 'active'
     or not public.is_current_user_collaboration_round_participant(v_round.id, true) then
    raise exception 'collaboration_response_unavailable' using errcode = '42501';
  end if;
  if (p_response_type = 'self' and v_user_id <> v_assignment.target_user_id)
     or (p_response_type in ('guess','need') and v_user_id = v_assignment.target_user_id) then
    raise exception 'collaboration_response_slot_invalid' using errcode = '42501';
  end if;
  select * into v_contract
  from public.collaboration_experience_prompt_response_contracts
  where experience_key = v_round_prompt.experience_key
    and pack_key = v_round_prompt.pack_key and pack_version = v_round_prompt.pack_version
    and prompt_key = v_round_prompt.prompt_key and prompt_version = v_round_prompt.prompt_version
    and response_type = p_response_type;
  if not found then raise exception 'collaboration_response_slot_invalid' using errcode = '42501'; end if;

  select coalesce(array_agg(choice_key order by choice_key), '{}'::text[]) into v_choices
  from (select distinct unnest(coalesce(p_choice_keys, '{}'::text[])) choice_key) choices;
  if cardinality(v_choices) <> cardinality(coalesce(p_choice_keys, '{}'::text[]))
     or cardinality(v_choices) not between v_contract.min_selections and v_contract.max_selections
     or not v_choices <@ v_contract.allowed_choice_keys then
    raise exception 'collaboration_response_choices_invalid' using errcode = '22023';
  end if;

  select * into v_existing from public.collaboration_experience_responses
  where prompt_assignment_id = p_prompt_assignment_id
    and respondent_user_id = v_user_id and response_type = p_response_type;
  if found then
    if v_existing.choice_keys = v_choices then return v_existing.id; end if;
    raise exception 'collaboration_response_is_locked' using errcode = '42501';
  end if;

  insert into public.collaboration_experience_responses (
    round_id, prompt_assignment_id, respondent_user_id, response_type, choice_keys
  ) values (
    v_round.id, p_prompt_assignment_id, v_user_id, p_response_type, v_choices
  ) returning id into v_response_id;
  return v_response_id;
exception
  when unique_violation then
    select * into v_existing from public.collaboration_experience_responses
    where prompt_assignment_id = p_prompt_assignment_id
      and respondent_user_id = v_user_id and response_type = p_response_type;
    if v_existing.choice_keys = v_choices then return v_existing.id; end if;
    raise exception 'collaboration_response_is_locked' using errcode = '42501';
end;
$$;

create or replace function public.get_collaboration_round_state(p_round_id uuid)
returns table (
  round_id uuid,
  founder_team_id uuid,
  experience_key text,
  pack_key text,
  pack_version integer,
  status text,
  rotation_offset smallint,
  participant_count integer,
  joined_count integer,
  own_locked_response_count integer,
  answer_phase_complete boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_current_user_collaboration_round_participant(p_round_id, false) then
    raise exception 'collaboration_round_unavailable' using errcode = '42501';
  end if;
  return query
    select round_row.id, round_row.founder_team_id, round_row.experience_key,
           round_row.pack_key, round_row.pack_version, round_row.status,
           round_row.rotation_offset,
           (select count(*)::integer from public.collaboration_experience_round_participants p where p.round_id=round_row.id),
           (select count(*)::integer from public.collaboration_experience_round_participants p where p.round_id=round_row.id and p.state='joined'),
           (select count(*)::integer from public.collaboration_experience_responses r where r.round_id=round_row.id and r.respondent_user_id=auth.uid()),
           case when round_row.status in ('active','completed')
             then public.is_collaboration_round_answer_phase_complete(round_row.id)
             else false
           end
    from public.collaboration_experience_rounds round_row
    where round_row.id = p_round_id;
end;
$$;

create or replace function public.is_collaboration_round_answer_phase_complete(p_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_current_user_collaboration_round_participant(p_round_id, true)
    and exists (
      select 1 from public.collaboration_experience_rounds round_row
      where round_row.id = p_round_id and round_row.status in ('active','completed')
    )
    and not exists (
      select 1
      from public.collaboration_experience_prompt_assignments assignment
      join public.collaboration_experience_round_prompts round_prompt
        on round_prompt.id = assignment.round_prompt_id
       and round_prompt.round_id = assignment.round_id
      join public.collaboration_experience_prompt_versions prompt
        on prompt.experience_key = round_prompt.experience_key
       and prompt.pack_key = round_prompt.pack_key
       and prompt.pack_version = round_prompt.pack_version
       and prompt.prompt_key = round_prompt.prompt_key
       and prompt.prompt_version = round_prompt.prompt_version
      join public.collaboration_experience_round_participants participant
        on participant.round_id = assignment.round_id and participant.state = 'joined'
      cross join lateral (
        select case when participant.founder_user_id = assignment.target_user_id then 'self' else 'guess' end response_type
        union all
        select 'need' where participant.founder_user_id <> assignment.target_user_id and prompt.need_mode = 'required'
      ) required_slot
      where assignment.round_id = p_round_id
        and not exists (
          select 1 from public.collaboration_experience_responses response
          where response.prompt_assignment_id = assignment.id
            and response.respondent_user_id = participant.founder_user_id
            and response.response_type = required_slot.response_type
            and response.locked_at is not null
        )
    );
$$;

create or replace function public.get_collaboration_prompt_reveal(p_round_prompt_id uuid)
returns table (
  round_prompt_id uuid,
  prompt_assignment_id uuid,
  target_user_id uuid,
  respondent_user_id uuid,
  response_type text,
  choice_keys text[],
  locked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round_id uuid;
begin
  if v_user_id is null then raise exception 'collaboration_reveal_auth_required' using errcode = '42501'; end if;
  select round_prompt.round_id into v_round_id
  from public.collaboration_experience_round_prompts round_prompt
  join public.collaboration_experience_rounds round_row on round_row.id = round_prompt.round_id
  where round_prompt.id = p_round_prompt_id
    and round_row.status in ('active','completed');
  if not found or not public.is_current_user_collaboration_round_participant(v_round_id, true)
     or not public.is_collaboration_round_answer_phase_complete(v_round_id) then
    raise exception 'collaboration_reveal_unavailable' using errcode = '42501';
  end if;
  insert into public.collaboration_experience_reveal_receipts(
    round_id, round_prompt_id, participant_user_id
  ) values (v_round_id, p_round_prompt_id, v_user_id)
  on conflict on constraint collaboration_experience_reveal_receipts_pkey
  do update set opened_at = excluded.opened_at;
  return query
    select assignment.round_prompt_id, assignment.id, assignment.target_user_id,
           response.respondent_user_id, response.response_type,
           response.choice_keys, response.locked_at
    from public.collaboration_experience_responses response
    join public.collaboration_experience_prompt_assignments assignment
      on assignment.id = response.prompt_assignment_id
    where assignment.round_prompt_id = p_round_prompt_id
    order by assignment.target_position, response.response_type, response.respondent_user_id;
end;
$$;

create or replace function public.abandon_collaboration_rounds_on_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid := case when tg_op = 'DELETE' then old.team_id else new.team_id end;
begin
  perform 1 from public.founder_teams where id = v_team_id for update;
  update public.collaboration_experience_rounds
  set status = 'abandoned', abandoned_at = now()
  where founder_team_id = v_team_id and status in ('forming','active');
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger trg_founder_team_members_abandon_collaboration_rounds
after insert or delete on public.founder_team_members
for each row execute function public.abandon_collaboration_rounds_on_membership_change();

create or replace function public.delete_collaboration_rounds_for_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.collaboration_experience_rounds round_row
  where exists (
    select 1 from public.collaboration_experience_round_participants participant
    where participant.round_id = round_row.id and participant.founder_user_id = old.id
  );
  return old;
end;
$$;

create trigger trg_auth_users_delete_collaboration_rounds
before delete on auth.users
for each row execute function public.delete_collaboration_rounds_for_deleted_user();

revoke all on table public.collaboration_experience_pack_versions from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_prompt_versions from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_prompt_response_contracts from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_rounds from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_round_participants from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_round_prompts from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_prompt_assignments from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_responses from public, anon, authenticated, service_role;
revoke all on table public.collaboration_experience_reveal_receipts from public, anon, authenticated, service_role;
grant select on public.collaboration_experience_pack_versions to authenticated;
grant select on public.collaboration_experience_prompt_versions to authenticated;
grant select on public.collaboration_experience_prompt_response_contracts to authenticated;
grant select on public.collaboration_experience_rounds to authenticated;
grant select on public.collaboration_experience_round_participants to authenticated;
grant select on public.collaboration_experience_round_prompts to authenticated;
grant select on public.collaboration_experience_prompt_assignments to authenticated;
grant select on public.collaboration_experience_responses to authenticated;
grant select on public.collaboration_experience_reveal_receipts to authenticated;

revoke all on function public.prevent_collaboration_content_mutation() from public, anon, authenticated, service_role;
revoke all on function public.prevent_collaboration_response_mutation() from public, anon, authenticated, service_role;
revoke all on function public.is_current_user_collaboration_round_participant(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.create_collaboration_experience_round(uuid, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.join_collaboration_experience_round(uuid) from public, anon, authenticated, service_role;
revoke all on function public.decline_collaboration_experience_round(uuid) from public, anon, authenticated, service_role;
revoke all on function public.lock_collaboration_response(uuid, text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.is_collaboration_round_answer_phase_complete(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_collaboration_round_state(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_collaboration_prompt_reveal(uuid) from public, anon, authenticated, service_role;
revoke all on function public.abandon_collaboration_rounds_on_membership_change() from public, anon, authenticated, service_role;
revoke all on function public.delete_collaboration_rounds_for_deleted_user() from public, anon, authenticated, service_role;
grant execute on function public.is_current_user_collaboration_round_participant(uuid, boolean) to authenticated;
grant execute on function public.create_collaboration_experience_round(uuid, text, integer) to authenticated;
grant execute on function public.join_collaboration_experience_round(uuid) to authenticated;
grant execute on function public.decline_collaboration_experience_round(uuid) to authenticated;
grant execute on function public.lock_collaboration_response(uuid, text, text[]) to authenticated;
grant execute on function public.is_collaboration_round_answer_phase_complete(uuid) to authenticated;
grant execute on function public.get_collaboration_round_state(uuid) to authenticated;
grant execute on function public.get_collaboration_prompt_reveal(uuid) to authenticated;

comment on table public.collaboration_experience_rounds is
  'Team-scoped Read My Mind rounds. No assessment, score, compatibility, or advisor semantics.';
comment on table public.collaboration_experience_responses is
  'Immutable Self, Guess, and required Need choice keys. Foreign responses are never directly selectable.';
comment on table public.collaboration_experience_round_prompts is
  'One visible, versioned prompt instance in a round. Two-founder target assignments are children of this shared prompt.';
comment on function public.get_collaboration_prompt_reveal(uuid) is
  'Projects all target assignments for one visible round prompt only after every required response across the entire round is locked.';

commit;
