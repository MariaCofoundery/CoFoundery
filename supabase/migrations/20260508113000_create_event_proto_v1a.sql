create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'live', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  display_name text not null,
  email text not null,
  participant_token text not null unique,
  consent_compare boolean not null default false,
  consent_visibility boolean not null default false,
  assessment_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, email),
  check (char_length(display_name) >= 2),
  check (position('@' in email) > 1)
);

create table if not exists public.event_answers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.event_participants(id) on delete cascade,
  question_key text not null,
  answer_type text not null
    check (answer_type in ('core', 'forced')),
  answer_value integer not null
    check (answer_value between 0 and 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (participant_id, question_key)
);

create index if not exists event_participants_event_id_idx
  on public.event_participants (event_id);

create index if not exists event_answers_participant_id_idx
  on public.event_answers (participant_id);

create index if not exists event_answers_event_id_idx
  on public.event_answers (event_id);

alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_answers enable row level security;

create or replace function public.set_event_proto_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_event_participants_set_updated_at
  on public.event_participants;

create trigger trg_event_participants_set_updated_at
before update on public.event_participants
for each row
execute function public.set_event_proto_updated_at();

drop trigger if exists trg_event_answers_set_updated_at
  on public.event_answers;

create trigger trg_event_answers_set_updated_at
before update on public.event_answers
for each row
execute function public.set_event_proto_updated_at();

comment on table public.events is
  'Event prototype V1a events. Deliberately separate from invitations, relationships and workbook flows.';

comment on table public.event_participants is
  'Event prototype V1a participants. Access is intentionally conservative and expected to go through server-side actions/functions.';

comment on table public.event_answers is
  'Event prototype V1a answers for core and forced conversation questions.';
