-- Erfolge, Sterne, Belohnungen und Gespraech zum Stand sind optional.
--
-- Jede Organisation entscheidet selbst, ob sie sie nutzt (Voreinstellung: aus). Solange
-- sie aus sind, sehen Teams nichts davon, nichts kann eingetragen werden, und die Seiten
-- der Organisation zeigen nur den Schalter. Ausschalten loescht nichts: Was schon da ist,
-- bleibt bis zum Ende des Programms und erscheint wieder, wenn die Organisation einschaltet.

begin;

alter table public.advisor_orgs add column program_success_enabled boolean not null default false;

create or replace function public.org_success_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select o.program_success_enabled from public.advisor_orgs o where o.id = p_org_id), false);
$$;
revoke all on function public.org_success_enabled(uuid) from public, anon, authenticated;

create or replace function public.get_success_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_advisor_org_member(p_org_id) and public.org_success_enabled(p_org_id);
$$;
revoke all on function public.get_success_enabled(uuid) from public, anon;
grant execute on function public.get_success_enabled(uuid) to authenticated;

create or replace function public.set_success_enabled(p_org_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  update public.advisor_orgs set program_success_enabled = coalesce(p_enabled, false) where id = p_org_id;
end;
$$;
revoke all on function public.set_success_enabled(uuid, boolean) from public, anon;
grant execute on function public.set_success_enabled(uuid, boolean) to authenticated;

-- Belohnungen, Kommentare und Gespraeche laufen ueber program_side: ist die Funktion aus, gibt es keine Seite.
create or replace function public.program_side(p_program_id uuid)
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
    and public.team_program_is_active(p.id) and public.org_success_enabled(p.org_id);
$$;
revoke all on function public.program_side(uuid) from public, anon, authenticated;

-- Die Ergebnisse: lesen und eintragen nur bei eingeschalteter Funktion.
create or replace function public.get_program_outcomes(p_program_id uuid)
returns table (
  catalog_id uuid, default_key text, title text, stars integer,
  outcome_id uuid, achieved_on date, note text, confirmed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_team uuid;
begin
  select org_id, team_id into v_org, v_team from public.team_programs p
  where p.id = p_program_id and p.status = 'active' and public.team_program_is_active(p.id);
  if v_org is null or auth.uid() is null or not public.org_success_enabled(v_org) then
    return;
  end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid())
    or public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid())
  ) then
    return;
  end if;
  perform public.seed_outcome_catalog(v_org);
  return query
  select c.id, c.default_key, c.title, c.stars, o.id, o.achieved_on, o.note, (o.confirmed_at is not null)
  from public.program_outcome_catalog c
  left join public.program_outcomes o on o.catalog_id = c.id and o.program_id = p_program_id
  where c.org_id = v_org and (c.active or o.id is not null)
  order by c.sort_order, c.created_at;
end;
$$;
revoke all on function public.get_program_outcomes(uuid) from public, anon;
grant execute on function public.get_program_outcomes(uuid) to authenticated;

create or replace function public.report_program_outcome(p_program_id uuid, p_catalog_id uuid, p_achieved_on date, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_team uuid;
  v_by_org boolean;
begin
  select org_id, team_id into v_org, v_team from public.team_programs p
  where p.id = p_program_id and p.status = 'active' and public.team_program_is_active(p.id);
  if v_org is null or auth.uid() is null or not public.org_success_enabled(v_org) then
    raise exception 'team_program_not_active' using errcode = '55000';
  end if;
  v_by_org := public.is_advisor_org_owner_of(v_org)
    or exists (select 1 from public.team_program_contacts c where c.program_id = p_program_id and c.advisor_user_id = auth.uid());
  if not v_by_org and not exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid()) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  if not exists (select 1 from public.program_outcome_catalog c where c.id = p_catalog_id and c.org_id = v_org and c.active) then
    raise exception 'outcome_not_found' using errcode = 'P0002';
  end if;
  if p_achieved_on is null or p_achieved_on > current_date + 1 then
    raise exception 'outcome_date_invalid' using errcode = '22023';
  end if;
  insert into public.program_outcomes (program_id, catalog_id, achieved_on, note, reported_by_user_id, confirmed_at, confirmed_by_user_id)
  values (p_program_id, p_catalog_id, p_achieved_on, nullif(btrim(coalesce(p_note, '')), ''), auth.uid(),
          case when v_by_org then pg_catalog.now() end, case when v_by_org then auth.uid() end)
  on conflict (program_id, catalog_id) do update
  set achieved_on = excluded.achieved_on,
      note = excluded.note,
      confirmed_at = case when v_by_org then pg_catalog.now() else null end,
      confirmed_by_user_id = case when v_by_org then auth.uid() else null end;
end;
$$;
revoke all on function public.report_program_outcome(uuid, uuid, date, text) from public, anon;
grant execute on function public.report_program_outcome(uuid, uuid, date, text) to authenticated;

commit;
