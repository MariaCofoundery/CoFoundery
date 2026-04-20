do $$
begin
  if not exists (select 1 from pg_type where typname = 'relationship_advisor_status') then
    create type public.relationship_advisor_status as enum ('pending', 'approved', 'linked', 'revoked');
  end if;
end $$;

create table if not exists public.relationship_advisors (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  advisor_user_id uuid references auth.users(id) on delete set null,
  advisor_name text,
  status public.relationship_advisor_status not null default 'pending',
  founder_a_approved boolean not null default false,
  founder_b_approved boolean not null default false,
  approved_at timestamptz,
  linked_at timestamptz,
  revoked_at timestamptz,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  source_invitation_id uuid references public.invitations(id) on delete set null,
  invite_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (invite_token_hash is null or char_length(invite_token_hash) = 64)
);

create index if not exists relationship_advisors_relationship_id_idx
  on public.relationship_advisors(relationship_id);

create index if not exists relationship_advisors_advisor_user_id_idx
  on public.relationship_advisors(advisor_user_id);

create index if not exists relationship_advisors_source_invitation_id_idx
  on public.relationship_advisors(source_invitation_id);

create unique index if not exists relationship_advisors_source_invitation_linked_uidx
  on public.relationship_advisors(source_invitation_id, advisor_user_id)
  where source_invitation_id is not null and advisor_user_id is not null;

create or replace function public.set_relationship_advisors_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_relationship_advisors_set_updated_at
on public.relationship_advisors;

create trigger trg_relationship_advisors_set_updated_at
before update on public.relationship_advisors
for each row execute function public.set_relationship_advisors_updated_at();

alter table public.relationship_advisors enable row level security;

create policy relationship_advisors_select_allowed
on public.relationship_advisors
for select to authenticated
using (
  advisor_user_id = auth.uid()
  or exists (
    select 1
    from public.relationships r
    where r.id = relationship_advisors.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
);

create policy relationship_advisors_insert_allowed
on public.relationship_advisors
for insert to authenticated
with check (
  advisor_user_id = auth.uid()
  or exists (
    select 1
    from public.relationships r
    where r.id = relationship_advisors.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
);

create policy relationship_advisors_update_allowed
on public.relationship_advisors
for update to authenticated
using (
  advisor_user_id = auth.uid()
  or exists (
    select 1
    from public.relationships r
    where r.id = relationship_advisors.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
)
with check (
  advisor_user_id = auth.uid()
  or exists (
    select 1
    from public.relationships r
    where r.id = relationship_advisors.relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
  )
);

with legacy_rows as (
  select
    fwa.invitation_id,
    coalesce(i.relationship_id, rel.id) as relationship_id,
    fwa.advisor_user_id,
    fwa.advisor_name,
    case
      when fwa.advisor_user_id is not null then 'linked'::public.relationship_advisor_status
      when fwa.founder_a_approved and fwa.founder_b_approved then 'approved'::public.relationship_advisor_status
      else 'pending'::public.relationship_advisor_status
    end as status,
    fwa.founder_a_approved,
    fwa.founder_b_approved,
    fwa.approved_at,
    case when fwa.advisor_user_id is not null then coalesce(fwa.claimed_at, fwa.updated_at, fwa.created_at) else null end as linked_at,
    null::timestamptz as revoked_at,
    fwa.requested_by as requested_by_user_id,
    fwa.invitation_id as source_invitation_id,
    fwa.token_hash as invite_token_hash,
    fwa.created_at,
    fwa.updated_at
  from public.founder_alignment_workbook_advisors fwa
  left join public.invitations i on i.id = fwa.invitation_id
  left join public.relationships rel
    on i.relationship_id is null
   and i.inviter_user_id is not null
   and i.invitee_user_id is not null
   and (
     (rel.user_a_id = i.inviter_user_id and rel.user_b_id = i.invitee_user_id)
     or (rel.user_a_id = i.invitee_user_id and rel.user_b_id = i.inviter_user_id)
   )
)
insert into public.relationship_advisors (
  relationship_id,
  advisor_user_id,
  advisor_name,
  status,
  founder_a_approved,
  founder_b_approved,
  approved_at,
  linked_at,
  revoked_at,
  requested_by_user_id,
  source_invitation_id,
  invite_token_hash,
  created_at,
  updated_at
)
select
  relationship_id,
  advisor_user_id,
  advisor_name,
  status,
  founder_a_approved,
  founder_b_approved,
  approved_at,
  linked_at,
  revoked_at,
  requested_by_user_id,
  source_invitation_id,
  invite_token_hash,
  created_at,
  updated_at
from legacy_rows
where relationship_id is not null
  and not exists (
    select 1
    from public.relationship_advisors existing
    where existing.source_invitation_id = legacy_rows.source_invitation_id
      and coalesce(existing.advisor_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = coalesce(legacy_rows.advisor_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create or replace view public.relationship_advisor_backfill_unresolved as
select
  fwa.invitation_id as source_invitation_id,
  i.relationship_id as invitation_relationship_id,
  i.inviter_user_id,
  i.invitee_user_id,
  fwa.advisor_user_id,
  fwa.advisor_name,
  fwa.founder_a_approved,
  fwa.founder_b_approved,
  fwa.approved_at,
  fwa.claimed_at,
  fwa.created_at,
  fwa.updated_at,
  case
    when i.id is null then 'invitation_not_found'
    when i.relationship_id is null and i.invitee_user_id is null then 'invitee_not_linked'
    when i.relationship_id is null then 'relationship_not_resolved'
    else 'unknown'
  end as unresolved_reason
from public.founder_alignment_workbook_advisors fwa
left join public.invitations i on i.id = fwa.invitation_id
left join public.relationship_advisors ra
  on ra.source_invitation_id = fwa.invitation_id
 and coalesce(ra.advisor_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    = coalesce(fwa.advisor_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
where ra.id is null;
