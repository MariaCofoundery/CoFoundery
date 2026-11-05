-- Teamraum: eine Aufgabe kann mehrere Zustaendige haben.
--
-- Wunsch von Maria (05.11.2026): "es muessen auch Aufgaben an 2 zugewiesen werden koennen."
--
-- Regeln:
--   - Die Zustaendigen stehen in advisor_org_task_assignees, hoechstens sechs je Aufgabe, nur aktive
--     Mitglieder der Organisation. Lesen wie die Aufgabe selbst (Mitglieder), schreiben nur ueber die
--     Funktionen.
--   - advisor_org_tasks.assignee_user_id bleibt als Spiegel der ersten zustaendigen Person stehen: Code,
--     der beim Ausrollen noch laeuft, und Funktionen, die eine Aufgabe mit einer Person anlegen (Seiten,
--     Foerderauflagen), funktionieren weiter. Geschrieben wird der Spiegel nur von den Ausloesern hier.
--   - Hinweise: jede neu zustaendige Person bekommt "zugeteilt" (nie man selbst); Kommentare gehen an alle
--     Zustaendigen und an die Person, die angelegt hat; "heute faellig" an alle Zustaendigen.
--   - Endet eine Mitgliedschaft, ist die Person bei keiner Aufgabe mehr zustaendig.
--   - Konto geloescht: die Zeilen gehen mit (cascade). Im Kontoexport: die eigenen Zuteilungen.
--   - Die Adresse in neuen Hinweisen zeigt auf den Teamraum (seit 05.11.2026 eigener Bereich).

begin;

create table public.advisor_org_task_assignees (
  task_id uuid not null references public.advisor_org_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  -- clock_timestamp: die Reihenfolge, in der Personen eingetragen wurden, bleibt auch in einer Anweisung erhalten.
  created_at timestamptz not null default clock_timestamp(),
  primary key (task_id, user_id)
);
create index advisor_org_task_assignees_user_idx on public.advisor_org_task_assignees (user_id, org_id);
create index advisor_org_task_assignees_org_idx on public.advisor_org_task_assignees (org_id);

alter table public.advisor_org_task_assignees enable row level security;
revoke all on public.advisor_org_task_assignees from anon, authenticated;
grant select on public.advisor_org_task_assignees to authenticated;
create policy advisor_org_task_assignees_members_read on public.advisor_org_task_assignees
  for select to authenticated using (public.is_advisor_org_member(org_id));

-- Bestehende Zustaendigkeiten uebernehmen - vor den Ausloesern, damit niemand einen Hinweis bekommt.
insert into public.advisor_org_task_assignees (task_id, user_id, org_id)
select t.id, t.assignee_user_id, t.org_id
from public.advisor_org_tasks t
where t.assignee_user_id is not null;

-- Der alte Ausloeser am Feld weicht dem an der Tabelle.
drop trigger if exists notify_org_task_assignee on public.advisor_org_tasks;
drop function if exists public.notify_org_task_assignee();

-- Hinweise zeigen jetzt auf den Teamraum.
create or replace function public.notify_org_task(p_task_id uuid, p_kind text, p_recipient_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if p_recipient_user_id is null or p_recipient_user_id = auth.uid() then
    return;
  end if;
  select t.org_id into v_org from public.advisor_org_tasks t where t.id = p_task_id;
  if v_org is null or not exists (
    select 1 from public.advisor_org_members m
    where m.org_id = v_org and m.user_id = p_recipient_user_id and m.status = 'active'
  ) then
    return;
  end if;
  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  values (p_recipient_user_id, auth.uid(), p_kind, p_task_id,
          '/advisor/teamraum/aufgaben?org=' || v_org::text || '&task=' || p_task_id::text)
  on conflict (recipient_user_id, kind, subject_id) do update
  set actor_user_id = excluded.actor_user_id, created_at = pg_catalog.now(), read_at = null;
end;
$$;
revoke all on function public.notify_org_task(uuid, text, uuid) from public, anon, authenticated;

-- Der Spiegel: die zuerst eingetragene Person.
create or replace function public.sync_org_task_first_assignee(p_task_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.advisor_org_tasks t
  set assignee_user_id = (
    select a.user_id from public.advisor_org_task_assignees a
    where a.task_id = p_task_id
    order by a.created_at, a.user_id
    limit 1
  )
  where t.id = p_task_id;
$$;
revoke all on function public.sync_org_task_first_assignee(uuid) from public, anon, authenticated;

create or replace function public.on_org_task_assignee_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.advisor_org_tasks t where t.id = new.task_id and t.status <> 'done') then
      perform public.notify_org_task(new.task_id, 'org_task_assigned', new.user_id);
    end if;
    perform public.sync_org_task_first_assignee(new.task_id);
    return new;
  end if;
  -- Die Zuteilung geht: ein ungelesener "zugeteilt"-Hinweis an diese Person auch.
  delete from public.in_app_notices n
  where n.recipient_user_id = old.user_id and n.kind = 'org_task_assigned' and n.subject_id = old.task_id and n.read_at is null;
  perform public.sync_org_task_first_assignee(old.task_id);
  return old;
end;
$$;
revoke all on function public.on_org_task_assignee_change() from public, anon, authenticated;
create trigger on_org_task_assignee_change
after insert or delete on public.advisor_org_task_assignees
for each row execute function public.on_org_task_assignee_change();

-- Funktionen, die eine Aufgabe mit einer Person anlegen (Seiten, Foerderauflagen), tragen sie so ein.
create or replace function public.adopt_org_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_user_id is not null and exists (
    select 1 from public.advisor_org_members m
    where m.org_id = new.org_id and m.user_id = new.assignee_user_id and m.status = 'active'
  ) then
    insert into public.advisor_org_task_assignees (task_id, user_id, org_id)
    values (new.id, new.assignee_user_id, new.org_id)
    on conflict (task_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.adopt_org_task_assignee() from public, anon, authenticated;
create trigger adopt_org_task_assignee
after insert on public.advisor_org_tasks
for each row execute function public.adopt_org_task_assignee();

-- Anlegen oder bearbeiten, jetzt mit mehreren Zustaendigen. p_assignee_user_id bleibt fuer Aufrufe mit
-- einer Person (Diktat, Code beim Ausrollen); p_assignee_user_ids gilt, wenn angegeben.
drop function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb);
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
  p_assignee_user_ids uuid[] default null
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

  -- Reihenfolge wie angegeben, jede Person einmal.
  select coalesce(array_agg(x.id order by x.first_ord), '{}')
  into v_ids
  from (
    select ids.id, min(ids.ord) as first_ord
    from unnest(coalesce(p_assignee_user_ids, case when p_assignee_user_id is null then '{}'::uuid[] else array[p_assignee_user_id] end))
      with ordinality as ids(id, ord)
    where ids.id is not null
    group by ids.id
  ) x;
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
      org_id, title, details, status, due_on, program_id, event_id, checklist, created_by_user_id, done_at
    ) values (
      v_org, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_details, '')), ''), coalesce(p_status, 'open'),
      p_due_on, p_program_id, p_event_id, public.clean_org_task_checklist(p_checklist),
      auth.uid(), case when p_status = 'done' then pg_catalog.now() end
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
revoke all on function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_org_task(uuid, uuid, text, text, text, uuid, date, uuid, uuid, jsonb, uuid[]) to authenticated;

-- Uebernehmen heisst jetzt: sich dazuschreiben.
create or replace function public.take_org_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := (select t.org_id from public.advisor_org_tasks t where t.id = p_task_id);
begin
  if not public.can_work_in_org(v_org) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  if (select count(*) from public.advisor_org_task_assignees a where a.task_id = p_task_id) >= 6 then
    raise exception 'org_task_too_many_assignees' using errcode = '22023';
  end if;
  insert into public.advisor_org_task_assignees (task_id, user_id, org_id)
  values (p_task_id, auth.uid(), v_org)
  on conflict (task_id, user_id) do nothing;
  update public.advisor_org_tasks set updated_at = pg_catalog.now() where id = p_task_id;
end;
$$;
revoke all on function public.take_org_task(uuid) from public, anon;
grant execute on function public.take_org_task(uuid) to authenticated;

-- Kommentiert: alle Zustaendigen und wer die Aufgabe angelegt hat.
create or replace function public.notify_org_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator uuid := (select t.created_by_user_id from public.advisor_org_tasks t where t.id = new.task_id);
  v_user uuid;
begin
  for v_user in
    select a.user_id from public.advisor_org_task_assignees a where a.task_id = new.task_id
    union
    select v_creator where v_creator is not null
  loop
    perform public.notify_org_task(new.task_id, 'org_task_comment', v_user);
  end loop;
  return new;
end;
$$;
revoke all on function public.notify_org_task_comment() from public, anon, authenticated;

-- Taeglich: heute faellig - an jede zustaendige Person einmal.
create or replace function public.prepare_org_task_due_notices(p_limit integer default 200)
returns table (recipient_user_id uuid, task_id uuid, path text, wants_push boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_today date := (pg_catalog.now() at time zone 'Europe/Berlin')::date;
begin
  return query
  with due as (
    select t.id, t.org_id, a.user_id
    from public.advisor_org_tasks t
    join public.advisor_orgs o on o.id = t.org_id and o.status = 'active'
    join public.advisor_org_task_assignees a on a.task_id = t.id
    join public.advisor_org_members m on m.org_id = t.org_id and m.user_id = a.user_id and m.status = 'active'
    where t.status <> 'done' and t.due_on = v_today
    limit greatest(p_limit, 1)
  ),
  inserted as (
    insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
    select due.user_id, null, 'org_task_due', due.id,
           '/advisor/teamraum/aufgaben?org=' || due.org_id::text || '&task=' || due.id::text
    from due
    on conflict (recipient_user_id, kind, subject_id) do nothing
    returning in_app_notices.recipient_user_id, in_app_notices.subject_id, in_app_notices.path
  )
  select inserted.recipient_user_id, inserted.subject_id, inserted.path,
         public.wants_email_notification(inserted.recipient_user_id, 'org_tasks')
  from inserted;
end;
$$;
revoke all on function public.prepare_org_task_due_notices(integer) from public, anon, authenticated;
grant execute on function public.prepare_org_task_due_notices(integer) to service_role;

-- Endet eine Mitgliedschaft (Stand 20270319120000, Aufgaben jetzt ueber die Tabelle).
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
    delete from public.advisor_org_task_assignees where org_id = v_org and user_id = v_user;
    update public.advisor_org_posts set assignee_user_id = null, updated_at = pg_catalog.now()
    where org_id = v_org and assignee_user_id = v_user;
    update public.advisor_org_member_presence set stand_in_user_id = null
    where org_id = v_org and stand_in_user_id = v_user;
    delete from public.advisor_org_member_presence where org_id = v_org and user_id = v_user;
  end if;
  return coalesce(new, old);
end;
$$;

commit;
