begin;

-- ---------------------------------------------------------------------------
-- Testprojekt: zwei Menschen arbeiten befristet an einer kleinen Aufgabe
-- ---------------------------------------------------------------------------
--
-- EBENE: Beziehung (ein konkretes Paar, relationships.id), wie Commitment Lab.
-- Es ist keine Teamfreigabe und gibt keine andere Freigabe mit. Ein Entwurf
-- bindet niemanden: gestartet wird erst, wenn BEIDE dem aktuellen Stand
-- zugestimmt haben. Jede Aenderung am Entwurf setzt beide Zustimmungen zurueck.
--
-- Nach dem Start ist der Inhalt eingefroren. Die Antworten zum Zwischenstand
-- und zum Abschluss sehen beide erst, wenn beide geantwortet haben.
--
-- Kein Score, keine Bewertung der anderen Person. Die Plattform sagt nicht, was
-- "fertig" ist - das tragen die beiden selbst ein. Kein Rechtsrat; die Rechte-
-- Fragen sind Fragen zum Besprechen.
-- ---------------------------------------------------------------------------

create table public.relationship_test_projects (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by_user_id uuid references auth.users(id) on delete set null,
  template_key text,
  title text not null default '',
  task text not null default '',
  weeks smallint not null default 2,
  roles text not null default '',
  note text not null default '',
  -- Je eine Liste aus {"t": text, "on": boolean}: Schalter, Text.
  done_items jsonb not null default '[]'::jsonb,
  rights_items jsonb not null default '[]'::jsonb,
  closing_items jsonb not null default '[]'::jsonb,
  draft_version integer not null default 1,
  status text not null default 'draft',
  started_at timestamptz,
  ends_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relationship_test_projects_status_check
    check (status in ('draft', 'active', 'closed', 'cancelled')),
  constraint relationship_test_projects_template_check
    check (template_key is null or template_key in (
      'interviews', 'landing', 'market', 'pitch', 'prototype', 'offer'
    )),
  -- Hoechstens vier Wochen: Danach wird entschieden, nicht verlaengert.
  constraint relationship_test_projects_weeks_check check (weeks between 1 and 4),
  constraint relationship_test_projects_text_check check (
    char_length(title) <= 80 and char_length(task) <= 400
    and char_length(roles) <= 300 and char_length(note) <= 600
  ),
  constraint relationship_test_projects_items_shape_check check (
    jsonb_typeof(done_items) = 'array' and jsonb_array_length(done_items) <= 20
    and jsonb_typeof(rights_items) = 'array' and jsonb_array_length(rights_items) <= 20
    and jsonb_typeof(closing_items) = 'array' and jsonb_array_length(closing_items) <= 20
    and octet_length(done_items::text) + octet_length(rights_items::text)
        + octet_length(closing_items::text) <= 30000
  )
);

-- Pro Paar hoechstens ein laufendes oder entworfenes Testprojekt.
create unique index relationship_test_projects_one_open_idx
  on public.relationship_test_projects (relationship_id)
  where status in ('draft', 'active');
create index relationship_test_projects_relationship_idx
  on public.relationship_test_projects (relationship_id, created_at desc);

create table public.relationship_test_project_agreements (
  project_id uuid not null references public.relationship_test_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_version integer not null,
  agreed_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.relationship_test_project_responses (
  project_id uuid not null references public.relationship_test_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phase text not null,
  -- Liste aus {"q": Frage, "a": Antwort}. Die Frage ist kopiert, weil sich die
  -- Liste im Projekt nicht mehr aendert, aber so bleibt die Antwort lesbar.
  answers jsonb not null default '[]'::jsonb,
  outcome text,
  submitted_at timestamptz not null default now(),
  primary key (project_id, user_id, phase),
  constraint relationship_test_project_responses_phase_check
    check (phase in ('interim', 'closing')),
  constraint relationship_test_project_responses_outcome_check
    check (outcome is null or outcome in ('continue', 'found_team', 'stop')),
  constraint relationship_test_project_responses_answers_check check (
    jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) <= 20
    and octet_length(answers::text) <= 30000
  )
);

create function public.set_relationship_test_project_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_relationship_test_projects_updated_at
before update on public.relationship_test_projects
for each row execute function public.set_relationship_test_project_updated_at();

-- Hilfen ---------------------------------------------------------------------

-- Ist die aufrufende Person Teil dieses Paares, und gehoeren beide noch zum Team?
-- Ein Paar, bei dem eine Person das Team verlassen hat, laeuft nicht weiter.
create function public.test_project_pair_active(p_relationship_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.relationships r
    where r.id = p_relationship_id
      and auth.uid() in (r.user_a_id, r.user_b_id)
      and (r.founder_team_id is null or (
        exists (select 1 from public.founder_team_members m
                where m.team_id = r.founder_team_id and m.user_id = r.user_a_id)
        and exists (select 1 from public.founder_team_members m
                    where m.team_id = r.founder_team_id and m.user_id = r.user_b_id)))
  );
$$;

-- Haben beide die Phase abgegeben? Erst dann sieht man die Antworten der anderen.
create function public.test_project_phase_complete(p_project_id uuid, p_phase text)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select count(*) = 2
  from public.relationship_test_project_responses r
  where r.project_id = p_project_id and r.phase = p_phase;
$$;

-- Liste {"t","on"} pruefen: Text hoechstens 160 Zeichen, "on" ein Wahrheitswert.
create function public.valid_test_project_items(p_items jsonb)
returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select p_items is not null
    and jsonb_typeof(p_items) = 'array'
    and jsonb_array_length(p_items) <= 20
    and not exists (
      select 1 from jsonb_array_elements(p_items) e(item)
      where jsonb_typeof(e.item) <> 'object'
        or jsonb_typeof(e.item -> 't') is distinct from 'string'
        or jsonb_typeof(e.item -> 'on') is distinct from 'boolean'
        or char_length(e.item ->> 't') > 160
    );
$$;

-- Zugriff -------------------------------------------------------------------

alter table public.relationship_test_projects enable row level security;
alter table public.relationship_test_project_agreements enable row level security;
alter table public.relationship_test_project_responses enable row level security;

revoke all on public.relationship_test_projects from public, anon, authenticated;
revoke all on public.relationship_test_project_agreements from public, anon, authenticated;
revoke all on public.relationship_test_project_responses from public, anon, authenticated;
grant select on public.relationship_test_projects to authenticated;
grant select on public.relationship_test_project_agreements to authenticated;
grant select on public.relationship_test_project_responses to authenticated;
grant all on public.relationship_test_projects to service_role;
grant all on public.relationship_test_project_agreements to service_role;
grant all on public.relationship_test_project_responses to service_role;

create policy relationship_test_projects_select_pair
on public.relationship_test_projects for select to authenticated
using (exists (
  select 1 from public.relationships r
  where r.id = relationship_test_projects.relationship_id
    and auth.uid() in (r.user_a_id, r.user_b_id)
));

create policy relationship_test_project_agreements_select_pair
on public.relationship_test_project_agreements for select to authenticated
using (exists (
  select 1 from public.relationship_test_projects p
  join public.relationships r on r.id = p.relationship_id
  where p.id = relationship_test_project_agreements.project_id
    and auth.uid() in (r.user_a_id, r.user_b_id)
));

-- Eigene Antworten immer; die der anderen Person erst, wenn beide abgegeben haben.
create policy relationship_test_project_responses_select_own_or_complete
on public.relationship_test_project_responses for select to authenticated
using (
  user_id = auth.uid()
  or (
    public.test_project_phase_complete(project_id, phase)
    and exists (
      select 1 from public.relationship_test_projects p
      join public.relationships r on r.id = p.relationship_id
      where p.id = relationship_test_project_responses.project_id
        and auth.uid() in (r.user_a_id, r.user_b_id)
    )
  )
);

-- Entwurf anlegen oder aendern ------------------------------------------------

create function public.save_test_project_draft(
  p_relationship_id uuid,
  p_project_id uuid,
  p_template_key text,
  p_title text,
  p_task text,
  p_weeks smallint,
  p_roles text,
  p_note text,
  p_done jsonb,
  p_rights jsonb,
  p_closing jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.relationship_test_projects%rowtype;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'test_project_auth_required' using errcode = '42501';
  end if;
  if not public.test_project_pair_active(p_relationship_id) then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  if p_weeks is null or p_weeks not between 1 and 4
     or char_length(coalesce(p_title, '')) > 80
     or char_length(coalesce(p_task, '')) > 400
     or char_length(coalesce(p_roles, '')) > 300
     or char_length(coalesce(p_note, '')) > 600
     or (p_template_key is not null and p_template_key not in (
       'interviews', 'landing', 'market', 'pitch', 'prototype', 'offer'))
     or not public.valid_test_project_items(p_done)
     or not public.valid_test_project_items(p_rights)
     or not public.valid_test_project_items(p_closing) then
    raise exception 'test_project_input_invalid' using errcode = '22023';
  end if;

  if p_project_id is null then
    if exists (
      select 1 from public.relationship_test_projects p
      where p.relationship_id = p_relationship_id and p.status in ('draft', 'active')
    ) then
      raise exception 'test_project_already_open' using errcode = '23505';
    end if;
    insert into public.relationship_test_projects (
      relationship_id, created_by_user_id, template_key, title, task, weeks, roles, note,
      done_items, rights_items, closing_items
    ) values (
      p_relationship_id, v_user_id, p_template_key, btrim(coalesce(p_title, '')),
      btrim(coalesce(p_task, '')), p_weeks, btrim(coalesce(p_roles, '')),
      btrim(coalesce(p_note, '')), p_done, p_rights, p_closing
    ) returning id into v_id;
    return v_id;
  end if;

  select * into v_project from public.relationship_test_projects p
  where p.id = p_project_id and p.relationship_id = p_relationship_id
  for update;
  if not found then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  -- Nach dem Start ist der Inhalt eingefroren.
  if v_project.status <> 'draft' then
    raise exception 'test_project_not_editable' using errcode = '22023';
  end if;

  update public.relationship_test_projects set
    template_key = p_template_key,
    title = btrim(coalesce(p_title, '')),
    task = btrim(coalesce(p_task, '')),
    weeks = p_weeks,
    roles = btrim(coalesce(p_roles, '')),
    note = btrim(coalesce(p_note, '')),
    done_items = p_done,
    rights_items = p_rights,
    closing_items = p_closing,
    draft_version = draft_version + 1
  where id = p_project_id;
  -- Eine Aenderung gilt fuer beide neu.
  delete from public.relationship_test_project_agreements where project_id = p_project_id;
  return p_project_id;
end;
$$;

-- Zustimmen, zuruecknehmen, abbrechen ----------------------------------------

create function public.agree_test_project(p_project_id uuid, p_version integer)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.relationship_test_projects%rowtype;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'test_project_auth_required' using errcode = '42501';
  end if;
  select * into v_project from public.relationship_test_projects p
  where p.id = p_project_id for update;
  if not found or not public.test_project_pair_active(v_project.relationship_id) then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  if v_project.status <> 'draft' then
    raise exception 'test_project_not_editable' using errcode = '22023';
  end if;
  -- Zugestimmt wird dem Stand, den man gesehen hat. Hat die andere Person
  -- inzwischen etwas geaendert, passt die Version nicht mehr.
  if p_version is distinct from v_project.draft_version then
    raise exception 'test_project_version_changed' using errcode = '40001';
  end if;
  if btrim(v_project.title) = '' or btrim(v_project.task) = ''
     or not exists (
       select 1 from jsonb_array_elements(v_project.done_items) e(item)
       where (e.item ->> 'on')::boolean and btrim(e.item ->> 't') <> ''
     ) then
    raise exception 'test_project_incomplete' using errcode = '22023';
  end if;

  insert into public.relationship_test_project_agreements (project_id, user_id, draft_version)
  values (p_project_id, v_user_id, v_project.draft_version)
  on conflict (project_id, user_id) do update
  set draft_version = excluded.draft_version, agreed_at = now();

  select count(*) into v_count
  from public.relationship_test_project_agreements a
  where a.project_id = p_project_id and a.draft_version = v_project.draft_version;
  if v_count = 2 then
    update public.relationship_test_projects set
      status = 'active',
      started_at = now(),
      ends_at = now() + make_interval(days => v_project.weeks * 7)
    where id = p_project_id;
    return 'active';
  end if;
  return 'draft';
end;
$$;

create function public.withdraw_test_project_agreement(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.relationship_test_projects%rowtype;
begin
  if v_user_id is null then
    raise exception 'test_project_auth_required' using errcode = '42501';
  end if;
  select * into v_project from public.relationship_test_projects p
  where p.id = p_project_id for update;
  if not found or not public.test_project_pair_active(v_project.relationship_id)
     or v_project.status <> 'draft' then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  delete from public.relationship_test_project_agreements
  where project_id = p_project_id and user_id = v_user_id;
end;
$$;

-- Jede der beiden Personen kann ein Testprojekt jederzeit beenden.
create function public.cancel_test_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.relationship_test_projects%rowtype;
begin
  if v_user_id is null then
    raise exception 'test_project_auth_required' using errcode = '42501';
  end if;
  select * into v_project from public.relationship_test_projects p
  where p.id = p_project_id for update;
  if not found or not public.test_project_pair_active(v_project.relationship_id)
     or v_project.status not in ('draft', 'active') then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  update public.relationship_test_projects
  set status = 'cancelled', closed_at = now()
  where id = p_project_id;
end;
$$;

-- Zwischenstand und Abschluss -------------------------------------------------

create function public.submit_test_project_response(
  p_project_id uuid,
  p_phase text,
  p_answers jsonb,
  p_outcome text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.relationship_test_projects%rowtype;
begin
  if v_user_id is null then
    raise exception 'test_project_auth_required' using errcode = '42501';
  end if;
  select * into v_project from public.relationship_test_projects p
  where p.id = p_project_id for update;
  if not found or not public.test_project_pair_active(v_project.relationship_id)
     or v_project.status <> 'active' then
    raise exception 'test_project_unavailable' using errcode = '42501';
  end if;
  if p_phase not in ('interim', 'closing')
     or p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) > 20
     or octet_length(p_answers::text) > 30000
     or exists (
       select 1 from jsonb_array_elements(p_answers) e(item)
       where jsonb_typeof(e.item) <> 'object'
         or jsonb_typeof(e.item -> 'q') is distinct from 'string'
         or jsonb_typeof(e.item -> 'a') is distinct from 'string'
         or char_length(e.item ->> 'q') > 200
         or char_length(e.item ->> 'a') > 3000
     )
     or (p_phase = 'closing' and p_outcome is null)
     or (p_phase = 'interim' and p_outcome is not null)
     or (p_outcome is not null and p_outcome not in ('continue', 'found_team', 'stop')) then
    raise exception 'test_project_input_invalid' using errcode = '22023';
  end if;
  -- Sind beide Antworten einer Phase da, sind sie festgehalten.
  if public.test_project_phase_complete(p_project_id, p_phase) then
    raise exception 'test_project_phase_locked' using errcode = '22023';
  end if;

  insert into public.relationship_test_project_responses (project_id, user_id, phase, answers, outcome)
  values (p_project_id, v_user_id, p_phase, p_answers, p_outcome)
  on conflict (project_id, user_id, phase) do update
  set answers = excluded.answers, outcome = excluded.outcome, submitted_at = now();

  if p_phase = 'closing' and public.test_project_phase_complete(p_project_id, 'closing') then
    update public.relationship_test_projects
    set status = 'closed', closed_at = now()
    where id = p_project_id;
    return 'closed';
  end if;
  return 'active';
end;
$$;

revoke all on function public.save_test_project_draft(uuid, uuid, text, text, text, smallint, text, text, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.agree_test_project(uuid, integer) from public, anon;
revoke all on function public.withdraw_test_project_agreement(uuid) from public, anon;
revoke all on function public.cancel_test_project(uuid) from public, anon;
revoke all on function public.submit_test_project_response(uuid, text, jsonb, text) from public, anon;
revoke all on function public.test_project_pair_active(uuid) from public, anon;
revoke all on function public.test_project_phase_complete(uuid, text) from public, anon;
revoke all on function public.valid_test_project_items(jsonb) from public, anon;
grant execute on function public.save_test_project_draft(uuid, uuid, text, text, text, smallint, text, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.agree_test_project(uuid, integer) to authenticated;
grant execute on function public.withdraw_test_project_agreement(uuid) to authenticated;
grant execute on function public.cancel_test_project(uuid) to authenticated;
grant execute on function public.submit_test_project_response(uuid, text, jsonb, text) to authenticated;
-- Die Hilfen laufen innerhalb der Politiken mit den Rechten der aufrufenden Person.
grant execute on function public.test_project_pair_active(uuid) to authenticated;
grant execute on function public.test_project_phase_complete(uuid, text) to authenticated;
grant execute on function public.valid_test_project_items(jsonb) to authenticated;

comment on table public.relationship_test_projects is
  'Befristetes Testprojekt eines Paares (relationships). Entwurf bindet niemanden; Start erst nach Zustimmung beider zum aktuellen Stand. Kein Score, kein Rechtsrat.';

notify pgrst, 'reload schema';
commit;
