-- Guardrails for user_id-first session identity.
-- These indexes are only created when existing data is clean.

do $$
begin
  if exists (
    select 1
    from public.participants
    where user_id is not null
    group by session_id, user_id
    having count(*) > 1
  ) then
    raise notice 'Skip participants_session_user_uidx: duplicate (session_id, user_id) rows exist.';
  else
    create unique index if not exists participants_session_user_uidx
      on public.participants (session_id, user_id)
      where user_id is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from public.participants
    where invited_email is not null and user_id is null
    group by session_id, invited_email
    having count(*) > 1
  ) then
    raise notice 'Skip participants_session_invited_email_open_uidx: duplicate open invites exist.';
  else
    create unique index if not exists participants_session_invited_email_open_uidx
      on public.participants (session_id, invited_email)
      where invited_email is not null and user_id is null;
  end if;
end $$;
