alter table public.invitations
  add column if not exists team_context text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invitations_team_context_check'
  ) then
    alter table public.invitations
      add constraint invitations_team_context_check
      check (team_context in ('pre_founder', 'existing_team'));
  end if;
end $$;

create index if not exists invitations_team_context_idx
  on public.invitations(team_context);
