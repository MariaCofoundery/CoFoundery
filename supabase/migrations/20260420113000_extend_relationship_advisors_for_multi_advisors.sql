do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'relationship_advisor_status'
      and e.enumlabel = 'invited'
  ) then
    null;
  else
    alter type public.relationship_advisor_status add value 'invited';
  end if;
end $$;

alter table public.relationship_advisors
  add column if not exists advisor_email text,
  add column if not exists invited_at timestamptz;

create index if not exists relationship_advisors_relationship_email_uidx
  on public.relationship_advisors (relationship_id, lower(advisor_email))
  where advisor_email is not null and revoked_at is null;
