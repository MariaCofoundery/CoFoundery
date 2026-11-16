-- Veranstaltungen im Admin anlegen und bearbeiten (Entwurf 16.11.2026).
--
-- Bisher entstanden Events nur von Hand in der Datenbank (kein Codepfad, keine Policy). Jetzt gibt es Admin-Funktionen mit Pruefung
-- (is_platform_admin) und Regeln, die die Seite braucht: ein sauberer Name in der Adresse (slug), ein Ende fuer alles ausser Entwuerfen,
-- kein Loeschen von Events mit Teilnahmen. Dazu eine oeffentliche Funktion, die NUR den Namen einer Veranstaltung liefert: Die Seite hinter
-- dem QR-Code zeigt ihn an ("Gruendungsabend Leipzig") - sonst nichts.
begin;

create or replace function public.admin_list_events()
returns table (id uuid, slug text, name text, status text, starts_at timestamptz, ends_at timestamptz, created_at timestamptz, participants bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query
    select e.id, e.slug, e.name, e.status, e.starts_at, e.ends_at, e.created_at,
           (select count(*) from public.event_participants p where p.event_id = e.id)
    from public.events e order by coalesce(e.starts_at, e.created_at) desc;
end;
$$;

create or replace function public.admin_save_event(p_id uuid, p_slug text, p_name text, p_status text, p_starts_at timestamptz, p_ends_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_slug text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_slug, ''))); v_name text := pg_catalog.btrim(coalesce(p_name, '')); v_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) not between 3 and 60 then raise exception 'event_slug_invalid' using errcode = '22023'; end if;
  if char_length(v_name) not between 2 and 120 then raise exception 'event_name_invalid' using errcode = '22023'; end if;
  if p_status not in ('draft', 'live', 'closed') then raise exception 'event_status_invalid' using errcode = '22023'; end if;
  if p_status <> 'draft' and p_ends_at is null then raise exception 'event_end_required' using errcode = '23514'; end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at < p_starts_at then raise exception 'event_time_invalid' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.events (slug, name, status, starts_at, ends_at) values (v_slug, v_name, p_status, p_starts_at, p_ends_at) returning events.id into v_id;
  else
    update public.events set slug = v_slug, name = v_name, status = p_status, starts_at = p_starts_at, ends_at = p_ends_at where events.id = p_id returning events.id into v_id;
    if v_id is null then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'event_slug_taken' using errcode = '23505';
end;
$$;

-- Loeschen nur ohne Teilnahmen: Hinter einer Teilnahme stehen Namen, E-Mails und Antworten, die ihre eigene Frist haben (24 Stunden nach Ende).
create or replace function public.admin_delete_event(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if exists (select 1 from public.event_participants p where p.event_id = p_id) then raise exception 'event_has_participants' using errcode = '23503'; end if;
  delete from public.events where id = p_id;
  return found;
end;
$$;

-- Oeffentlich: nur der Name. Fuer die Seite hinter dem QR-Code. Kein Status, keine Zeiten, keine Teilnehmenden.
create or replace function public.get_public_event_name(p_slug text)
returns text language sql stable security definer set search_path = '' as $$
  select e.name from public.events e where e.slug = pg_catalog.lower(pg_catalog.btrim(coalesce(p_slug, ''))) limit 1;
$$;

do $$
declare f text;
begin
  foreach f in array array['admin_list_events()', 'admin_save_event(uuid, text, text, text, timestamptz, timestamptz)', 'admin_delete_event(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public.get_public_event_name(text) from public;
  grant execute on function public.get_public_event_name(text) to anon, authenticated;
end $$;

commit;
