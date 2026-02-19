-- Allow partner role and match_ready session status for join-flow.

alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check
  check (status in ('not_started', 'in_progress', 'waiting', 'ready', 'match_ready', 'completed'));

alter table public.participants drop constraint if exists participants_role_check;
alter table public.participants
  add constraint participants_role_check
  check (role in ('A', 'B', 'partner'));
