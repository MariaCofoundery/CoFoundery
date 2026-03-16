create table if not exists public.founder_alignment_workbook_advisors (
  invitation_id uuid primary key references public.invitations(id) on delete cascade,
  advisor_user_id uuid references auth.users(id) on delete set null,
  advisor_name text,
  token_hash text unique,
  founder_a_approved boolean not null default false,
  founder_b_approved boolean not null default false,
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (token_hash is null or char_length(token_hash) = 64)
);

create or replace function public.set_founder_alignment_workbook_advisor_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_founder_alignment_workbook_advisors_set_updated_at
on public.founder_alignment_workbook_advisors;

create trigger trg_founder_alignment_workbook_advisors_set_updated_at
before update on public.founder_alignment_workbook_advisors
for each row execute function public.set_founder_alignment_workbook_advisor_updated_at();

alter table public.founder_alignment_workbook_advisors enable row level security;

create policy founder_alignment_workbook_advisors_select_allowed
on public.founder_alignment_workbook_advisors
for select to authenticated
using (
  advisor_user_id = auth.uid()
  or exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbook_advisors.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

create policy founder_alignment_workbook_advisors_insert_participants
on public.founder_alignment_workbook_advisors
for insert to authenticated
with check (
  requested_by = auth.uid()
  and exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbook_advisors.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);

create policy founder_alignment_workbook_advisors_update_allowed
on public.founder_alignment_workbook_advisors
for update to authenticated
using (
  advisor_user_id = auth.uid()
  or exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbook_advisors.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
)
with check (
  advisor_user_id = auth.uid()
  or exists (
    select 1
    from public.invitations i
    where i.id = founder_alignment_workbook_advisors.invitation_id
      and auth.uid() in (i.inviter_user_id, i.invitee_user_id)
  )
);
