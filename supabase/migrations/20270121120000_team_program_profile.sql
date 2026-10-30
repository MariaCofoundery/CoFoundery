-- Programmprofil: die Angaben, die ein Team seinem Programm gibt (Name des
-- Unternehmens, Gruenderinnen und Gruender, Adresse, E-Mail, Telefon).
--
-- Das TEAM pflegt es, kein Mitglied der Organisation. Lesen duerfen es Team,
-- Bezugspersonen und Inhaber - nur solange das Programm AKTIV ist. Mit dem
-- Ende des Programms ist es weg (on delete cascade am Programm, und
-- end_team_program loescht es ausdruecklich).
--
-- Es sind freie Angaben des Teams. Nichts daraus kommt aus dem Profil einer
-- Person, und nichts davon ist eine Freigabe von Arbeitsweisen, Founder Setup
-- oder Team-Review.

begin;

create table public.team_program_profiles (
  program_id uuid primary key references public.team_programs (id) on delete cascade,
  company_name text,
  founders text,
  address text,
  contact_email text,
  contact_phone text,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint team_program_profiles_company check (company_name is null or char_length(company_name) <= 120),
  constraint team_program_profiles_founders check (founders is null or char_length(founders) <= 300),
  constraint team_program_profiles_address check (address is null or char_length(address) <= 300),
  constraint team_program_profiles_email check (contact_email is null or (char_length(contact_email) <= 200 and position('@' in contact_email) > 1)),
  constraint team_program_profiles_phone check (contact_phone is null or char_length(contact_phone) <= 50)
);

alter table public.team_program_profiles enable row level security;
revoke all on public.team_program_profiles from anon, authenticated;

create or replace function public.save_team_program_profile(
  p_program_id uuid,
  p_company_name text,
  p_founders text,
  p_address text,
  p_contact_email text,
  p_contact_phone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nur das Team schreibt.
  if not public.can_use_team_program(p_program_id)
     or not exists (
       select 1 from public.team_programs p
       join public.founder_team_members m on m.team_id = p.team_id and m.user_id = auth.uid()
       where p.id = p_program_id
     ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  insert into public.team_program_profiles as t (program_id, company_name, founders, address, contact_email, contact_phone, updated_by_user_id)
  values (
    p_program_id,
    nullif(btrim(coalesce(p_company_name, '')), ''),
    nullif(btrim(coalesce(p_founders, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(lower(btrim(coalesce(p_contact_email, ''))), ''),
    nullif(btrim(coalesce(p_contact_phone, '')), ''),
    auth.uid()
  )
  on conflict (program_id) do update
  set company_name = excluded.company_name, founders = excluded.founders, address = excluded.address,
      contact_email = excluded.contact_email, contact_phone = excluded.contact_phone,
      updated_by_user_id = auth.uid(), updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.save_team_program_profile(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.save_team_program_profile(uuid, text, text, text, text, text) to authenticated;

create or replace function public.get_team_program_profile(p_program_id uuid)
returns table (company_name text, founders text, address text, contact_email text, contact_phone text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.company_name, t.founders, t.address, t.contact_email, t.contact_phone, t.updated_at
  from public.team_program_profiles t
  where t.program_id = p_program_id and public.can_use_team_program(p_program_id);
$$;
revoke all on function public.get_team_program_profile(uuid) from public, anon;
grant execute on function public.get_team_program_profile(uuid) to authenticated;

-- Mit dem Ende des Programms verschwindet, was das Team ins Programm
-- eingetragen hat: Profil, Meilensteine, Updates und Fragen. Nur "nicht mehr
-- lesbar" waere zu wenig - die Zeilen wuerden liegen bleiben.
create or replace function public.end_team_program(p_program_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
  v_org uuid;
begin
  select team_id, org_id into v_team, v_org from public.team_programs where id = p_program_id and status <> 'ended';
  if v_team is null then return; end if;
  if not (
    exists (select 1 from public.founder_team_members m where m.team_id = v_team and m.user_id = auth.uid())
    or public.is_advisor_org_owner_of(v_org)
  ) then
    raise exception 'team_program_not_yours' using errcode = '42501';
  end if;
  update public.team_programs
  set status = 'ended', ended_at = pg_catalog.now(), ended_by_user_id = auth.uid()
  where id = p_program_id;
  delete from public.team_program_contacts where program_id = p_program_id;
  delete from public.team_program_profiles where program_id = p_program_id;
  delete from public.team_program_milestones where program_id = p_program_id;
  delete from public.team_program_updates where program_id = p_program_id;
  delete from public.team_program_update_questions where program_id = p_program_id;
end;
$$;
revoke all on function public.end_team_program(uuid) from public, anon;
grant execute on function public.end_team_program(uuid) to authenticated;

commit;
