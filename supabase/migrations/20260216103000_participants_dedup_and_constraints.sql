-- Harden participant identity semantics and clean up legacy duplicates.
-- Goal:
-- 1) one linked user membership per session
-- 2) one open invite per e-mail per session
-- 3) one secondary slot (B/partner) per session

alter table public.participants
  add column if not exists requested_scope text;

alter table public.participants
  add column if not exists invite_consent_at timestamptz;

alter table public.participants
  add column if not exists invite_consent_by_user_id uuid references auth.users(id) on delete set null;

update public.participants
set invited_email = nullif(lower(btrim(invited_email)), '')
where invited_email is not null;

do $$
declare
  has_sessions_participant_id boolean;
begin
  create temporary table participant_merge_map (
    old_id uuid primary key,
    keep_id uuid not null
  ) on commit drop;

  -- If both B and partner exist in one session, keep the strongest row.
  with response_counts as (
    select participant_id, count(*)::int as response_count
    from public.responses
    group by participant_id
  ),
  ranked as (
    select
      p.id,
      p.session_id,
      row_number() over (
        partition by p.session_id
        order by
          (p.completed_at is not null) desc,
          (p.user_id is not null) desc,
          coalesce(rc.response_count, 0) desc,
          (p.role = 'B') desc,
          p.created_at desc,
          p.id desc
      ) as rank_in_session
    from public.participants p
    left join response_counts rc on rc.participant_id = p.id
    where p.role in ('B', 'partner')
  )
  insert into participant_merge_map (old_id, keep_id)
  select losing.id, winning.id
  from ranked losing
  join ranked winning
    on winning.session_id = losing.session_id
   and winning.rank_in_session = 1
  where losing.rank_in_session > 1
  on conflict (old_id) do nothing;

  -- If the same user is linked multiple times within one session, keep one.
  with response_counts as (
    select participant_id, count(*)::int as response_count
    from public.responses
    group by participant_id
  ),
  ranked as (
    select
      p.id,
      p.session_id,
      p.user_id,
      row_number() over (
        partition by p.session_id, p.user_id
        order by
          (p.role = 'A') desc,
          (p.completed_at is not null) desc,
          coalesce(rc.response_count, 0) desc,
          p.created_at desc,
          p.id desc
      ) as rank_for_user
    from public.participants p
    left join response_counts rc on rc.participant_id = p.id
    where p.user_id is not null
  )
  insert into participant_merge_map (old_id, keep_id)
  select losing.id, winning.id
  from ranked losing
  join ranked winning
    on winning.session_id = losing.session_id
   and winning.user_id = losing.user_id
   and winning.rank_for_user = 1
  where losing.rank_for_user > 1
  on conflict (old_id) do nothing;

  -- If multiple open invite rows target the same email in one session, keep one.
  with response_counts as (
    select participant_id, count(*)::int as response_count
    from public.responses
    group by participant_id
  ),
  ranked as (
    select
      p.id,
      p.session_id,
      lower(p.invited_email) as invited_email_key,
      row_number() over (
        partition by p.session_id, lower(p.invited_email)
        order by
          (p.completed_at is not null) desc,
          coalesce(rc.response_count, 0) desc,
          p.created_at desc,
          p.id desc
      ) as rank_for_invite
    from public.participants p
    left join response_counts rc on rc.participant_id = p.id
    where p.user_id is null
      and p.invited_email is not null
      and btrim(p.invited_email) <> ''
  )
  insert into participant_merge_map (old_id, keep_id)
  select losing.id, winning.id
  from ranked losing
  join ranked winning
    on winning.session_id = losing.session_id
   and winning.invited_email_key = losing.invited_email_key
   and winning.rank_for_invite = 1
  where losing.rank_for_invite > 1
  on conflict (old_id) do nothing;

  delete from participant_merge_map
  where old_id = keep_id;

  -- Prevent response unique collisions before remapping participant_ids.
  create temporary table response_conflicts (
    response_id uuid primary key
  ) on commit drop;

  insert into response_conflicts (response_id)
  select r_old.id
  from participant_merge_map m
  join public.responses r_old
    on r_old.participant_id = m.old_id
  join public.responses r_keep
    on r_keep.participant_id = m.keep_id
   and r_keep.question_id = r_old.question_id;

  delete from public.responses r
  using response_conflicts c
  where r.id = c.response_id;

  update public.responses r
  set participant_id = m.keep_id
  from participant_merge_map m
  where r.participant_id = m.old_id;

  -- Merge free-text content where both old and keep rows exist.
  update public.free_text f_keep
  set
    text = case
      when coalesce(btrim(f_keep.text), '') = '' then f_old.text
      else f_keep.text
    end,
    updated_at = greatest(f_keep.updated_at, f_old.updated_at)
  from participant_merge_map m
  join public.free_text f_old
    on f_old.participant_id = m.old_id
  where f_keep.participant_id = m.keep_id;

  delete from public.free_text f_old
  using participant_merge_map m, public.free_text f_keep
  where f_old.participant_id = m.old_id
    and f_keep.participant_id = m.keep_id;

  update public.free_text f
  set participant_id = m.keep_id
  from participant_merge_map m
  where f.participant_id = m.old_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'participant_id'
  ) into has_sessions_participant_id;

  if has_sessions_participant_id then
    execute '
      update public.sessions s
      set participant_id = m.keep_id
      from participant_merge_map m
      where s.participant_id = m.old_id
    ';
  end if;

  delete from public.participants p
  using participant_merge_map m
  where p.id = m.old_id;
end $$;

alter table public.participants drop constraint if exists participants_requested_scope_check;
alter table public.participants
  add constraint participants_requested_scope_check
  check (requested_scope is null or requested_scope in ('basis', 'basis_plus_values'));

alter table public.participants drop constraint if exists participants_invited_email_normalized_check;
alter table public.participants
  add constraint participants_invited_email_normalized_check
  check (invited_email is null or invited_email = lower(btrim(invited_email)));

drop index if exists participants_session_user_uidx;
drop index if exists participants_session_invited_email_open_uidx;
drop index if exists participants_session_invited_email_open_lower_uidx;
drop index if exists participants_session_secondary_uidx;

create unique index participants_session_user_uidx
  on public.participants (session_id, user_id)
  where user_id is not null;

create unique index participants_session_invited_email_open_lower_uidx
  on public.participants (session_id, lower(invited_email))
  where invited_email is not null and user_id is null;

create unique index participants_session_secondary_uidx
  on public.participants (session_id)
  where role in ('B', 'partner');

create index if not exists participants_invite_consent_by_user_id_idx
  on public.participants (invite_consent_by_user_id);
