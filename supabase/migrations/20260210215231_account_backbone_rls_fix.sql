-- Fix RLS recursion and tighten authenticated dashboard flow

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
        and (
          p.user_id = auth.uid()
          or p.invited_email = lower(auth.jwt()->>'email')
        )
    )
  );

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
    user_id = auth.uid()
    or invited_email = lower(auth.jwt()->>'email')
  );

drop policy if exists "participants_insert_owned_or_invite" on public.participants;
create policy "participants_insert_owned_or_invite"
  on public.participants
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or (
      user_id is null
      and invited_email is not null
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
      and invited_email = lower(auth.jwt()->>'email')
    )
  )
  with check (user_id = auth.uid());
