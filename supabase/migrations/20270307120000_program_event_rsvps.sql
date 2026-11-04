-- Programm-Veranstaltungen: Zusagen der Teams ("ich komme / ich kann nicht").
--
-- Wunsch von Maria (Feedback 04.11.2026): Die Teams sollen Veranstaltungen
-- bestaetigen - je Person, aber bequem auch fuer das ganze Team auf einmal.
-- Die Anwesenheit (da / fehlte / entschuldigt) bleibt, wie sie ist: je Team,
-- eingetragen von Inhaber oder Bezugsperson (20270208120000).
--
-- Regeln:
--   - Eine Zusage gehoert einer Person (user_id), an Veranstaltung und Programm.
--   - Antworten kann nur, wer im Team ist, bei aktivem Programm mit
--     eingeschaltetem Plan - und nur vor Beginn der Veranstaltung.
--   - "Fuer das ganze Team" traegt die Antwort fuer alle ein, die noch NICHT
--     selbst geantwortet haben. Wer selbst "ich kann nicht" gesagt hat, wird
--     nicht ueberschrieben. Eine fuer einen eingetragene Antwort aendert man
--     jederzeit selbst.
--   - Sichtbar fuer das eigene Team und fuer die, die die Anwesenheit sehen
--     (Inhaber, Bezugspersonen dieses Teams). Gezeigt werden nur aktuelle
--     Mitglieder.
--   - Geloescht mit dem Ende des Programms, beim Verlassen des Teams und mit
--     dem Konto. Im Kontoexport ueber export_my_restricted_data.

begin;

create table public.team_program_event_rsvps (
  event_id uuid not null references public.team_program_events (id) on delete cascade,
  program_id uuid not null references public.team_programs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  response text not null,
  set_by_user_id uuid references auth.users (id) on delete set null,
  set_at timestamptz not null default now(),
  primary key (event_id, program_id, user_id),
  constraint team_program_event_rsvps_response check (response in ('yes', 'no'))
);
create index team_program_event_rsvps_program_idx on public.team_program_event_rsvps (program_id);
create index team_program_event_rsvps_user_idx on public.team_program_event_rsvps (user_id);

alter table public.team_program_event_rsvps enable row level security;
revoke all on public.team_program_event_rsvps from anon, authenticated;

-- Antworten: selbst, oder fuer alle im Team, die noch nicht selbst geantwortet haben.
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
  ) then
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
    -- Zuruecknehmen geht nur fuer sich selbst.
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
    -- Eine eigene Antwort einer anderen Person bleibt stehen.
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
revoke all on function public.set_program_event_rsvp(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.set_program_event_rsvp(uuid, uuid, text, boolean) to authenticated;

-- Fuer das Team: alle aktuellen Mitglieder je Veranstaltung, mit Antwort oder ohne.
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
    and exists (select 1 from public.founder_team_members me where me.team_id = p.team_id and me.user_id = auth.uid())
  order by e.starts_at, p.id, core.display_name nulls last, m.user_id;
$$;
revoke all on function public.get_my_program_event_rsvps() from public, anon;
grant execute on function public.get_my_program_event_rsvps() to authenticated;

-- Fuer die Organisation: dieselben Teams wie bei der Anwesenheit (Inhaber alle, Bezugspersonen die eigenen).
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
    and (
      public.is_advisor_org_owner_of(e.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by p.id, core.display_name nulls last, m.user_id;
$$;
revoke all on function public.get_event_rsvps(uuid) from public, anon;
grant execute on function public.get_event_rsvps(uuid) to authenticated;

-- Mit dem Ende des Programms sind auch die Zusagen weg (Stand 20270209120000 plus eine Zeile).
create or replace function public.delete_attendance_when_program_ends()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    delete from public.team_program_attendance where program_id = new.id;
    delete from public.team_program_event_rsvps where program_id = new.id;
    delete from public.advisor_private_notes where program_id = new.id;
    delete from public.advisor_follow_ups where program_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.delete_attendance_when_program_ends() from public, anon, authenticated;

-- Wer das Team verlaesst, nimmt seine Zusagen mit.
create or replace function public.delete_event_rsvps_on_team_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.team_program_event_rsvps v
  using public.team_programs p
  where p.id = v.program_id and p.team_id = old.team_id and v.user_id = old.user_id;
  return old;
end;
$$;
revoke all on function public.delete_event_rsvps_on_team_leave() from public, anon, authenticated;
create trigger delete_event_rsvps_on_team_leave
after delete on public.founder_team_members
for each row execute function public.delete_event_rsvps_on_team_leave();

-- Kontoexport: Stand 20270305120000 plus die eigenen Zusagen.
create or replace function public.export_my_restricted_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object(
    'network_messages', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at, m.id)
      from public.network_messages m where m.sender_user_id = uid), '[]'::jsonb),
    'network_blocks', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.created_at)
      from public.network_blocks b where b.blocker_user_id = uid), '[]'::jsonb),
    'workstyle_pretest_sessions', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.started_at)
      from public.workstyle_pretest_sessions s
      where s.assessment_id in (select a.id from public.assessments a where a.user_id = uid)), '[]'::jsonb),
    'workstyle_research_responses', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.answered_at, r.item_key)
      from public.workstyle_research_responses r
      where r.assessment_id in (select a.id from public.assessments a where a.user_id = uid)), '[]'::jsonb),
    'team_program_consents', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.approved_at)
      from public.team_program_consents c where c.founder_user_id = uid), '[]'::jsonb),
    'team_program_updates', coalesce((
      select jsonb_agg(to_jsonb(u) order by u.submitted_at)
      from public.team_program_updates u where u.submitted_by_user_id = uid), '[]'::jsonb),
    'team_program_milestones', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from public.team_program_milestones m where m.created_by_user_id = uid), '[]'::jsonb),
    'team_program_profiles', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.updated_at)
      from public.team_program_profiles p where p.updated_by_user_id = uid), '[]'::jsonb),
    'team_program_org_data', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.updated_at)
      from public.team_program_org_data d where d.updated_by_user_id = uid), '[]'::jsonb),
    -- Neu (20270305120000): die eigenen Stempel der Check-in-Erinnerung.
    'team_check_in_reminders', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.due_on, r.team_id)
      from public.team_check_in_reminders r where r.user_id = uid), '[]'::jsonb),
    -- Neu (20270307120000): die eigenen Zusagen zu Programm-Veranstaltungen.
    'team_program_event_rsvps', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.set_at, v.event_id)
      from public.team_program_event_rsvps v where v.user_id = uid), '[]'::jsonb)
  );
end $$;


commit;
