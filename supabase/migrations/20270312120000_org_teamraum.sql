-- Teamraum: wie sich das Team einer Organisation selbst organisiert.
--
-- Wunsch von Maria (05.11.2026): Ein Bereich fuer die Mitglieder einer Organisation - Aufgaben,
-- wer was macht, was diese Woche ansteht. Stufe 1: Aufgaben (mit Checkliste und Kommentaren) und
-- "Wer macht was" (Rolle im Team, Abwesenheit, Vertretung). Seiten folgen in Stufe 2.
--
-- Regeln:
--   - NUR FUER MITGLIEDER. Lesen darf jedes aktive Mitglied der Organisation, nie ein Team im
--     Programm und nie jemand von aussen. Schreiben nur ueber die Funktionen hier und nur, solange
--     die Organisation aktiv ist (ausgesetzt = lesen ja, aendern nein).
--   - Zustaendig sein kann nur ein aktives Mitglied. Endet eine Mitgliedschaft, verlieren ihre
--     Aufgaben die Zustaendigkeit (sie bleiben im Team) und niemand vertritt mehr durch sie.
--   - Eine Aufgabe kann an einem Team im Programm haengen - aber nur, wenn die Person, die sie
--     anlegt, dieses Team sehen darf (Inhaberin oder Bezugsperson). Die Datenbank liefert den Namen
--     nicht mit; die Oberflaeche zeigt ihn nur denen, die das Team ohnehin sehen.
--   - Loeschen darf, wer die Aufgabe angelegt hat, oder die Fuehrung. Bearbeiten darf jedes Mitglied -
--     es ist eine gemeinsame Liste.
--   - Keine Wertung: Zahlen sind Anzahl offener Aufgaben, keine Leistung.
--   - Konto geloescht: angelegt/zustaendig verlieren die Verknuepfung (set null), eigene Kommentare
--     und die eigene Anwesenheitsangabe gehen mit (cascade). Im Kontoexport: angelegte Aufgaben und
--     eigene Kommentare (normaler Client, Zeilensicherheit).

begin;

create table public.advisor_org_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  title text not null,
  details text,
  status text not null default 'open',
  assignee_user_id uuid references auth.users (id) on delete set null,
  due_on date,
  program_id uuid references public.team_programs (id) on delete set null,
  event_id uuid references public.team_program_events (id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz,
  constraint advisor_org_tasks_title check (char_length(btrim(title)) between 1 and 200),
  constraint advisor_org_tasks_details check (details is null or char_length(details) <= 4000),
  constraint advisor_org_tasks_status check (status in ('open', 'doing', 'waiting', 'done')),
  constraint advisor_org_tasks_checklist check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 30)
);
create index advisor_org_tasks_org_idx on public.advisor_org_tasks (org_id, status, due_on);
create index advisor_org_tasks_assignee_idx on public.advisor_org_tasks (assignee_user_id) where assignee_user_id is not null;
create index advisor_org_tasks_program_idx on public.advisor_org_tasks (program_id) where program_id is not null;
create index advisor_org_tasks_event_idx on public.advisor_org_tasks (event_id) where event_id is not null;
create index advisor_org_tasks_created_by_idx on public.advisor_org_tasks (created_by_user_id);

create table public.advisor_org_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.advisor_org_tasks (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint advisor_org_task_comments_body check (char_length(btrim(body)) between 1 and 2000)
);
create index advisor_org_task_comments_task_idx on public.advisor_org_task_comments (task_id, created_at);
create index advisor_org_task_comments_author_idx on public.advisor_org_task_comments (author_user_id);

-- Wer macht was: Rolle im Team, abwesend bis, vertreten durch. Eine Zeile je Mitglied und Organisation.
create table public.advisor_org_member_presence (
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  team_role text,
  away_until date,
  stand_in_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (org_id, user_id),
  constraint advisor_org_member_presence_role check (team_role is null or char_length(team_role) <= 80),
  constraint advisor_org_member_presence_stand_in check (stand_in_user_id is null or stand_in_user_id <> user_id)
);
create index advisor_org_member_presence_stand_in_idx on public.advisor_org_member_presence (stand_in_user_id) where stand_in_user_id is not null;

alter table public.advisor_org_tasks enable row level security;
alter table public.advisor_org_task_comments enable row level security;
alter table public.advisor_org_member_presence enable row level security;
revoke all on public.advisor_org_tasks from anon, authenticated;
revoke all on public.advisor_org_task_comments from anon, authenticated;
revoke all on public.advisor_org_member_presence from anon, authenticated;
grant select on public.advisor_org_tasks to authenticated;
grant select on public.advisor_org_task_comments to authenticated;
grant select on public.advisor_org_member_presence to authenticated;

create policy advisor_org_tasks_members_read on public.advisor_org_tasks
  for select to authenticated using (public.is_advisor_org_member(org_id));
create policy advisor_org_task_comments_members_read on public.advisor_org_task_comments
  for select to authenticated using (public.is_advisor_org_member(org_id));
create policy advisor_org_member_presence_members_read on public.advisor_org_member_presence
  for select to authenticated using (public.is_advisor_org_member(org_id));

-- Schreiben: aktives Mitglied einer aktiven Organisation.
create or replace function public.can_work_in_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.advisor_org_members m
    join public.advisor_orgs o on o.id = m.org_id and o.status = 'active'
    where m.org_id = p_org_id and m.user_id = auth.uid() and m.status = 'active'
  );
$$;
revoke all on function public.can_work_in_org(uuid) from public, anon, authenticated;

-- Darf diese Person das Team im Programm sehen? (Dieselbe Regel wie get_org_team_programs.)
create or replace function public.can_see_org_program(p_org_id uuid, p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_programs p
    where p.id = p_program_id and p.org_id = p_org_id
      and (
        public.is_advisor_org_owner_of(p_org_id)
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
      )
  );
$$;
revoke all on function public.can_see_org_program(uuid, uuid) from public, anon, authenticated;

-- Eine Checkliste: hoechstens 30 Zeilen {text, done}, Text 1 bis 200 Zeichen. Alles andere faellt weg.
create or replace function public.clean_org_task_checklist(p_checklist jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('text', item.text, 'done', item.done) order by item.ord), '[]'::jsonb)
  from (
    select left(btrim(entry->>'text'), 200) as text, coalesce((entry->>'done')::boolean, false) as done, ord
    from jsonb_array_elements(case when jsonb_typeof(p_checklist) = 'array' then p_checklist else '[]'::jsonb end)
      with ordinality as rows(entry, ord)
    where jsonb_typeof(entry) = 'object' and coalesce(btrim(entry->>'text'), '') <> ''
    order by ord
    limit 30
  ) item;
$$;
revoke all on function public.clean_org_task_checklist(jsonb) from public, anon, authenticated;

-- Anlegen (p_task_id null) oder bearbeiten. Gibt die id zurueck.
create or replace function public.save_org_task(
  p_task_id uuid,
  p_org_id uuid,
  p_title text,
  p_details text default null,
  p_status text default 'open',
  p_assignee_user_id uuid default null,
  p_due_on date default null,
  p_program_id uuid default null,
  p_event_id uuid default null,
  p_checklist jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := p_org_id;
  v_old public.advisor_org_tasks%rowtype;
  v_id uuid;
begin
  if p_task_id is not null then
    select * into v_old from public.advisor_org_tasks t where t.id = p_task_id;
    if v_old.id is null then
      raise exception 'org_task_not_found' using errcode = 'P0002';
    end if;
    v_org := v_old.org_id;
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  if coalesce(p_status, 'open') not in ('open', 'doing', 'waiting', 'done') then
    raise exception 'org_task_invalid' using errcode = '22023';
  end if;
  if p_assignee_user_id is not null and not exists (
    select 1 from public.advisor_org_members m
    where m.org_id = v_org and m.user_id = p_assignee_user_id and m.status = 'active'
  ) then
    raise exception 'org_task_assignee_not_member' using errcode = '22023';
  end if;
  -- Ein Team verknuepft nur, wer es sehen darf. Eine bestehende Verknuepfung darf stehen bleiben.
  if p_program_id is not null
     and p_program_id is distinct from v_old.program_id
     and not public.can_see_org_program(v_org, p_program_id) then
    raise exception 'org_task_program_not_visible' using errcode = '42501';
  end if;
  if p_event_id is not null and not exists (
    select 1 from public.team_program_events e where e.id = p_event_id and e.org_id = v_org
  ) then
    raise exception 'org_task_invalid' using errcode = '22023';
  end if;

  if p_task_id is null then
    insert into public.advisor_org_tasks (
      org_id, title, details, status, assignee_user_id, due_on, program_id, event_id, checklist,
      created_by_user_id, done_at
    ) values (
      v_org, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_details, '')), ''), coalesce(p_status, 'open'),
      p_assignee_user_id, p_due_on, p_program_id, p_event_id, public.clean_org_task_checklist(p_checklist),
      auth.uid(), case when p_status = 'done' then pg_catalog.now() end
    )
    returning id into v_id;
  else
    update public.advisor_org_tasks t
    set title = btrim(coalesce(p_title, '')),
        details = nullif(btrim(coalesce(p_details, '')), ''),
        status = coalesce(p_status, 'open'),
        assignee_user_id = p_assignee_user_id,
        due_on = p_due_on,
        program_id = p_program_id,
        event_id = p_event_id,
        checklist = public.clean_org_task_checklist(p_checklist),
        updated_at = pg_catalog.now(),
        done_at = case when p_status = 'done' then coalesce(t.done_at, pg_catalog.now()) end
    where t.id = p_task_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb) to authenticated;

-- Schnelle Aenderungen vom Board: Spalte wechseln, uebernehmen, eine Checklistenzeile abhaken.
create or replace function public.move_org_task(p_task_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('open', 'doing', 'waiting', 'done') then
    raise exception 'org_task_invalid' using errcode = '22023';
  end if;
  if not public.can_work_in_org((select t.org_id from public.advisor_org_tasks t where t.id = p_task_id)) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  update public.advisor_org_tasks t
  set status = p_status,
      updated_at = pg_catalog.now(),
      done_at = case when p_status = 'done' then coalesce(t.done_at, pg_catalog.now()) end
  where t.id = p_task_id;
end;
$$;
revoke all on function public.move_org_task(uuid, text) from public, anon;
grant execute on function public.move_org_task(uuid, text) to authenticated;

create or replace function public.take_org_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_work_in_org((select t.org_id from public.advisor_org_tasks t where t.id = p_task_id)) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  update public.advisor_org_tasks
  set assignee_user_id = auth.uid(), updated_at = pg_catalog.now()
  where id = p_task_id;
end;
$$;
revoke all on function public.take_org_task(uuid) from public, anon;
grant execute on function public.take_org_task(uuid) to authenticated;

create or replace function public.check_org_task_item(p_task_id uuid, p_index integer, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_work_in_org((select t.org_id from public.advisor_org_tasks t where t.id = p_task_id)) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  update public.advisor_org_tasks t
  set checklist = jsonb_set(t.checklist, array[p_index::text, 'done'], to_jsonb(coalesce(p_done, false))),
      updated_at = pg_catalog.now()
  where t.id = p_task_id and p_index >= 0 and p_index < jsonb_array_length(t.checklist);
end;
$$;
revoke all on function public.check_org_task_item(uuid, integer, boolean) from public, anon;
grant execute on function public.check_org_task_item(uuid, integer, boolean) to authenticated;

create or replace function public.delete_org_task(p_task_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.advisor_org_tasks%rowtype;
begin
  select * into v_task from public.advisor_org_tasks t where t.id = p_task_id;
  if v_task.id is null then
    return false;
  end if;
  if not public.can_work_in_org(v_task.org_id)
     or not (v_task.created_by_user_id = auth.uid() or public.is_advisor_org_owner_of(v_task.org_id)) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_tasks where id = p_task_id;
  return true;
end;
$$;
revoke all on function public.delete_org_task(uuid) from public, anon;
grant execute on function public.delete_org_task(uuid) to authenticated;

create or replace function public.add_org_task_comment(p_task_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select t.org_id into v_org from public.advisor_org_tasks t where t.id = p_task_id;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  insert into public.advisor_org_task_comments (task_id, org_id, author_user_id, body)
  values (p_task_id, v_org, auth.uid(), btrim(coalesce(p_body, '')))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_org_task_comment(uuid, text) from public, anon;
grant execute on function public.add_org_task_comment(uuid, text) to authenticated;

-- Den eigenen Kommentar zuruecknehmen.
create or replace function public.delete_org_task_comment(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.advisor_org_task_comments c
  where c.id = p_comment_id and c.author_user_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.delete_org_task_comment(uuid) from public, anon;
grant execute on function public.delete_org_task_comment(uuid) to authenticated;

-- Die eigene Angabe unter "Wer macht was". Vertreten kann nur ein anderes aktives Mitglied.
create or replace function public.set_my_org_presence(p_org_id uuid, p_team_role text, p_away_until date, p_stand_in_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_work_in_org(p_org_id) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  if p_stand_in_user_id is not null and (p_stand_in_user_id = auth.uid() or not exists (
    select 1 from public.advisor_org_members m
    where m.org_id = p_org_id and m.user_id = p_stand_in_user_id and m.status = 'active'
  )) then
    raise exception 'org_task_assignee_not_member' using errcode = '22023';
  end if;
  insert into public.advisor_org_member_presence (org_id, user_id, team_role, away_until, stand_in_user_id)
  values (p_org_id, auth.uid(), nullif(left(btrim(coalesce(p_team_role, '')), 80), ''), p_away_until, p_stand_in_user_id)
  on conflict (org_id, user_id) do update
  set team_role = excluded.team_role,
      away_until = excluded.away_until,
      stand_in_user_id = excluded.stand_in_user_id,
      updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.set_my_org_presence(uuid, text, date, uuid) from public, anon;
grant execute on function public.set_my_org_presence(uuid, text, date, uuid) to authenticated;

-- Endet eine Mitgliedschaft: Aufgaben verlieren die Zustaendigkeit, Vertretungen durch diese Person enden,
-- ihre eigene Angabe geht.
create or replace function public.release_org_work_on_member_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := coalesce(new.org_id, old.org_id);
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  if tg_op = 'DELETE' or (new.status <> 'active' and old.status = 'active') then
    update public.advisor_org_tasks set assignee_user_id = null, updated_at = pg_catalog.now()
    where org_id = v_org and assignee_user_id = v_user;
    update public.advisor_org_member_presence set stand_in_user_id = null
    where org_id = v_org and stand_in_user_id = v_user;
    delete from public.advisor_org_member_presence where org_id = v_org and user_id = v_user;
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.release_org_work_on_member_end() from public, anon, authenticated;
create trigger release_org_work_on_member_end
after update of status or delete on public.advisor_org_members
for each row execute function public.release_org_work_on_member_end();

commit;
