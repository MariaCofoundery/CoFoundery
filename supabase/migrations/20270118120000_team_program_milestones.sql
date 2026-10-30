-- Meilensteine im Programm: Das Team und seine Bezugspersonen legen sie
-- gemeinsam an. Sichtbar fuer das Team, die Bezugspersonen und die Inhaber der
-- Organisation - und nur, solange das Programm AKTIV ist (alle aktuellen
-- Mitglieder haben zugestimmt, siehe 20270117120000).
--
-- Fortschritt ist eine Zahl gegen das EIGENE Ziel des Teams ("3 von 5"). Es gibt
-- keine Gesamtwertung und keinen Vergleich zwischen Teams.

begin;

create table public.team_program_milestones (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.team_programs (id) on delete cascade,
  title text not null,
  due_on date,
  target_count integer,
  done_count integer not null default 0,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_program_milestones_title check (char_length(btrim(title)) between 1 and 160),
  constraint team_program_milestones_target check (target_count is null or target_count between 1 and 1000),
  constraint team_program_milestones_done check (done_count >= 0 and (target_count is null or done_count <= target_count))
);
create index team_program_milestones_program_idx on public.team_program_milestones (program_id, due_on);

alter table public.team_program_milestones enable row level security;
revoke all on public.team_program_milestones from anon, authenticated;

-- Intern: Team, Bezugsperson oder Inhaber - bei aktivem Programm.
create or replace function public.can_use_team_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and public.team_program_is_active(p_program_id)
    and exists (
      select 1 from public.team_programs p
      where p.id = p_program_id
        and (
          exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
          or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()
                     and public.is_advisor_org_member(p.org_id))
          or public.is_advisor_org_owner_of(p.org_id)
        )
    );
$$;
revoke all on function public.can_use_team_program(uuid) from public, anon, authenticated;

create or replace function public.list_team_program_milestones(p_program_id uuid)
returns table (milestone_id uuid, title text, due_on date, target_count integer, done_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.title, m.due_on, m.target_count, m.done_count
  from public.team_program_milestones m
  where m.program_id = p_program_id and public.can_use_team_program(p_program_id)
  order by m.due_on nulls last, m.created_at;
$$;
revoke all on function public.list_team_program_milestones(uuid) from public, anon;
grant execute on function public.list_team_program_milestones(uuid) to authenticated;

create or replace function public.save_team_program_milestone(
  p_program_id uuid,
  p_milestone_id uuid,
  p_title text,
  p_due_on date,
  p_target_count integer,
  p_done_count integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.can_use_team_program(p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if p_milestone_id is null then
    insert into public.team_program_milestones (program_id, title, due_on, target_count, done_count, created_by_user_id)
    values (p_program_id, btrim(p_title), p_due_on, p_target_count, coalesce(p_done_count, 0), auth.uid())
    returning id into v_id;
  else
    update public.team_program_milestones
    set title = btrim(p_title), due_on = p_due_on, target_count = p_target_count,
        done_count = coalesce(p_done_count, 0), updated_at = pg_catalog.now()
    where id = p_milestone_id and program_id = p_program_id
    returning id into v_id;
    if v_id is null then
      raise exception 'team_program_milestone_missing' using errcode = '22023';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_team_program_milestone(uuid, uuid, text, date, integer, integer) from public, anon;
grant execute on function public.save_team_program_milestone(uuid, uuid, text, date, integer, integer) to authenticated;

create or replace function public.delete_team_program_milestone(p_program_id uuid, p_milestone_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_use_team_program(p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  delete from public.team_program_milestones where id = p_milestone_id and program_id = p_program_id;
end;
$$;
revoke all on function public.delete_team_program_milestone(uuid, uuid) from public, anon;
grant execute on function public.delete_team_program_milestone(uuid, uuid) to authenticated;

-- Fristen zum Nachfassen: nur Faelle, in denen die Frist erreicht ist und das
-- Ziel nicht erreicht. Eine Liste fuer den Inhaber, keine Wertung.
create or replace function public.get_org_milestone_deadlines(p_org_id uuid)
returns table (program_id uuid, team_name text, milestone_title text, due_on date, target_count integer, done_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, t.name, m.title, m.due_on, m.target_count, m.done_count
  from public.team_program_milestones m
  join public.team_programs p on p.id = m.program_id and p.org_id = p_org_id
  join public.founder_teams t on t.id = p.team_id
  where public.can_use_team_program(p.id)
    and m.due_on is not null and m.due_on <= current_date
    and (m.target_count is null or m.done_count < m.target_count)
    and (
      public.is_advisor_org_owner_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by m.due_on, t.name;
$$;
revoke all on function public.get_org_milestone_deadlines(uuid) from public, anon;
grant execute on function public.get_org_milestone_deadlines(uuid) to authenticated;

commit;
