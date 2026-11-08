begin;

-- ---------------------------------------------------------------------------
-- Mitteilungen: drei Darstellungen
-- ---------------------------------------------------------------------------
--
--   card    Karte in der Mitte, die Seite pausiert (bisher die einzige Form).
--   banner  Band oben, die Seite bleibt bedienbar.
--   toast   Hinweis unten rechts (Handy: ueber den Reitern), die Seite bleibt bedienbar.
--
-- Nur das Aussehen aendert sich. Wann eine Mitteilung gezeigt wird, wer sie
-- gesehen hat und was "weggeklickt" heisst, bleibt fuer alle drei gleich.
-- Bestehende Mitteilungen bleiben Karten.
-- ---------------------------------------------------------------------------

alter table public.platform_announcements
  add column display text not null default 'card' check (display in ('card', 'banner', 'toast'));

comment on column public.platform_announcements.display is
  'Darstellung des Pop-ups: card (Mitte, pausiert die Seite), banner (oben), toast (unten rechts). Nur Aussehen.';

-- Rueckgabespalten aendern sich: alte Fassungen weg, neue mit `display`.
drop function public.get_pending_announcement(text);
drop function public.admin_list_announcements();
drop function public.admin_save_announcement(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz);

create function public.get_pending_announcement(p_locale text default 'de')
returns table (id uuid, title text, body text, cta_label text, cta_href text, show_once boolean, display text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.platform_announcements%rowtype;
begin
  if v_user is null then
    return;
  end if;

  select a.* into v_row
  from public.platform_announcements a
  where a.status = 'active'
    and (a.starts_at is null or a.starts_at <= now())
    and (a.ends_at is null or a.ends_at > now())
    and not exists (
      select 1 from public.announcement_receipts r
      where r.announcement_id = a.id and r.user_id = v_user
        and (a.show_once or r.dismissed_at is not null)
    )
  order by a.published_at asc nulls last, a.created_at asc, a.id
  limit 1;

  if not found then
    return;
  end if;

  insert into public.announcement_receipts (announcement_id, user_id)
  values (v_row.id, v_user)
  on conflict (announcement_id, user_id) do nothing;

  return query select
    v_row.id,
    case when p_locale = 'en' and v_row.title_en is not null and v_row.body_en is not null then v_row.title_en else v_row.title_de end,
    case when p_locale = 'en' and v_row.title_en is not null and v_row.body_en is not null then v_row.body_en else v_row.body_de end,
    case when p_locale = 'en' and v_row.cta_label_en is not null then v_row.cta_label_en else v_row.cta_label_de end,
    v_row.cta_href,
    v_row.show_once,
    v_row.display;
end;
$$;

create function public.admin_list_announcements()
returns table (
  id uuid, status text, title_de text, body_de text, title_en text, body_en text,
  cta_label_de text, cta_label_en text, cta_href text, show_once boolean,
  starts_at timestamptz, ends_at timestamptz, published_at timestamptz, created_at timestamptz,
  seen_count bigint, dismissed_count bigint, display text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return query
    select a.id, a.status, a.title_de, a.body_de, a.title_en, a.body_en, a.cta_label_de, a.cta_label_en,
           a.cta_href, a.show_once, a.starts_at, a.ends_at, a.published_at, a.created_at,
           (select count(*) from public.announcement_receipts r where r.announcement_id = a.id),
           (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.dismissed_at is not null),
           a.display
    from public.platform_announcements a
    order by (a.status = 'active') desc, a.created_at desc;
end;
$$;

-- `p_display` steht am Ende und hat einen Standard: Aufrufe mit den bisherigen elf Angaben gelten weiter.
create function public.admin_save_announcement(
  p_id uuid,
  p_title_de text, p_body_de text, p_title_en text, p_body_en text,
  p_cta_label_de text, p_cta_label_en text, p_cta_href text,
  p_show_once boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_display text default 'card'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_display text := coalesce(p_display, 'card');
begin
  if not public.is_platform_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if v_display not in ('card', 'banner', 'toast') then
    raise exception 'invalid_display' using errcode = '23514';
  end if;
  if p_id is null then
    insert into public.platform_announcements (
      created_by, title_de, body_de, title_en, body_en, cta_label_de, cta_label_en, cta_href, show_once, starts_at, ends_at, display
    ) values (
      auth.uid(), btrim(p_title_de), btrim(p_body_de), nullif(btrim(p_title_en), ''), nullif(btrim(p_body_en), ''),
      nullif(btrim(p_cta_label_de), ''), nullif(btrim(p_cta_label_en), ''), nullif(btrim(p_cta_href), ''),
      coalesce(p_show_once, true), p_starts_at, p_ends_at, v_display
    ) returning id into v_id;
  else
    update public.platform_announcements set
      title_de = btrim(p_title_de), body_de = btrim(p_body_de),
      title_en = nullif(btrim(p_title_en), ''), body_en = nullif(btrim(p_body_en), ''),
      cta_label_de = nullif(btrim(p_cta_label_de), ''), cta_label_en = nullif(btrim(p_cta_label_en), ''),
      cta_href = nullif(btrim(p_cta_href), ''), show_once = coalesce(p_show_once, true),
      starts_at = p_starts_at, ends_at = p_ends_at, display = v_display, updated_at = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'announcement_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.get_pending_announcement(text), public.admin_list_announcements(),
  public.admin_save_announcement(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.get_pending_announcement(text), public.admin_list_announcements(),
  public.admin_save_announcement(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
