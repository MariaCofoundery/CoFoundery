-- Termine im Programmplan: klarere Angaben statt "Art" (Entwurf vom 05.11.2026, von Maria freigegeben).
--
-- Vorher fasste "Art" (Education / intern / extern) drei Fragen zusammen - und "intern" hielt nicht, was es
-- versprach: Die Teams im Programm sahen interne Termine trotzdem (get_my_program_events filterte nicht).
--
-- Jetzt:
--   - FUER WEN (audience): alle Teams im Programm, ausgewaehlte Teams, oder nur unser Team. "Nur unser Team"
--     sehen die Teams nicht - weder im Plan noch bei Zusagen, Anwesenheit oder in der Auswertung je Team.
--     Jede Funktion, ueber die ein Team einen Termin sieht oder zusagt, prueft das (program_event_reaches).
--   - ENDE, WO (vor Ort / online / hybrid), PFLICHT oder freiwillig, VERANSTALTET VON (wir / Partner), eine NOTIZ
--     NUR FUERS TEAM der Organisation (nie an Teams).
--   - OEFFENTLICH: Auf Wunsch geht der Termin als Vorschlag in den Event-Kalender (nur Fakten und ein https-Link,
--     sichtbar erst nach Freigabe durch die Plattform-Admins - wie jeder Vorschlag).
--   - "kind" bleibt als abgeleiteter Wert stehen (Auswertung, Foerderauflagen, Code beim Ausrollen):
--     nur unser Team -> internal, Partner -> external, sonst education.
--   - FOERDERAUFLAGEN koennen zusaetzlich nach Format zaehlen ("6 Masterclasses").
--   - EINRICHTEN ("Los geht's"): je Person und Organisation, welche Schritte uebersprungen sind und ob die
--     Liste ausgeblendet ist. Erledigt ergibt sich aus den Daten, nicht aus einem Haken.

begin;

alter table public.team_program_events
  add column ends_at timestamptz,
  add column venue text not null default 'onsite',
  add column audience text not null default 'all',
  add column mandatory boolean not null default false,
  add column host text not null default 'us',
  add column internal_note text,
  add column public_url text,
  add column public_event_id uuid references public.ecosystem_events (id) on delete set null,
  add constraint team_program_events_venue check (venue in ('onsite', 'online', 'hybrid')),
  add constraint team_program_events_audience check (audience in ('all', 'selected', 'internal')),
  add constraint team_program_events_host check (host in ('us', 'partner')),
  add constraint team_program_events_internal_note check (internal_note is null or char_length(internal_note) <= 2000),
  add constraint team_program_events_public_url check (public_url is null or (public_url ~ '^https://[^\s]+$' and char_length(public_url) <= 500)),
  add constraint team_program_events_ends check (ends_at is null or ends_at >= starts_at);

-- Bestehende Termine: "intern" heisst jetzt wirklich intern; "extern" war ein Partner-Termin.
update public.team_program_events set audience = 'internal' where kind = 'internal';
update public.team_program_events set host = 'partner' where kind = 'external';
update public.team_program_events set venue = 'online' where location ilike 'online%';

create table public.team_program_event_audience (
  event_id uuid not null references public.team_program_events (id) on delete cascade,
  program_id uuid not null references public.team_programs (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  primary key (event_id, program_id)
);
create index team_program_event_audience_program_idx on public.team_program_event_audience (program_id);
alter table public.team_program_event_audience enable row level security;
revoke all on public.team_program_event_audience from anon, authenticated;
grant select on public.team_program_event_audience to authenticated;
create policy team_program_event_audience_members_read on public.team_program_event_audience
  for select to authenticated using (public.is_advisor_org_member(org_id));

-- Erreicht dieser Termin dieses Team?
create or replace function public.program_event_reaches(p_event_id uuid, p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_program_events e
    where e.id = p_event_id
      and (e.audience = 'all'
           or (e.audience = 'selected' and exists (
             select 1 from public.team_program_event_audience a where a.event_id = e.id and a.program_id = p_program_id)))
  );
$$;
revoke all on function public.program_event_reaches(uuid, uuid) from public, anon, authenticated;

-- Speichern mit allen Angaben. Aufrufe ohne die neuen Angaben (Code beim Ausrollen) leiten sie aus "kind" ab.
drop function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text, uuid);
create function public.save_program_event(
  p_org_id uuid, p_event_id uuid, p_title text, p_kind text, p_starts_at timestamptz,
  p_location text, p_notes text, p_todos text, p_format_id uuid default null,
  p_ends_at timestamptz default null,
  p_venue text default null,
  p_audience text default null,
  p_program_ids uuid[] default null,
  p_mandatory boolean default null,
  p_host text default null,
  p_internal_note text default null,
  p_make_public boolean default null,
  p_public_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text, uuid, timestamptz, text, text, uuid[], boolean, text, text, boolean, text) from public, anon;
grant execute on function public.save_program_event(uuid, uuid, text, text, timestamptz, text, text, text, uuid, timestamptz, text, text, uuid[], boolean, text, text, boolean, text) to authenticated;

-- Fuer die Organisation: alles, auch die interne Notiz und welche Teams.
drop function public.list_program_events(uuid);
create function public.list_program_events(p_org_id uuid)
returns table (
  event_id uuid, title text, kind text, starts_at timestamptz, location text, notes text, todos text,
  format_id uuid, format_label text, ends_at timestamptz, venue text, audience text, program_ids uuid[],
  mandatory boolean, host text, internal_note text, public_url text, public_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.kind, e.starts_at, e.location, e.notes, e.todos, e.format_id, f.label,
    e.ends_at, e.venue, e.audience,
    coalesce((select array_agg(a.program_id) from public.team_program_event_audience a where a.event_id = e.id), '{}'),
    e.mandatory, e.host, e.internal_note, e.public_url,
    (select x.status from public.ecosystem_events x where x.id = e.public_event_id)
  from public.team_program_events e
  left join public.program_event_formats f on f.id = e.format_id
  where e.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by e.starts_at;
$$;
revoke all on function public.list_program_events(uuid) from public, anon;
grant execute on function public.list_program_events(uuid) to authenticated;

-- Fuer die Teams: nur Termine, die sie erreichen - ohne interne Notiz.
drop function public.get_my_program_events();
create function public.get_my_program_events()
returns table (program_id uuid, org_name text, event_id uuid, title text, kind text, starts_at timestamptz,
               location text, notes text, todos text, my_status text, format_label text,
               ends_at timestamptz, venue text, mandatory boolean, host text)
language sql
stable
security definer
set search_path = ''
as $$
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
    and public.program_event_reaches(e.id, p.id)
    and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
  order by e.starts_at;
$$;
revoke all on function public.get_my_program_events() from public, anon;
grant execute on function public.get_my_program_events() to authenticated;

-- Zusagen: nur zu Terminen, die das Team erreichen.
create or replace function public.set_program_event_rsvp(
  p_event_id uuid, p_program_id uuid, p_response text, p_whole_team boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_starts timestamptz;
begin
  select p.team_id, e.starts_at into v_team, v_starts
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
$$;

create or replace function public.get_my_program_event_rsvps()
returns table (program_id uuid, event_id uuid, user_id uuid, display_name text, response text, by_self boolean, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
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
    and public.program_event_reaches(e.id, p.id)
    and exists (select 1 from public.founder_team_members me where me.team_id = p.team_id and me.user_id = auth.uid())
  order by e.starts_at, p.id, core.display_name nulls last, m.user_id;
$$;

-- Organisation: Anwesenheit und Zusagen nur fuer Teams, die der Termin erreicht.
create or replace function public.get_event_attendance(p_event_id uuid)
returns table (program_id uuid, team_name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, t.name, a.status
  from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.status = 'active' and public.team_program_is_active(p.id)
  join public.founder_teams t on t.id = p.team_id
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.id
  where e.id = p_event_id
    and auth.uid() is not null
    and public.program_event_reaches(e.id, p.id)
    and (
      public.is_advisor_org_owner_of(e.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by t.name nulls last, p.created_at;
$$;

create or replace function public.get_event_rsvps(p_event_id uuid)
returns table (program_id uuid, user_id uuid, display_name text, response text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, m.user_id, core.display_name, v.response
  from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.status = 'active' and public.team_program_is_active(p.id)
  join public.founder_team_members m on m.team_id = p.team_id
  left join public.person_core core on core.user_id = m.user_id
  left join public.team_program_event_rsvps v
    on v.event_id = e.id and v.program_id = p.id and v.user_id = m.user_id
  where e.id = p_event_id
    and auth.uid() is not null
    and public.program_event_reaches(e.id, p.id)
    and (
      public.is_advisor_org_owner_of(e.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by p.id, core.display_name nulls last, m.user_id;
$$;

create or replace function public.set_program_attendance(p_event_id uuid, p_program_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select e.org_id into v_org from public.team_program_events e
  join public.team_programs p on p.org_id = e.org_id and p.id = p_program_id
  where e.id = p_event_id;
  if v_org is null or auth.uid() is null or not (
    public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid())
  ) or not public.program_event_reaches(p_event_id, p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
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
$$;

create or replace function public.get_org_report_attendance(p_org_id uuid, p_from date, p_to date)
returns table (
  event_id uuid, title text, kind text, starts_at timestamptz,
  program_id uuid, team_name text, members integer,
  attendance text, rsvp_yes integer, rsvp_no integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.title, e.kind, e.starts_at,
    p.program_id, p.team_name, p.members,
    a.status,
    (select count(*)::integer from public.team_program_event_rsvps v
       join public.founder_team_members m on m.user_id = v.user_id and m.team_id = p.team_id
       where v.event_id = e.id and v.program_id = p.program_id and v.response = 'yes'),
    (select count(*)::integer from public.team_program_event_rsvps v
       join public.founder_team_members m on m.user_id = v.user_id and m.team_id = p.team_id
       where v.event_id = e.id and v.program_id = p.program_id and v.response = 'no')
  from public.team_program_events e
  join public.program_report_programs(p_org_id) p
    on (e.starts_at at time zone 'Europe/Berlin')::date >= p.active_since
  left join public.team_program_attendance a on a.event_id = e.id and a.program_id = p.program_id
  where e.org_id = p_org_id
    and public.program_event_reaches(e.id, p.program_id)
    and (p_from is null or (e.starts_at at time zone 'Europe/Berlin')::date >= p_from)
    and (p_to is null or (e.starts_at at time zone 'Europe/Berlin')::date <= p_to)
  order by e.starts_at, e.id, p.team_name nulls last, p.program_id;
$$;

-- Foerderauflagen: auch nach Format zaehlen.
alter table public.advisor_org_requirements
  add column format_id uuid references public.program_event_formats (id) on delete set null,
  add constraint advisor_org_requirements_format check (format_id is null or measure in ('events', 'event_attendance'));

drop function public.save_org_requirement(uuid, uuid, text, text, text, text, numeric, text, date, text);
create function public.save_org_requirement(
  p_requirement_id uuid, p_grant_id uuid, p_title text, p_kind text, p_measure text, p_event_kind text,
  p_target numeric, p_unit text, p_due_on date, p_notes text, p_format_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant uuid := p_grant_id;
  v_org uuid;
  v_id uuid;
begin
  if p_requirement_id is not null then
    select r.grant_id into v_grant from public.advisor_org_requirements r where r.id = p_requirement_id;
  end if;
  select g.org_id into v_org from public.advisor_org_grants g where g.id = v_grant;
  if v_org is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_format_id is not null and not exists (select 1 from public.program_event_formats f where f.id = p_format_id and f.org_id = v_org) then
    raise exception 'org_funding_invalid' using errcode = '22023';
  end if;
  if p_requirement_id is null then
    insert into public.advisor_org_requirements (grant_id, org_id, title, kind, measure, event_kind, format_id, target, unit, due_on, notes, sort_order, created_by_user_id)
    values (v_grant, v_org, btrim(coalesce(p_title, '')), p_kind, coalesce(p_measure, 'manual'), nullif(p_event_kind, ''), p_format_id,
            case when p_kind = 'once' then null else p_target end, nullif(btrim(coalesce(p_unit, '')), ''), p_due_on,
            nullif(btrim(coalesce(p_notes, '')), ''),
            coalesce((select max(r.sort_order) + 1 from public.advisor_org_requirements r where r.grant_id = v_grant), 0),
            auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_requirements
    set title = btrim(coalesce(p_title, '')), kind = p_kind, measure = coalesce(p_measure, 'manual'), event_kind = nullif(p_event_kind, ''),
        format_id = p_format_id,
        target = case when p_kind = 'once' then null else p_target end, unit = nullif(btrim(coalesce(p_unit, '')), ''),
        due_on = p_due_on, notes = nullif(btrim(coalesce(p_notes, '')), ''), updated_at = pg_catalog.now()
    where id = p_requirement_id
    returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'org_funding_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_requirement(uuid, uuid, text, text, text, text, numeric, text, date, text, uuid) from public, anon;
grant execute on function public.save_org_requirement(uuid, uuid, text, text, text, text, numeric, text, date, text, uuid) to authenticated;

create or replace function public.get_org_funding_progress(p_grant_id uuid)
returns table (requirement_id uuid, program_id uuid, team_name text, auto_value numeric, manual_value numeric, tasks_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  with g as (
    select g.* from public.advisor_org_grants g
    where g.id = p_grant_id and public.is_advisor_org_member(g.org_id)
  ),
  period as (
    select g.org_id, g.starts_on, least(g.ends_on, (pg_catalog.now() at time zone 'Europe/Berlin')::date) as until_on from g
  ),
  visible as (
    select p.* from period, public.program_report_programs(period.org_id) p
  )
  select r.id, null::uuid, null::text,
    case r.measure
      when 'events' then (
        select count(*)::numeric from public.team_program_events e, period
        where e.org_id = r.org_id
          and (e.starts_at at time zone 'Europe/Berlin')::date between period.starts_on and period.until_on
          and (r.event_kind is null or e.kind = r.event_kind)
          and (r.format_id is null or e.format_id = r.format_id))
      when 'teams' then (select count(*)::numeric from visible)
      else 0::numeric
    end,
    coalesce((select sum(en.amount) from public.advisor_org_requirement_entries en where en.requirement_id = r.id and en.program_id is null), 0),
    (select count(*)::integer from public.advisor_org_tasks t where t.requirement_id = r.id and t.status = 'done')
  from public.advisor_org_requirements r
  join g on g.id = r.grant_id
  where r.kind <> 'per_team'
  union all
  select r.id, v.program_id, v.team_name,
    case r.measure
      when 'event_attendance' then (
        select count(*)::numeric from public.team_program_attendance a
        join public.team_program_events e on e.id = a.event_id, period
        where a.program_id = v.program_id and a.status = 'present'
          and (e.starts_at at time zone 'Europe/Berlin')::date between period.starts_on and period.until_on
          and (r.event_kind is null or e.kind = r.event_kind)
          and (r.format_id is null or e.format_id = r.format_id))
      when 'check_ins' then (
        select count(*)::numeric from public.program_check_ins c, period
        where c.program_id = v.program_id and c.held_on between period.starts_on and period.until_on)
      else 0::numeric
    end,
    coalesce((select sum(en.amount) from public.advisor_org_requirement_entries en where en.requirement_id = r.id and en.program_id = v.program_id), 0),
    0
  from public.advisor_org_requirements r
  join g on g.id = r.grant_id
  cross join visible v
  where r.kind = 'per_team';
$$;

-- Einrichten ("Los geht's"): uebersprungene Schritte und ausgeblendet - je Person und Organisation.
create table public.advisor_setup_state (
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  skipped text[] not null default '{}',
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint advisor_setup_state_skipped check (cardinality(skipped) <= 20)
);
alter table public.advisor_setup_state enable row level security;
revoke all on public.advisor_setup_state from anon, authenticated;
grant select on public.advisor_setup_state to authenticated;
create policy advisor_setup_state_own on public.advisor_setup_state
  for select to authenticated using (user_id = auth.uid());

create or replace function public.set_advisor_setup_state(p_org_id uuid, p_skip text, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_advisor_org_member(p_org_id) then
    raise exception 'advisor_org_member_required' using errcode = '42501';
  end if;
  if p_skip is not null and p_skip !~ '^[a-z]{2,20}$' then
    raise exception 'advisor_setup_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_setup_state (org_id, user_id, skipped, hidden)
  values (p_org_id, auth.uid(), case when p_skip is null then '{}' else array[p_skip] end, coalesce(p_hidden, false))
  on conflict (org_id, user_id) do update
  set skipped = case
        when p_skip is null then public.advisor_setup_state.skipped
        when p_skip = any (public.advisor_setup_state.skipped) then public.advisor_setup_state.skipped
        else public.advisor_setup_state.skipped || p_skip
      end,
      hidden = coalesce(p_hidden, public.advisor_setup_state.hidden),
      updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.set_advisor_setup_state(uuid, text, boolean) from public, anon;
grant execute on function public.set_advisor_setup_state(uuid, text, boolean) to authenticated;

commit;
