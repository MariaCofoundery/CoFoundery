-- Teamraum: private Aufgaben - nur fuer die Person, die sie angelegt hat.
--
-- Wunsch von Maria (06.11.2026): "Wenn man eine Aufgabe eintraegt, dass man die Sichtbarkeit auch fuer sich
-- einstellen kann ... wirklich privat, dass es nicht auch die Inhaberin oder der Inhaber der Organisation sieht.
-- Private Aufgaben koennen auf Heute und in den Kalender - aber nur fuer die Person selbst."
--
-- Eine Aufgabe hat visibility = 'team' (wie bisher) oder 'private':
--   - Lesen (Aufgabe, Kommentare, Zustaendige): nur, wer sie angelegt hat - nicht die Fuehrung, kein anderes Mitglied.
--     Das regelt die Zeilensicherheit; Kommentare und Zustaendige folgen der Aufgabe.
--   - Aendern, loeschen, kommentieren, zuweisen: ebenfalls nur die Person selbst. Die Funktionen laufen als
--     security definer und umgehen die Zeilensicherheit - deshalb sperren Ausloeser, auch fuer sie.
--     (Dienstaufrufe ohne Anmeldung - Erinnerungen, Aufraeumen - und Folgen von Fremdschluesseln sind ausgenommen.)
--   - Zustaendig kann nur die Person selbst sein; keine Verknuepfung mit einem Team im Programm, einer Seite oder
--     einer Foerderauflage (das waere sichtbar fuer andere).
--   - Eine Termin-Verknuepfung bleibt moeglich; der Termin zeigt die Aufgabe den anderen nicht (sie koennen sie nicht lesen).
--   - Wer das Konto loescht, nimmt die privaten Aufgaben mit.
-- Wechseln zwischen privat und Team: nur die Person selbst (set_org_task_visibility).

begin;

alter table public.advisor_org_tasks
  add column visibility text not null default 'team',
  add constraint advisor_org_tasks_visibility check (visibility in ('team', 'private')),
  add constraint advisor_org_tasks_private_alone check (visibility = 'team' or (program_id is null and page_id is null and requirement_id is null));
create index advisor_org_tasks_private_idx on public.advisor_org_tasks (created_by_user_id) where visibility = 'private';

-- Lesen.
drop policy advisor_org_tasks_members_read on public.advisor_org_tasks;
create policy advisor_org_tasks_members_read on public.advisor_org_tasks
  for select to authenticated using (
    public.is_advisor_org_member(org_id)
    and (visibility = 'team' or created_by_user_id = auth.uid())
  );
-- Kommentare und Zustaendige sind nur lesbar, wenn die Aufgabe es ist (die Unterabfrage laeuft mit der Zeilensicherheit der Aufgabe).
drop policy advisor_org_task_comments_members_read on public.advisor_org_task_comments;
create policy advisor_org_task_comments_members_read on public.advisor_org_task_comments
  for select to authenticated using (
    public.is_advisor_org_member(org_id)
    and exists (select 1 from public.advisor_org_tasks t where t.id = task_id)
  );
drop policy advisor_org_task_assignees_members_read on public.advisor_org_task_assignees;
create policy advisor_org_task_assignees_members_read on public.advisor_org_task_assignees
  for select to authenticated using (
    public.is_advisor_org_member(org_id)
    and exists (select 1 from public.advisor_org_tasks t where t.id = task_id)
  );

-- Schreiben: Aufgabe.
create or replace function public.guard_private_org_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.visibility = 'private'
     and auth.uid() is not null
     and auth.uid() is distinct from old.created_by_user_id
     and pg_catalog.pg_trigger_depth() <= 1 then
    raise exception 'org_task_private' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.guard_private_org_task() from public, anon, authenticated;
create trigger guard_private_org_task
before update or delete on public.advisor_org_tasks
for each row execute function public.guard_private_org_task();

-- Schreiben: Kommentare.
create or replace function public.guard_private_org_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.advisor_org_tasks%rowtype;
  v_id uuid := case when tg_op = 'DELETE' then old.task_id else new.task_id end;
begin
  select * into v_task from public.advisor_org_tasks t where t.id = v_id;
  if v_task.visibility = 'private'
     and auth.uid() is not null
     and auth.uid() is distinct from v_task.created_by_user_id
     and pg_catalog.pg_trigger_depth() <= 1 then
    raise exception 'org_task_private' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.guard_private_org_task_comment() from public, anon, authenticated;
create trigger guard_private_org_task_comment
before insert or delete on public.advisor_org_task_comments
for each row execute function public.guard_private_org_task_comment();

-- Schreiben: Zustaendige - bei einer privaten Aufgabe nur die Person selbst.
create or replace function public.guard_private_org_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.advisor_org_tasks%rowtype;
begin
  select * into v_task from public.advisor_org_tasks t where t.id = new.task_id;
  if v_task.visibility = 'private' and new.user_id is distinct from v_task.created_by_user_id then
    raise exception 'org_task_private' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_private_org_task_assignee() from public, anon, authenticated;
create trigger guard_private_org_task_assignee
before insert on public.advisor_org_task_assignees
for each row execute function public.guard_private_org_task_assignee();

-- Wer das Konto loescht, nimmt die privaten Aufgaben mit (der Fremdschluessel setzt den Ersteller auf null).
create or replace function public.drop_orphan_private_org_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.visibility = 'private' and new.created_by_user_id is null then
    delete from public.advisor_org_tasks where id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function public.drop_orphan_private_org_task() from public, anon, authenticated;
create trigger drop_orphan_private_org_task
after update of created_by_user_id on public.advisor_org_tasks
for each row execute function public.drop_orphan_private_org_task();

-- Anlegen und bearbeiten: mit Sichtbarkeit (nur fuer NEUE Aufgaben; bestehende aendert set_org_task_visibility).
drop function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb, uuid[]);
create function public.save_org_task(
  p_task_id uuid,
  p_org_id uuid,
  p_title text,
  p_details text default null,
  p_status text default 'open',
  p_assignee_user_id uuid default null,
  p_due_on date default null,
  p_program_id uuid default null,
  p_event_id uuid default null,
  p_checklist jsonb default '[]'::jsonb,
  p_assignee_user_ids uuid[] default null,
  p_visibility text default 'team'
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
  v_ids uuid[];
  v_private boolean := coalesce(p_visibility, 'team') = 'private';
begin
  if coalesce(p_visibility, 'team') not in ('team', 'private') then
    raise exception 'org_task_invalid' using errcode = '22023';
  end if;
  if p_task_id is not null then
    select * into v_old from public.advisor_org_tasks t where t.id = p_task_id;
    if v_old.id is null then
      raise exception 'org_task_not_found' using errcode = 'P0002';
    end if;
    v_org := v_old.org_id;
    v_private := v_old.visibility = 'private';
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  if coalesce(p_status, 'open') not in ('open', 'doing', 'waiting', 'done') then
    raise exception 'org_task_invalid' using errcode = '22023';
  end if;

  -- Reihenfolge wie angegeben, jede Person einmal. Eine private Aufgabe gehoert nur der Person selbst.
  if v_private then
    v_ids := array[auth.uid()];
  else
    select coalesce(array_agg(x.id order by x.first_ord), '{}')
    into v_ids
    from (
      select ids.id, min(ids.ord) as first_ord
      from unnest(coalesce(p_assignee_user_ids, case when p_assignee_user_id is null then '{}'::uuid[] else array[p_assignee_user_id] end))
        with ordinality as ids(id, ord)
      where ids.id is not null
      group by ids.id
    ) x;
  end if;
  if cardinality(v_ids) > 6 then
    raise exception 'org_task_too_many_assignees' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_ids) as ids(id)
    where not exists (
      select 1 from public.advisor_org_members m
      where m.org_id = v_org and m.user_id = ids.id and m.status = 'active'
    )
  ) then
    raise exception 'org_task_assignee_not_member' using errcode = '22023';
  end if;
  -- Ein Team verknuepft nur, wer es sehen darf; eine private Aufgabe gar nicht.
  if p_program_id is not null and v_private then
    raise exception 'org_task_invalid' using errcode = '22023';
  end if;
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
      org_id, title, details, status, due_on, program_id, event_id, checklist, created_by_user_id, done_at, visibility
    ) values (
      v_org, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_details, '')), ''), coalesce(p_status, 'open'),
      p_due_on, p_program_id, p_event_id, public.clean_org_task_checklist(p_checklist),
      auth.uid(), case when p_status = 'done' then pg_catalog.now() end,
      case when v_private then 'private' else 'team' end
    )
    returning id into v_id;
  else
    update public.advisor_org_tasks t
    set title = btrim(coalesce(p_title, '')),
        details = nullif(btrim(coalesce(p_details, '')), ''),
        status = coalesce(p_status, 'open'),
        due_on = p_due_on,
        program_id = p_program_id,
        event_id = p_event_id,
        checklist = public.clean_org_task_checklist(p_checklist),
        updated_at = pg_catalog.now(),
        done_at = case when p_status = 'done' then coalesce(t.done_at, pg_catalog.now()) end
    where t.id = p_task_id
    returning id into v_id;
    delete from public.advisor_org_task_assignees a
    where a.task_id = v_id and not (a.user_id = any (v_ids));
  end if;

  insert into public.advisor_org_task_assignees (task_id, user_id, org_id)
  select v_id, ids.id, v_org
  from unnest(v_ids) with ordinality as ids(id, ord)
  order by ids.ord
  on conflict (task_id, user_id) do nothing;
  return v_id;
end;
$$;
revoke all on function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb, uuid[], text) from public, anon;
grant execute on function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb, uuid[], text) to authenticated;

-- Umschalten zwischen privat und Team - nur die Person, die die Aufgabe angelegt hat.
-- Privat: andere Zustaendige fallen weg, Verknuepfungen mit Team, Seite und Auflage werden geloest.
create or replace function public.set_org_task_visibility(p_task_id uuid, p_visibility text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.advisor_org_tasks%rowtype;
begin
  if p_visibility not in ('team', 'private') then
    raise exception 'org_task_invalid' using errcode = '22023';
  end if;
  select * into v_task from public.advisor_org_tasks t where t.id = p_task_id;
  if v_task.id is null then
    raise exception 'org_task_not_found' using errcode = 'P0002';
  end if;
  if v_task.created_by_user_id is distinct from auth.uid() or not public.can_work_in_org(v_task.org_id) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  if p_visibility = 'private' then
    delete from public.advisor_org_task_assignees a where a.task_id = p_task_id and a.user_id <> auth.uid();
    update public.advisor_org_tasks t
    set visibility = 'private', program_id = null, page_id = null, requirement_id = null, updated_at = pg_catalog.now()
    where t.id = p_task_id;
    insert into public.advisor_org_task_assignees (task_id, user_id, org_id)
    values (p_task_id, auth.uid(), v_task.org_id)
    on conflict (task_id, user_id) do nothing;
  else
    update public.advisor_org_tasks t set visibility = 'team', updated_at = pg_catalog.now() where t.id = p_task_id;
  end if;
end;
$$;
revoke all on function public.set_org_task_visibility(uuid, text) from public, anon;
grant execute on function public.set_org_task_visibility(uuid, text) to authenticated;

commit;
