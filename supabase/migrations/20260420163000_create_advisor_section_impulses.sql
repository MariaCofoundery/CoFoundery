create table if not exists public.advisor_section_impulses (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  advisor_user_id uuid not null,
  section_key text not null check (
    section_key in (
      'report_overview',
      'top_tensions',
      'workbook_collaboration',
      'workbook_values'
    )
  ),
  text text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, advisor_user_id, section_key)
);

create index if not exists advisor_section_impulses_relationship_idx
  on public.advisor_section_impulses (relationship_id);

create index if not exists advisor_section_impulses_advisor_idx
  on public.advisor_section_impulses (advisor_user_id);

alter table public.advisor_section_impulses enable row level security;

create or replace function public.set_advisor_section_impulses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_advisor_section_impulses_set_updated_at
  on public.advisor_section_impulses;

create trigger trg_advisor_section_impulses_set_updated_at
before update on public.advisor_section_impulses
for each row
execute function public.set_advisor_section_impulses_updated_at();
