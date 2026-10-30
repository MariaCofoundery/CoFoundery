-- Programmseite: zwei Farben fuer den Verlauf (Farbe 1 = program_accent, Farbe 2
-- = program_accent_b). Ist Farbe 2 leer, ist die Flaeche einfarbig.

begin;

alter table public.advisor_orgs
  add column program_accent_b text,
  add constraint advisor_orgs_program_accent_b check (program_accent_b is null or program_accent_b ~ '^#[0-9a-f]{6}$');

drop function public.set_org_program_page(uuid, text, boolean, text, text);

create function public.set_org_program_page(
  p_org_id uuid, p_slug text, p_published boolean, p_welcome text, p_accent text default null, p_accent_b text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text := nullif(lower(btrim(coalesce(p_slug, ''))), '');
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if v_slug is not null and v_slug in ('admin', 'api', 'login', 'start', 'dashboard', 'programm', 'advisor', 'account', 'connect', 'discovery', 'p', 'join', 'invite', 'team', 'teams', 'datenschutz', 'impressum', 'agb') then
    raise exception 'program_slug_reserved' using errcode = '22023';
  end if;
  if coalesce(p_published, false) and v_slug is null then
    raise exception 'program_page_needs_slug' using errcode = '22023';
  end if;
  update public.advisor_orgs
  set program_slug = v_slug,
      program_page_published = coalesce(p_published, false),
      program_welcome = nullif(btrim(coalesce(p_welcome, '')), ''),
      program_accent = nullif(lower(btrim(coalesce(p_accent, ''))), ''),
      program_accent_b = nullif(lower(btrim(coalesce(p_accent_b, ''))), '')
  where id = p_org_id;
end;
$$;
revoke all on function public.set_org_program_page(uuid, text, boolean, text, text, text) from public, anon;
grant execute on function public.set_org_program_page(uuid, text, boolean, text, text, text) to authenticated;

drop function public.get_public_program_page(text);

create function public.get_public_program_page(p_slug text)
returns table (org_name text, welcome text, has_logo boolean, accent text, accent_b text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, o.program_welcome, o.program_logo_path is not null, o.program_accent, o.program_accent_b
  from public.advisor_orgs o
  where o.program_slug = lower(btrim(coalesce(p_slug, '')))
    and o.program_page_published and o.status = 'active';
$$;
revoke all on function public.get_public_program_page(text) from public;
grant execute on function public.get_public_program_page(text) to anon, authenticated;

commit;
