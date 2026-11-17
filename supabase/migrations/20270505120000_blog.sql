-- Blog: oeffentliche Beitraege auf der Domain der App (Entwurf 17.11.2026).
--
-- Ein Beitrag besteht wie eine Newsletter-Ausgabe aus Bausteinen (blocks als JSON), hat aber eine Sprache (de oder en, je Beitrag), eine Adresse (slug)
-- und einen Weg: Entwurf -> freigegeben -> veroeffentlicht. NICHTS wird automatisch veroeffentlicht: jeder Schritt ist eine Handlung im Admin.
-- Gelesen und geschrieben wird nur ueber Funktionen. Die Admin-Funktionen pruefen is_platform_admin(); die oeffentlichen Funktionen liefern
-- ausschliesslich VEROEFFENTLICHTE Beitraege und keine Konten-, Team- oder Forschungsdaten (die Tabelle kennt solche Spalten gar nicht).
begin;

-- Bilder: oeffentlich lesbar (Seite und Vorschaubild), geschrieben nur ueber den Dienst nach Admin-Pruefung.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog', 'blog', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  language text not null default 'de',
  translation_key text not null default '',
  title text not null default '',
  excerpt text not null default '',
  author_name text not null default '',
  post_date date not null default (pg_catalog.now() at time zone 'Europe/Berlin')::date,
  cover_path text,
  cover_alt text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint blog_posts_slug check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  constraint blog_posts_language check (language in ('de', 'en')),
  constraint blog_posts_translation_key check (translation_key ~ '^[a-z0-9-]{0,80}$'),
  constraint blog_posts_status check (status in ('draft', 'approved', 'published')),
  constraint blog_posts_text check (char_length(title) <= 140 and char_length(excerpt) <= 300 and char_length(author_name) <= 80 and char_length(cover_alt) <= 200),
  constraint blog_posts_blocks check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 60),
  constraint blog_posts_published check (status <> 'published' or published_at is not null)
);
create unique index blog_posts_slug_key on public.blog_posts (slug);
-- Je Uebersetzungsgruppe hoechstens eine Fassung je Sprache.
create unique index blog_posts_translation_key_language on public.blog_posts (translation_key, language) where translation_key <> '';
create index blog_posts_published_idx on public.blog_posts (post_date desc) where status = 'published';
alter table public.blog_posts enable row level security;
revoke all on public.blog_posts from public, anon, authenticated;

-- Was fehlt, damit ein Beitrag freigegeben oder veroeffentlicht werden darf? NULL = nichts. Ein Bild ohne Alternativtext ist ein Fehler, kein Schoenheitsfehler.
create or replace function public.blog_post_problem(p public.blog_posts)
returns text language plpgsql immutable set search_path = '' as $$
declare v_last jsonb; v_buttons integer;
begin
  if pg_catalog.btrim(p.title) = '' then return 'blog_title'; end if;
  if pg_catalog.btrim(p.excerpt) = '' then return 'blog_excerpt'; end if;
  if pg_catalog.btrim(p.author_name) = '' then return 'blog_author'; end if;
  if jsonb_array_length(p.blocks) = 0 then return 'blog_empty'; end if;
  if exists (select 1 from jsonb_array_elements(p.blocks) b where b->>'type' = 'image' and (pg_catalog.btrim(coalesce(b->>'alt', '')) = '' or pg_catalog.btrim(coalesce(b->>'path', '')) = '')) then return 'blog_alt'; end if;
  if p.cover_path is not null and pg_catalog.btrim(p.cover_alt) = '' then return 'blog_alt'; end if;
  select count(*) into v_buttons from jsonb_array_elements(p.blocks) b where b->>'type' = 'button';
  if v_buttons > 1 then return 'blog_cta'; end if;
  if v_buttons = 1 then
    v_last := p.blocks -> (jsonb_array_length(p.blocks) - 1);
    if v_last->>'type' <> 'button' or pg_catalog.btrim(coalesce(v_last->>'label', '')) = '' or pg_catalog.btrim(coalesce(v_last->>'href', '')) = '' then return 'blog_cta'; end if;
  end if;
  return null;
end;
$$;

create or replace function public.admin_list_blog_posts()
returns table (id uuid, slug text, language text, title text, status text, post_date date, published_at timestamptz, updated_at timestamptz, translation_key text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select b.id, b.slug, b.language, b.title, b.status, b.post_date, b.published_at, b.updated_at, b.translation_key
  from public.blog_posts b order by b.created_at desc;
end;
$$;

create or replace function public.admin_get_blog_post(p_id uuid)
returns setof public.blog_posts
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select * from public.blog_posts where id = p_id;
end;
$$;

-- Speichern (neu oder bestehend). Nur ein Entwurf laesst sich aendern; fuer eine Aenderung geht ein Beitrag zurueck in den Entwurf.
create or replace function public.admin_save_blog_post(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.blog_posts (slug, language, translation_key, title, excerpt, author_name, post_date, cover_path, cover_alt, blocks)
    values (
      coalesce(nullif(p->>'slug', ''), 'beitrag-' || pg_catalog.substr(pg_catalog.md5(gen_random_uuid()::text), 1, 8)), coalesce(p->>'language', 'de'),
      coalesce(p->>'translation_key', ''), coalesce(p->>'title', ''), coalesce(p->>'excerpt', ''), coalesce(p->>'author_name', ''),
      coalesce(nullif(p->>'post_date', '')::date, (pg_catalog.now() at time zone 'Europe/Berlin')::date),
      nullif(p->>'cover_path', ''), coalesce(p->>'cover_alt', ''), coalesce(p->'blocks', '[]'::jsonb)
    ) returning id into v_id;
    return v_id;
  end if;
  select status into v_status from public.blog_posts where id = p_id;
  if v_status is null then raise exception 'blog_not_found' using errcode = 'P0002'; end if;
  if v_status <> 'draft' then raise exception 'blog_locked' using errcode = '55000'; end if;
  update public.blog_posts set
    slug = coalesce(nullif(p->>'slug', ''), slug), language = coalesce(p->>'language', language),
    translation_key = coalesce(p->>'translation_key', translation_key), title = coalesce(p->>'title', title), excerpt = coalesce(p->>'excerpt', excerpt),
    author_name = coalesce(p->>'author_name', author_name), post_date = coalesce(nullif(p->>'post_date', '')::date, post_date),
    cover_path = case when p ? 'cover_path' then nullif(p->>'cover_path', '') else cover_path end,
    cover_alt = coalesce(p->>'cover_alt', cover_alt), blocks = coalesce(p->'blocks', blocks), updated_at = pg_catalog.now()
  where id = p_id;
  return p_id;
end;
$$;

-- Der Weg: draft -> approved (freigeben), approved -> published, approved/published -> draft. Freigeben und Veroeffentlichen pruefen, ob der Beitrag vollstaendig ist.
create or replace function public.admin_set_blog_status(p_id uuid, p_status text)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.blog_posts%rowtype; v_problem text;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  select * into v from public.blog_posts where id = p_id for update;
  if not found then raise exception 'blog_not_found' using errcode = 'P0002'; end if;
  if p_status = 'approved' then
    if v.status <> 'draft' then raise exception 'blog_locked' using errcode = '55000'; end if;
    v_problem := public.blog_post_problem(v);
    if v_problem is not null then raise exception '%', v_problem using errcode = '23514'; end if;
    update public.blog_posts set status = 'approved', updated_at = pg_catalog.now() where id = p_id;
  elsif p_status = 'published' then
    if v.status <> 'approved' then raise exception 'blog_not_approved' using errcode = '55000'; end if;
    v_problem := public.blog_post_problem(v);
    if v_problem is not null then raise exception '%', v_problem using errcode = '23514'; end if;
    update public.blog_posts set status = 'published', published_at = pg_catalog.now(), updated_at = pg_catalog.now() where id = p_id;
  elsif p_status = 'draft' then
    if v.status = 'draft' then raise exception 'blog_locked' using errcode = '55000'; end if;
    update public.blog_posts set status = 'draft', published_at = null, updated_at = pg_catalog.now() where id = p_id;
  else
    raise exception 'blog_invalid' using errcode = '22023';
  end if;
  return p_status;
end;
$$;

-- Loeschen: nur Entwuerfe. Was veroeffentlicht war, geht erst zurueck in den Entwurf.
create or replace function public.admin_delete_blog_post(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  delete from public.blog_posts where id = p_id and status = 'draft';
  if not found then raise exception 'blog_locked' using errcode = '55000'; end if;
  return true;
end;
$$;

-- Oeffentlich: nur Veroeffentlichtes, nur Beitragsfelder.
create or replace function public.public_list_blog_posts(p_language text default null)
returns table (slug text, language text, title text, excerpt text, author_name text, post_date date, cover_path text, cover_alt text, published_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select b.slug, b.language, b.title, b.excerpt, b.author_name, b.post_date, b.cover_path, b.cover_alt, b.published_at
  from public.blog_posts b where b.status = 'published' and (p_language is null or b.language = p_language)
  order by b.post_date desc, b.published_at desc limit 200;
end;
$$;

create or replace function public.public_get_blog_post(p_slug text)
returns table (slug text, language text, title text, excerpt text, author_name text, post_date date, cover_path text, cover_alt text, blocks jsonb,
               published_at timestamptz, updated_at timestamptz, translations jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select b.slug, b.language, b.title, b.excerpt, b.author_name, b.post_date, b.cover_path, b.cover_alt, b.blocks, b.published_at, b.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object('slug', t.slug, 'language', t.language, 'title', t.title))
              from public.blog_posts t where b.translation_key <> '' and t.translation_key = b.translation_key and t.id <> b.id and t.status = 'published'), '[]'::jsonb)
  from public.blog_posts b where b.slug = p_slug and b.status = 'published';
end;
$$;

create or replace function public.public_blog_sitemap()
returns table (slug text, language text, updated_at timestamptz, translations jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select b.slug, b.language, b.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object('slug', t.slug, 'language', t.language))
              from public.blog_posts t where b.translation_key <> '' and t.translation_key = b.translation_key and t.id <> b.id and t.status = 'published'), '[]'::jsonb)
  from public.blog_posts b where b.status = 'published' order by b.post_date desc limit 500;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_list_blog_posts()', 'admin_get_blog_post(uuid)', 'admin_save_blog_post(uuid, jsonb)', 'admin_set_blog_status(uuid, text)', 'admin_delete_blog_post(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['public_list_blog_posts(text)', 'public_get_blog_post(text)', 'public_blog_sitemap()'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  revoke all on function public.blog_post_problem(public.blog_posts) from public, anon, authenticated;
end $$;

commit;
