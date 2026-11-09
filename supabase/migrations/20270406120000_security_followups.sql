-- Nachbesserungen aus der Sicherheitsdurchsicht vom 09.11.2026.
--
-- 1. Ansprechpersonen eines Startups (team_program_contacts) behielten ihren Zugang zu den gemeinsamen Programm-Aufgaben,
--    Kommentaren und Zielen, auch nachdem sie die Organisation verlassen hatten oder entfernt wurden. Die aeltere Funktion
--    `can_use_team_program` prueft zusaetzlich die aktive Mitgliedschaft; `program_tasks_access` und
--    `program_task_assignee_ok` taten es nicht. Jetzt:
--      - beide Funktionen verlangen fuer Ansprechpersonen die aktive Mitgliedschaft,
--      - endet eine Mitgliedschaft, werden die Ansprechperson-Zeilen der Person in den Programmen dieser Organisation
--        entfernt (die Inhaberin bestimmt dann neu) - das schliesst auch alle aelteren Funktionen, die nur auf
--        `team_program_contacts` schauen (Anwesenheit, Zusagen, Programmauswertung),
--      - bereits verwaiste Zeilen werden einmalig aufgeraeumt.
-- 2. product_feedback: Die Seite darf kein `//fremder-host` sein (die Admin-Liste verlinkt sie), die Tabelle hatte weit mehr
--    Rechte als noetig, und die eigene Zeile war fuer die Person selbst nicht lesbar - der Datenexport ("alles, was zu dir
--    gehoert") lieferte ihr Feedback deshalb nicht mit.

begin;

-- 1a. Zugang: Ansprechpersonen nur mit aktiver Mitgliedschaft.
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
        or exists (
          select 1 from public.team_program_contacts c
          where c.program_id = p.id and c.advisor_user_id = auth.uid() and public.is_advisor_org_member(p.org_id)
        )
      )
  );
$$;

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
        or exists (
          select 1 from public.team_program_contacts c
          join public.advisor_org_members om on om.org_id = p.org_id and om.user_id = c.advisor_user_id and om.status = 'active'
          where c.program_id = p.id and c.advisor_user_id = p_user_id
        )
      )
  );
$$;

-- 1b. Endet eine Mitgliedschaft, endet auch die Rolle als Ansprechperson.
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
    delete from public.team_program_contacts c
    using public.team_programs p
    where p.id = c.program_id and p.org_id = v_org and c.advisor_user_id = v_user;
  end if;
  return coalesce(new, old);
end;
$$;

-- 1c. Einmalig: Ansprechpersonen ohne aktive Mitgliedschaft entfernen.
delete from public.team_program_contacts c
using public.team_programs p
where p.id = c.program_id
  and not exists (
    select 1 from public.advisor_org_members m
    where m.org_id = p.org_id and m.user_id = c.advisor_user_id and m.status = 'active'
  );

-- 2a. Die Seite im Feedback: nur Woerter, Zahlen, ":id" - nie `//host` oder Backslash. NOT VALID: gilt fuer alles Neue.
alter table public.product_feedback
  add constraint product_feedback_page_path_safe
  check (page_path is null or page_path ~ '^/[a-z0-9:_-]+(/[a-z0-9:_-]+)*$') not valid;

-- 2b. Nur noch das Noetige: eintragen und die eigenen Zeilen lesen (Datenexport). Kein Aendern, Loeschen, Leeren.
revoke all on public.product_feedback from anon, authenticated;
grant select, insert on public.product_feedback to authenticated;
create policy product_feedback_select_own on public.product_feedback
  for select to authenticated using (user_id = auth.uid());

commit;
