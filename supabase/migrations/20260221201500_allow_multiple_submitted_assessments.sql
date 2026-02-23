begin;

drop index if exists public.assessments_user_module_submitted_uidx;

create index if not exists assessments_user_module_submitted_idx
  on public.assessments(user_id, module, submitted_at desc nulls last, created_at desc);

commit;
