-- Account-based auth backbone
-- Switch from anonymous token-only access to authenticated user access.

alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check
  check (status in ('not_started', 'in_progress', 'waiting', 'ready'));
alter table public.sessions alter column status set default 'not_started';

alter table public.participants add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.participants add column if not exists invited_email text;
alter table public.participants alter column token drop not null;

create index if not exists participants_user_id_idx on public.participants(user_id);
create unique index if not exists participants_session_role_idx on public.participants(session_id, role);

-- RLS policies
drop policy if exists "sessions_select_member" on public.sessions;
create policy "sessions_select_member"
  on public.sessions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.session_id = sessions.id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "sessions_insert_authenticated" on public.sessions;
create policy "sessions_insert_authenticated"
  on public.sessions
  for insert
  to authenticated
  with check (true);

drop policy if exists "sessions_update_member" on public.sessions;
create policy "sessions_update_member"
  on public.sessions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.session_id = sessions.id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.participants p
      where p.session_id = sessions.id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "participants_select_member_session" on public.participants;
create policy "participants_select_member_session"
  on public.participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.session_id = participants.session_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "participants_insert_owned_or_invite" on public.participants;
create policy "participants_insert_owned_or_invite"
  on public.participants
  for insert
  to authenticated
  with check (
    (
      user_id = auth.uid()
    )
    or (
      user_id is null
      and invited_email is not null
      and exists (
        select 1
        from public.participants p
        where p.session_id = participants.session_id
          and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists "participants_update_self" on public.participants;
create policy "participants_update_self"
  on public.participants
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and invited_email = (auth.jwt()->>'email')
    )
  )
  with check (user_id = auth.uid());

drop policy if exists "responses_select_member_session" on public.responses;
create policy "responses_select_member_session"
  on public.responses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.session_id = responses.session_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "responses_insert_owner_participant" on public.responses;
create policy "responses_insert_owner_participant"
  on public.responses
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.participants p
      where p.id = responses.participant_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "responses_update_owner_participant" on public.responses;
create policy "responses_update_owner_participant"
  on public.responses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.id = responses.participant_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.participants p
      where p.id = responses.participant_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "free_text_select_member_session" on public.free_text;
create policy "free_text_select_member_session"
  on public.free_text
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.session_id = free_text.session_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "free_text_insert_owner_participant" on public.free_text;
create policy "free_text_insert_owner_participant"
  on public.free_text
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.participants p
      where p.id = free_text.participant_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "free_text_update_owner_participant" on public.free_text;
create policy "free_text_update_owner_participant"
  on public.free_text
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.participants p
      where p.id = free_text.participant_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.participants p
      where p.id = free_text.participant_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "questions_select_authenticated" on public.questions;
create policy "questions_select_authenticated"
  on public.questions
  for select
  to authenticated
  using (true);

drop policy if exists "choices_select_authenticated" on public.choices;
create policy "choices_select_authenticated"
  on public.choices
  for select
  to authenticated
  using (true);
