-- Programmseite: eine oeffentliche Einstiegsseite je Organisation
-- (`/p/<kurzname>`) mit Logo, Willkommenstext und einem Feld fuer den
-- Programmcode.
--
-- OEFFENTLICH IST NUR, WAS DIE ORGANISATION VERSTEHT: Name, Willkommenstext,
-- Logo - und nur, wenn der Inhaber die Seite ausdruecklich veroeffentlicht.
-- Ohne Haken ist nichts erreichbar. Die Seite gibt keine Daten der Teams und
-- keine Mitglieder preis.
--
-- Zwei Pruefungen fuer die Anmeldeseite: Ein gueltiger Programmcode oder eine
-- gueltige Programm-Einladung erlaubt, aus diesem Weg ein Konto anzulegen,
-- auch ohne Beta-Zugangscode. Die Funktionen antworten nur mit ja oder nein.

begin;

alter table public.advisor_orgs
  add column program_slug text,
  add column program_page_published boolean not null default false,
  add column program_welcome text,
  add column program_logo_path text,
  add constraint advisor_orgs_program_slug_format
    check (program_slug is null or program_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  add constraint advisor_orgs_program_welcome_len
    check (program_welcome is null or char_length(program_welcome) <= 600),
  add constraint advisor_orgs_program_logo_path
    check (program_logo_path is null or program_logo_path ~ '^[0-9a-f-]{36}/logo-[A-Za-z0-9._-]{1,80}$');

create unique index advisor_orgs_program_slug_uidx on public.advisor_orgs (program_slug) where program_slug is not null;

-- Privater Bucket; geschrieben und gelesen wird nur mit dem Dienstschluessel,
-- nachdem die Anwendung den Inhaber geprueft hat. Keine Policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('program-logos', 'program-logos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_org_program_page(
  p_org_id uuid, p_slug text, p_published boolean, p_welcome text
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
      program_welcome = nullif(btrim(coalesce(p_welcome, '')), '')
  where id = p_org_id;
end;
$$;
revoke all on function public.set_org_program_page(uuid, text, boolean, text) from public, anon;
grant execute on function public.set_org_program_page(uuid, text, boolean, text) to authenticated;

-- Das Logo setzt die Anwendung nach dem Hochladen; der Pfad muss zur Organisation gehoeren.
create or replace function public.set_org_program_logo(p_org_id uuid, p_logo_path text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  if auth.uid() is null or not public.is_advisor_org_owner_of(p_org_id) then
    raise exception 'advisor_org_owner_required' using errcode = '42501';
  end if;
  if p_logo_path is not null and split_part(p_logo_path, '/', 1) <> p_org_id::text then
    raise exception 'program_logo_not_yours' using errcode = '42501';
  end if;
  select program_logo_path into v_old from public.advisor_orgs where id = p_org_id;
  update public.advisor_orgs set program_logo_path = p_logo_path where id = p_org_id;
  return v_old;
end;
$$;
revoke all on function public.set_org_program_logo(uuid, text) from public, anon;
grant execute on function public.set_org_program_logo(uuid, text) to authenticated;

-- Oeffentlich lesbar, aber nur, was veroeffentlicht ist.
create or replace function public.get_public_program_page(p_slug text)
returns table (org_name text, welcome text, has_logo boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, o.program_welcome, o.program_logo_path is not null
  from public.advisor_orgs o
  where o.program_slug = lower(btrim(coalesce(p_slug, '')))
    and o.program_page_published and o.status = 'active';
$$;
revoke all on function public.get_public_program_page(text) from public;
grant execute on function public.get_public_program_page(text) to anon, authenticated;

-- Fuer die Anmeldeseite: erlaubt dieser Code / diese Einladung, ein Konto anzulegen?
create or replace function public.is_valid_team_program_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_program_codes c
    join public.advisor_orgs o on o.id = c.org_id and o.status = 'active'
    where c.code = upper(btrim(coalesce(p_code, '')))
      and c.status = 'active' and c.expires_at > pg_catalog.now() and c.uses < c.max_uses
  );
$$;
revoke all on function public.is_valid_team_program_code(text) from public;
grant execute on function public.is_valid_team_program_code(text) to anon, authenticated;

create or replace function public.is_valid_team_program_invite(p_token_hash text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_program_invites i
    join public.advisor_orgs o on o.id = i.org_id and o.status = 'active'
    where i.token_hash = coalesce(p_token_hash, '')
      and i.status = 'open' and i.expires_at > pg_catalog.now()
  );
$$;
revoke all on function public.is_valid_team_program_invite(text) from public;
grant execute on function public.is_valid_team_program_invite(text) to anon, authenticated;

commit;
