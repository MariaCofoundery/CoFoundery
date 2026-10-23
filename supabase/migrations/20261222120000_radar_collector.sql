begin;

-- ---------------------------------------------------------------------------
-- PROBLEM RADAR: begrenzter Sammler (R2) und Wochenlauf (R7)
-- ---------------------------------------------------------------------------
-- Der Sammler legt KEINE Signale an. Er legt Kandidaten ab: eine Adresse, den
-- Titel und das Datum eines oeffentlichen Beitrags. Was daraus ein Signal wird,
-- entscheidet ein Mensch im Adminbereich - mit eigenen Worten (siehe
-- docs/problem-radar-implementation-plan.md, Abschnitt 3).
--
-- Er laeuft unter einer eigenen Datenbankrolle, die nur die vier Funktionen
-- unten ausfuehren darf. Kein Tabellenzugriff, kein Service-Role-Schluessel.
-- Die Rolle wird hier ohne Anmeldung angelegt; Login und Passwort setzt Maria
-- ausserhalb der Migration (ein Geheimnis gehoert nicht ins Repository).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'radar_collector') then
    create role radar_collector nologin;
  end if;
end $$;
grant usage on schema public to radar_collector;

-- Welche Abrufart eine Quelle fuer den Sammler hat. Heute genau eine.
alter table public.radar_sources
  add column collection_adapter text check (collection_adapter in ('hn_algolia')),
  add column collection_queries text[] not null default '{}' check (cardinality(collection_queries) <= 5),
  add constraint radar_sources_adapter_scope check (
    collection_adapter is null
    or (retrieval_method = 'official_api' and domain = 'news.ycombinator.com'
        and (allowed_path = '/' or allowed_path = '/item'))
  );

-- Ein globaler Schalter. Standard: aus.
create table public.radar_settings (
  singleton boolean primary key default true check (singleton),
  collection_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);
insert into public.radar_settings default values;

create table public.radar_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.radar_sources on delete cascade,
  source_revision integer not null,
  item_id text not null check (item_id ~ '^[0-9]{1,12}$'),
  url text check (length(url) <= 2048),
  title text check (length(title) <= 200),
  source_date date,
  state text not null default 'open' check (state in ('open', 'taken', 'dismissed')),
  collected_at timestamptz not null default now(),
  delete_after timestamptz not null default now() + interval '30 days',
  unique (source_id, item_id),
  -- Nach der Entscheidung bleibt nur die Kennung, damit der Beitrag nicht als neu wiederkehrt.
  check (state = 'open' or (url is null and title is null))
);
create index radar_candidates_open_idx on public.radar_candidates (state, collected_at desc, id);

-- Protokoll der Laeufe: inhaltsfrei, nur Zahlen und ein fester Ausgang.
create table public.radar_collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.radar_sources on delete cascade,
  source_revision integer not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null default 'started' check (outcome in ('started', 'ok', 'empty', 'http_error', 'format_error', 'timeout', 'source_changed', 'disabled')),
  fetched integer not null default 0,
  added integer not null default 0
);
create index radar_collection_runs_source_idx on public.radar_collection_runs (source_id, finished_at desc);

alter table public.radar_settings enable row level security;
alter table public.radar_candidates enable row level security;
alter table public.radar_collection_runs enable row level security;
revoke all on public.radar_settings, public.radar_candidates, public.radar_collection_runs from public, anon, authenticated;

-- Darf diese Quelle gesammelt werden? Dieselben Bedingungen wie bei der Freigabe,
-- dazu ein gesetzter Abruftyp und mindestens ein Suchbegriff.
create function public.radar_source_collectable(s public.radar_sources) returns boolean
language sql stable set search_path = '' as $$
  select s.status = 'active' and s.permission_state = 'approved' and s.is_public
     and s.retrieval_method = 'official_api' and s.collection_adapter is not null
     and cardinality(s.collection_queries) > 0 and s.review_due_at > now();
$$;
revoke all on function public.radar_source_collectable(public.radar_sources) from public, anon, authenticated;

-- ---- Sammler (nur radar_collector) ----------------------------------------

-- Faellige Quellen: freigegeben, aktiv, seit mindestens p_min_gap nicht erfolgreich gelaufen.
-- Mindestabstand eine Stunde, damit auch ein "Jetzt scannen" keine Dauerabfrage wird.
create function public.radar_collector_due(p_min_gap interval)
returns table (source_id uuid, source_revision integer, adapter text, queries text[])
language sql stable security definer set search_path = '' as $$
  select s.id, s.revision, s.collection_adapter, s.collection_queries
  from public.radar_sources s, public.radar_settings st
  where st.collection_enabled and public.radar_source_collectable(s)
    and not exists (
      select 1 from public.radar_collection_runs r
      where r.source_id = s.id and r.outcome in ('ok', 'empty')
        and r.finished_at > now() - greatest(p_min_gap, interval '1 hour'))
  order by s.id limit 5;
$$;

create function public.radar_collector_start(p_source_id uuid, p_revision integer) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.radar_sources; v_id uuid;
begin
  select * into s from public.radar_sources where id = p_source_id;
  if not found or s.revision is distinct from p_revision or not public.radar_source_collectable(s)
     or not (select collection_enabled from public.radar_settings) then
    raise exception 'radar_source_changed' using errcode = '40001';
  end if;
  insert into public.radar_collection_runs (source_id, source_revision) values (p_source_id, p_revision) returning id into v_id;
  return v_id;
end $$;

-- Nimmt nur Kennung, Titel und Datum. Die Adresse baut die Datenbank selbst:
-- der Sammler kann keine beliebige URL eintragen.
create function public.radar_collector_ingest(p_run_id uuid, p_items jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare r public.radar_collection_runs; s public.radar_sources; item jsonb; v_added integer := 0; v_n integer;
begin
  select * into r from public.radar_collection_runs where id = p_run_id and outcome = 'started' for update;
  if not found then raise exception 'radar_run_invalid' using errcode = '22023'; end if;
  select * into s from public.radar_sources where id = r.source_id;
  -- Zwischen Abruf und Eintrag kann die Quelle gesperrt oder geaendert worden sein.
  if s.revision is distinct from r.source_revision or not public.radar_source_collectable(s)
     or not (select collection_enabled from public.radar_settings) then
    raise exception 'radar_source_changed' using errcode = '40001';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'radar_items_invalid' using errcode = '22023';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) <> 'object' or (item ->> 'item_id') !~ '^[0-9]{1,12}$' or length(coalesce(item ->> 'title', '')) not between 1 and 200 then
      raise exception 'radar_items_invalid' using errcode = '22023';
    end if;
    insert into public.radar_candidates (source_id, source_revision, item_id, url, title, source_date)
    values (r.source_id, r.source_revision, item ->> 'item_id',
            'https://news.ycombinator.com/item?id=' || (item ->> 'item_id'),
            btrim(item ->> 'title'),
            case when (item ->> 'source_date') ~ '^\d{4}-\d{2}-\d{2}$' then (item ->> 'source_date')::date end)
    on conflict (source_id, item_id) do nothing;
    get diagnostics v_n = row_count;
    v_added := v_added + v_n;
  end loop;
  return v_added;
end $$;

create function public.radar_collector_finish(p_run_id uuid, p_outcome text, p_fetched integer, p_added integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_outcome not in ('ok', 'empty', 'http_error', 'format_error', 'timeout', 'source_changed', 'disabled') then
    raise exception 'radar_outcome_invalid' using errcode = '22023';
  end if;
  update public.radar_collection_runs
    set outcome = p_outcome, finished_at = now(), fetched = greatest(0, least(coalesce(p_fetched, 0), 1000)), added = greatest(0, least(coalesce(p_added, 0), 1000))
    where id = p_run_id and outcome = 'started';
  -- Aufraeumen: offene Kandidaten verfallen nach 30 Tagen zur blossen Kennung, Laufprotokolle nach 30 Tagen.
  update public.radar_candidates set state = 'dismissed', url = null, title = null, source_date = null
    where state = 'open' and delete_after < now();
  delete from public.radar_collection_runs where started_at < now() - interval '30 days';
end $$;

revoke all on function public.radar_collector_due(interval), public.radar_collector_start(uuid, integer),
  public.radar_collector_ingest(uuid, jsonb), public.radar_collector_finish(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.radar_collector_due(interval), public.radar_collector_start(uuid, integer),
  public.radar_collector_ingest(uuid, jsonb), public.radar_collector_finish(uuid, text, integer, integer) to radar_collector;

-- ---- Verwaltung (nur Plattform-Admins) ------------------------------------

create function public.admin_radar_collection_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return jsonb_build_object(
    'enabled', (select collection_enabled from public.radar_settings),
    'open_candidates', (select count(*) from public.radar_candidates where state = 'open'),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'revision', s.revision, 'adapter', s.collection_adapter, 'queries', s.collection_queries,
        'collectable', public.radar_source_collectable(s),
        'last_run', (select jsonb_build_object('finished_at', r.finished_at, 'outcome', r.outcome, 'fetched', r.fetched, 'added', r.added)
                     from public.radar_collection_runs r where r.source_id = s.id order by r.started_at desc limit 1)
      ) order by s.name)
      from public.radar_sources s where s.retrieval_method = 'official_api'), '[]'::jsonb));
end $$;

create function public.set_radar_collection_enabled(p_enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  update public.radar_settings set collection_enabled = coalesce(p_enabled, false), updated_at = now(), updated_by = auth.uid();
end $$;

-- Abrufart und Suchbegriffe einer Quelle. Wie jede Aenderung am Abrufvertrag
-- setzt das die Freigabe zurueck.
create function public.save_radar_source_collection(p_id uuid, p_revision integer, p_adapter text, p_queries text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v_queries text[];
begin
  perform public.radar_require_admin();
  if p_adapter is not null and p_adapter not in ('hn_algolia') then raise exception 'radar_invalid' using errcode = '23514'; end if;
  select coalesce(array_agg(q), '{}') into v_queries from (
    select btrim(x) q from unnest(coalesce(p_queries, '{}')) x where btrim(x) <> '') t;
  if cardinality(v_queries) > 5 or exists (select 1 from unnest(v_queries) q where length(q) not between 2 and 80) then
    raise exception 'radar_invalid' using errcode = '23514';
  end if;
  perform 1 from public.radar_sources where id = p_id and revision = p_revision for update;
  if not found then raise exception 'radar_conflict' using errcode = '40001'; end if;
  update public.radar_sources set collection_adapter = p_adapter, collection_queries = case when p_adapter is null then '{}' else v_queries end,
    status = 'paused', permission_state = 'pending', reviewed_at = null, reviewed_by = null, review_due_at = null,
    revision = revision + 1, updated_at = now() where id = p_id;
  insert into public.radar_review_events (source_id, actor, revision, action, reason_code)
    select id, auth.uid(), revision, 'edited', 'scope_changed' from public.radar_sources where id = p_id;
end $$;

create function public.list_radar_candidates(p_state text, p_offset integer) returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return query
    select jsonb_build_object('id', c.id, 'source_id', c.source_id, 'source_name', s.name, 'url', c.url, 'title', c.title,
                              'source_date', c.source_date, 'collected_at', c.collected_at, 'state', c.state)
    from public.radar_candidates c join public.radar_sources s on s.id = c.source_id
    where c.state = coalesce(p_state, 'open')
    order by c.collected_at desc, c.id
    limit 26 offset greatest(0, least(coalesce(p_offset, 0), 100000));
end $$;

create function public.get_radar_candidate(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return (select jsonb_build_object('id', c.id, 'source_id', c.source_id, 'url', c.url, 'title', c.title, 'source_date', c.source_date)
          from public.radar_candidates c where c.id = p_id and c.state = 'open');
end $$;

-- "dismiss" verwirft, "take" vermerkt die Uebernahme als Signal. Beides loescht
-- Titel und Adresse des Kandidaten und behaelt nur die Kennung.
create function public.review_radar_candidate(p_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  if p_action not in ('dismiss', 'take') then raise exception 'radar_invalid' using errcode = '23514'; end if;
  update public.radar_candidates
    set state = case when p_action = 'take' then 'taken' else 'dismissed' end, url = null, title = null, source_date = null
    where id = p_id and state = 'open';
  if not found then raise exception 'radar_conflict' using errcode = '40001'; end if;
end $$;

revoke all on function public.admin_radar_collection_status(), public.set_radar_collection_enabled(boolean),
  public.save_radar_source_collection(uuid, integer, text, text[]), public.list_radar_candidates(text, integer),
  public.get_radar_candidate(uuid), public.review_radar_candidate(uuid, text) from public, anon;
grant execute on function public.admin_radar_collection_status(), public.set_radar_collection_enabled(boolean),
  public.save_radar_source_collection(uuid, integer, text, text[]), public.list_radar_candidates(text, integer),
  public.get_radar_candidate(uuid), public.review_radar_candidate(uuid, text) to authenticated;

notify pgrst, 'reload schema';
commit;
