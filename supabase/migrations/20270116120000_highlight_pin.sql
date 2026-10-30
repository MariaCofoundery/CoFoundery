begin;

-- ---------------------------------------------------------------------------
-- Highlights: anpinnen
-- ---------------------------------------------------------------------------
--
-- Eine eigene Empfehlung kann angepinnt werden: Sie steht dann immer vorn im
-- Karussell, solange sie laeuft, und wird nicht ausgelost. Es ist hoechstens
-- eine angepinnt; eine neue loest die alte ab.
--
-- NUR EMPFEHLUNGEN, KEINE ANZEIGEN. Bei einer Anzeige gilt: "Die Reihenfolge ist
-- keine Rangfolge, auch fuer eine Anzeige nicht." Ein Platz ganz vorn waere genau
-- eine Rangfolge. Die Datenbank erzwingt das (`pinned` nur bei `editorial`).
-- ---------------------------------------------------------------------------

alter table public.connect_highlight_placements
  add column pinned boolean not null default false;
alter table public.connect_highlight_placements
  add constraint connect_highlight_placements_pin_editorial_check check (not pinned or source = 'editorial');

create or replace function public.list_connect_highlight_placements()
returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'placement_id', x.id, 'source', x.source,
           'note', case when x.source = 'editorial' then x.note end,
           'pinned', x.pinned and x.source = 'editorial',
           'kind', x.target_kind, 'item', x.item)
  from (
    select pl.id, pl.source, pl.note, pl.pinned, pl.target_kind, to_jsonb(l) as item
    from public.connect_highlight_placements pl
    join public.network_listings l on pl.target_kind = 'listing' and l.id = pl.target_id
    join public.network_profiles p on p.user_id = l.owner_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
      and l.status = 'active' and l.expires_at > now()
    union all
    select pl.id, pl.source, pl.note, pl.pinned, pl.target_kind, to_jsonb(v)
    from public.connect_highlight_placements pl
    join public.network_ventures v on pl.target_kind = 'venture' and v.id = pl.target_id
    join public.network_profiles p on p.user_id = v.owner_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
      and v.status = 'active'
    union all
    select pl.id, pl.source, pl.note, pl.pinned, pl.target_kind, to_jsonb(p)
    from public.connect_highlight_placements pl
    join public.network_profiles p on pl.target_kind = 'person' and p.user_id = pl.target_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
    union all
    select pl.id, pl.source, pl.note, pl.pinned, pl.target_kind, to_jsonb(n)
    from public.connect_highlight_placements pl
    join public.network_problems n on pl.target_kind = 'problem' and n.id = pl.target_id
    join public.network_profiles p on p.user_id = n.author_user_id
    where pl.starts_at <= now() and pl.ends_at > now()
      and p.status = 'active' and p.highlightable and public.connect_owner_visible(p.user_id)
      and n.status = 'active' and not n.moderation_blocked
  ) x
  where public.is_network_member();
$$;

create or replace function public.admin_list_connect_highlight_placements()
returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;
  return query
    select jsonb_build_object(
      'id', pl.id, 'source', pl.source, 'kind', pl.target_kind, 'target_id', pl.target_id,
      'note', pl.note, 'pinned', pl.pinned, 'starts_at', pl.starts_at, 'ends_at', pl.ends_at,
      'title', case pl.target_kind
        when 'listing' then (select l.title from public.network_listings l where l.id = pl.target_id)
        when 'venture' then (select v.name from public.network_ventures v where v.id = pl.target_id)
        when 'person' then (select p.display_name from public.network_profiles p where p.user_id = pl.target_id)
        else (select n.title from public.network_problems n where n.id = pl.target_id)
      end,
      'owner_name', (select p.display_name from public.network_profiles p where p.user_id = pl.owner_user_id),
      'owner_consent', coalesce((select p.highlightable from public.network_profiles p where p.user_id = pl.owner_user_id), false))
    from public.connect_highlight_placements pl
    order by pl.ends_at desc, pl.id;
end;
$$;

drop function if exists public.admin_save_connect_highlight_placement(text, text, uuid, text, timestamptz, timestamptz);

create function public.admin_save_connect_highlight_placement(
  p_source text, p_kind text, p_target_id uuid, p_note text,
  p_starts_at timestamptz, p_ends_at timestamptz, p_pinned boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_id uuid;
  v_pinned boolean := coalesce(p_pinned, false) and p_source = 'editorial';
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
  if v_owner is null then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  -- Hoechstens eine angepinnte: Die neue loest die alte ab.
  if v_pinned then
    update public.connect_highlight_placements set pinned = false where pinned;
  end if;
  insert into public.connect_highlight_placements
    (source, target_kind, target_id, owner_user_id, note, starts_at, ends_at, created_by, pinned)
  values
    (p_source, p_kind, p_target_id, v_owner,
     case when p_source = 'editorial' then nullif(btrim(p_note), '') end,
     coalesce(p_starts_at, now()), p_ends_at, auth.uid(), v_pinned)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.admin_save_connect_highlight_placement(text, text, uuid, text, timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.admin_save_connect_highlight_placement(text, text, uuid, text, timestamptz, timestamptz, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
