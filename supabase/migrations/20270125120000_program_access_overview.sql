-- Freigaben-Uebersicht fuer Beratende: Welche Einsichten hat DIE AUFRUFENDE
-- Person in ein Programm-Team?
--
-- Das Programm selbst gibt nichts weiter frei. Diese Funktion LIEST nur, was es
-- schon gibt, und aendert nichts:
--   Team-Review:   aktiv, solange eine aktive Review an dieses Team gebunden ist
--                  (Roster unveraendert) und bei mir oder bei meiner Organisation liegt.
--   Founder Setup: aktiv, wenn mein Zugang aktiv ist UND alle aktuellen
--                  Mitglieder zugestimmt haben; "angefragt", solange er aussteht.
-- Sichtbar sind nur die Programme, die ich ohnehin sehen darf (Inhaber alle,
-- Bezugsperson die eigenen). Keine Wertung, keine Gesamtzahl.

begin;

create or replace function public.get_program_access_for_me(p_org_id uuid)
returns table (program_id uuid, team_review text, founder_setup text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case when exists (
      select 1 from public.advisor_team_reviews r
      where r.team_id = p.team_id
        and r.status = 'active'
        and r.team_access_ended_at is null
        and (
          r.advisor_user_id = auth.uid()
          or (r.org_id = p.org_id and public.is_advisor_org_member(p.org_id))
        )
    ) then 'active' else 'none' end,
    case
      when exists (
        select 1 from public.founder_team_advisor_setup_grants g
        where g.team_id = p.team_id and g.advisor_user_id = auth.uid() and g.status = 'active'
          and not exists (
            select 1 from public.founder_team_members m
            where m.team_id = p.team_id
              and not exists (
                select 1 from public.founder_team_advisor_setup_consents c
                where c.grant_id = g.id and c.founder_user_id = m.user_id
              )
          )
      ) then 'active'
      when exists (
        select 1 from public.founder_team_advisor_setup_grants g
        where g.team_id = p.team_id and g.advisor_user_id = auth.uid() and g.status in ('pending', 'active')
      ) then 'requested'
      else 'none'
    end
  from public.team_programs p
  where p.org_id = p_org_id
    and p.status <> 'ended'
    and public.team_program_is_active(p.id)
    and public.is_advisor_org_member(p_org_id)
    and (
      public.is_advisor_org_owner_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    );
$$;
revoke all on function public.get_program_access_for_me(uuid) from public, anon;
grant execute on function public.get_program_access_for_me(uuid) to authenticated;

commit;
