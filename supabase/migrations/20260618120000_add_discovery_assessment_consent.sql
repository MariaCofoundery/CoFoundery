begin;

alter table public.founder_search_preferences
  add column if not exists include_assessment_signals boolean not null default false,
  add column if not exists assessment_signals_consented_at timestamptz;

comment on column public.founder_search_preferences.include_assessment_signals is
  'Private owner-only consent flag for using Cofoundery assessment signals in future Discovery recommendations.';

comment on column public.founder_search_preferences.assessment_signals_consented_at is
  'Server-managed timestamp for when assessment signals consent was enabled for Discovery.';

commit;
