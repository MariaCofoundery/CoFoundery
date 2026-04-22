create table if not exists public.advisor_team_invites (
  id uuid primary key default gen_random_uuid(),
  advisor_user_id uuid not null references auth.users(id) on delete cascade,
  advisor_email text,
  advisor_name text,
  team_name text,
  founder_a_email text not null,
  founder_b_email text not null,
  founder_a_user_id uuid references auth.users(id) on delete set null,
  founder_b_user_id uuid references auth.users(id) on delete set null,
  founder_a_claimed_at timestamptz,
  founder_b_claimed_at timestamptz,
  founder_a_token_hash text not null unique,
  founder_b_token_hash text not null unique,
  invitation_id uuid references public.invitations(id) on delete set null,
  relationship_id uuid references public.relationships(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'activating', 'activated', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (founder_a_email = lower(founder_a_email)),
  check (founder_b_email = lower(founder_b_email)),
  check (founder_a_email <> founder_b_email),
  check (char_length(founder_a_token_hash) = 64),
  check (char_length(founder_b_token_hash) = 64)
);

create index if not exists advisor_team_invites_advisor_user_idx
  on public.advisor_team_invites (advisor_user_id);

create index if not exists advisor_team_invites_status_idx
  on public.advisor_team_invites (status);

create index if not exists advisor_team_invites_invitation_idx
  on public.advisor_team_invites (invitation_id);

create index if not exists advisor_team_invites_relationship_idx
  on public.advisor_team_invites (relationship_id);

alter table public.advisor_team_invites enable row level security;

create or replace function public.set_advisor_team_invites_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_advisor_team_invites_set_updated_at
  on public.advisor_team_invites;

create trigger trg_advisor_team_invites_set_updated_at
before update on public.advisor_team_invites
for each row
execute function public.set_advisor_team_invites_updated_at();

drop policy if exists advisor_team_invites_select_own on public.advisor_team_invites;
create policy advisor_team_invites_select_own
on public.advisor_team_invites
for select
to authenticated
using (advisor_user_id = auth.uid());

drop policy if exists advisor_team_invites_insert_own on public.advisor_team_invites;
create policy advisor_team_invites_insert_own
on public.advisor_team_invites
for insert
to authenticated
with check (advisor_user_id = auth.uid());

drop policy if exists advisor_team_invites_update_own on public.advisor_team_invites;
create policy advisor_team_invites_update_own
on public.advisor_team_invites
for update
to authenticated
using (advisor_user_id = auth.uid())
with check (advisor_user_id = auth.uid());
