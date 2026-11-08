-- Aufgaben im Programm: gemeinsam zwischen einem Startup und seiner Organisation.
--
-- Wunsch von Maria (06.11.2026): Die Startups im Programm sollen auch einen Aufgabenbereich haben, wenn sie mit einem
-- Advisor oder Accelerator arbeiten.
--
-- Eine Aufgabe gehoert zu EINEM Programm (Team x Organisation) und ist
--   - 'shared':  sichtbar und aenderbar fuer die Gruendenden dieses Teams und fuer die Menschen der Organisation, die das
--                Team sehen duerfen (Inhaberin, Ansprechpersonen) - nicht fuer andere Startups, nicht fuer die uebrigen
--                Mitglieder der Organisation. Zugang nur, solange das Programm fuer das Team aktiv ist (Zustimmung aller).
--   - 'private': nur fuer die Person, die sie angelegt hat - auf keiner Seite, auch nicht fuer die Gegenseite.
-- Jede Aufgabe zeigt, wer sie angelegt hat. Zustaendig kann eine Person des Teams oder eine Ansprechperson der Organisation
-- sein; wer zugewiesen wird (und nicht selbst zuweist), bekommt einen Hinweis im Nachrichtensystem.
-- Das ist ein eigener Zugriffsvertrag: er folgt weder aus der Teamzugehoerigkeit noch aus der Mitgliedschaft in der
-- Organisation (Teamraum-Aufgaben der Organisation bleiben fuer die Startups unsichtbar).
-- Endet das Programm, gehen die Aufgaben mit; wer das Konto loescht, nimmt private Aufgaben mit.

begin;

create table public.team_program_tasks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  title text not null,
  details text,
  status text not null default 'open',
  due_on date,
  assignee_user_id uuid references auth.users (id) on delete set null,
  visibility text not null default 'shared',
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz,
  constraint team_program_tasks_title check (char_length(btrim(title)) between 1 and 200),
  constraint team_program_tasks_details check (details is null or char_length(details) <= 4000),
  constraint team_program_tasks_status check (status in ('open', 'doing', 'done')),
  constraint team_program_tasks_visibility check (visibility in ('shared', 'private')),
  constraint team_program_tasks_private_alone check (visibility = 'shared' or assignee_user_id is null or assignee_user_id = created_by_user_id)
);
create index team_program_tasks_program_idx on public.team_program_tasks (program_id, status, due_on);
create index team_program_tasks_assignee_idx on public.team_program_tasks (assignee_user_id) where assignee_user_id is not null;
create index team_program_tasks_created_by_idx on public.team_program_tasks (created_by_user_id);

-- Wer mit den Aufgaben dieses Programms arbeiten darf: Gruendende des Teams (Programm aktiv) und die Menschen der
-- Organisation, die das Team sehen duerfen (Inhaberin, Ansprechpersonen).
create or replace function public.program_tasks_access(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.team_programs p
    where p.id = p_program_id
      and p.status <> 'ended'
      and public.team_program_is_active(p.id)
      and (
        exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
        or public.is_advisor_org_owner_of(p.org_id)
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
      )
  );
$$;
-- Die Zeilenregel ruft sie auf, deshalb darf sie jede angemeldete Person aufrufen; sie sagt nur etwas ueber den eigenen Zugang.
revoke all on function public.program_tasks_access(uuid) from public, anon;
grant execute on function public.program_tasks_access(uuid) to authenticated;

-- Ist diese Person als Zustaendige moeglich? Gruendende des Teams, Inhaberin, Ansprechpersonen.
create or replace function public.program_task_assignee_ok(p_program_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_programs p
    where p.id = p_program_id
      and (
        exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = p_user_id)
        or exists (select 1 from public.advisor_org_members om where om.org_id = p.org_id and om.user_id = p_user_id and om.status = 'active' and om.role = 'owner')
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = p_user_id)
      )
  );
$$;
revoke all on function public.program_task_assignee_ok(uuid, uuid) from public, anon, authenticated;

alter table public.team_program_tasks enable row level security;
revoke all on public.team_program_tasks from anon, authenticated;
grant select on public.team_program_tasks to authenticated;
create policy team_program_tasks_read on public.team_program_tasks
  for select to authenticated using (
    public.program_tasks_access(program_id)
    and (visibility = 'shared' or created_by_user_id = auth.uid())
  );

-- Anlegen oder aendern. Privat gilt nur fuer neue Aufgaben (bestehende wechseln ueber set_program_task_visibility) und
-- gehoert der Person allein.
create or replace function public.save_program_task(
  p_task_id uuid,
  p_program_id uuid,
  p_title text,
  p_details text default null,
  p_status text default 'open',
  p_due_on date default null,
  p_assignee_user_id uuid default null,
  p_visibility text default 'shared'
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
    insert into public.team_program_tasks (program_id, title, details, status, due_on, assignee_user_id, visibility, created_by_user_id, done_at)
    values (v_program, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_details, '')), ''), coalesce(p_status, 'open'), p_due_on, v_assignee,
            case when v_private then 'private' else 'shared' end, auth.uid(), case when p_status = 'done' then pg_catalog.now() end)
    returning id into v_id;
  else
    update public.team_program_tasks t
    set title = btrim(coalesce(p_title, '')),
        details = nullif(btrim(coalesce(p_details, '')), ''),
        status = coalesce(p_status, 'open'),
        due_on = p_due_on,
        assignee_user_id = v_assignee,
        updated_at = pg_catalog.now(),
        done_at = case when p_status = 'done' then coalesce(t.done_at, pg_catalog.now()) end
    where t.id = p_task_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_program_task(uuid, uuid, text, text, text, date, uuid, text) from public, anon;
grant execute on function public.save_program_task(uuid, uuid, text, text, text, date, uuid, text) to authenticated;

create or replace function public.move_program_task(p_task_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.team_program_tasks%rowtype;
begin
  if p_status not in ('open', 'doing', 'done') then
    raise exception 'program_task_invalid' using errcode = '22023';
  end if;
  select * into v_task from public.team_program_tasks t where t.id = p_task_id;
  if v_task.id is null then
    raise exception 'program_task_not_found' using errcode = 'P0002';
  end if;
  if not public.program_tasks_access(v_task.program_id) or (v_task.visibility = 'private' and v_task.created_by_user_id is distinct from auth.uid()) then
    raise exception 'program_task_not_yours' using errcode = '42501';
  end if;
  update public.team_program_tasks
  set status = p_status, updated_at = pg_catalog.now(), done_at = case when p_status = 'done' then coalesce(done_at, pg_catalog.now()) end
  where id = p_task_id;
end;
$$;
revoke all on function public.move_program_task(uuid, text) from public, anon;
grant execute on function public.move_program_task(uuid, text) to authenticated;

-- Loeschen: wer sie angelegt hat, oder die Inhaberin der Organisation (bei gemeinsamen Aufgaben).
create or replace function public.delete_program_task(p_task_id uuid)
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
    return;
  end if;
  if not public.program_tasks_access(v_task.program_id)
     or not (
       v_task.created_by_user_id = auth.uid()
       or (v_task.visibility = 'shared' and exists (select 1 from public.team_programs p where p.id = v_task.program_id and public.is_advisor_org_owner_of(p.org_id)))
     ) then
    raise exception 'program_task_not_yours' using errcode = '42501';
  end if;
  delete from public.team_program_tasks where id = p_task_id;
end;
$$;
revoke all on function public.delete_program_task(uuid) from public, anon;
grant execute on function public.delete_program_task(uuid) to authenticated;

-- Privat <-> gemeinsam: nur, wer sie angelegt hat. Privat nimmt die Zuweisung weg.
create or replace function public.set_program_task_visibility(p_task_id uuid, p_visibility text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.team_program_tasks%rowtype;
begin
  if p_visibility not in ('shared', 'private') then
    raise exception 'program_task_invalid' using errcode = '22023';
  end if;
  select * into v_task from public.team_program_tasks t where t.id = p_task_id;
  if v_task.id is null then
    raise exception 'program_task_not_found' using errcode = 'P0002';
  end if;
  if v_task.created_by_user_id is distinct from auth.uid() or not public.program_tasks_access(v_task.program_id) then
    raise exception 'program_task_not_yours' using errcode = '42501';
  end if;
  update public.team_program_tasks
  set visibility = p_visibility, assignee_user_id = case when p_visibility = 'private' then null else assignee_user_id end, updated_at = pg_catalog.now()
  where id = p_task_id;
end;
$$;
revoke all on function public.set_program_task_visibility(uuid, text) from public, anon;
grant execute on function public.set_program_task_visibility(uuid, text) to authenticated;

-- Hinweis im Nachrichtensystem: jemand hat dir eine Aufgabe im Programm zugewiesen.
alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request', 'problem_interest', 'approach_interest', 'discovery_intro_request',
  'discovery_intro_accepted', 'read_my_mind_handoff', 'founder_in_the_wild_handoff',
  'collaboration_conversation_marker', 'program_update_due', 'program_invited',
  'program_review_requested', 'program_removed', 'program_reward_unlocked',
  'org_task_assigned', 'org_task_comment', 'org_task_due',
  'advisor_org_invited', 'advisor_person_invited', 'founder_invited',
  'program_task_assigned'
));

create or replace function public.on_program_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  -- Neue Zuweisung: Hinweis (nicht an sich selbst, nicht bei privaten Aufgaben).
  if new.assignee_user_id is not null
     and new.visibility = 'shared'
     and new.assignee_user_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.assignee_user_id is distinct from old.assignee_user_id) then
    select p.team_id into v_team from public.team_programs p where p.id = new.program_id;
    insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
    values (
      new.assignee_user_id, auth.uid(), 'program_task_assigned', new.id,
      case when exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = new.assignee_user_id)
           then '/programm#aufgaben'
           else '/advisor/programm/' || new.program_id::text || '?tab=aufgaben' end
    )
    on conflict (recipient_user_id, kind, subject_id) do update set read_at = null, created_at = pg_catalog.now();
  end if;
  -- Wechselt die Zustaendigkeit oder ist die Aufgabe erledigt, wartet der alte Hinweis auf niemanden mehr.
  if tg_op = 'UPDATE' and (new.assignee_user_id is distinct from old.assignee_user_id or new.status = 'done' or new.visibility = 'private') then
    delete from public.in_app_notices n
    where n.kind = 'program_task_assigned' and n.subject_id = new.id
      and (new.status = 'done' or new.visibility = 'private' or n.recipient_user_id is distinct from new.assignee_user_id);
  end if;
  return null;
end;
$$;
revoke all on function public.on_program_task_assignee() from public, anon, authenticated;
create trigger on_program_task_assignee after insert or update on public.team_program_tasks
  for each row execute function public.on_program_task_assignee();

create or replace function public.drop_program_task_notices()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.in_app_notices where kind = 'program_task_assigned' and subject_id = old.id;
  return null;
end;
$$;
revoke all on function public.drop_program_task_notices() from public, anon, authenticated;
create trigger drop_program_task_notices after delete on public.team_program_tasks
  for each row execute function public.drop_program_task_notices();

-- Endet das Programm, gehen die Aufgaben mit.
create or replace function public.drop_program_tasks_on_end()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.team_program_tasks where program_id = new.id;
  return null;
end;
$$;
revoke all on function public.drop_program_tasks_on_end() from public, anon, authenticated;
create trigger drop_program_tasks_on_end after update of status on public.team_programs
  for each row when (new.status = 'ended' and old.status <> 'ended') execute function public.drop_program_tasks_on_end();

-- Wer das Konto loescht, nimmt private Aufgaben mit.
create or replace function public.drop_orphan_private_program_task()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility = 'private' and new.created_by_user_id is null then
    delete from public.team_program_tasks where id = new.id;
  end if;
  return null;
end;
$$;
revoke all on function public.drop_orphan_private_program_task() from public, anon, authenticated;
create trigger drop_orphan_private_program_task after update of created_by_user_id on public.team_program_tasks
  for each row execute function public.drop_orphan_private_program_task();

-- Die Menschen, die zugewiesen werden koennen: das Team und die Inhaberin und Ansprechpersonen der Organisation - nur fuer
-- Berechtigte, mit dem Namen aus dem Kern.
create or replace function public.get_program_task_people(p_program_id uuid)
returns table (user_id uuid, display_name text, side text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(nullif(btrim(core.display_name), ''), ''), 'team'::text
  from public.team_programs p
  join public.founder_team_members m on m.team_id = p.team_id
  left join public.person_core core on core.user_id = m.user_id
  where p.id = p_program_id and public.program_tasks_access(p.id)
  union
  select om.user_id, coalesce(nullif(btrim(core.display_name), ''), ''), 'org'::text
  from public.team_programs p
  join public.advisor_org_members om on om.org_id = p.org_id and om.status = 'active'
  left join public.person_core core on core.user_id = om.user_id
  where p.id = p_program_id and public.program_tasks_access(p.id)
    and (om.role = 'owner' or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = om.user_id))
  order by 3, 2;
$$;
revoke all on function public.get_program_task_people(uuid) from public, anon;
grant execute on function public.get_program_task_people(uuid) to authenticated;

commit;
