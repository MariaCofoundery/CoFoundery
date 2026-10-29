begin;

-- ---------------------------------------------------------------------------
-- Mitteilungen der Plattform: Vorlage fest, Inhalt aus dem Admin-Bereich
-- ---------------------------------------------------------------------------
--
-- Eine Mitteilung erscheint als Pop-up. Das Aussehen ist immer gleich, der Inhalt
-- kommt aus dem Admin-Bereich (Titel, Text, optional ein Knopf, deutsch und
-- englisch). Wer sie wegklickt, hat sie gelesen: Sie liegt danach im Postfach
-- ("Nachrichten") und erscheint nicht wieder.
--
--   show_once = true   Einmalig. Sie wird beim ersten Zeigen als gesehen
--                      vermerkt und kommt nicht wieder, auch wenn sie nicht
--                      weggeklickt wurde.
--   show_once = false  Sie kommt bei jedem Besuch wieder, bis sie weggeklickt ist.
--
-- Die Tabellen sind fuer Angemeldete geschlossen; alles laeuft ueber die
-- Funktionen unten. Admin-Funktionen pruefen `is_platform_admin()` selbst.
--
-- DATENSCHUTZ: `announcement_receipts` haelt nur "diese Person hat Mitteilung X
-- gesehen/weggeklickt". Sie haengt am Konto und wird mit ihm geloescht.
-- ---------------------------------------------------------------------------

create table public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  title_de text not null check (char_length(btrim(title_de)) between 1 and 120),
  body_de text not null check (char_length(btrim(body_de)) between 1 and 1500),
  title_en text check (title_en is null or char_length(btrim(title_en)) between 1 and 120),
  body_en text check (body_en is null or char_length(btrim(body_en)) between 1 and 1500),
  cta_label_de text check (cta_label_de is null or char_length(btrim(cta_label_de)) between 1 and 40),
  cta_label_en text check (cta_label_en is null or char_length(btrim(cta_label_en)) between 1 and 40),
  -- Ein Pfad in der App ("/connect") oder eine https-Adresse. Nichts anderes:
  -- kein javascript:, kein //fremde-seite.
  cta_href text check (
    cta_href is null
    or (char_length(cta_href) <= 300 and (cta_href ~ '^/[^/\s]' or cta_href = '/' or cta_href ~ '^https://[^\s/]+'))
  ),
  show_once boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  constraint platform_announcements_window_check check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint platform_announcements_cta_pair_check check (cta_href is null or cta_label_de is not null)
);

create table public.announcement_receipts (
  announcement_id uuid not null references public.platform_announcements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  dismissed_at timestamptz,
  primary key (announcement_id, user_id)
);

create index announcement_receipts_user_idx on public.announcement_receipts (user_id, first_seen_at desc);

alter table public.platform_announcements enable row level security;
alter table public.announcement_receipts enable row level security;
revoke all on public.platform_announcements from public, anon, authenticated;
revoke all on public.announcement_receipts from public, anon, authenticated;

comment on table public.platform_announcements is
  'Mitteilungen der Plattform als Pop-up. Fester Aufbau, Inhalt aus dem Admin-Bereich. Nur ueber Funktionen zugaenglich.';
comment on table public.announcement_receipts is
  'Wer welche Mitteilung gesehen oder weggeklickt hat. Nur ueber Funktionen zugaenglich; mit dem Konto geloescht.';


-- ---------------------------------------------------------------------------
-- Fuer alle Angemeldeten
-- ---------------------------------------------------------------------------

/**
 * Die naechste Mitteilung, die diese Person noch nicht erledigt hat - oder nichts.
 * Gleichzeitig wird sie als "gesehen" vermerkt (deshalb nicht `stable`): Bei
 * "einmalig" ist das das Ende ihrer Laufbahn, auch ohne Klick.
 */
create function public.get_pending_announcement(p_locale text default 'de')
returns table (id uuid, title text, body text, cta_label text, cta_href text, show_once boolean)
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
    v_row.show_once;
end;
$$;

/** Weggeklickt: gelesen, erledigt, liegt danach im Postfach. */
create function public.dismiss_announcement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  -- Nur eine Mitteilung, die es gibt und die nicht noch ein Entwurf ist.
  if not exists (select 1 from public.platform_announcements a where a.id = p_id and a.status <> 'draft') then
    raise exception 'announcement_not_found' using errcode = 'P0002';
  end if;
  insert into public.announcement_receipts (announcement_id, user_id, dismissed_at)
  values (p_id, auth.uid(), now())
  on conflict (announcement_id, user_id)
  do update set dismissed_at = coalesce(public.announcement_receipts.dismissed_at, now());
end;
$$;

/** Das Postfach der Mitteilungen: alles, was diese Person schon gesehen hat. */
create function public.list_my_announcements(p_locale text default 'de')
returns table (id uuid, title text, body text, cta_label text, cta_href text, first_seen_at timestamptz, dismissed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    case when p_locale = 'en' and a.title_en is not null and a.body_en is not null then a.title_en else a.title_de end,
    case when p_locale = 'en' and a.title_en is not null and a.body_en is not null then a.body_en else a.body_de end,
    case when p_locale = 'en' and a.cta_label_en is not null then a.cta_label_en else a.cta_label_de end,
    a.cta_href,
    r.first_seen_at,
    r.dismissed_at
  from public.announcement_receipts r
  join public.platform_announcements a on a.id = r.announcement_id
  where r.user_id = auth.uid()
    and a.status <> 'draft'
  order by r.first_seen_at desc, a.id
  limit 50;
$$;


-- ---------------------------------------------------------------------------
-- Nur fuer Admins
-- ---------------------------------------------------------------------------

create function public.admin_list_announcements()
returns table (
  id uuid, status text, title_de text, body_de text, title_en text, body_en text,
  cta_label_de text, cta_label_en text, cta_href text, show_once boolean,
  starts_at timestamptz, ends_at timestamptz, published_at timestamptz, created_at timestamptz,
  seen_count bigint, dismissed_count bigint
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
           (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.dismissed_at is not null)
    from public.platform_announcements a
    order by (a.status = 'active') desc, a.created_at desc;
end;
$$;

create function public.admin_save_announcement(
  p_id uuid,
  p_title_de text, p_body_de text, p_title_en text, p_body_en text,
  p_cta_label_de text, p_cta_label_en text, p_cta_href text,
  p_show_once boolean, p_starts_at timestamptz, p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_id is null then
    insert into public.platform_announcements (
      created_by, title_de, body_de, title_en, body_en, cta_label_de, cta_label_en, cta_href, show_once, starts_at, ends_at
    ) values (
      auth.uid(), btrim(p_title_de), btrim(p_body_de), nullif(btrim(p_title_en), ''), nullif(btrim(p_body_en), ''),
      nullif(btrim(p_cta_label_de), ''), nullif(btrim(p_cta_label_en), ''), nullif(btrim(p_cta_href), ''),
      coalesce(p_show_once, true), p_starts_at, p_ends_at
    ) returning id into v_id;
  else
    update public.platform_announcements set
      title_de = btrim(p_title_de), body_de = btrim(p_body_de),
      title_en = nullif(btrim(p_title_en), ''), body_en = nullif(btrim(p_body_en), ''),
      cta_label_de = nullif(btrim(p_cta_label_de), ''), cta_label_en = nullif(btrim(p_cta_label_en), ''),
      cta_href = nullif(btrim(p_cta_href), ''), show_once = coalesce(p_show_once, true),
      starts_at = p_starts_at, ends_at = p_ends_at, updated_at = now()
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'announcement_not_found' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

/** draft -> active (setzt den Zeitpunkt der Veroeffentlichung), active -> archived, und zurueck zum Entwurf. */
create function public.admin_set_announcement_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_status not in ('draft', 'active', 'archived') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  update public.platform_announcements
     set status = p_status,
         -- clock_timestamp() und nicht now(): Die Reihenfolge, in der Mitteilungen gezeigt
         -- werden, soll auch dann stimmen, wenn zwei in derselben Anweisung veroeffentlicht werden.
         published_at = case when p_status = 'active' then coalesce(published_at, clock_timestamp()) else published_at end,
         updated_at = now()
   where id = p_id;
  if not found then
    raise exception 'announcement_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_pending_announcement(text), public.dismiss_announcement(uuid), public.list_my_announcements(text),
  public.admin_list_announcements(), public.admin_set_announcement_status(uuid, text),
  public.admin_save_announcement(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_pending_announcement(text), public.dismiss_announcement(uuid), public.list_my_announcements(text),
  public.admin_list_announcements(), public.admin_set_announcement_status(uuid, text),
  public.admin_save_announcement(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz)
  to authenticated;

notify pgrst, 'reload schema';

commit;
