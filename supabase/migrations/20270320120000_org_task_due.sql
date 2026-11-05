-- Teamraum: die Faelligkeit einer Aufgabe allein aendern - fuer den Aufgaben-Kalender, in dem man eine
-- Aufgabe auf einen anderen Tag zieht (Wunsch von Maria, 05.11.2026). Dieselben Rechte wie jede
-- Aenderung an einer Aufgabe (20270312120000): aktives Mitglied einer aktiven Organisation.

begin;

create or replace function public.set_org_task_due(p_task_id uuid, p_due_on date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_work_in_org((select t.org_id from public.advisor_org_tasks t where t.id = p_task_id)) then
    raise exception 'org_task_not_yours' using errcode = '42501';
  end if;
  update public.advisor_org_tasks set due_on = p_due_on, updated_at = pg_catalog.now() where id = p_task_id;
end;
$$;
revoke all on function public.set_org_task_due(uuid, date) from public, anon;
grant execute on function public.set_org_task_due(uuid, date) to authenticated;

commit;
