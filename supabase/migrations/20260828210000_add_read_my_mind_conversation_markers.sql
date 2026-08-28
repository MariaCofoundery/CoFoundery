begin;

-- Read My Mind rounds are removed as a lifecycle unit. The foundation already
-- cascades from rounds into participants, prompts, responses, assignments, and
-- receipts, but its participant snapshot foreign keys were missing cascades.
-- Without these clauses a completed/answered round can block the existing team
-- and account cleanup paths. No founder receives additional delete privileges;
-- these constraints only make an already-authorized round deletion complete.
alter table public.collaboration_experience_prompt_assignments
  drop constraint collaboration_experience_prompt_a_round_id_target_position_fkey,
  add constraint collaboration_experience_prompt_a_round_id_target_position_fkey
    foreign key (round_id, target_position)
    references public.collaboration_experience_round_participants(round_id, "position")
    on delete cascade,
  drop constraint collaboration_experience_prompt_as_round_id_target_user_id_fkey,
  add constraint collaboration_experience_prompt_as_round_id_target_user_id_fkey
    foreign key (round_id, target_user_id)
    references public.collaboration_experience_round_participants(round_id, founder_user_id)
    on delete cascade;

alter table public.collaboration_experience_responses
  drop constraint collaboration_experience_respo_round_id_respondent_user_id_fkey,
  add constraint collaboration_experience_respo_round_id_respondent_user_id_fkey
    foreign key (round_id, respondent_user_id)
    references public.collaboration_experience_round_participants(round_id, founder_user_id)
    on delete cascade;

alter table public.collaboration_experience_reveal_receipts
  drop constraint collaboration_experience_reve_round_id_participant_user_id_fkey,
  add constraint collaboration_experience_reve_round_id_participant_user_id_fkey
    foreign key (round_id, participant_user_id)
    references public.collaboration_experience_round_participants(round_id, founder_user_id)
    on delete cascade;

-- Locked responses stay immutable for every direct update/delete. Allow only a
-- nested FK cascade that is already deleting their owning round/participant;
-- otherwise the foundation's immutability trigger blocks team/account cleanup.
create or replace function public.prevent_collaboration_response_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  raise exception 'collaboration_response_is_locked' using errcode = '42501';
end;
$$;

create table public.collaboration_experience_conversation_markers (
  round_id uuid not null,
  round_prompt_id uuid not null,
  participant_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (round_prompt_id, participant_user_id),
  foreign key (round_prompt_id, round_id)
    references public.collaboration_experience_round_prompts(id, round_id) on delete cascade,
  foreign key (round_id, participant_user_id)
    references public.collaboration_experience_round_participants(round_id, founder_user_id) on delete cascade
);

create index collaboration_conversation_markers_round_idx
  on public.collaboration_experience_conversation_markers(round_id, round_prompt_id);

alter table public.collaboration_experience_conversation_markers enable row level security;

create policy collaboration_conversation_markers_select_round_participants
on public.collaboration_experience_conversation_markers
for select to authenticated
using (
  public.is_current_user_collaboration_round_participant(round_id, true)
  and exists (
    select 1
    from public.collaboration_experience_reveal_receipts receipt
    where receipt.round_id = collaboration_experience_conversation_markers.round_id
      and receipt.round_prompt_id = collaboration_experience_conversation_markers.round_prompt_id
      and receipt.participant_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.collaboration_experience_rounds round_row
    where round_row.id = collaboration_experience_conversation_markers.round_id
      and round_row.status in ('active', 'completed')
  )
);

create or replace function public.mark_collaboration_prompt_for_conversation(
  p_round_prompt_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'collaboration_marker_auth_required' using errcode = '42501';
  end if;

  select round_prompt.round_id, round_row.status
  into v_round_id, v_status
  from public.collaboration_experience_round_prompts round_prompt
  join public.collaboration_experience_rounds round_row
    on round_row.id = round_prompt.round_id
  where round_prompt.id = p_round_prompt_id;

  if not found
     or v_status not in ('active', 'completed')
     or not public.is_current_user_collaboration_round_participant(v_round_id, true)
     or not exists (
       select 1
       from public.collaboration_experience_reveal_receipts receipt
       where receipt.round_id = v_round_id
         and receipt.round_prompt_id = p_round_prompt_id
         and receipt.participant_user_id = v_user_id
     ) then
    raise exception 'collaboration_marker_unavailable' using errcode = '42501';
  end if;

  insert into public.collaboration_experience_conversation_markers (
    round_id, round_prompt_id, participant_user_id
  ) values (
    v_round_id, p_round_prompt_id, v_user_id
  )
  on conflict (round_prompt_id, participant_user_id) do nothing;

  return true;
end;
$$;

create or replace function public.unmark_collaboration_prompt_for_conversation(
  p_round_prompt_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_round_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'collaboration_marker_auth_required' using errcode = '42501';
  end if;

  select round_prompt.round_id, round_row.status
  into v_round_id, v_status
  from public.collaboration_experience_round_prompts round_prompt
  join public.collaboration_experience_rounds round_row
    on round_row.id = round_prompt.round_id
  where round_prompt.id = p_round_prompt_id;

  if not found
     or v_status not in ('active', 'completed')
     or not public.is_current_user_collaboration_round_participant(v_round_id, true)
     or not exists (
       select 1
       from public.collaboration_experience_reveal_receipts receipt
       where receipt.round_id = v_round_id
         and receipt.round_prompt_id = p_round_prompt_id
         and receipt.participant_user_id = v_user_id
     ) then
    raise exception 'collaboration_marker_unavailable' using errcode = '42501';
  end if;

  delete from public.collaboration_experience_conversation_markers marker
  where marker.round_id = v_round_id
    and marker.round_prompt_id = p_round_prompt_id
    and marker.participant_user_id = v_user_id;

  return true;
end;
$$;

revoke all on table public.collaboration_experience_conversation_markers
from public, anon, authenticated, service_role;
grant select on table public.collaboration_experience_conversation_markers
to authenticated;

revoke all on function public.mark_collaboration_prompt_for_conversation(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.unmark_collaboration_prompt_for_conversation(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.mark_collaboration_prompt_for_conversation(uuid)
to authenticated;
grant execute on function public.unmark_collaboration_prompt_for_conversation(uuid)
to authenticated;

comment on table public.collaboration_experience_conversation_markers is
  'Founder-only shared conversation points for opened collaboration prompt reveals; stores no response content.';
comment on function public.mark_collaboration_prompt_for_conversation(uuid) is
  'Idempotently marks one already-opened active or completed prompt reveal for the authenticated current founder participant.';
comment on function public.unmark_collaboration_prompt_for_conversation(uuid) is
  'Idempotently removes only the authenticated founder participant own conversation marker.';

commit;
