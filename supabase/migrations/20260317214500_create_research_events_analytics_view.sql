begin;

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
  coalesce(re.app_version, nullif(re.properties ->> 'appVersion', '')) as app_version
from public.research_events re;

comment on view public.research_events_analytics_v1 is
  'Read-only Analytics-Sicht auf research_events mit vereinheitlichten Spalten fuer historische und neue Eventstrukturen.';

revoke all on public.research_events_analytics_v1 from anon;
revoke all on public.research_events_analytics_v1 from authenticated;
grant select on public.research_events_analytics_v1 to service_role;

commit;
