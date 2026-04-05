begin;

alter table public.research_events
  add column if not exists instrument_version text;

comment on column public.research_events.instrument_version is
  'Version des eingesetzten Fragebogen-Instruments. Bleibt in research_events nur kurzzeitig fuer die spaetere Aggregation erhalten.';

create or replace view public.research_events_analytics_v1 as
select
  re.id,
  coalesce(re.client_occurred_at, re.received_at) as created_at,
  re.event_name,
  re.event_version,

  re.subject_hash,
  re.invitation_hash,
  coalesce(
    re.assessment_hash,
    case
      when (re.properties ->> 'assessmentId') ~ '^[0-9a-f]{64}$'
        then re.properties ->> 'assessmentId'
      else null
    end
  ) as assessment_hash,
  re.flow_hash,

  re.module,
  coalesce(re.team_context, nullif(re.properties ->> 'teamContext', '')) as team_context,

  re.question_id,
  re.question_index,
  coalesce(re.question_type, nullif(re.properties ->> 'questionType', '')) as question_type,
  coalesce(re.dimension, nullif(re.properties ->> 'dimension', '')) as dimension,

  nullif(re.properties ->> 'choiceValue', '') as choice_value,
  re.answer_changed,
  re.duration_ms,
  re.elapsed_ms,
  re.pause_ms,
  re.completion_ratio,

  nullif(re.properties ->> 'role', '') as role,
  nullif(re.properties ->> 'reportType', '') as report_type,
  case
    when lower(coalesce(re.properties ->> 'valuesBlock', '')) = 'true' then true
    when lower(coalesce(re.properties ->> 'valuesBlock', '')) = 'false' then false
    else null
  end as values_block,

  coalesce(re.device_class, nullif(re.properties ->> 'deviceClass', '')) as device_class,
  coalesce(re.app_version, nullif(re.properties ->> 'appVersion', '')) as app_version,
  nullif(
    coalesce(
      re.instrument_version,
      nullif(re.properties ->> 'instrumentVersion', ''),
      case
        when re.module = 'base' then 'founder_base_v2'
        when re.module = 'values' then 'values_v2'
        else 'unknown'
      end
    ),
    ''
  ) as instrument_version
from public.research_events re;

comment on view public.research_events_analytics_v1 is
  'Read-only Analytics-Sicht auf research_events mit vereinheitlichten Spalten fuer historische und neue Eventstrukturen.';

revoke all on public.research_events_analytics_v1 from anon;
revoke all on public.research_events_analytics_v1 from authenticated;
grant select on public.research_events_analytics_v1 to service_role;

create table if not exists public.analytics_item_distribution_daily (
  date_bucket date not null,
  module text not null,
  instrument_version text not null,
  item_id text not null,
  question_type text not null,
  dimension text not null,
  choice_bucket text not null,
  response_count integer not null check (response_count >= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (
    date_bucket,
    module,
    instrument_version,
    item_id,
    question_type,
    dimension,
    choice_bucket
  )
);

create table if not exists public.analytics_dimension_score_buckets_daily (
  date_bucket date not null,
  module text not null,
  instrument_version text not null,
  dimension text not null,
  score_bucket text not null,
  case_count integer not null check (case_count >= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (
    date_bucket,
    module,
    instrument_version,
    dimension,
    score_bucket
  )
);

create table if not exists public.analytics_questionnaire_funnel_daily (
  date_bucket date not null,
  module text not null,
  instrument_version text not null,
  stage text not null,
  question_index integer,
  event_count integer not null check (event_count >= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists analytics_questionnaire_funnel_daily_unique_idx
  on public.analytics_questionnaire_funnel_daily (
    date_bucket,
    module,
    instrument_version,
    stage,
    coalesce(question_index, -1)
  );

create table if not exists public.analytics_question_timing_buckets_daily (
  date_bucket date not null,
  module text not null,
  instrument_version text not null,
  item_id text not null,
  question_type text not null,
  duration_bucket text not null,
  event_count integer not null check (event_count >= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (
    date_bucket,
    module,
    instrument_version,
    item_id,
    question_type,
    duration_bucket
  )
);

comment on table public.analytics_item_distribution_daily is
  'Anonyme Tagesaggregate aus research_events: Antwortverteilungen pro Item ohne IDs, Hashes oder Rohverlaeufe.';
comment on table public.analytics_dimension_score_buckets_daily is
  'Anonyme Tagesaggregate finaler Dimension-Scores in festen Buckets auf Basis operativer Founder-Scoring-Outputs.';
comment on table public.analytics_questionnaire_funnel_daily is
  'Anonyme Tagesaggregate des Questionnaire-Funnels auf Fragenebene ohne Session- oder Nutzerbezug.';
comment on table public.analytics_question_timing_buckets_daily is
  'Anonyme Tagesaggregate von Antwortdauern pro Item in groben Dauer-Buckets.';

revoke all on public.analytics_item_distribution_daily from anon;
revoke all on public.analytics_item_distribution_daily from authenticated;
revoke all on public.analytics_dimension_score_buckets_daily from anon;
revoke all on public.analytics_dimension_score_buckets_daily from authenticated;
revoke all on public.analytics_questionnaire_funnel_daily from anon;
revoke all on public.analytics_questionnaire_funnel_daily from authenticated;
revoke all on public.analytics_question_timing_buckets_daily from anon;
revoke all on public.analytics_question_timing_buckets_daily from authenticated;

grant select on public.analytics_item_distribution_daily to service_role;
grant select on public.analytics_dimension_score_buckets_daily to service_role;
grant select on public.analytics_questionnaire_funnel_daily to service_role;
grant select on public.analytics_question_timing_buckets_daily to service_role;

create or replace function public.analytics_min_cell_count()
returns integer
language sql
immutable
as $$
  select 20;
$$;

create or replace function public.analytics_duration_bucket(p_duration_ms integer)
returns text
language plpgsql
immutable
as $$
begin
  if p_duration_ms is null or p_duration_ms < 0 then
    return null;
  elsif p_duration_ms < 5000 then
    return '0_5s';
  elsif p_duration_ms < 15000 then
    return '5_15s';
  elsif p_duration_ms < 30000 then
    return '15_30s';
  elsif p_duration_ms < 60000 then
    return '30_60s';
  else
    return '60s_plus';
  end if;
end;
$$;

create or replace function public.analytics_score_bucket(p_score numeric)
returns text
language plpgsql
immutable
as $$
begin
  if p_score is null then
    return null;
  elsif p_score <= 20 then
    return '0_20';
  elsif p_score <= 40 then
    return '21_40';
  elsif p_score <= 60 then
    return '41_60';
  elsif p_score <= 80 then
    return '61_80';
  else
    return '81_100';
  end if;
end;
$$;

create or replace function public.analytics_resolve_instrument_version(
  p_module public.assessment_module,
  p_question_id text,
  p_instrument_version text
)
returns text
language plpgsql
immutable
as $$
declare
  v_trimmed text := nullif(btrim(p_instrument_version), '');
begin
  if v_trimmed is not null then
    return v_trimmed;
  end if;

  if p_module = 'base' then
    return 'founder_base_v2';
  end if;

  if p_module = 'values' and p_question_id like 'wv2\_%' escape '\' then
    return 'values_v2';
  end if;

  if p_module = 'values' then
    return 'values_v2';
  end if;

  return 'unknown';
end;
$$;

create or replace function public.aggregate_phase1_questionnaire_analytics_for_date(
  p_target_date date default (current_date - 1),
  p_min_count integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min_count integer := greatest(coalesce(p_min_count, public.analytics_min_cell_count()), 1);
  v_item_rows integer := 0;
  v_funnel_rows integer := 0;
  v_timing_rows integer := 0;
begin
  if p_target_date is null then
    raise exception 'target_date_required';
  end if;

  delete from public.analytics_item_distribution_daily where date_bucket = p_target_date;
  delete from public.analytics_questionnaire_funnel_daily where date_bucket = p_target_date;
  delete from public.analytics_question_timing_buckets_daily where date_bucket = p_target_date;

  insert into public.analytics_item_distribution_daily (
    date_bucket,
    module,
    instrument_version,
    item_id,
    question_type,
    dimension,
    choice_bucket,
    response_count
  )
  select
    source.date_bucket,
    source.module,
    source.instrument_version,
    source.item_id,
    source.question_type,
    source.dimension,
    source.choice_bucket,
    source.response_count
  from (
    select
      rea.created_at::date as date_bucket,
      rea.module::text as module,
      public.analytics_resolve_instrument_version(rea.module, rea.question_id, rea.instrument_version) as instrument_version,
      rea.question_id as item_id,
      coalesce(rea.question_type, 'unknown') as question_type,
      coalesce(nullif(rea.dimension, ''), 'unknown') as dimension,
      rea.choice_value as choice_bucket,
      count(*)::integer as response_count
    from public.research_events_analytics_v1 rea
    where rea.created_at::date = p_target_date
      and rea.event_name = 'answer_saved'
      and rea.module in ('base', 'values')
      and rea.question_id is not null
      and rea.choice_value is not null
    group by
      rea.created_at::date,
      rea.module,
      public.analytics_resolve_instrument_version(rea.module, rea.question_id, rea.instrument_version),
      rea.question_id,
      coalesce(rea.question_type, 'unknown'),
      coalesce(nullif(rea.dimension, ''), 'unknown'),
      rea.choice_value
    having count(*) >= v_min_count
  ) as source
  on conflict (
    date_bucket,
    module,
    instrument_version,
    item_id,
    question_type,
    dimension,
    choice_bucket
  ) do update
  set response_count = excluded.response_count,
      updated_at = now();

  get diagnostics v_item_rows = row_count;

  insert into public.analytics_questionnaire_funnel_daily (
    date_bucket,
    module,
    instrument_version,
    stage,
    question_index,
    event_count
  )
  select
    source.date_bucket,
    source.module,
    source.instrument_version,
    source.stage,
    source.question_index,
    source.event_count
  from (
    select
      rea.created_at::date as date_bucket,
      rea.module::text as module,
      public.analytics_resolve_instrument_version(rea.module, rea.question_id, rea.instrument_version) as instrument_version,
      case rea.event_name
        when 'questionnaire_started' then 'started'
        when 'question_viewed' then 'question_viewed'
        when 'answer_saved' then 'answer_saved'
        when 'questionnaire_submitted' then 'submitted'
        else null
      end as stage,
      case
        when rea.event_name in ('question_viewed', 'answer_saved') then rea.question_index
        else null
      end as question_index,
      count(*)::integer as event_count
    from public.research_events_analytics_v1 rea
    where rea.created_at::date = p_target_date
      and rea.event_name in (
        'questionnaire_started',
        'question_viewed',
        'answer_saved',
        'questionnaire_submitted'
      )
      and rea.module in ('base', 'values')
    group by
      rea.created_at::date,
      rea.module,
      public.analytics_resolve_instrument_version(rea.module, rea.question_id, rea.instrument_version),
      case rea.event_name
        when 'questionnaire_started' then 'started'
        when 'question_viewed' then 'question_viewed'
        when 'answer_saved' then 'answer_saved'
        when 'questionnaire_submitted' then 'submitted'
        else null
      end,
      case
        when rea.event_name in ('question_viewed', 'answer_saved') then rea.question_index
        else null
      end
    having count(*) >= v_min_count
  ) as source
  where source.stage is not null;

  get diagnostics v_funnel_rows = row_count;

  insert into public.analytics_question_timing_buckets_daily (
    date_bucket,
    module,
    instrument_version,
    item_id,
    question_type,
    duration_bucket,
    event_count
  )
  select
    source.date_bucket,
    source.module,
    source.instrument_version,
    source.item_id,
    source.question_type,
    source.duration_bucket,
    source.event_count
  from (
    select
      rea.created_at::date as date_bucket,
      rea.module::text as module,
      public.analytics_resolve_instrument_version(rea.module, rea.question_id, rea.instrument_version) as instrument_version,
      rea.question_id as item_id,
      coalesce(rea.question_type, 'unknown') as question_type,
      public.analytics_duration_bucket(rea.duration_ms) as duration_bucket,
      count(*)::integer as event_count
    from public.research_events_analytics_v1 rea
    where rea.created_at::date = p_target_date
      and rea.event_name = 'answer_saved'
      and rea.module in ('base', 'values')
      and rea.question_id is not null
      and rea.duration_ms is not null
    group by
      rea.created_at::date,
      rea.module,
      public.analytics_resolve_instrument_version(rea.module, rea.question_id, rea.instrument_version),
      rea.question_id,
      coalesce(rea.question_type, 'unknown'),
      public.analytics_duration_bucket(rea.duration_ms)
    having count(*) >= v_min_count
  ) as source
  where source.duration_bucket is not null
  on conflict (
    date_bucket,
    module,
    instrument_version,
    item_id,
    question_type,
    duration_bucket
  ) do update
  set event_count = excluded.event_count,
      updated_at = now();

  get diagnostics v_timing_rows = row_count;

  return jsonb_build_object(
    'dateBucket', p_target_date,
    'minCellCount', v_min_count,
    'itemDistributionRows', v_item_rows,
    'questionnaireFunnelRows', v_funnel_rows,
    'questionTimingRows', v_timing_rows,
    'dataSource', 'research_events'
  );
end;
$$;

create or replace function public.aggregate_phase1_dimension_score_buckets_for_date(
  p_target_date date default (current_date - 1),
  p_min_count integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min_count integer := greatest(coalesce(p_min_count, public.analytics_min_cell_count()), 1);
  v_rows integer := 0;
begin
  if p_target_date is null then
    raise exception 'target_date_required';
  end if;

  delete from public.analytics_dimension_score_buckets_daily where date_bucket = p_target_date;

  insert into public.analytics_dimension_score_buckets_daily (
    date_bucket,
    module,
    instrument_version,
    dimension,
    score_bucket,
    case_count
  )
  select
    source.date_bucket,
    source.module,
    source.instrument_version,
    source.dimension,
    source.score_bucket,
    source.case_count
  from (
    select
      rr.created_at::date as date_bucket,
      'base'::text as module,
      'founder_base_v2'::text as instrument_version,
      dimension_row.dimension,
      public.analytics_score_bucket(dimension_row.score_value) as score_bucket,
      count(*)::integer as case_count
    from public.report_runs rr
    cross join lateral jsonb_array_elements(
      coalesce(rr.payload -> 'founderScoring' -> 'dimensions', '[]'::jsonb)
    ) as dimension_json(item)
    cross join lateral (
      values
        (
          nullif(btrim(dimension_json.item ->> 'dimension'), ''),
          nullif(dimension_json.item ->> 'scoreA', '')::numeric
        ),
        (
          nullif(btrim(dimension_json.item ->> 'dimension'), ''),
          nullif(dimension_json.item ->> 'scoreB', '')::numeric
        )
    ) as dimension_row(dimension, score_value)
    where rr.created_at::date = p_target_date
      and rr.payload ->> 'reportType' = 'founder_alignment_v1'
      and dimension_row.dimension is not null
      and dimension_row.score_value is not null
    group by
      rr.created_at::date,
      dimension_row.dimension,
      public.analytics_score_bucket(dimension_row.score_value)
    having count(*) >= v_min_count
  ) as source
  where source.score_bucket is not null
  on conflict (
    date_bucket,
    module,
    instrument_version,
    dimension,
    score_bucket
  ) do update
  set case_count = excluded.case_count,
      updated_at = now();

  get diagnostics v_rows = row_count;

  return jsonb_build_object(
    'dateBucket', p_target_date,
    'minCellCount', v_min_count,
    'dimensionScoreBucketRows', v_rows,
    'dataSource', 'report_runs.payload.founderScoring'
  );
end;
$$;

create or replace function public.run_phase1_daily_analytics(
  p_target_date date default (current_date - 1),
  p_min_count integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_questionnaire jsonb;
  v_dimension_scores jsonb;
begin
  v_questionnaire := public.aggregate_phase1_questionnaire_analytics_for_date(p_target_date, p_min_count);
  v_dimension_scores := public.aggregate_phase1_dimension_score_buckets_for_date(p_target_date, p_min_count);

  return jsonb_build_object(
    'dateBucket', p_target_date,
    'questionnaireAnalytics', v_questionnaire,
    'dimensionScoreBuckets', v_dimension_scores
  );
end;
$$;

create or replace function public.purge_old_research_events(
  p_retention_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retention_days integer := coalesce(p_retention_days, 30);
  v_deleted_count integer := 0;
  v_cutoff timestamptz;
begin
  if v_retention_days < 1 or v_retention_days > 60 then
    raise exception 'invalid_retention_days';
  end if;

  v_cutoff := date_trunc('day', now()) - make_interval(days => v_retention_days);

  perform set_config('app.allow_account_cleanup', 'on', true);

  delete from public.research_events
  where coalesce(client_occurred_at, received_at) < v_cutoff;

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'retentionDays', v_retention_days,
    'cutoff', v_cutoff,
    'deletedResearchEvents', v_deleted_count
  );
end;
$$;

create or replace function public.schedule_phase1_analytics_jobs(
  p_aggregate_schedule text default '15 2 * * *',
  p_purge_schedule text default '45 2 * * *',
  p_retention_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_pg_cron boolean := exists(select 1 from pg_extension where extname = 'pg_cron');
  v_aggregate_job_id bigint;
  v_purge_job_id bigint;
begin
  if p_retention_days < 1 or p_retention_days > 60 then
    raise exception 'invalid_retention_days';
  end if;

  if not v_has_pg_cron then
    return jsonb_build_object(
      'scheduled', false,
      'reason', 'pg_cron_not_installed',
      'aggregateCommand', 'select public.run_phase1_daily_analytics(current_date - 1);',
      'purgeCommand', format('select public.purge_old_research_events(%s);', p_retention_days)
    );
  end if;

  execute $sql$
    select cron.unschedule(jobid)
    from cron.job
    where jobname in ('phase1_analytics_daily_aggregate', 'phase1_analytics_daily_purge')
  $sql$;

  execute format(
    'select cron.schedule(%L, %L, %L)',
    'phase1_analytics_daily_aggregate',
    p_aggregate_schedule,
    'select public.run_phase1_daily_analytics(current_date - 1);'
  )
  into v_aggregate_job_id;

  execute format(
    'select cron.schedule(%L, %L, %L)',
    'phase1_analytics_daily_purge',
    p_purge_schedule,
    format('select public.purge_old_research_events(%s);', p_retention_days)
  )
  into v_purge_job_id;

  return jsonb_build_object(
    'scheduled', true,
    'aggregateJobId', v_aggregate_job_id,
    'purgeJobId', v_purge_job_id,
    'retentionDays', p_retention_days
  );
end;
$$;

grant execute on function public.aggregate_phase1_questionnaire_analytics_for_date(date, integer) to service_role;
grant execute on function public.aggregate_phase1_dimension_score_buckets_for_date(date, integer) to service_role;
grant execute on function public.run_phase1_daily_analytics(date, integer) to service_role;
grant execute on function public.purge_old_research_events(integer) to service_role;
grant execute on function public.schedule_phase1_analytics_jobs(text, text, integer) to service_role;

commit;
