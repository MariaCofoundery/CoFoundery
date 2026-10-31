-- Sterne und naechste Belohnung je Team, fuer die Team-Karten der Organisation.
--
-- Nur wenn die Organisation Erfolge eingeschaltet hat, nur fuer Teams mit aktivem Programm, nur fuer
-- Inhaber (alle Teams) und Bezugspersonen (die eigenen). Je Team eine Zeile; es gibt keine Summe ueber
-- Teams und keine Reihenfolge nach Sternen (sortiert wird nach Name).

begin;

create or replace function public.get_org_program_stars(p_org_id uuid)
returns table (program_id uuid, stars integer, next_stars integer, next_title text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
         public.program_star_total(p.id),
         nxt.stars_needed,
         nxt.title
  from public.team_programs p
  join public.founder_teams t on t.id = p.team_id
  left join lateral (
    select r.stars_needed, r.title from public.program_rewards r
    where r.org_id = p.org_id and r.active and r.stars_needed > public.program_star_total(p.id)
    order by r.stars_needed limit 1
  ) nxt on true
  where p.org_id = p_org_id
    and p.status = 'active'
    and auth.uid() is not null
    and public.org_success_enabled(p_org_id)
    and public.team_program_is_active(p.id)
    and (
      public.is_advisor_org_owner_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by t.name nulls last, p.created_at;
$$;
revoke all on function public.get_org_program_stars(uuid) from public, anon;
grant execute on function public.get_org_program_stars(uuid) to authenticated;

commit;
