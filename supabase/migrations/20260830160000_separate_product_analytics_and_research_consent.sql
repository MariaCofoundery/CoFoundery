begin;

create extension if not exists pgcrypto with schema extensions;

create table public.research_consent_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null check (state in ('accepted', 'declined')),
  research_subject_id uuid not null default gen_random_uuid() unique,
  accepted_at timestamptz,
  declined_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (state = 'accepted' and accepted_at is not null)
    or (state = 'declined' and declined_at is not null)
  )
);

alter table public.research_consent_preferences enable row level security;

create policy research_consent_preferences_select_owner
on public.research_consent_preferences
for select to authenticated
using (user_id = auth.uid());

revoke all on table public.research_consent_preferences from anon, authenticated;
grant select on table public.research_consent_preferences to authenticated;
grant select, insert, update, delete on table public.research_consent_preferences to service_role;

create table public.product_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name ~ '^[a-z0-9_:. -]+$'),
  event_version integer not null default 1 check (event_version between 1 and 1000),
  module public.assessment_module,
  instrument_version text,
  question_id text,
  question_index integer check (question_index is null or question_index between 1 and 5000),
  duration_ms integer check (duration_ms is null or duration_ms between 0 and 3600000),
  elapsed_ms integer check (elapsed_ms is null or elapsed_ms between 0 and 14400000),
  pause_ms integer check (pause_ms is null or pause_ms between 0 and 14400000),
  answer_changed boolean,
  completion_ratio numeric(5,4) check (completion_ratio is null or completion_ratio between 0 and 1),
  client_occurred_at timestamptz,
  received_at timestamptz not null default now(),
  page_path text,
  device_class text check (device_class is null or device_class in ('mobile', 'desktop', 'tablet', 'unknown')),
  app_version text
);

create index product_analytics_events_received_idx
  on public.product_analytics_events(received_at desc);
create index product_analytics_events_event_received_idx
  on public.product_analytics_events(event_name, received_at desc);
comment on table public.product_analytics_events is
  'Minimale Produktanalyse ohne Nutzerkennung, Teamkennung, Choice Values oder Freitext.';

alter table public.product_analytics_events enable row level security;
revoke all on table public.product_analytics_events from public, anon, authenticated;
grant select, insert, delete on table public.product_analytics_events to service_role;

create or replace function public.block_product_analytics_events_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_account_cleanup', true) = 'on' then
    return old;
  end if;
  raise exception 'product_analytics_events_are_immutable';
end;
$$;

create trigger product_analytics_events_immutable
before update or delete on public.product_analytics_events
for each row execute function public.block_product_analytics_events_mutation();

alter table public.research_events
  add column research_consent_version text;

comment on table public.research_events is
  'Pseudonymisierte Research-Ereignisse; neue Events erfordern explizites Opt-in und eine strukturierte Allowlist.';
comment on column public.research_events.research_consent_version is
  'Nur neue, nach explizitem Research Opt-in gespeicherte Events tragen research_consent_v1.';

create or replace function public.enforce_research_event_v1_contract()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_choice_value text;
begin
  if new.research_consent_version is distinct from 'research_consent_v1' then
    raise exception 'research_consent_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.research_consent_preferences preference
    where preference.state = 'accepted'
      and encode(extensions.digest(preference.research_subject_id::text, 'sha256'), 'hex') = new.subject_hash
  ) then
    raise exception 'active_research_consent_required' using errcode = '42501';
  end if;

  if (new.properties - 'choiceValue') <> '{}'::jsonb then
    raise exception 'research_properties_not_allowed' using errcode = '22023';
  end if;

  if new.properties ? 'choiceValue' then
    v_choice_value := nullif(btrim(new.properties ->> 'choiceValue'), '');
    if new.event_name <> 'answer_saved'
       or new.module is null
       or nullif(btrim(coalesce(new.instrument_version, '')), '') is null
       or nullif(btrim(coalesce(new.question_id, '')), '') is null
       or v_choice_value is null
       or length(v_choice_value) > 16
       or v_choice_value !~ '^(0|1|2|3|4|25|33|50|67|75|100)$' then
      raise exception 'invalid_research_choice_contract' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

create trigger research_events_v1_contract
before insert on public.research_events
for each row execute function public.enforce_research_event_v1_contract();

drop policy if exists research_events_insert_authenticated on public.research_events;
revoke insert on table public.research_events from authenticated;
grant select, insert, delete on table public.research_events to service_role;

create or replace function public.set_my_research_consent(p_state text)
returns table (
  state text,
  accepted_at timestamptz,
  declined_at timestamptz,
  withdrawn_at timestamptz,
  deleted_raw_events integer
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_previous_state text;
  v_subject_id uuid;
  v_subject_hash text;
  v_deleted integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_state not in ('accepted', 'declined') then
    raise exception 'invalid_research_consent_state' using errcode = '22023';
  end if;

  select rcp.state, rcp.research_subject_id
    into v_previous_state, v_subject_id
  from public.research_consent_preferences rcp
  where rcp.user_id = v_uid
  for update;

  if v_subject_id is null then
    v_subject_id := gen_random_uuid();
  end if;

  insert into public.research_consent_preferences (
    user_id, state, research_subject_id, accepted_at, declined_at, withdrawn_at, updated_at
  ) values (
    v_uid,
    p_state,
    v_subject_id,
    case when p_state = 'accepted' then now() else null end,
    case when p_state = 'declined' then now() else null end,
    null,
    now()
  )
  on conflict (user_id) do update
  set state = excluded.state,
      accepted_at = case
        when excluded.state = 'accepted' then coalesce(public.research_consent_preferences.accepted_at, now())
        else null
      end,
      declined_at = case when excluded.state = 'declined' then now() else public.research_consent_preferences.declined_at end,
      withdrawn_at = case
        when excluded.state = 'declined' and public.research_consent_preferences.state = 'accepted' then now()
        when excluded.state = 'accepted' then null
        else public.research_consent_preferences.withdrawn_at
      end,
      updated_at = now();

  if p_state = 'declined' then
    v_subject_hash := encode(digest(v_subject_id::text, 'sha256'), 'hex');
    perform set_config('app.allow_account_cleanup', 'on', true);
    delete from public.research_events re
    where re.subject_hash = v_subject_hash
      and re.research_consent_version = 'research_consent_v1';
    get diagnostics v_deleted = row_count;
  end if;

  return query
  select rcp.state, rcp.accepted_at, rcp.declined_at, rcp.withdrawn_at, v_deleted
  from public.research_consent_preferences rcp
  where rcp.user_id = v_uid;
end;
$$;

revoke all on function public.set_my_research_consent(text) from public, anon, authenticated, service_role;
grant execute on function public.set_my_research_consent(text) to authenticated;

create or replace function public.cleanup_research_events_for_deleted_consent_preference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_account_cleanup', 'on', true);
  delete from public.research_events
  where research_consent_version = 'research_consent_v1'
    and subject_hash = encode(extensions.digest(old.research_subject_id::text, 'sha256'), 'hex');
  return old;
end;
$$;

revoke all on function public.cleanup_research_events_for_deleted_consent_preference() from public, anon, authenticated;

create trigger research_consent_preferences_cleanup_research_events
before delete on public.research_consent_preferences
for each row execute function public.cleanup_research_events_for_deleted_consent_preference();

create or replace view public.research_events_analytics_v1 as
select
  re.id,
  coalesce(re.client_occurred_at, re.received_at) as created_at,
  re.event_name,
  re.event_version,
  re.subject_hash,
  re.invitation_hash,
  re.assessment_hash,
  re.flow_hash,
  re.module,
  re.team_context,
  re.question_id,
  re.question_index,
  re.question_type,
  re.dimension,
  nullif(re.properties ->> 'choiceValue', '') as choice_value,
  re.answer_changed,
  re.duration_ms,
  re.elapsed_ms,
  re.pause_ms,
  re.completion_ratio,
  null::text as role,
  null::text as report_type,
  null::boolean as values_block,
  re.device_class,
  re.app_version,
  re.instrument_version,
  re.research_consent_version
from public.research_events re
where re.research_consent_version = 'research_consent_v1';

comment on view public.research_events_analytics_v1 is
  'Service-only Research-Sicht ausschließlich auf Events nach explizitem Research Opt-in.';
revoke all on public.research_events_analytics_v1 from public, anon, authenticated;
grant select on public.research_events_analytics_v1 to service_role;

create or replace function public.aggregate_phase1_dimension_score_buckets_for_date(
  p_target_date date default (current_date - 1),
  p_min_count integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_target_date is null then
    raise exception 'target_date_required';
  end if;

  delete from public.analytics_dimension_score_buckets_daily
  where date_bucket = p_target_date;

  return jsonb_build_object(
    'dateBucket', p_target_date,
    'minCellCount', greatest(coalesce(p_min_count, public.analytics_min_cell_count()), 1),
    'dimensionScoreBucketRows', 0,
    'dataSource', 'disabled_pending_explicit_research_consent_contract'
  );
end;
$$;

comment on function public.aggregate_phase1_dimension_score_buckets_for_date(date, integer) is
  'P0 fail-closed: report-derived scores are not aggregated until a consent-bound dyadic contract exists.';
revoke all on function public.aggregate_phase1_dimension_score_buckets_for_date(date, integer) from public, anon, authenticated;
grant execute on function public.aggregate_phase1_dimension_score_buckets_for_date(date, integer) to service_role;

create or replace function public.purge_old_research_events(p_retention_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retention_days integer := coalesce(p_retention_days, 30);
  v_deleted_research_count integer := 0;
  v_deleted_product_count integer := 0;
  v_cutoff timestamptz;
begin
  if v_retention_days < 1 or v_retention_days > 60 then
    raise exception 'invalid_retention_days';
  end if;

  v_cutoff := date_trunc('day', now()) - make_interval(days => v_retention_days);
  perform set_config('app.allow_account_cleanup', 'on', true);

  delete from public.research_events
  where coalesce(client_occurred_at, received_at) < v_cutoff;
  get diagnostics v_deleted_research_count = row_count;

  delete from public.product_analytics_events
  where coalesce(client_occurred_at, received_at) < v_cutoff;
  get diagnostics v_deleted_product_count = row_count;

  return jsonb_build_object(
    'retentionDays', v_retention_days,
    'cutoff', v_cutoff,
    'deletedResearchEvents', v_deleted_research_count,
    'deletedProductAnalyticsEvents', v_deleted_product_count
  );
end;
$$;

revoke all on function public.purge_old_research_events(integer) from public, anon, authenticated;
grant execute on function public.purge_old_research_events(integer) to service_role;

commit;
