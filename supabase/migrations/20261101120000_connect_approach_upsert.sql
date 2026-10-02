begin;

-- Phase 7.1: PostgREST's ON CONFLICT (problem_id, author_user_id) cannot
-- infer the partial index. NULLS DISTINCT preserves exactly its uniqueness
-- semantics: one row per identified author (including withdrawn rows), but
-- any number of anonymized authors. Do not use NULLS NOT DISTINCT here.
alter table public.network_problem_approaches
  add constraint network_problem_approaches_unique
  unique nulls distinct (problem_id, author_user_id);

drop index public.network_problem_approaches_one_per_author;

commit;
