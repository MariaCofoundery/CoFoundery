-- Die Zustimmung zum Programm schliesst das Founder Setup (bestaetigte Fassung) ein.
--
-- Wer ein Begleitprogramm beginnt, will mit der Organisation darueber reden;
-- eine zweite und dritte Freigabe waere Reibung ohne Gewinn. Damit das keine
-- stille Ausweitung ist, steht es AUSDRUECKLICH im Zustimmungstext - und wird
-- je Programm festgehalten (includes_setup): Programme, die vorher begannen,
-- bekommen es NICHT nachtraeglich; nur Programme, die mit diesem Text beginnen.
--
-- Die bestehende Setup-Freigabe ueber Begleitbeziehungen bleibt unberuehrt.
-- Dies ist eine eigene Lesefunktion mit denselben Grenzen:
--   - nur bestaetigte Fassungen, und nur Punkte, die JEDES aktuelle Mitglied
--     bestaetigt hat (wie im Teambericht),
--   - nur lesend,
--   - nur solange das Programm aktiv ist (alle zugestimmt, Roster stimmt),
--   - nur fuer Inhaber der Organisation und Bezugspersonen dieses Teams.

begin;

alter table public.team_programs add column includes_setup boolean not null default false;
alter table public.team_programs alter column includes_setup set default true;

create or replace function public.get_program_confirmed_setup(p_program_id uuid)
returns table (
  item_key text,
  resolution_status text,
  note text,
  documentation_reference text,
  confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select item.item_key, revision.resolution_status, revision.note, revision.documentation_reference, revision.confirmed_at
  from public.team_programs p
  join public.founder_team_setup_items item on item.team_id = p.team_id
  join public.founder_team_setup_revisions revision
    on revision.id = item.current_confirmed_revision_id and revision.setup_item_id = item.id
  where p.id = p_program_id
    and auth.uid() is not null
    and p.status = 'active'
    and p.includes_setup
    and public.team_program_is_active(p.id)
    and (
      public.is_advisor_org_owner_of(p.org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
    and revision.confirmed_at is not null
    and revision.superseded_at is null
    and not exists (
      select 1 from public.founder_team_members current_member
      where current_member.team_id = p.team_id
        and not exists (
          select 1 from public.founder_team_setup_confirmations confirmation
          where confirmation.revision_id = revision.id
            and confirmation.user_id = current_member.user_id
            and public.setup_confirmation_is_current(p.team_id, confirmation.user_id, confirmation.confirmed_at)))
  order by item.item_key;
$$;
revoke all on function public.get_program_confirmed_setup(uuid) from public, anon;
grant execute on function public.get_program_confirmed_setup(uuid) to authenticated;

-- Die Freigaben-Uebersicht (Fassung aus 20270126, mit "angefragt" fuer die Team-Review) zeigt das Setup als aktiv, wenn es ueber das Programm gilt.
create or replace function public.get_program_access_for_me(p_org_id uuid)
returns table (program_id uuid, team_review text, founder_setup text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case
      when exists (
        select 1 from public.advisor_team_reviews r
        where r.team_id = p.team_id
          and r.status = 'active'
          and r.team_access_ended_at is null
          and (
            r.advisor_user_id = auth.uid()
            or (r.org_id = p.org_id and public.is_advisor_org_member(p.org_id))
          )
      ) then 'active'
      when exists (
        select 1 from public.advisor_team_reviews r
        where r.advisor_user_id = auth.uid() and r.status = 'requested'
          and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id)
          and not exists (
            select 1 from public.advisor_team_review_members x
            where x.review_id = r.id
              and not exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = x.subject_user_id)
          )
          and not exists (
            select 1 from public.founder_team_members m
            where m.team_id = p.team_id and m.user_id <> auth.uid()
              and not exists (select 1 from public.advisor_team_review_members x where x.review_id = r.id and x.subject_user_id = m.user_id)
          )
      ) then 'requested'
      else 'none'
    end,
    case
      when p.includes_setup then 'active'
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

-- Beide Listen tragen mit, ob das Programm das Setup einschliesst, damit die Seiten es ehrlich sagen.
drop function public.get_org_team_programs(uuid);
create function public.get_org_team_programs(p_org_id uuid)
returns table (
  program_id uuid,
  team_id uuid,
  team_name text,
  status text,
  is_active boolean,
  member_count integer,
  approved_count integer,
  contact_user_ids uuid[],
  is_contact boolean,
  batch text,
  category text,
  is_alumni boolean,
  solo_confirmed boolean,
  includes_setup boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.team_id,
    t.name,
    p.status,
    public.team_program_is_active(p.id),
    (select count(*)::integer from public.founder_team_members m where m.team_id = p.team_id),
    (select count(*)::integer from public.founder_team_members m
       join public.team_program_consents c on c.program_id = p.id and c.founder_user_id = m.user_id
       where m.team_id = p.team_id),
    coalesce((select array_agg(c.advisor_user_id order by c.created_at) from public.team_program_contacts c where c.program_id = p.id), '{}'::uuid[]),
    exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid()),
    p.batch,
    p.category,
    p.is_alumni,
    p.solo_confirmed_at is not null,
    p.includes_setup
  from public.team_programs p
  join public.founder_teams t on t.id = p.team_id
  where p.org_id = p_org_id
    and p.status <> 'ended'
    and public.is_advisor_org_member(p_org_id)
    and (
      public.is_advisor_org_owner_of(p_org_id)
      or exists (select 1 from public.team_program_contacts c where c.program_id = p.id and c.advisor_user_id = auth.uid())
    )
  order by t.name nulls last, p.created_at;
$$;
revoke all on function public.get_org_team_programs(uuid) from public, anon;
grant execute on function public.get_org_team_programs(uuid) to authenticated;

drop function public.get_my_team_programs();
create function public.get_my_team_programs()
returns table (
  program_id uuid,
  team_id uuid,
  org_name text,
  status text,
  is_active boolean,
  i_approved boolean,
  member_count integer,
  approved_count integer,
  contact_names text[],
  admin_names text[],
  solo_confirmed boolean,
  includes_setup boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.team_id,
    o.name,
    p.status,
    public.team_program_is_active(p.id),
    exists (select 1 from public.team_program_consents c where c.program_id = p.id and c.founder_user_id = auth.uid()),
    (select count(*)::integer from public.founder_team_members m where m.team_id = p.team_id),
    (select count(*)::integer from public.founder_team_members m
       join public.team_program_consents c on c.program_id = p.id and c.founder_user_id = m.user_id
       where m.team_id = p.team_id),
    coalesce((select array_agg(coalesce(nullif(btrim(core.display_name), ''), '') order by c.created_at)
              from public.team_program_contacts c
              left join public.person_core core on core.user_id = c.advisor_user_id
              where c.program_id = p.id), '{}'::text[]),
    coalesce((select array_agg(coalesce(nullif(btrim(core.display_name), ''), '') order by om.created_at)
              from public.advisor_org_members om
              left join public.person_core core on core.user_id = om.user_id
              where om.org_id = p.org_id and om.role = 'owner' and om.status = 'active'), '{}'::text[]),
    p.solo_confirmed_at is not null,
    p.includes_setup
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  where p.status <> 'ended'
    and auth.uid() is not null
    and exists (select 1 from public.founder_team_members m where m.team_id = p.team_id and m.user_id = auth.uid())
  order by p.created_at;
$$;
revoke all on function public.get_my_team_programs() from public, anon;
grant execute on function public.get_my_team_programs() to authenticated;


commit;
