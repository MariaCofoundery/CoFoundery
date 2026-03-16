begin;

create extension if not exists pgcrypto;

create table if not exists public.research_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_version integer not null default 1 check (event_version > 0),

  -- Pseudonymous linkage only (no plain user ids, no email)
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  invitation_hash text check (invitation_hash is null or invitation_hash ~ '^[0-9a-f]{64}$'),
  flow_hash text check (flow_hash is null or flow_hash ~ '^[0-9a-f]{64}$'),

  module public.assessment_module,
  question_id text,
  question_index integer check (question_index is null or question_index >= 1),

  duration_ms integer check (duration_ms is null or duration_ms between 0 and 3600000),
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms between 0 and 14400000),
  pause_ms integer check (pause_ms is null or pause_ms between 0 and 14400000),
  answer_changed boolean,
  completion_ratio numeric(5,4) check (completion_ratio is null or completion_ratio between 0 and 1),

  client_occurred_at timestamptz,
  received_at timestamptz not null default now(),
  page_path text,
  device_class text check (
    device_class is null
    or device_class in ('mobile', 'desktop', 'tablet', 'unknown')
  ),
  app_version text,

  properties jsonb not null default '{}'::jsonb check (jsonb_typeof(properties) = 'object')
);

create index if not exists research_events_received_idx
  on public.research_events(received_at desc);

create index if not exists research_events_event_received_idx
  on public.research_events(event_name, received_at desc);

create index if not exists research_events_subject_received_idx
  on public.research_events(subject_hash, received_at desc);

create index if not exists research_events_invitation_received_idx
  on public.research_events(invitation_hash, received_at desc)
  where invitation_hash is not null;

create index if not exists research_events_module_question_idx
  on public.research_events(module, question_id, received_at desc)
  where question_id is not null;

comment on table public.research_events is
  'Anonymisierte Produkt- und Forschungsereignisse (keine E-Mail, keine Klartext-User-IDs).';

create or replace function public.block_research_events_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'research_events_are_immutable';
end;
$$;

drop trigger if exists research_events_immutable on public.research_events;
create trigger research_events_immutable
before update or delete on public.research_events
for each row execute function public.block_research_events_mutation();

alter table public.research_events enable row level security;

drop policy if exists research_events_insert_authenticated on public.research_events;
create policy research_events_insert_authenticated
  on public.research_events
  for insert
  to authenticated
  with check (
    subject_hash ~ '^[0-9a-f]{64}$'
  );

-- Keep reads restricted to service role (analytics jobs / secured backend only).
revoke all on table public.research_events from anon;
revoke all on table public.research_events from authenticated;
grant insert on table public.research_events to authenticated;
grant select on table public.research_events to service_role;

commit;
