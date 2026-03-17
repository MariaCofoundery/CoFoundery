begin;

alter table public.research_events
  add column if not exists assessment_hash text
    check (assessment_hash is null or assessment_hash ~ '^[0-9a-f]{64}$'),
  add column if not exists team_context text
    check (team_context is null or team_context in ('pre_founder', 'existing_team')),
  add column if not exists question_type text
    check (question_type is null or question_type in ('likert', 'scenario', 'forced_choice', 'unknown')),
  add column if not exists dimension text;

create index if not exists research_events_assessment_received_idx
  on public.research_events(assessment_hash, received_at desc)
  where assessment_hash is not null;

create index if not exists research_events_team_context_received_idx
  on public.research_events(team_context, received_at desc)
  where team_context is not null;

create index if not exists research_events_dimension_received_idx
  on public.research_events(dimension, received_at desc)
  where dimension is not null;

commit;
