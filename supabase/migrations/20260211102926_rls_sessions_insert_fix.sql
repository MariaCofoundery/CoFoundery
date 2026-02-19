-- Ensure authenticated users can create sessions and participants

drop policy if exists "sessions_insert_authenticated" on public.sessions;
create policy "sessions_insert_authenticated"
  on public.sessions
  for insert
  to authenticated
  with check (true);

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
