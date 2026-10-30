-- Batch, Kategorie und Alumni-Status eines Programm-Teams.
--
-- Das sind Angaben der ORGANISATION ueber ihr Programm (Bezugspersonen und
-- Inhaber setzen sie), keine Angaben des Teams. Sie dienen der Uebersicht:
-- Zaehler und Filter, keine Wertung, keine Rangfolge. Sichtbar sind sie
-- denselben Personen wie das Programm selbst; mit dem Ende des Programms ist
-- die Zeile ohnehin nicht mehr lesbar.

begin;

alter table public.team_programs
  add column batch text,
  add column category text,
  add column is_alumni boolean not null default false,
  add constraint team_programs_batch_len check (batch is null or char_length(batch) <= 60),
  add constraint team_programs_category_len check (category is null or char_length(category) <= 60);

create or replace function public.set_team_program_meta(
  p_program_id uuid,
  p_batch text,
  p_category text,
  p_is_alumni boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_team_program(p_program_id) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  update public.team_programs
  set batch = nullif(btrim(coalesce(p_batch, '')), ''),
      category = nullif(btrim(coalesce(p_category, '')), ''),
      is_alumni = coalesce(p_is_alumni, false)
  where id = p_program_id and status <> 'ended';
end;
$$;
revoke all on function public.set_team_program_meta(uuid, text, text, boolean) from public, anon;
grant execute on function public.set_team_program_meta(uuid, text, text, boolean) to authenticated;

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
  is_alumni boolean
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
    p.is_alumni
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

commit;
