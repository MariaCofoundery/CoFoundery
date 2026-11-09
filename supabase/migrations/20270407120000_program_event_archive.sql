-- Termine archivieren statt loeschen.
--
-- Wunsch von Maria (09.11.2026): Ein Termin einfach zu loeschen, ohne Absicherung, ist schlecht - die Organisation muss
-- auf solche Termine zugreifen koennen, vor allem fuer die Auswertungen.
--
-- Bisher loeschte "Loeschen" den Termin samt Teilnahme, Zusagen und Referenten (on delete cascade). Jetzt:
--   - "Archivieren" nimmt den Termin aus dem Plan: weg aus Kalender, Planliste und bei den Teams, ein oeffentlicher
--     Vorschlag im Event-Kalender wird zurueckgenommen. Alles andere bleibt, wie es war.
--   - Die Auswertungen (Teilnahme, Zusagen, Foerderauflagen) zaehlen archivierte Termine WEITER mit - dort braucht die
--     Organisation sie.
--   - Archivierte Termine sind eingefroren (nicht bearbeiten, keine neue Teilnahme/Zusage) und lassen sich
--     wiederherstellen. Nur die Inhaberin archiviert und stellt wieder her.
--   - Einen Termin endgueltig zu loeschen gibt es nicht mehr: `delete_program_event` entfaellt.

begin;

alter table public.team_program_events add column archived_at timestamptz;
create index team_program_events_active_idx on public.team_program_events (org_id, starts_at) where archived_at is null;

comment on column public.team_program_events.archived_at is
  'Aus dem Plan genommen. Teilnahme und Zusagen bleiben; die Auswertungen zaehlen den Termin weiter.';

create or replace function public.archive_program_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_public uuid;
begin
  select e.org_id, e.public_event_id into v_org, v_public from public.team_program_events e where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_events set archived_at = coalesce(archived_at, pg_catalog.now()) where id = p_event_id;
  -- Ein oeffentlicher Vorschlag wird zurueckgenommen (er haengt am Termin im Plan).
  if v_public is not null then
    delete from public.ecosystem_events where id = v_public;
  end if;
end;
$$;

create or replace function public.restore_program_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select e.org_id into v_org from public.team_program_events e where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.team_program_events set archived_at = null where id = p_event_id;
end;
$$;

revoke all on function public.archive_program_event(uuid), public.restore_program_event(uuid) from public, anon;
grant execute on function public.archive_program_event(uuid), public.restore_program_event(uuid) to authenticated;

drop function public.delete_program_event(uuid);

-- Fuer die Teams: archivierte Termine sind nicht zu sehen und nicht zu beantworten.
CREATE OR REPLACE FUNCTION public.get_my_program_events()
 RETURNS TABLE(program_id uuid, org_name text, event_id uuid, title text, kind text, starts_at timestamp with time zone, location text, notes text, todos text, my_status text, format_label text, ends_at timestamp with time zone, venue text, mandatory boolean, host text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.id, o.name, e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos, a.status, f.label,
    e.ends_at, e.venue, e.mandatory, e.host
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  join public.team_program_events e on e.org_id = p.org_id
  left join public.program_event_formats f on f.id = e.format_id
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.id
  where auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and public.org_feature_enabled(p.org_id, 'plan')
    and e.archived_at is null
    and public.program_event_reaches(e.id, p.id)
    and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
  order by e.starts_at;
$function$;
CREATE OR REPLACE FUNCTION public.get_my_program_event_rsvps()
 RETURNS TABLE(program_id uuid, event_id uuid, user_id uuid, display_name text, response text, by_self boolean, is_me boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p.id, e.id, m.user_id, core.display_name, v.response,
    (v.set_by_user_id = v.user_id), (m.user_id = auth.uid())
  from public.team_programs p
  join public.team_program_events e on e.org_id = p.org_id
  join public.founder_team_members m on m.team_id = p.team_id
  left join public.person_core core on core.user_id = m.user_id
  left join public.team_program_event_rsvps v
    on v.event_id = e.id and v.program_id = p.id and v.user_id = m.user_id
  where auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and public.org_feature_enabled(p.org_id, 'plan')
    and e.archived_at is null
    and public.program_event_reaches(e.id, p.id)
    and exists (select 1 from public.founder_team_members me where me.team_id = p.team_id and me.user_id = auth.uid())
  order by e.starts_at, p.id, core.display_name nulls last, m.user_id;
$function$;
CREATE OR REPLACE FUNCTION public.set_program_event_rsvp(p_event_id uuid, p_program_id uuid, p_response text, p_whole_team boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_team uuid;
  v_starts timestamptz;
  v_archived timestamptz;
begin
  select p.team_id, e.starts_at, e.archived_at into v_team, v_starts, v_archived
  from public.team_programs p
  join public.team_program_events e on e.org_id = p.org_id and e.id = p_event_id
  where p.id = p_program_id;
  if v_team is null or auth.uid() is null or not exists (
    select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid()
  ) or not public.program_event_reaches(p_event_id, p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if not public.team_program_is_active(p_program_id)
     or not public.org_feature_enabled((select org_id from public.team_programs where id = p_program_id), 'plan') then
    raise exception 'team_program_not_active' using errcode = '55000';
  end if;
  if v_archived is not null then
    raise exception 'program_event_archived' using errcode = '55000';
  end if;
  if v_starts <= pg_catalog.now() then
    raise exception 'program_event_started' using errcode = '55000';
  end if;

  if p_response is null or p_response = '' then
    delete from public.team_program_event_rsvps
    where event_id = p_event_id and program_id = p_program_id and user_id = auth.uid();
    return;
  end if;
  if p_response not in ('yes', 'no') then
    raise exception 'program_event_rsvp_invalid' using errcode = '22023';
  end if;

  if coalesce(p_whole_team, false) then
    insert into public.team_program_event_rsvps (event_id, program_id, user_id, response, set_by_user_id)
    select p_event_id, p_program_id, m.user_id, p_response, auth.uid()
    from public.founder_team_members m
    where m.team_id = v_team
    on conflict (event_id, program_id, user_id) do update
    set response = excluded.response, set_by_user_id = excluded.set_by_user_id, set_at = pg_catalog.now()
    where public.team_program_event_rsvps.user_id = auth.uid()
       or public.team_program_event_rsvps.set_by_user_id is distinct from public.team_program_event_rsvps.user_id;
  else
    insert into public.team_program_event_rsvps (event_id, program_id, user_id, response, set_by_user_id)
    values (p_event_id, p_program_id, auth.uid(), p_response, auth.uid())
    on conflict (event_id, program_id, user_id) do update
    set response = excluded.response, set_by_user_id = excluded.set_by_user_id, set_at = pg_catalog.now();
  end if;
end;
$function$;
-- Teilnahme eintragen: nicht bei archivierten Terminen.
CREATE OR REPLACE FUNCTION public.set_program_attendance(p_event_id uuid, p_program_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_org uuid;
  v_archived timestamptz;
begin
  select e.org_id, e.archived_at into v_org, v_archived from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.id = p_program_id
  where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not (
    public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid())
  ) or not public.program_event_reaches(p_event_id, p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  -- Ein archivierter Termin ist eingefroren (die Teilnahme bleibt fuer die Auswertung, wie sie war).
  if v_archived is not null then
    raise exception 'program_event_archived' using errcode = '55000';
  end if;
  if not public.team_program_is_active(p_program_id) then
    raise exception 'team_program_not_active' using errcode = '55000';
  end if;
  if p_status is null or p_status = '' then
    delete from public.team_program_attendance where event_id = p_event_id and program_id = p_program_id;
  else
    insert into public.team_program_attendance (event_id, program_id, status, set_by_user_id)
    values (p_event_id, p_program_id, p_status, auth.uid())
    on conflict (event_id, program_id) do update
    set status = excluded.status, set_by_user_id = excluded.set_by_user_id, set_at = pg_catalog.now();
  end if;
end;
$function$;
-- Bearbeiten: nicht bei archivierten Terminen.
CREATE OR REPLACE FUNCTION public.save_program_event(p_org_id uuid, p_event_id uuid, p_title text, p_kind text, p_starts_at timestamp with time zone, p_location text, p_notes text, p_todos text, p_format_id uuid DEFAULT NULL::uuid, p_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_venue text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_program_ids uuid[] DEFAULT NULL::uuid[], p_mandatory boolean DEFAULT NULL::boolean, p_host text DEFAULT NULL::text, p_internal_note text DEFAULT NULL::text, p_make_public boolean DEFAULT NULL::boolean, p_public_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_old public.team_program_events%rowtype;
  v_audience text;
  v_host text;
  v_venue text;
  v_kind text;
  v_public uuid;
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_format_id is not null and not exists (select 1 from public.program_event_formats f where f.id = p_format_id and f.org_id = p_org_id) then
    raise exception 'program_event_format_invalid' using errcode = '22023';
  end if;
  if p_event_id is not null then
    select * into v_old from public.team_program_events e where e.id = p_event_id and e.org_id = p_org_id;
    if v_old.id is null then
      raise exception 'program_event_not_found' using errcode = 'P0002';
    end if;
    -- Ein archivierter Termin wird nicht mehr bearbeitet; erst wiederherstellen.
    if v_old.archived_at is not null then
      raise exception 'program_event_archived' using errcode = '55000';
    end if;
  end if;

  v_audience := coalesce(p_audience, case when p_kind = 'internal' then 'internal' else coalesce(v_old.audience, 'all') end);
  v_host := coalesce(p_host, case when p_kind = 'external' then 'partner' else coalesce(v_old.host, 'us') end);
  v_venue := coalesce(p_venue, v_old.venue, 'onsite');
  v_kind := case when v_audience = 'internal' then 'internal' when v_host = 'partner' then 'external' else 'education' end;
  if v_audience = 'selected' and (
    coalesce(cardinality(p_program_ids), 0) = 0
    or exists (select 1 from unnest(p_program_ids) as ids(id) where not exists (select 1 from public.team_programs tp where tp.id = ids.id and tp.org_id = p_org_id))
  ) then
    raise exception 'program_event_audience_invalid' using errcode = '22023';
  end if;

  if p_event_id is null then
    insert into public.team_program_events (
      org_id, title, kind, starts_at, ends_at, location, notes, todos, created_by_user_id, format_id,
      venue, audience, mandatory, host, internal_note, public_url
    ) values (
      p_org_id, btrim(p_title), v_kind, p_starts_at, p_ends_at, nullif(btrim(coalesce(p_location, '')), ''),
      nullif(btrim(coalesce(p_notes, '')), ''), nullif(btrim(coalesce(p_todos, '')), ''), auth.uid(), p_format_id,
      v_venue, v_audience, coalesce(p_mandatory, false), v_host, nullif(btrim(coalesce(p_internal_note, '')), ''),
      nullif(btrim(coalesce(p_public_url, '')), '')
    )
    returning id into v_id;
  else
    update public.team_program_events
    set title = btrim(p_title), kind = v_kind, starts_at = p_starts_at,
        ends_at = case when p_audience is null and p_ends_at is null then v_old.ends_at else p_ends_at end,
        location = nullif(btrim(coalesce(p_location, '')), ''),
        notes = nullif(btrim(coalesce(p_notes, '')), ''),
        todos = nullif(btrim(coalesce(p_todos, '')), ''),
        format_id = p_format_id,
        venue = v_venue, audience = v_audience,
        mandatory = coalesce(p_mandatory, v_old.mandatory),
        host = v_host,
        internal_note = case when p_audience is null and p_internal_note is null then v_old.internal_note else nullif(btrim(coalesce(p_internal_note, '')), '') end,
        public_url = case when p_audience is null and p_public_url is null then v_old.public_url else nullif(btrim(coalesce(p_public_url, '')), '') end
    where id = p_event_id
    returning id into v_id;
  end if;

  delete from public.team_program_event_audience where event_id = v_id;
  if v_audience = 'selected' then
    insert into public.team_program_event_audience (event_id, program_id, org_id)
    select distinct v_id, ids.id, p_org_id from unnest(p_program_ids) as ids(id);
  end if;

  -- Oeffentlich: einmal als Vorschlag in den Event-Kalender; abgewaehlt nimmt den Vorschlag zurueck.
  if p_make_public is not null then
    select e.public_event_id into v_public from public.team_program_events e where e.id = v_id;
    if p_make_public and v_audience <> 'internal' and v_public is null then
      if coalesce(p_public_url, '') !~ '^https://[^\s]+$' then
        raise exception 'program_event_public_url_required' using errcode = '22023';
      end if;
      v_public := public.submit_ecosystem_event(
        p_org_id, btrim(p_title), p_starts_at, p_ends_at, false, nullif(btrim(coalesce(p_location, '')), ''), null,
        v_venue = 'online', (select left(o.name, 120) from public.advisor_orgs o where o.id = p_org_id), btrim(p_public_url), true
      );
      update public.team_program_events set public_event_id = v_public where id = v_id;
    elsif (not p_make_public or v_audience = 'internal') and v_public is not null then
      delete from public.ecosystem_events where id = v_public;
    end if;
  end if;
  return v_id;
end;
$function$;

-- Fuer die Organisation: alles, auch archivierte (mit Zeitpunkt).
drop function public.list_program_events(uuid);
CREATE FUNCTION public.list_program_events(p_org_id uuid)
 RETURNS TABLE(event_id uuid, title text, kind text, starts_at timestamp with time zone, location text, notes text, todos text, format_id uuid, format_label text, ends_at timestamp with time zone, venue text, audience text, program_ids uuid[], mandatory boolean, host text, internal_note text, public_url text, public_status text, archived_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos, e.format_id, f.label,
    e.ends_at, e.venue, e.audience,
    coalesce((select array_agg(a.program_id) from public.team_program_event_audience a where a.event_id = e.id), '{}'),
    e.mandatory, e.host, e.internal_note, e.public_url,
    (select x.status from public.ecosystem_events x where x.id = e.public_event_id),
    e.archived_at
  from public.team_program_events e
  left join public.program_event_formats f on f.id = e.format_id
  where e.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by e.starts_at;
$function$;
revoke all on function public.list_program_events(uuid) from public, anon;
grant execute on function public.list_program_events(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
