-- Event-Kalender: Termine aus dem Startup-Oekosystem fuer Gruendende und Advisor.
--
-- Wunsch von Maria (05.11.2026): bundesweit, regelmaessig automatisch eingespielt, ohne KI - und "es muss
-- absolut erlaubt sein, was da drin steht".
--
-- Regeln:
--   - NUR FAKTEN. Titel, Beginn/Ende, Ort, online ja/nein, Bundesland, Veranstalter und der Link zur offiziellen
--     Seite. Keine Beschreibung, keine Bilder - die sind geschuetzt, Fakten nicht. Wer mehr wissen will, folgt
--     dem Link.
--   - JEDES EVENT HAT EINE NACHWEISBARE HERKUNFT:
--       a) eine Quelle (ecosystem_event_sources) mit Lizenz, Namensnennung und dem Ort, an dem die Erlaubnis
--          steht (Lizenzseite oder Erlaubnis-Mail). Eine Quelle ist aus, bis die Plattform-Admins sie
--          einschalten. Was die Quelle nicht mehr liefert, verschwindet hier beim naechsten Lauf.
--       b) ein Eintrag von einem Mitglied einer aktiven Organisation (Accelerator, Beratung), das bestaetigt:
--          oeffentlich angekuendigt, nur Fakten, Link zur offiziellen Seite. Sichtbar erst, wenn die
--          Plattform-Admins es freigegeben haben.
--   - Lesen: freigegebene Events alle angemeldeten Menschen; eigene Vorschlaege die Person selbst; alles die
--     Admins. Schreiben nur ueber die Funktionen.
--   - "Merken" ist privat (eigene Zeilen).
--   - Aufbewahrung: Events, die laenger als 60 Tage vorbei sind, loescht der taegliche Lauf.
--   - Konto geloescht: Gemerktes geht mit (cascade), eingereichte Fakten bleiben ohne Person (set null).
--     Im Kontoexport: eigene Vorschlaege und Gemerktes.

begin;

create table public.ecosystem_event_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  homepage_url text not null,
  feed_kind text not null,
  feed_url text not null,
  region text,
  license text not null,
  license_url text,
  attribution text not null,
  -- Wo die Erlaubnis steht: Lizenzseite, Nutzungsbedingungen oder "Mail von ... am ...".
  permission_note text not null,
  enabled boolean not null default false,
  last_run_at timestamptz,
  last_count integer,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_event_sources_key check (key ~ '^[a-z0-9-]{2,40}$'),
  -- Erst Kalenderdateien (iCal). Weitere Formate (z. B. die JSON-Schnittstelle des Digital Hub muensterLAND)
  -- kommen mit eigener Migration, sobald ein eigener Zugang da ist und das Format geprueft ist.
  constraint ecosystem_event_sources_kind check (feed_kind in ('ics')),
  constraint ecosystem_event_sources_urls check (homepage_url ~ '^https://' and feed_url ~ '^https://' and (license_url is null or license_url ~ '^https://')),
  constraint ecosystem_event_sources_texts check (
    char_length(btrim(name)) between 1 and 120
    and char_length(btrim(license)) between 1 and 120
    and char_length(btrim(attribution)) between 1 and 200
    and char_length(btrim(permission_note)) between 5 and 500
  ),
  constraint ecosystem_event_sources_region check (region is null or region in ('BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH'))
);

create table public.ecosystem_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.ecosystem_event_sources (id) on delete cascade,
  external_id text,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  place text,
  region text,
  online boolean not null default false,
  organizer text,
  url text not null,
  status text not null default 'pending',
  submitted_by_user_id uuid references auth.users (id) on delete set null,
  submitted_org_id uuid references public.advisor_orgs (id) on delete set null,
  -- Der Name zum Zeitpunkt des Eintrags: Gruendende duerfen die Organisationen selbst nicht lesen.
  submitted_org_name text,
  review_note text,
  reviewed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_events_origin check ((source_id is null) = (external_id is null)),
  constraint ecosystem_events_title check (char_length(btrim(title)) between 1 and 200),
  constraint ecosystem_events_texts check (
    (place is null or char_length(place) <= 160)
    and (organizer is null or char_length(organizer) <= 120)
    and (review_note is null or char_length(review_note) <= 300)
    and (submitted_org_name is null or char_length(submitted_org_name) <= 160)
    and char_length(url) <= 500
  ),
  constraint ecosystem_events_url check (url ~ '^https://[^\s]+$'),
  constraint ecosystem_events_times check (ends_at is null or ends_at >= starts_at),
  constraint ecosystem_events_status check (status in ('pending', 'published', 'rejected')),
  constraint ecosystem_events_region check (region is null or region in ('BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH')),
  unique (source_id, external_id)
);
create index ecosystem_events_published_idx on public.ecosystem_events (starts_at) where status = 'published';
create index ecosystem_events_pending_idx on public.ecosystem_events (created_at) where status = 'pending';
create index ecosystem_events_submitter_idx on public.ecosystem_events (submitted_by_user_id) where submitted_by_user_id is not null;
create index ecosystem_events_org_idx on public.ecosystem_events (submitted_org_id) where submitted_org_id is not null;

create table public.ecosystem_event_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.ecosystem_events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index ecosystem_event_saves_event_idx on public.ecosystem_event_saves (event_id);

alter table public.ecosystem_event_sources enable row level security;
alter table public.ecosystem_events enable row level security;
alter table public.ecosystem_event_saves enable row level security;
revoke all on public.ecosystem_event_sources from anon, authenticated;
revoke all on public.ecosystem_events from anon, authenticated;
revoke all on public.ecosystem_event_saves from anon, authenticated;
grant select on public.ecosystem_event_sources to authenticated;
grant select on public.ecosystem_events to authenticated;
grant select on public.ecosystem_event_saves to authenticated;

-- Quellen sind oeffentliche Angaben (Name, Lizenz, Namensnennung) - jede angemeldete Person darf sie lesen.
create policy ecosystem_event_sources_read on public.ecosystem_event_sources
  for select to authenticated using (true);
create policy ecosystem_events_read on public.ecosystem_events
  for select to authenticated using (
    status = 'published' or submitted_by_user_id = auth.uid() or public.is_platform_admin()
  );
create policy ecosystem_event_saves_own on public.ecosystem_event_saves
  for select to authenticated using (user_id = auth.uid());

-- Ein Event vorschlagen: Mitglied einer aktiven Organisation, mit Bestaetigung. Wartet auf Freigabe.
create or replace function public.submit_ecosystem_event(
  p_org_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_place text,
  p_region text,
  p_online boolean,
  p_organizer text,
  p_url text,
  p_confirmed boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not coalesce(p_confirmed, false) then
    raise exception 'ecosystem_event_not_confirmed' using errcode = '22023';
  end if;
  if not public.can_work_in_org(p_org_id) then
    raise exception 'ecosystem_event_not_allowed' using errcode = '42501';
  end if;
  if p_starts_at is null or p_starts_at < pg_catalog.now() - interval '1 day' or p_starts_at > pg_catalog.now() + interval '18 months' then
    raise exception 'ecosystem_event_invalid' using errcode = '22023';
  end if;
  -- Ein Riegel gegen Massen: hoechstens 20 offene Vorschlaege je Person.
  if (select count(*) from public.ecosystem_events e where e.submitted_by_user_id = auth.uid() and e.status = 'pending') >= 20 then
    raise exception 'ecosystem_event_too_many' using errcode = '22023';
  end if;
  insert into public.ecosystem_events (title, starts_at, ends_at, all_day, place, region, online, organizer, url, status, submitted_by_user_id, submitted_org_id, submitted_org_name)
  values (
    btrim(coalesce(p_title, '')), p_starts_at, p_ends_at, coalesce(p_all_day, false),
    nullif(btrim(coalesce(p_place, '')), ''), nullif(p_region, ''), coalesce(p_online, false),
    nullif(btrim(coalesce(p_organizer, '')), ''), btrim(coalesce(p_url, '')), 'pending', auth.uid(), p_org_id,
    (select left(o.name, 160) from public.advisor_orgs o where o.id = p_org_id)
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_ecosystem_event(uuid, text, timestamptz, timestamptz, boolean, text, text, boolean, text, text, boolean) from public, anon;
grant execute on function public.submit_ecosystem_event(uuid, text, timestamptz, timestamptz, boolean, text, text, boolean, text, text, boolean) to authenticated;

-- Eigenen Vorschlag zurueckziehen (in jedem Stand); Admins duerfen jedes Event entfernen.
create or replace function public.delete_ecosystem_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ecosystem_events e
  where e.id = p_event_id
    and ((e.source_id is null and e.submitted_by_user_id = auth.uid()) or public.is_platform_admin());
  return found;
end;
$$;
revoke all on function public.delete_ecosystem_event(uuid) from public, anon;
grant execute on function public.delete_ecosystem_event(uuid) to authenticated;

-- Freigeben oder ablehnen - nur Plattform-Admins, nur Eintraege (Quellen-Events sind durch ihre Lizenz gedeckt).
create or replace function public.review_ecosystem_event(p_event_id uuid, p_publish boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'ecosystem_event_not_allowed' using errcode = '42501';
  end if;
  update public.ecosystem_events e
  set status = case when p_publish then 'published' else 'rejected' end,
      review_note = nullif(left(btrim(coalesce(p_note, '')), 300), ''),
      reviewed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where e.id = p_event_id and e.source_id is null;
end;
$$;
revoke all on function public.review_ecosystem_event(uuid, boolean, text) from public, anon;
grant execute on function public.review_ecosystem_event(uuid, boolean, text) to authenticated;

-- Merken: an und aus.
create or replace function public.toggle_ecosystem_event_save(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.ecosystem_events e where e.id = p_event_id and e.status = 'published') then
    raise exception 'ecosystem_event_not_found' using errcode = 'P0002';
  end if;
  delete from public.ecosystem_event_saves s where s.user_id = auth.uid() and s.event_id = p_event_id;
  if found then
    return false;
  end if;
  insert into public.ecosystem_event_saves (user_id, event_id) values (auth.uid(), p_event_id);
  return true;
end;
$$;
revoke all on function public.toggle_ecosystem_event_save(uuid) from public, anon;
grant execute on function public.toggle_ecosystem_event_save(uuid) to authenticated;

-- Quellen pflegen - nur Admins. Lizenz, Namensnennung und Erlaubnis-Nachweis sind Pflicht.
create or replace function public.save_ecosystem_event_source(
  p_key text, p_name text, p_homepage_url text, p_feed_kind text, p_feed_url text, p_region text,
  p_license text, p_license_url text, p_attribution text, p_permission_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'ecosystem_event_not_allowed' using errcode = '42501';
  end if;
  insert into public.ecosystem_event_sources (key, name, homepage_url, feed_kind, feed_url, region, license, license_url, attribution, permission_note)
  values (lower(btrim(p_key)), btrim(p_name), btrim(p_homepage_url), p_feed_kind, btrim(p_feed_url), nullif(p_region, ''),
          btrim(p_license), nullif(btrim(coalesce(p_license_url, '')), ''), btrim(p_attribution), btrim(p_permission_note))
  on conflict (key) do update
  set name = excluded.name, homepage_url = excluded.homepage_url, feed_kind = excluded.feed_kind, feed_url = excluded.feed_url,
      region = excluded.region, license = excluded.license, license_url = excluded.license_url, attribution = excluded.attribution,
      permission_note = excluded.permission_note, updated_at = pg_catalog.now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.save_ecosystem_event_source(text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.save_ecosystem_event_source(text, text, text, text, text, text, text, text, text, text) to authenticated;

-- Eine Quelle aus: ihre Events gehen sofort mit - was nicht mehr gedeckt ist, steht nicht mehr da.
create or replace function public.set_ecosystem_event_source_enabled(p_source_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'ecosystem_event_not_allowed' using errcode = '42501';
  end if;
  update public.ecosystem_event_sources s set enabled = coalesce(p_enabled, false), updated_at = pg_catalog.now() where s.id = p_source_id;
  if not coalesce(p_enabled, false) then
    delete from public.ecosystem_events e where e.source_id = p_source_id;
  end if;
end;
$$;
revoke all on function public.set_ecosystem_event_source_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_ecosystem_event_source_enabled(uuid, boolean) to authenticated;

-- Der taegliche Lauf: was eine eingeschaltete Quelle liefert, ersetzt ihren Stand. Kommende Events, die sie nicht
-- mehr liefert, gehen. Nur fuer den Server (service_role).
create or replace function public.import_ecosystem_events(p_source_id uuid, p_rows jsonb, p_error text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.ecosystem_event_sources%rowtype;
  -- Die Uhrzeit dieses Laufs, nicht der Beginn der Transaktion: zwei Laeufe nacheinander sind zwei Staende.
  v_run timestamptz := pg_catalog.clock_timestamp();
  v_count integer := 0;
begin
  select * into v_source from public.ecosystem_event_sources s where s.id = p_source_id;
  if v_source.id is null or not v_source.enabled then
    return 0;
  end if;
  if p_error is not null then
    update public.ecosystem_event_sources s set last_run_at = v_run, last_error = left(p_error, 300) where s.id = p_source_id;
    return 0;
  end if;

  insert into public.ecosystem_events (source_id, external_id, title, starts_at, ends_at, all_day, place, region, online, organizer, url, status, last_seen_at)
  select p_source_id, left(r.external_id, 300), left(btrim(r.title), 200), r.starts_at,
         case when r.ends_at >= r.starts_at then r.ends_at end, coalesce(r.all_day, false),
         nullif(left(btrim(coalesce(r.place, '')), 160), ''), coalesce(nullif(r.region, ''), v_source.region), coalesce(r.online, false),
         nullif(left(btrim(coalesce(r.organizer, '')), 120), ''), r.url, 'published', v_run
  from jsonb_to_recordset(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end)
    as r(external_id text, title text, starts_at timestamptz, ends_at timestamptz, all_day boolean, place text, region text, online boolean, organizer text, url text)
  where coalesce(btrim(r.external_id), '') <> ''
    and coalesce(btrim(r.title), '') <> ''
    and r.starts_at is not null
    and r.starts_at > v_run - interval '1 day'
    and r.url ~ '^https://[^\s]+$' and char_length(r.url) <= 500
    and (r.region is null or r.region = '' or r.region in ('BW','BY','BE','BB','HB','HH','HE','MV','NI','NW','RP','SL','SN','ST','SH','TH'))
  on conflict (source_id, external_id) do update
  set title = excluded.title, starts_at = excluded.starts_at, ends_at = excluded.ends_at, all_day = excluded.all_day,
      place = excluded.place, region = excluded.region, online = excluded.online, organizer = excluded.organizer,
      url = excluded.url, last_seen_at = v_run, updated_at = pg_catalog.now();
  get diagnostics v_count = row_count;

  delete from public.ecosystem_events e
  where e.source_id = p_source_id and e.starts_at >= v_run and (e.last_seen_at is null or e.last_seen_at < v_run);

  update public.ecosystem_event_sources s
  set last_run_at = v_run, last_count = v_count, last_error = null
  where s.id = p_source_id;
  return v_count;
end;
$$;
revoke all on function public.import_ecosystem_events(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.import_ecosystem_events(uuid, jsonb, text) to service_role;

-- Aufbewahrung: laenger als 60 Tage vorbei, abgelehnt und aelter als 30 Tage.
create or replace function public.purge_old_ecosystem_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.ecosystem_events e
  where coalesce(e.ends_at, e.starts_at) < pg_catalog.now() - interval '60 days'
     or (e.status = 'rejected' and e.reviewed_at < pg_catalog.now() - interval '30 days');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.purge_old_ecosystem_events() from public, anon, authenticated;
grant execute on function public.purge_old_ecosystem_events() to service_role;

commit;
