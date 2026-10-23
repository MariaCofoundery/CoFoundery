begin;

-- ---------------------------------------------------------------------------
-- CONNECT: Highlight-Plaetze (von uns empfohlen, Anzeige)
-- ---------------------------------------------------------------------------
-- Bisher waren die drei Highlights reiner Zufall. Jetzt kann die Plattform
-- einen Eintrag selbst empfehlen oder einen bezahlten Platz vergeben. Die Karte
-- sagt dann, warum sie dasteht - bei "Anzeige" ist das Pflicht (§ 5a UWG).
--
-- Ein Platz ist KEINE neue Freigabe. Gezeigt wird ein Eintrag nur, wenn er auch
-- als Zufalls-Highlight erscheinen duerfte: veroeffentlicht, Besitzer aktiv,
-- "darf vorgeschlagen werden" gesetzt, nicht blockiert. Wer das ausgeschaltet
-- hat, wird auch nicht empfohlen und nicht beworben.
--
-- Die Tabelle hat keinen direkten Zugriff. Gelesen und geschrieben wird nur
-- ueber die Funktionen darunter; die Verwaltung prueft is_platform_admin().
create table public.connect_highlight_placements (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('editorial', 'sponsored')),
  target_kind text not null check (target_kind in ('listing', 'venture', 'person', 'problem')),
  target_id uuid not null,
  -- Wem der Eintrag gehoert. Faellt das Konto weg, faellt der Platz mit weg.
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  note text check (note is null or char_length(note) between 1 and 240),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Der Begruendungssatz gehoert nur zu einer Empfehlung. Bei einer Anzeige waere er
  -- Werbetext in unserem Namen.
  check (source = 'editorial' or note is null)
);
create index connect_highlight_placements_active_idx
  on public.connect_highlight_placements (ends_at desc, source);
alter table public.connect_highlight_placements enable row level security;
revoke all on public.connect_highlight_placements from public, anon, authenticated;
grant select, insert, update, delete on public.connect_highlight_placements to service_role;

-- Fuer Mitglieder: die gerade laufenden Plaetze, nur wenn der Eintrag zeigbar ist.
create function public.list_connect_highlight_placements()
returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'placement_id', x.id, 'source', x.source,
           'note', case when x.source = 'editorial' then x.note end,
           'kind', x.target_kind, 'item', x.item)
  from (
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(l) as item
    from public.connect_highlight_placements pl
    join public.network_listings l on pl.target_kind = 'listing' and l.id = pl.target_id
    join public.network_profiles p on p.user_id = l.owner_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.suggestable and public.connect_owner_visible(p.user_id)
      and l.status = 'active' and l.expires_at > now()
    union all
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(v)
    from public.connect_highlight_placements pl
    join public.network_ventures v on pl.target_kind = 'venture' and v.id = pl.target_id
    join public.network_profiles p on p.user_id = v.owner_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.suggestable and public.connect_owner_visible(p.user_id)
      and v.status = 'active'
    union all
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(p)
    from public.connect_highlight_placements pl
    join public.network_profiles p on pl.target_kind = 'person' and p.user_id = pl.target_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.suggestable and public.connect_owner_visible(p.user_id)
    union all
    select pl.id, pl.source, pl.note, pl.target_kind, to_jsonb(n)
    from public.connect_highlight_placements pl
    join public.network_problems n on pl.target_kind = 'problem' and n.id = pl.target_id
    join public.network_profiles p on p.user_id = n.author_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.suggestable and public.connect_owner_visible(p.user_id)
      and n.status = 'active' and not n.moderation_blocked
  ) x
  where public.is_network_member();
$$;
revoke all on function public.list_connect_highlight_placements() from public, anon;
grant execute on function public.list_connect_highlight_placements() to authenticated;

-- Verwaltung: alle Plaetze mit dem Titel des Eintrags.
create function public.admin_list_connect_highlight_placements()
returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  return query
    select jsonb_build_object(
      'id', pl.id, 'source', pl.source, 'kind', pl.target_kind, 'target_id', pl.target_id,
      'note', pl.note, 'starts_at', pl.starts_at, 'ends_at', pl.ends_at,
      'title', case pl.target_kind
        when 'listing' then (select l.title from public.network_listings l where l.id = pl.target_id)
        when 'venture' then (select v.name from public.network_ventures v where v.id = pl.target_id)
        when 'person' then (select p.display_name from public.network_profiles p where p.user_id = pl.target_id)
        else (select n.title from public.network_problems n where n.id = pl.target_id)
      end,
      'owner_name', (select p.display_name from public.network_profiles p where p.user_id = pl.owner_user_id))
    from public.connect_highlight_placements pl
    order by pl.ends_at desc, pl.id;
end;
$$;
revoke all on function public.admin_list_connect_highlight_placements() from public, anon;
grant execute on function public.admin_list_connect_highlight_placements() to authenticated;

create function public.admin_save_connect_highlight_placement(
  p_source text, p_kind text, p_target_id uuid, p_note text,
  p_starts_at timestamptz, p_ends_at timestamptz
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  if p_kind = 'listing' then
    select owner_user_id into v_owner from public.network_listings where id = p_target_id;
  elsif p_kind = 'venture' then
    select owner_user_id into v_owner from public.network_ventures where id = p_target_id;
  elsif p_kind = 'person' then
    select user_id into v_owner from public.network_profiles where user_id = p_target_id;
  elsif p_kind = 'problem' then
    select author_user_id into v_owner from public.network_problems where id = p_target_id;
  else
    raise exception 'invalid_target_kind' using errcode = '22023';
  end if;
  -- Ein Problem ohne Verfasser:in gehoert niemandem, den man fragen koennte.
  if v_owner is null then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  insert into public.connect_highlight_placements
    (source, target_kind, target_id, owner_user_id, note, starts_at, ends_at, created_by)
  values
    (p_source, p_kind, p_target_id, v_owner,
     case when p_source = 'editorial' then nullif(btrim(p_note), '') end,
     coalesce(p_starts_at, now()), p_ends_at, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.admin_save_connect_highlight_placement(text, text, uuid, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_save_connect_highlight_placement(text, text, uuid, text, timestamptz, timestamptz) to authenticated;

create function public.admin_delete_connect_highlight_placement(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  delete from public.connect_highlight_placements where id = p_id;
end;
$$;
revoke all on function public.admin_delete_connect_highlight_placement(uuid) from public, anon;
grant execute on function public.admin_delete_connect_highlight_placement(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
