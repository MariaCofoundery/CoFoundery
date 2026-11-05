-- Programmplan und Social Media verbinden (Wunsch Maria, 05.11.2026).
--
-- 1. FORMATE: Eine Organisation legt eigene Formate fuer ihre Veranstaltungen an (Masterclass, Pitch in Progress,
--    Fireside Chat ...) - im Programmplan und unter Einrichten. Die Art (Education, intern, extern) bleibt daneben
--    bestehen. Teams im Programm sehen das Format an der Veranstaltung.
-- 2. POST-VORLAGEN: eine Struktur wie "eine Woche vorher LinkedIn und Instagram, drei Tage vorher LinkedIn, einen
--    Tag danach LinkedIn". Angewendet auf eine Veranstaltung entstehen VORSCHLAEGE; gespeichert wird erst nach
--    Freigabe - ueber dieselbe Funktion wie jedes Posting (save_org_post).
-- 3. EVENT-KALENDER: Auch Gruendende duerfen Oekosystem-Events vorschlagen - ohne Organisation, sichtbar erst nach
--    Freigabe durch die Plattform-Admins (wie bisher). Der Name der Person erscheint nie am Event.
--
-- Rechte: Formate pflegt, wer den Plan pflegt (Inhaberin). Vorlagen pflegt jedes aktive Mitglied (wie Postings).
-- Lesen: Mitglieder der Organisation. Keine personenbezogenen Daten ausser "angelegt von" (set null).

begin;

create table public.program_event_formats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  label text not null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint program_event_formats_label check (char_length(btrim(label)) between 1 and 60)
);
create unique index program_event_formats_label_idx on public.program_event_formats (org_id, lower(btrim(label)));

alter table public.team_program_events add column format_id uuid references public.program_event_formats (id) on delete set null;
create index team_program_events_format_idx on public.team_program_events (format_id) where format_id is not null;

create table public.advisor_org_post_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  name text not null,
  -- [{ "days": -7, "channel": "linkedin", "label": "Ankuendigung", "time": "09:00" }, ...]
  steps jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_org_post_templates_name check (char_length(btrim(name)) between 1 and 80),
  constraint advisor_org_post_templates_steps check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 20)
);
create index advisor_org_post_templates_org_idx on public.advisor_org_post_templates (org_id);

alter table public.program_event_formats enable row level security;
alter table public.advisor_org_post_templates enable row level security;
revoke all on public.program_event_formats from anon, authenticated;
revoke all on public.advisor_org_post_templates from anon, authenticated;
grant select on public.program_event_formats to authenticated;
grant select on public.advisor_org_post_templates to authenticated;
create policy program_event_formats_members_read on public.program_event_formats
  for select to authenticated using (public.is_advisor_org_member(org_id));
create policy advisor_org_post_templates_members_read on public.advisor_org_post_templates
  for select to authenticated using (public.is_advisor_org_member(org_id));

-- Formate: anlegen (gibt es den Namen schon, die bestehende id) und loeschen - nur die Inhaberin.
create or replace function public.save_program_event_format(p_org_id uuid, p_label text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_label text := btrim(coalesce(p_label, ''));
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if char_length(v_label) not between 1 and 60 then
    raise exception 'program_event_format_invalid' using errcode = '22023';
  end if;
  select f.id into v_id from public.program_event_formats f where f.org_id = p_org_id and lower(btrim(f.label)) = lower(v_label);
  if v_id is not null then
    return v_id;
  end if;
  if (select count(*) from public.program_event_formats f where f.org_id = p_org_id) >= 40 then
    raise exception 'program_event_format_too_many' using errcode = '22023';
  end if;
  insert into public.program_event_formats (org_id, label, created_by_user_id) values (p_org_id, v_label, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.save_program_event_format(uuid, text) from public, anon;
grant execute on function public.save_program_event_format(uuid, text) to authenticated;

create or replace function public.delete_program_event_format(p_format_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := (select f.org_id from public.program_event_formats f where f.id = p_format_id);
begin
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.program_event_formats where id = p_format_id;
end;
$$;
revoke all on function public.delete_program_event_format(uuid) from public, anon;
grant execute on function public.delete_program_event_format(uuid) to authenticated;

-- Veranstaltung speichern, jetzt mit Format (nur ein Format dieser Organisation).
drop function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text);
create function public.save_program_event(
  p_org_id uuid, p_event_id uuid, p_title text, p_kind text, p_starts_at timestamptz,
  p_location text, p_notes text, p_todos text, p_format_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_format_id is not null and not exists (select 1 from public.program_event_formats f where f.id = p_format_id and f.org_id = p_org_id) then
    raise exception 'program_event_format_invalid' using errcode = '22023';
  end if;
  if p_event_id is null then
    insert into public.team_program_events (org_id, title, kind, starts_at, location, notes, todos, created_by_user_id, format_id)
    values (p_org_id, btrim(p_title), p_kind, p_starts_at, nullif(btrim(coalesce(p_location, '')), ''),
            nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_todos, '')), ''), auth.uid(), p_format_id)
    returning id into v_id;
  else
    update public.team_program_events
    set title = btrim(p_title), kind = p_kind, starts_at = p_starts_at,
        location = nullif(btrim(coalesce(p_location, '')), ''),
        notes = nullif(btrim(coalesce(p_notes, '')), ''),
        todos = nullif(btrim(coalesce(p_todos, '')), ''),
        format_id = p_format_id
    where id = p_event_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'program_event_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text, uuid) from public, anon;
grant execute on function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text, uuid) to authenticated;

-- Lesen mit dem Namen des Formats (Organisation und Teams).
drop function public.list_program_events(uuid);
create function public.list_program_events(p_org_id uuid)
returns table (event_id uuid, title text, kind text, starts_at timestamptz, location text, notes text, todos text, format_id uuid, format_label text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos, e.format_id, f.label
  from public.team_program_events e
  left join public.program_event_formats f on f.id = e.format_id
  where e.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by e.starts_at;
$$;
revoke all on function public.list_program_events(uuid) from public, anon;
grant execute on function public.list_program_events(uuid) to authenticated;

drop function public.get_my_program_events();
create function public.get_my_program_events()
returns table (program_id uuid, org_name text, event_id uuid, title text, kind text, starts_at timestamptz,
               location text, notes text, todos text, my_status text, format_label text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, o.name, e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos, a.status, f.label
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  join public.team_program_events e on e.org_id = p.org_id
  left join public.program_event_formats f on f.id = e.format_id
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.id
  where auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and public.org_feature_enabled(p.org_id, 'plan')
    and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
  order by e.starts_at;
$$;
revoke all on function public.get_my_program_events() from public, anon;
grant execute on function public.get_my_program_events() to authenticated;

-- Eine Vorlage aufraeumen: hoechstens 20 Schritte; Tage -60 bis 60, ein bekannter Kanal, Bezeichnung bis 60
-- Zeichen, Uhrzeit HH:MM oder keine. Alles andere faellt weg.
create or replace function public.clean_post_template_steps(p_steps jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('days', s.days, 'channel', s.channel, 'label', s.label, 'time', s.time) order by s.ord), '[]'::jsonb)
  from (
    select
      (entry->>'days')::integer as days,
      entry->>'channel' as channel,
      nullif(left(btrim(coalesce(entry->>'label', '')), 60), '') as label,
      case when coalesce(entry->>'time', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then entry->>'time' end as time,
      ord
    from jsonb_array_elements(case when jsonb_typeof(p_steps) = 'array' then p_steps else '[]'::jsonb end) with ordinality as rows(entry, ord)
    where jsonb_typeof(entry) = 'object'
      and coalesce(entry->>'days', '') ~ '^-?[0-9]{1,2}$'
      and (entry->>'days')::integer between -60 and 60
      and entry->>'channel' in ('linkedin', 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'newsletter', 'website', 'other')
    order by ord
    limit 20
  ) s;
$$;
revoke all on function public.clean_post_template_steps(jsonb) from public, anon, authenticated;

create or replace function public.save_org_post_template(p_template_id uuid, p_org_id uuid, p_name text, p_steps jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := p_org_id;
  v_steps jsonb := public.clean_post_template_steps(p_steps);
  v_id uuid;
begin
  if p_template_id is not null then
    select t.org_id into v_org from public.advisor_org_post_templates t where t.id = p_template_id;
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_post_template_not_yours' using errcode = '42501';
  end if;
  if jsonb_array_length(v_steps) = 0 or char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'org_post_template_invalid' using errcode = '22023';
  end if;
  if p_template_id is null then
    if (select count(*) from public.advisor_org_post_templates t where t.org_id = v_org) >= 30 then
      raise exception 'org_post_template_too_many' using errcode = '22023';
    end if;
    insert into public.advisor_org_post_templates (org_id, name, steps, created_by_user_id)
    values (v_org, btrim(p_name), v_steps, auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_post_templates t
    set name = btrim(p_name), steps = v_steps, updated_at = pg_catalog.now()
    where t.id = p_template_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_org_post_template(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.save_org_post_template(uuid, uuid, text, jsonb) to authenticated;

create or replace function public.delete_org_post_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_work_in_org((select t.org_id from public.advisor_org_post_templates t where t.id = p_template_id)) then
    raise exception 'org_post_template_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_post_templates where id = p_template_id;
end;
$$;
revoke all on function public.delete_org_post_template(uuid) from public, anon;
grant execute on function public.delete_org_post_template(uuid) to authenticated;

-- Event-Kalender: Vorschlag mit Organisation (Mitglied) oder ohne (Gruendende). Alles andere wie bisher.
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
  if p_org_id is not null then
    if not public.can_work_in_org(p_org_id) then
      raise exception 'ecosystem_event_not_allowed' using errcode = '42501';
    end if;
  elsif auth.uid() is null or not exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and 'founder' = any (p.roles)
  ) then
    raise exception 'ecosystem_event_not_allowed' using errcode = '42501';
  end if;
  if p_starts_at is null or p_starts_at < pg_catalog.now() - interval '1 day' or p_starts_at > pg_catalog.now() + interval '18 months' then
    raise exception 'ecosystem_event_invalid' using errcode = '22023';
  end if;
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

commit;
