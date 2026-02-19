-- Align DB schema with currently deployed server actions/components.

alter table public.sessions
  add column if not exists participant_id uuid references public.participants(id) on delete set null;

create index if not exists sessions_participant_id_idx
  on public.sessions(participant_id);

alter table public.questions
  add column if not exists category text;

alter table public.questions
  add column if not exists type text;

update public.questions
set category = coalesce(nullif(btrim(category), ''), 'basis')
where category is null or btrim(category) = '';

update public.questions
set type = coalesce(nullif(btrim(type), ''), 'single_choice')
where type is null or btrim(type) = '';

alter table public.questions
  alter column category set default 'basis';

alter table public.questions
  alter column type set default 'single_choice';

alter table public.questions
  alter column category set not null;

alter table public.questions
  alter column type set not null;

create index if not exists questions_category_idx
  on public.questions(category);
