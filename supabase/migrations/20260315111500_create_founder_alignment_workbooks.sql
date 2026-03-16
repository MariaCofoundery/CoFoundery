create table if not exists public.founder_alignment_workbooks (
  invitation_id uuid primary key references public.invitations(id) on delete cascade,
  team_context text not null check (team_context in ('pre_founder', 'existing_team')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_founder_alignment_workbook_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_founder_alignment_workbooks_set_updated_at
on public.founder_alignment_workbooks;

create trigger trg_founder_alignment_workbooks_set_updated_at
before update on public.founder_alignment_workbooks
for each row execute function public.set_founder_alignment_workbook_updated_at();

alter table public.founder_alignment_workbooks enable row level security;

create policy founder_alignment_workbooks_select_participants
on public.founder_alignment_workbooks
for select to authenticated
using (
  exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbooks.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

create policy founder_alignment_workbooks_insert_participants
on public.founder_alignment_workbooks
for insert to authenticated
with check (
  created_by = auth.uid()
  and updated_by = auth.uid()
  and exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbooks.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

create policy founder_alignment_workbooks_update_participants
on public.founder_alignment_workbooks
for update to authenticated
using (
  exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbooks.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbooks.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);
