-- Allow explicit completed status for finished questionnaire sessions.

alter table public.sessions drop constraint if exists sessions_status_check;
alter table public.sessions
  add constraint sessions_status_check
  check (status in ('not_started', 'in_progress', 'waiting', 'ready', 'match_ready', 'completed'));
