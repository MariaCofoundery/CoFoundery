create extension if not exists "pgcrypto";

-- Core session tables
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'in_progress' check (status in ('in_progress', 'waiting', 'ready')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  role text not null check (role in ('A', 'B')),
  token text not null unique,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Questionnaire content
create table if not exists public.questions (
  id text primary key,
  dimension text not null,
  prompt text not null,
  sort_order int not null,
  is_active boolean not null default true
);

create table if not exists public.choices (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.questions(id) on delete cascade,
  label text not null,
  value text not null,
  sort_order int not null
);

-- Responses
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  question_id text not null references public.questions(id) on delete restrict,
  choice_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, question_id)
);

create table if not exists public.free_text (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  text text,
  updated_at timestamptz not null default now(),
  unique (participant_id)
);

create index if not exists participants_session_id_idx on public.participants(session_id);
create index if not exists responses_session_participant_idx on public.responses(session_id, participant_id);
create index if not exists choices_question_id_idx on public.choices(question_id);

alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.responses enable row level security;
alter table public.free_text enable row level security;
