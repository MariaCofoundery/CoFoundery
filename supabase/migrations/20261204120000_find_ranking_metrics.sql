-- FIND Matching v0.1: aggregierte technische Kennzahlen des Rankingpfads (E3d).
--
-- NUR Zähler je UTC-Tag, Kennzahl und Bucket. Keine Zeile pro Anfrage, kein Zeitstempel
-- einzelner Anfragen, keine Person, keine ID, kein Hash, kein Text. Welche (Kennzahl,
-- Bucket)-Paare es gibt, legt find_ranking_metric_allowed fest - alles andere lehnt die
-- Datenbank ab, auch wenn es der Server versuchte.
--
-- Geschrieben nur vom Server (service_role) über record_find_ranking_metrics, nach der
-- Antwort und nur, solange MATCHING_FIND_V01_RANKING_ENABLED=true ist. Gelesen nur von
-- service_role (Auswertung). Doku: docs/research/matching-v0.1-find-shadow.md (E3d).

begin;

create or replace function public.find_ranking_metric_allowed(p_metric text, p_bucket text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_metric
    when 'requests' then p_bucket = 'all'
    when 'ranking_mode' then p_bucket in ('legacy', 'v01')
    when 'v01_attempts' then p_bucket = 'all'
    when 'v01_success' then p_bucket = 'all'
    when 'fallback' then p_bucket in (
      'session_invalid', 'viewer_mismatch', 'viewer_not_searching', 'service_unavailable',
      'pool_failed', 'inputs_failed', 'engine_failed', 'detail_failed', 'presenter_failed', 'unexpected')
    when 'presenter' then p_bucket in ('ok', 'failed')
    when 'pool_size' then p_bucket in ('lt_10', 'lt_100', 'lt_1000', 'lt_10000', 'ge_10000', 'sum', 'n')
    when 'gate' then p_bucket in ('eligible', 'uncertain', 'excluded')
    when 'page_visible' then p_bucket in ('full', 'short_last_page', 'short_detail_dropped', 'empty')
    when 'runtime_pool' then p_bucket in ('lt_50', 'lt_100', 'lt_250', 'lt_500', 'lt_1000', 'lt_2500', 'ge_2500', 'sum_ms', 'n')
    when 'runtime_inputs' then p_bucket in ('lt_50', 'lt_100', 'lt_250', 'lt_500', 'lt_1000', 'lt_2500', 'ge_2500', 'sum_ms', 'n')
    when 'runtime_engine' then p_bucket in ('lt_50', 'lt_100', 'lt_250', 'lt_500', 'lt_1000', 'lt_2500', 'ge_2500', 'sum_ms', 'n')
    when 'runtime_detail' then p_bucket in ('lt_50', 'lt_100', 'lt_250', 'lt_500', 'lt_1000', 'lt_2500', 'ge_2500', 'sum_ms', 'n')
    when 'runtime_total' then p_bucket in ('lt_50', 'lt_100', 'lt_250', 'lt_500', 'lt_1000', 'lt_2500', 'ge_2500', 'sum_ms', 'n')
    else false
  end;
$$;

create table public.find_ranking_metrics_daily (
  day date not null,
  metric text not null,
  bucket text not null,
  value bigint not null default 0 check (value >= 0),
  primary key (day, metric, bucket),
  check (public.find_ranking_metric_allowed(metric, bucket))
);

comment on table public.find_ranking_metrics_daily is
  'FIND v0.1 Rankingpfad: nur aggregierte Tageszähler (Kennzahl, Bucket). Keine Personen, IDs, Hashes, Texte oder Einzelanfragen.';

alter table public.find_ranking_metrics_daily enable row level security;
revoke all on table public.find_ranking_metrics_daily from public, anon, authenticated, service_role;
-- Auch der Server schreibt nur über record_find_ranking_metrics (Allowlist), nie direkt.
grant select on table public.find_ranking_metrics_daily to service_role;

-- Erhöht Zähler des aktuellen UTC-Tags. Erwartet ein jsonb-Array aus
-- {"metric": text, "bucket": text, "value": integer >= 0} mit genau diesen drei Schlüsseln.
-- Ein unbekanntes Paar, ein weiterer Schlüssel oder ein ungültiger Wert lehnt den ganzen
-- Aufruf ab (nichts wird teilweise geschrieben).
create or replace function public.record_find_ranking_metrics(p_increments jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_day date := (now() at time zone 'utc')::date;
begin
  if jsonb_typeof(p_increments) is distinct from 'array' or jsonb_array_length(p_increments) > 80 then
    raise exception 'find_ranking_metrics_invalid' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_increments) loop
    if jsonb_typeof(v_item) is distinct from 'object'
       or (select array_agg(k order by k) from jsonb_object_keys(v_item) k) is distinct from array['bucket', 'metric', 'value']
       or jsonb_typeof(v_item -> 'metric') is distinct from 'string'
       or jsonb_typeof(v_item -> 'bucket') is distinct from 'string'
       or jsonb_typeof(v_item -> 'value') is distinct from 'number'
       or (v_item ->> 'value') !~ '^[0-9]{1,12}$'
       or not public.find_ranking_metric_allowed(v_item ->> 'metric', v_item ->> 'bucket') then
      raise exception 'find_ranking_metrics_invalid' using errcode = '22023';
    end if;
  end loop;

  insert into public.find_ranking_metrics_daily as m (day, metric, bucket, value)
  select v_day, x ->> 'metric', x ->> 'bucket', sum((x ->> 'value')::bigint)
  from jsonb_array_elements(p_increments) x
  group by x ->> 'metric', x ->> 'bucket'
  on conflict (day, metric, bucket) do update set value = m.value + excluded.value;
end;
$$;

revoke all on function public.record_find_ranking_metrics(jsonb) from public, anon, authenticated;
grant execute on function public.record_find_ranking_metrics(jsonb) to service_role;
revoke all on function public.find_ranking_metric_allowed(text, text) from public, anon, authenticated;
grant execute on function public.find_ranking_metric_allowed(text, text) to service_role;

commit;
