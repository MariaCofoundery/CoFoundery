-- Gespraech zum Stand gehoert zur Begleitung, nicht zu Erfolgen.
--
-- Durchsicht vom 05.11.2026: "Gespraech zum Stand" war an den Schalter fuer Erfolge, Sterne und Belohnungen
-- gebunden (ueber program_side). Wer nichts Spielerisches will, konnte also auch keine Gespraeche
-- festhalten - und die Auswertung zeigte dort nichts. Jetzt:
--   - eigene Seiten-Pruefung ohne den Erfolge-Schalter (program_check_in_side), sonst dieselben Regeln:
--     Inhaberin oder Bezugsperson = 'org', Mitglied des Teams = 'team', nur aktive Programme;
--   - save_check_in und get_check_ins nutzen sie;
--   - die Auswertung zaehlt Gespraeche immer.
-- Belohnungen und Kommentare zu Ergebnissen bleiben an program_side und damit an Erfolgen.

begin;

create or replace function public.program_check_in_side(p_program_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_advisor_org_owner_of(p.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()) then 'org'
    when exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid()) then 'team'
  end
  from public.team_programs p
  where p.id = p_program_id and auth.uid() is not null and p.status = 'active'
    and public.team_program_is_active(p.id);
$$;
revoke all on function public.program_check_in_side(uuid) from public, anon, authenticated;

create or replace function public.save_check_in(p_program_id uuid, p_held_on date, p_summary text, p_next_on date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if public.program_check_in_side(p_program_id) is null then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if p_held_on is null or p_held_on > current_date + 1 then
    raise exception 'check_in_date_invalid' using errcode = '22023';
  end if;
  if p_next_on is not null and p_next_on < p_held_on then
    raise exception 'check_in_date_invalid' using errcode = '22023';
  end if;
  insert into public.program_check_ins (program_id, held_on, summary, next_on, created_by_user_id)
  values (p_program_id, p_held_on, nullif(btrim(coalesce(p_summary, '')), ''), p_next_on, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.save_check_in(uuid, date, text, date) from public, anon;
grant execute on function public.save_check_in(uuid, date, text, date) to authenticated;

create or replace function public.get_check_ins(p_program_id uuid)
returns table (check_in_id uuid, held_on date, summary text, next_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.held_on, c.summary, c.next_on
  from public.program_check_ins c
  where c.program_id = p_program_id and public.program_check_in_side(p_program_id) is not null
  order by c.held_on desc, c.created_at desc
  limit 20;
$$;
revoke all on function public.get_check_ins(uuid) from public, anon;
grant execute on function public.get_check_ins(uuid) to authenticated;

create or replace function public.get_org_report_check_ins(p_org_id uuid, p_from date, p_to date)
returns table (
  program_id uuid, team_name text, members integer,
  check_ins integer, last_held_on date, next_on date
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.program_id, p.team_name, p.members,
    (select count(*)::integer from public.program_check_ins c
     where c.program_id = p.program_id
       and (p_from is null or c.held_on >= p_from)
       and (p_to is null or c.held_on <= p_to)),
    (select max(c.held_on) from public.program_check_ins c
     where c.program_id = p.program_id
       and (p_from is null or c.held_on >= p_from)
       and (p_to is null or c.held_on <= p_to)),
    -- Das naechste vereinbarte Gespraech: aus dem zuletzt gefuehrten, unabhaengig vom Zeitraum.
    (select c.next_on from public.program_check_ins c
     where c.program_id = p.program_id
     order by c.held_on desc, c.created_at desc limit 1)
  from public.program_report_programs(p_org_id) p
  order by p.team_name nulls last, p.program_id;
$$;
revoke all on function public.get_org_report_check_ins(uuid, date, date) from public, anon;
grant execute on function public.get_org_report_check_ins(uuid, date, date) to authenticated;

commit;
