create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  invitation_id uuid null,
  source text not null check (source in ('nav', 'workbook')),
  q1_value text not null check (char_length(btrim(q1_value)) > 0),
  q2_value text not null check (char_length(btrim(q2_value)) > 0),
  q3_value text not null check (char_length(btrim(q3_value)) > 0),
  q4_choice text null check (
    q4_choice is null
    or q4_choice in (
      'matching_besser_verstehen',
      'unterschiede_klarer_sehen',
      'entscheidungen_treffen',
      'zusammenarbeit_strukturieren',
      'konflikte_greifbarer_machen',
      'anderes'
    )
  ),
  q4_other_text text null,
  q5_text text null
);

create index if not exists product_feedback_user_id_idx
  on public.product_feedback (user_id);

create index if not exists product_feedback_created_at_idx
  on public.product_feedback (created_at desc);

alter table public.product_feedback enable row level security;

create policy "product_feedback_insert_own"
  on public.product_feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());
