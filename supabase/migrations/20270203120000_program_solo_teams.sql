-- Ein-Personen-Teams im Programm: "Team ist vollstaendig".
--
-- Manche Teams bestehen wirklich nur aus einer Gruenderin oder einem Gruender.
-- Bisher galt ein Team erst ab zwei Personen als aktiv. Jetzt kann das Team
-- selbst - oder die Organisation (Inhaber oder Bezugsperson des Teams) -
-- markieren: "Dieses Team ist vollstaendig, es ist nur eine Person."
--
-- Die Markierung ersetzt KEINE Zustimmung. Aktiv ist ein Team weiterhin nur,
-- wenn jedes aktuelle Mitglied zugestimmt hat; die eine Person hat das beim
-- Beitritt getan. Kommt spaeter eine zweite Person dazu, gilt wieder die Regel
-- "alle zugestimmt" - die Markierung schaltet dann nichts frei. Sie ist nur
-- zulaessig, solange das Team genau eine Person hat, und das Team kann sie
-- jederzeit zuruecknehmen.

begin;

alter table public.team_programs
  add column solo_confirmed_at timestamptz,
  add column solo_confirmed_by uuid references auth.users (id) on delete set null;

create or replace function public.team_program_is_active(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_programs program
    join public.founder_teams team on team.id = program.team_id and team.archived_at is null
    where program.id = p_program_id
      and program.status = 'active'
      and (
        (select count(*) from public.founder_team_members m where m.team_id = program.team_id) >= 2
        or (program.solo_confirmed_at is not null
            and (select count(*) from public.founder_team_members m where m.team_id = program.team_id) = 1)
      )
      and not exists (
        select 1 from public.founder_team_members m
        where m.team_id = program.team_id
          and not exists (
            select 1 from public.team_program_consents c
            where c.program_id = program.id and c.founder_user_id = m.user_id
          )
      )
  );
$$;
revoke all on function public.team_program_is_active(uuid) from public, anon, authenticated;

create or replace function public.set_team_program_solo(p_program_id uuid, p_confirmed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program public.team_programs%rowtype;
  v_members integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select * into v_program from public.team_programs where id = p_program_id and status <> 'ended';
  if not found then
    raise exception 'team_program_not_found' using errcode = 'P0002';
  end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_program.team_id and m.user_id = auth.uid())
    or public.is_advisor_org_owner_of(v_program.org_id)
    or exists (select 1 from public.team_program_contacts c where c.program_id = v_program.id and c.advisor_user_id = auth.uid())
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;

  if p_confirmed then
    select count(*) into v_members from public.founder_team_members m where m.team_id = v_program.team_id;
    if v_members <> 1 then
      raise exception 'team_program_not_solo' using errcode = '23514';
    end if;
    update public.team_programs set solo_confirmed_at = pg_catalog.now(), solo_confirmed_by = auth.uid() where id = p_program_id;
  else
    -- Zuruecknehmen: nur das Team selbst. Die Organisation macht eine Markierung nicht rueckgaengig,
    -- sonst koennte sie ein Team wieder ausblenden, das gerade arbeitet - das darf nur das Team.
    if not exists (select 1 from public.founder_team_members m where m.team_id = v_program.team_id and m.user_id = auth.uid()) then
      raise exception 'team_program_not_yours' using errcode = '42501';
    end if;
    update public.team_programs set solo_confirmed_at = null, solo_confirmed_by = null where id = p_program_id;
  end if;
end;
$$;
revoke all on function public.set_team_program_solo(uuid, boolean) from public, anon;
grant execute on function public.set_team_program_solo(uuid, boolean) to authenticated;

-- Beide Listen tragen die Markierung mit, damit die Seiten sie zeigen koennen.
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
  solo_confirmed boolean
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
    p.solo_confirmed_at is not null
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
  solo_confirmed boolean
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
    p.solo_confirmed_at is not null
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
