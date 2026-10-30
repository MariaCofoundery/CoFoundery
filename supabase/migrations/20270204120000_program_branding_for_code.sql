-- Die Code-Seite zeigt Logo und Farben der Organisation, zu der der Code gehoert.
--
-- Nur, was die oeffentliche Programmseite ohnehin zeigt (Name, Logo, Farben,
-- Kurzname) und nur, wenn diese Seite veroeffentlicht ist. Der Code verraet
-- damit nichts, was nicht schon auf /p/<kurzname> steht. Nur fuer angemeldete
-- Personen, und wer zu oft einen falschen Code eingegeben hat, bekommt nichts.

begin;

create or replace function public.get_program_branding_for_code(p_code text)
returns table (slug text, org_name text, has_logo boolean, accent text, accent_b text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.team_program_code_may_try() then
    return;
  end if;
  return query
  select o.program_slug, o.name, o.program_logo_path is not null, o.program_accent, o.program_accent_b
  from public.team_program_codes c
  join public.advisor_orgs o on o.id = c.org_id
  where c.code = upper(btrim(coalesce(p_code, '')))
    and c.status = 'active' and c.expires_at > pg_catalog.now()
    and o.status = 'active' and o.program_page_published and o.program_slug is not null;
end;
$$;
revoke all on function public.get_program_branding_for_code(text) from public, anon;
grant execute on function public.get_program_branding_for_code(text) to authenticated;

commit;
