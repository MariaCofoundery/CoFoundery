-- Programm: Checkliste und Kommentare an Aufgaben, gemeinsame Ziele.
--
-- Wunsch von Maria (08.11.2026): Checkliste und Kommentare an den Aufgaben im Programm; dazu Ziele, die man mit den
-- Startups festlegt, abhakt und bearbeitet.
--
--   - Checkliste: bis 30 Punkte je Aufgabe wie im Teamraum; jede Person mit Zugang hakt ab.
--   - Kommentare: dieselben Menschen wie bei der Aufgabe (nie andere Startups, nie die uebrigen Mitglieder der Organisation,
--     bei einer privaten Aufgabe nur die Person selbst). Wer kommentiert, benachrichtigt die Person, die die Aufgabe
--     angelegt hat, und die Zustaendige - nicht sich selbst.
--   - Ziele: je Programm eine gemeinsame Liste (Titel, Beschreibung, bis wann, erreicht oder offen). Beide Seiten legen an,
--     bearbeiten und haken ab - derselbe Zugang wie bei den Aufgaben (program_tasks_access). Loeschen: wer es angelegt hat
--     oder die Inhaberin. Endet das Programm, gehen die Ziele mit.

begin;

alter table public.team_program_tasks
  add column checklist jsonb not null default '[]'::jsonb,
  add constraint team_program_tasks_checklist check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 30);

drop function public.save_program_task(uuid, uuid, text, text, text, date, uuid, text);
create function public.save_program_task(
  p_task_id uuid,
  p_program_id uuid,
  p_title text,
  p_details text default null,
  p_status text default 'open',
  p_due_on date default null,
  p_assignee_user_id uuid default null,
  p_visibility text default 'shared',
  p_checklist jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.team_program_tasks%rowtype;
  v_program uuid := p_program_id;
  v_private boolean := coalesce(p_visibility, 'shared') = 'private';
  v_assignee uuid := p_assignee_user_id;
  v_id uuid;
begin
  if coalesce(p_visibility, 'shared') not in ('shared', 'private') or coalesce(p_status, 'open') not in ('open', 'doing', 'done') then
    raise exception 'program_task_invalid' using errcode = '22023';
  end if;
  if p_task_id is not null then
    select * into v_old from public.team_program_tasks t where t.id = p_task_id;
    if v_old.id is null then
      raise exception 'program_task_not_found' using errcode = 'P0002';
    end if;
    v_program := v_old.program_id;
    v_private := v_old.visibility = 'private';
    if v_private and v_old.created_by_user_id is distinct from auth.uid() then
      raise exception 'program_task_private' using errcode = '42501';
    end if;
  end if;
  if v_program is null or not public.program_tasks_access(v_program) then
    raise exception 'program_task_not_yours' using errcode = '42501';
  end if;
  if v_private then
    v_assignee := null;
  elsif v_assignee is not null and not public.program_task_assignee_ok(v_program, v_assignee) then
    raise exception 'program_task_assignee_invalid' using errcode = '22023';
  end if;

  if p_task_id is null then
    insert into public.team_program_tasks (program_id, title, details, status, due_on, assignee_user_id, visibility, created_by_user_id, done_at, checklist)
    values (v_program, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_details, '')), ''), coalesce(p_status, 'open'), p_due_on, v_assignee,
            case when v_private then 'private' else 'shared' end, auth.uid(), case when p_status = 'done' then pg_catalog.now() end,
            public.clean_org_task_checklist(p_checklist))
    returning id into v_id;
  else
    update public.team_program_tasks t
    set title = btrim(coalesce(p_title, '')),
        details = nullif(btrim(coalesce(p_details, '')), ''),
        status = coalesce(p_status, 'open'),
        due_on = p_due_on,
        assignee_user_id = v_assignee,
        checklist = public.clean_org_task_checklist(p_checklist),
        updated_at = pg_catalog.now(),
        done_at = case when p_status = 'done' then coalesce(t.done_at, pg_catalog.now()) end
    where t.id = p_task_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_program_task(uuid, uuid, text, text, text, date, uuid, text, jsonb) from public, anon;
grant execute on function public.save_program_task(uuid, uuid, text, text, text, date, uuid, text, jsonb) to authenticated;

-- Einen Punkt der Checkliste abhaken.
create or replace function public.check_program_task_item(p_task_id uuid, p_index integer, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.team_program_tasks%rowtype;
begin
  select * into v_task from public.team_program_tasks t where t.id = p_task_id;
  if v_task.id is null then
    raise exception 'program_task_not_found' using errcode = 'P0002';
  end if;
  if not public.program_tasks_access(v_task.program_id) or (v_task.visibility = 'private' and v_task.created_by_user_id is distinct from auth.uid()) then
    raise exception 'program_task_not_yours' using errcode = '42501';
  end if;
  if p_index < 0 or p_index >= jsonb_array_length(v_task.checklist) then
    raise exception 'program_task_invalid' using errcode = '22023';
  end if;
  update public.team_program_tasks
  set checklist = jsonb_set(checklist, array[p_index::text, 'done'], to_jsonb(coalesce(p_done, false))), updated_at = pg_catalog.now()
  where id = p_task_id;
end;
$$;
revoke all on function public.check_program_task_item(uuid, integer, boolean) from public, anon;
grant execute on function public.check_program_task_item(uuid, integer, boolean) to authenticated;

-- Kommentare.
create table public.team_program_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.team_program_tasks (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint team_program_task_comments_body check (char_length(btrim(body)) between 1 and 2000)
);
create index team_program_task_comments_task_idx on public.team_program_task_comments (task_id, created_at);
create index team_program_task_comments_author_idx on public.team_program_task_comments (author_user_id);

alter table public.team_program_task_comments enable row level security;
revoke all on public.team_program_task_comments from anon, authenticated;
grant select on public.team_program_task_comments to authenticated;
-- Lesbar, wenn die Aufgabe es ist (die Unterabfrage laeuft mit der Zeilenregel der Aufgabe).
create policy team_program_task_comments_read on public.team_program_task_comments
  for select to authenticated using (exists (select 1 from public.team_program_tasks t where t.id = task_id));

create or replace function public.add_program_task_comment(p_task_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.team_program_tasks%rowtype;
  v_id uuid;
begin
  select * into v_task from public.team_program_tasks t where t.id = p_task_id;
  if v_task.id is null then
    raise exception 'program_task_not_found' using errcode = 'P0002';
  end if;
  if not public.program_tasks_access(v_task.program_id) or (v_task.visibility = 'private' and v_task.created_by_user_id is distinct from auth.uid()) then
    raise exception 'program_task_not_yours' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 2000 then
    raise exception 'program_task_invalid' using errcode = '22023';
  end if;
  insert into public.team_program_task_comments (task_id, author_user_id, body) values (p_task_id, auth.uid(), btrim(p_body)) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_program_task_comment(uuid, text) from public, anon;
grant execute on function public.add_program_task_comment(uuid, text) to authenticated;

create or replace function public.delete_program_task_comment(p_comment_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.team_program_task_comments c where c.id = p_comment_id and c.author_user_id = auth.uid();
$$;
revoke all on function public.delete_program_task_comment(uuid) from public, anon;
grant execute on function public.delete_program_task_comment(uuid) to authenticated;

-- Hinweis: neuer Kommentar an die Person, die die Aufgabe angelegt hat, und die Zustaendige (nicht an sich selbst,
-- nicht bei privaten Aufgaben). Pro Aufgabe ein Hinweis; ein weiterer Kommentar setzt ihn wieder auf ungelesen.
alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request', 'problem_interest', 'approach_interest', 'discovery_intro_request',
  'discovery_intro_accepted', 'read_my_mind_handoff', 'founder_in_the_wild_handoff',
  'collaboration_conversation_marker', 'program_update_due', 'program_invited',
  'program_review_requested', 'program_removed', 'program_reward_unlocked',
  'org_task_assigned', 'org_task_comment', 'org_task_due',
  'advisor_org_invited', 'advisor_person_invited', 'founder_invited',
  'program_task_assigned', 'program_task_comment'
));

create or replace function public.on_program_task_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.team_program_tasks%rowtype;
  v_team uuid;
  v_user uuid;
begin
  select * into v_task from public.team_program_tasks t where t.id = new.task_id;
  if v_task.id is null or v_task.visibility = 'private' then
    return null;
  end if;
  select p.team_id into v_team from public.team_programs p where p.id = v_task.program_id;
  for v_user in
    select distinct u from unnest(array[v_task.created_by_user_id, v_task.assignee_user_id]) as x(u)
    where u is not null and u is distinct from new.author_user_id
  loop
    insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
    values (
      v_user, new.author_user_id, 'program_task_comment', v_task.id,
      case when exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = v_user)
           then '/programm#aufgaben'
           else '/advisor/programm/' || v_task.program_id::text || '?tab=aufgaben' end
    )
    on conflict (recipient_user_id, kind, subject_id) do update set read_at = null, created_at = pg_catalog.now();
  end loop;
  return null;
end;
$$;
revoke all on function public.on_program_task_comment() from public, anon, authenticated;
create trigger on_program_task_comment after insert on public.team_program_task_comments
  for each row execute function public.on_program_task_comment();

-- Eine geloeschte Aufgabe nimmt auch die Kommentar-Hinweise mit.
create or replace function public.drop_program_task_notices()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.in_app_notices where kind in ('program_task_assigned', 'program_task_comment') and subject_id = old.id;
  return null;
end;
$$;

-- Ziele.
create table public.team_program_goals (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  title text not null,
  details text,
  due_on date,
  status text not null default 'open',
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reached_at timestamptz,
  constraint team_program_goals_title check (char_length(btrim(title)) between 1 and 200),
  constraint team_program_goals_details check (details is null or char_length(details) <= 2000),
  constraint team_program_goals_status check (status in ('open', 'reached')),
  constraint team_program_goals_reached check ((status = 'reached') = (reached_at is not null))
);
create index team_program_goals_program_idx on public.team_program_goals (program_id, status, due_on);
create index team_program_goals_created_by_idx on public.team_program_goals (created_by_user_id);

alter table public.team_program_goals enable row level security;
revoke all on public.team_program_goals from anon, authenticated;
grant select on public.team_program_goals to authenticated;
create policy team_program_goals_read on public.team_program_goals
  for select to authenticated using (public.program_tasks_access(program_id));

create or replace function public.save_program_goal(p_goal_id uuid, p_program_id uuid, p_title text, p_details text default null, p_due_on date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program uuid := p_program_id;
  v_id uuid;
begin
  if p_goal_id is not null then
    select g.program_id into v_program from public.team_program_goals g where g.id = p_goal_id;
    if v_program is null then
      raise exception 'program_goal_not_found' using errcode = 'P0002';
    end if;
  end if;
  if v_program is null or not public.program_tasks_access(v_program) then
    raise exception 'program_goal_not_yours' using errcode = '42501';
  end if;
  if p_goal_id is null then
    insert into public.team_program_goals (program_id, title, details, due_on, created_by_user_id)
    values (v_program, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_details, '')), ''), p_due_on, auth.uid())
    returning id into v_id;
  else
    update public.team_program_goals
    set title = btrim(coalesce(p_title, '')), details = nullif(btrim(coalesce(p_details, '')), ''), due_on = p_due_on, updated_at = pg_catalog.now()
    where id = p_goal_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_program_goal(uuid, uuid, text, text, date) from public, anon;
grant execute on function public.save_program_goal(uuid, uuid, text, text, date) to authenticated;

create or replace function public.set_program_goal_status(p_goal_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program uuid;
begin
  if p_status not in ('open', 'reached') then
    raise exception 'program_goal_invalid' using errcode = '22023';
  end if;
  select g.program_id into v_program from public.team_program_goals g where g.id = p_goal_id;
  if v_program is null then
    raise exception 'program_goal_not_found' using errcode = 'P0002';
  end if;
  if not public.program_tasks_access(v_program) then
    raise exception 'program_goal_not_yours' using errcode = '42501';
  end if;
  update public.team_program_goals
  set status = p_status, updated_at = pg_catalog.now(), reached_at = case when p_status = 'reached' then coalesce(reached_at, pg_catalog.now()) end
  where id = p_goal_id;
end;
$$;
revoke all on function public.set_program_goal_status(uuid, text) from public, anon;
grant execute on function public.set_program_goal_status(uuid, text) to authenticated;

create or replace function public.delete_program_goal(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goal public.team_program_goals%rowtype;
begin
  select * into v_goal from public.team_program_goals g where g.id = p_goal_id;
  if v_goal.id is null then
    return;
  end if;
  if not public.program_tasks_access(v_goal.program_id)
     or not (v_goal.created_by_user_id = auth.uid() or exists (select 1 from public.team_programs p where p.id = v_goal.program_id and public.is_advisor_org_owner_of(p.org_id))) then
    raise exception 'program_goal_not_yours' using errcode = '42501';
  end if;
  delete from public.team_program_goals where id = p_goal_id;
end;
$$;
revoke all on function public.delete_program_goal(uuid) from public, anon;
grant execute on function public.delete_program_goal(uuid) to authenticated;

-- Endet das Programm, gehen Aufgaben und Ziele mit.
create or replace function public.drop_program_tasks_on_end()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.team_program_tasks where program_id = new.id;
  delete from public.team_program_goals where program_id = new.id;
  return null;
end;
$$;

commit;
