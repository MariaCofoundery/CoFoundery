-- Ergebnisse je Batch als beschreibende Zahlen: "3 von 5 Teams haben ...".
--
-- Die Migration 20270210 hat bewusst keine Zahl ueber Teams hinweg angelegt. Hier kommt sie, eng gefasst:
--   - nur die Organisation sieht sie (Inhaber alle Programme, Bezugsperson ihre eigenen, wie in
--     get_org_team_programs), und nur bei eingeschalteter Erfolgs-Funktion;
--   - gezaehlt werden nur bestaetigte Ergebnisse (confirmed_at gesetzt) in aktiven Programmen;
--   - je Batch und Katalogpunkt: Teams im Batch und Teams mit bestaetigtem Ergebnis. Keine Sterne,
--     keine Summe ueber Punkte, keine Quote, keine Reihenfolge nach Ergebnissen, keine Teamnamen.
-- Die Teams werden auf ihrer Programm-Seite darauf hingewiesen (Text in den Uebersetzungen).

begin;

create or replace function public.get_org_outcome_counts(p_org_id uuid)
returns table (batch text, catalog_id uuid, default_key text, title text, teams_total integer, teams_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select p.id, p.batch
    from public.team_programs p
    where p.org_id = p_org_id
      and p.status = 'active'
      and public.team_program_is_active(p.id)
      and public.is_advisor_org_member(p_org_id)
      and public.org_success_enabled(p_org_id)
      and (
        public.is_advisor_org_owner_of(p_org_id)
        or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
      )
  ),
  batches as (
    select v.batch, count(*)::integer as teams_total from visible v group by v.batch
  ),
  done as (
    select v.batch, o.catalog_id, count(*)::integer as n
    from visible v
    join public.program_outcomes o on o.program_id = v.id and o.confirmed_at is not null
    group by v.batch, o.catalog_id
  )
  select b.batch, c.id, c.default_key, c.title, b.teams_total, coalesce(d.n, 0)
  from batches b
  cross join public.program_outcome_catalog c
  left join done d on d.batch is not distinct from b.batch and d.catalog_id = c.id
  where c.org_id = p_org_id and (c.active or d.n is not null)
  order by b.batch nulls last, c.sort_order, c.created_at;
$$;
revoke all on function public.get_org_outcome_counts(uuid) from public, anon;
grant execute on function public.get_org_outcome_counts(uuid) to authenticated;

commit;
