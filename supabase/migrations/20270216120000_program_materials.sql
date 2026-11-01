-- Programmunterlagen als Links: Die Organisation legt Verweise auf ihre eigenen
-- Ablagen an (Ordner, Folien, Aufzeichnungen) - Made2Found speichert keine
-- Dateien. Die Teams im aktiven Programm sehen die Links.
--
-- Grenzen:
--   - Die Unterlagen gehoeren der Organisation, nicht einem Team; sie bleiben,
--     wenn ein Team das Programm verlaesst.
--   - Nur Inhaber legen an, aendern und loeschen; Mitglieder der Organisation
--     lesen. Teams lesen nur, solange ihr Programm aktiv ist (alle zugestimmt).
--   - Nur https-Adressen. Der Link wird nicht abgerufen und nicht geprueft;
--     wer ihn oeffnet, landet bei der Ablage der Organisation und deren Rechten.

begin;

create table public.team_program_materials (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  title text not null,
  url text not null,
  note text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_program_materials_title check (char_length(btrim(title)) between 1 and 160),
  constraint team_program_materials_url check (char_length(url) <= 500 and url ~* '^https://[^[:space:]]+$'),
  constraint team_program_materials_note check (note is null or char_length(note) <= 300)
);
create index team_program_materials_org_idx on public.team_program_materials (org_id, created_at);

alter table public.team_program_materials enable row level security;
revoke all on public.team_program_materials from anon, authenticated;

-- Anlegen und aendern: nur der Inhaber.
create or replace function public.save_program_material(
  p_org_id uuid, p_material_id uuid, p_title text, p_url text, p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_material_id is null then
    insert into public.team_program_materials (org_id, title, url, note, created_by_user_id)
    values (p_org_id, btrim(p_title), btrim(p_url), nullif(btrim(coalesce(p_note, '')), ''), auth.uid())
    returning id into v_id;
  else
    update public.team_program_materials
    set title = btrim(p_title), url = btrim(p_url), note = nullif(btrim(coalesce(p_note, '')), '')
    where id = p_material_id and org_id = p_org_id
    returning id into v_id;
    if v_id is null then
      raise exception 'program_material_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_program_material(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.save_program_material(uuid, uuid, text, text, text) to authenticated;

create or replace function public.delete_program_material(p_material_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.team_program_materials where id = p_material_id;
  if v_org is null or auth.uid() is null or not public.is_advisor_org_owner_of(v_org) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  delete from public.team_program_materials where id = p_material_id;
end;
$$;
revoke all on function public.delete_program_material(uuid) from public, anon;
grant execute on function public.delete_program_material(uuid) to authenticated;

-- Fuer die Organisation: Inhaber und Mitglieder lesen.
create or replace function public.list_program_materials(p_org_id uuid)
returns table (material_id uuid, title text, url text, note text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.title, m.url, m.note
  from public.team_program_materials m
  where m.org_id = p_org_id and public.is_advisor_org_member(p_org_id)
  order by m.created_at, m.id;
$$;
revoke all on function public.list_program_materials(uuid) from public, anon;
grant execute on function public.list_program_materials(uuid) to authenticated;

-- Fuer Teams: nur Organisationen, in deren Programm das Team aktiv ist.
create or replace function public.get_my_program_materials()
returns table (org_name text, material_id uuid, title text, url text, note text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (m.id) o.name, m.id, m.title, m.url, m.note
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id
  join public.team_program_materials m on m.org_id = p.org_id
  where auth.uid() is not null
    and p.status = 'active'
    and public.team_program_is_active(p.id)
    and exists (select 1 from public.founder_team_members t where t.team_id = p.team_id and t.user_id = auth.uid())
  order by m.id;
$$;
revoke all on function public.get_my_program_materials() from public, anon;
grant execute on function public.get_my_program_materials() to authenticated;

commit;
