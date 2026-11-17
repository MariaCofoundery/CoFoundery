-- Blog: Kategorien, eigene Suchangaben, Newsletter-Hinweis-Baustein; Admin: das rosa Herz zaehlt mehr mit (17.11.2026).
--
-- Kategorien: eine je Beitrag (oder keine), Namen auf Deutsch und Englisch, vom Admin verwaltet. Eine Kategorie ist oeffentlich nur sichtbar, solange
-- sie in der jeweiligen Sprache mindestens einen VEROEFFENTLICHTEN Beitrag hat. Suchangaben: optionaler Suchtitel und eigene Beschreibung.
-- Das Herz am Avatar (admin_attention_count) zaehlt neu auch: Radar-Signale "neu", Empfehlungen "in Pruefung", vorgeschlagene Events und neue
-- Newsletter-Anmeldungen seit dem letzten Blick in den Newsletter-Admin.
begin;

create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name_de text not null default '',
  name_en text not null default '',
  description_de text not null default '',
  description_en text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default pg_catalog.now(),
  constraint blog_categories_slug check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  constraint blog_categories_text check (char_length(name_de) between 1 and 60 and char_length(name_en) <= 60 and char_length(description_de) <= 200 and char_length(description_en) <= 200)
);
create unique index blog_categories_slug_key on public.blog_categories (slug);
alter table public.blog_categories enable row level security;
revoke all on public.blog_categories from public, anon, authenticated;

insert into public.blog_categories (slug, name_de, name_en, description_de, description_en, sort_order) values
  ('zu-zweit-gruenden', 'Zu zweit gründen', 'Founding as a pair', 'Zusammenarbeit, Rollen und Absprachen im Gründungsduo.', 'Working together, roles and agreements in a founding pair.', 1),
  ('konflikte-frueh-erkennen', 'Konflikte früh erkennen', 'Spotting conflict early', 'Woran ihr merkt, dass etwas auseinanderläuft, bevor es laut wird.', 'How to notice that something is drifting apart before it gets loud.', 2),
  ('struktur-und-fuehrung', 'Struktur und Führung', 'Structure and leadership', 'Organisation, Entscheidungen und Zuständigkeit im Team.', 'Organization, decisions and ownership in a team.', 3),
  ('erfahrungen', 'Erfahrungen', 'Experiences', 'Geschichten aus Gründungsteams, auch meine eigene.', 'Stories from founding teams, including my own.', 4),
  ('neues', 'Neues von Made2Found', 'News from Made2Found', 'Was es Neues gibt und wie ihr uns Fragen schickt.', 'What is new and how to send us questions.', 5);

alter table public.blog_posts
  add column category_id uuid references public.blog_categories (id) on delete restrict,
  add column seo_title text not null default '',
  add column seo_description text not null default '',
  add constraint blog_posts_seo check (char_length(seo_title) <= 70 and char_length(seo_description) <= 200),
  add constraint blog_posts_slug_reserved check (slug not in ('kategorie', 'feed'));
create index blog_posts_category_idx on public.blog_posts (category_id) where category_id is not null;

-- Freigabe-Regeln: neu dazu - hoechstens ein Newsletter-Hinweis.
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
  if (select count(*) from jsonb_array_elements(p.blocks) b where b->>'type' = 'newsletter') > 1 then return 'blog_newsletter'; end if;
  select count(*) into v_buttons from jsonb_array_elements(p.blocks) b where b->>'type' = 'button';
  if v_buttons > 1 then return 'blog_cta'; end if;
  if v_buttons = 1 then
    v_last := p.blocks -> (jsonb_array_length(p.blocks) - 1);
    if v_last->>'type' <> 'button' or pg_catalog.btrim(coalesce(v_last->>'label', '')) = '' or pg_catalog.btrim(coalesce(v_last->>'href', '')) = '' then return 'blog_cta'; end if;
  end if;
  return null;
end;
$$;

-- Speichern: mit Kategorie und Suchangaben.
create or replace function public.admin_save_blog_post(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.blog_posts (slug, language, translation_key, title, excerpt, author_name, post_date, cover_path, cover_alt, blocks, category_id, seo_title, seo_description)
    values (
      coalesce(nullif(p->>'slug', ''), 'beitrag-' || pg_catalog.substr(pg_catalog.md5(gen_random_uuid()::text), 1, 8)), coalesce(p->>'language', 'de'),
      coalesce(p->>'translation_key', ''), coalesce(p->>'title', ''), coalesce(p->>'excerpt', ''), coalesce(p->>'author_name', ''),
      coalesce(nullif(p->>'post_date', '')::date, (pg_catalog.now() at time zone 'Europe/Berlin')::date),
      nullif(p->>'cover_path', ''), coalesce(p->>'cover_alt', ''), coalesce(p->'blocks', '[]'::jsonb),
      nullif(p->>'category_id', '')::uuid, coalesce(p->>'seo_title', ''), coalesce(p->>'seo_description', '')
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
    cover_alt = coalesce(p->>'cover_alt', cover_alt), blocks = coalesce(p->'blocks', blocks),
    category_id = case when p ? 'category_id' then nullif(p->>'category_id', '')::uuid else category_id end,
    seo_title = coalesce(p->>'seo_title', seo_title), seo_description = coalesce(p->>'seo_description', seo_description),
    updated_at = pg_catalog.now()
  where id = p_id;
  return p_id;
end;
$$;

-- Kategorien verwalten (Admin).
create or replace function public.admin_list_blog_categories()
returns table (id uuid, slug text, name_de text, name_en text, description_de text, description_en text, sort_order integer, post_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select c.id, c.slug, c.name_de, c.name_en, c.description_de, c.description_en, c.sort_order,
    (select count(*) from public.blog_posts b where b.category_id = c.id)
  from public.blog_categories c order by c.sort_order, c.created_at;
end;
$$;

create or replace function public.admin_save_blog_category(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.blog_categories (slug, name_de, name_en, description_de, description_en, sort_order)
    values (coalesce(p->>'slug', ''), coalesce(p->>'name_de', ''), coalesce(p->>'name_en', ''), coalesce(p->>'description_de', ''), coalesce(p->>'description_en', ''),
            coalesce((p->>'sort_order')::integer, (select coalesce(max(sort_order), 0) + 1 from public.blog_categories)))
    returning id into v_id;
    return v_id;
  end if;
  update public.blog_categories set
    slug = coalesce(nullif(p->>'slug', ''), slug), name_de = coalesce(p->>'name_de', name_de), name_en = coalesce(p->>'name_en', name_en),
    description_de = coalesce(p->>'description_de', description_de), description_en = coalesce(p->>'description_en', description_en),
    sort_order = coalesce((p->>'sort_order')::integer, sort_order)
  where id = p_id;
  if not found then raise exception 'blog_not_found' using errcode = 'P0002'; end if;
  return p_id;
end;
$$;

create or replace function public.admin_delete_blog_category(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if exists (select 1 from public.blog_posts where category_id = p_id) then raise exception 'blog_category_in_use' using errcode = '55000'; end if;
  delete from public.blog_categories where id = p_id;
  if not found then raise exception 'blog_not_found' using errcode = 'P0002'; end if;
  return true;
end;
$$;

-- Oeffentlich: Kategorien nur, solange sie in der Sprache einen veroeffentlichten Beitrag haben.
create or replace function public.public_list_blog_categories(p_language text)
returns table (slug text, name text, description text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select c.slug,
    case when p_language = 'en' and c.name_en <> '' then c.name_en else c.name_de end,
    case when p_language = 'en' and c.description_en <> '' then c.description_en else c.description_de end
  from public.blog_categories c
  where exists (select 1 from public.blog_posts b where b.category_id = c.id and b.status = 'published' and b.language = p_language)
  order by c.sort_order, c.created_at;
end;
$$;

create or replace function public.public_blog_category_sitemap()
returns table (slug text, language text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select distinct c.slug, b.language from public.blog_categories c join public.blog_posts b on b.category_id = c.id and b.status = 'published' order by 1, 2;
end;
$$;

drop function public.public_list_blog_posts(text);
create function public.public_list_blog_posts(p_language text default null, p_category text default null)
returns table (slug text, language text, title text, excerpt text, author_name text, post_date date, cover_path text, cover_alt text, published_at timestamptz,
               category_slug text, category_name text, reading_minutes integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select b.slug, b.language, b.title, b.excerpt, b.author_name, b.post_date, b.cover_path, b.cover_alt, b.published_at,
    c.slug, case when b.language = 'en' and c.name_en <> '' then c.name_en else c.name_de end,
    greatest(1, ceil(coalesce((select sum(coalesce(array_length(regexp_split_to_array(pg_catalog.btrim(coalesce(x->>'text', '')), '\s+'), 1), 0)) from jsonb_array_elements(b.blocks) x where x->>'type' in ('text', 'quote')), 0) / 200.0)::integer)
  from public.blog_posts b left join public.blog_categories c on c.id = b.category_id
  where b.status = 'published' and (p_language is null or b.language = p_language) and (p_category is null or c.slug = p_category)
  order by b.post_date desc, b.published_at desc limit 200;
end;
$$;

drop function public.public_get_blog_post(text);
create function public.public_get_blog_post(p_slug text)
returns table (slug text, language text, title text, excerpt text, author_name text, post_date date, cover_path text, cover_alt text, blocks jsonb,
               published_at timestamptz, updated_at timestamptz, translations jsonb, category_slug text, category_name text, seo_title text, seo_description text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select b.slug, b.language, b.title, b.excerpt, b.author_name, b.post_date, b.cover_path, b.cover_alt, b.blocks, b.published_at, b.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object('slug', t.slug, 'language', t.language, 'title', t.title))
              from public.blog_posts t where b.translation_key <> '' and t.translation_key = b.translation_key and t.id <> b.id and t.status = 'published'), '[]'::jsonb),
    c.slug, case when b.language = 'en' and c.name_en <> '' then c.name_en else c.name_de end, b.seo_title, b.seo_description
  from public.blog_posts b left join public.blog_categories c on c.id = b.category_id
  where b.slug = p_slug and b.status = 'published';
end;
$$;

-- Newsletter-Admin: Zahlen und "neu seit dem letzten Blick".
create table public.admin_newsletter_seen (
  admin_user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null default pg_catalog.now()
);
alter table public.admin_newsletter_seen enable row level security;
revoke all on public.admin_newsletter_seen from public, anon, authenticated;

drop function public.admin_newsletter_stats();
create function public.admin_newsletter_stats()
returns table (confirmed bigint, pending bigint, unsubscribed bigint, confirmed_de bigint, confirmed_en bigint, confirmed_week bigint, new_since_seen bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_seen timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  select coalesce((select n.seen_at from public.admin_newsletter_seen n where n.admin_user_id = auth.uid()), pg_catalog.now() - interval '7 days') into v_seen;
  return query select
    count(*) filter (where s.status = 'confirmed'), count(*) filter (where s.status = 'pending'), count(*) filter (where s.status = 'unsubscribed'),
    count(*) filter (where s.status = 'confirmed' and coalesce(pc.locale, 'de') <> 'en'),
    count(*) filter (where s.status = 'confirmed' and pc.locale = 'en'),
    count(*) filter (where s.status = 'confirmed' and s.confirmed_at > pg_catalog.now() - interval '7 days'),
    count(*) filter (where s.status = 'confirmed' and s.confirmed_at > v_seen)
  from public.newsletter_subscriptions s left join public.person_core pc on pc.user_id = s.user_id;
end;
$$;

create or replace function public.admin_mark_newsletter_seen()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  insert into public.admin_newsletter_seen (admin_user_id, seen_at) values (auth.uid(), pg_catalog.now())
  on conflict (admin_user_id) do update set seen_at = excluded.seen_at;
  return true;
end;
$$;

-- Das Herz: alles, was im Admin auf dich wartet. Jeder Teil hat einen eigenen "offen"-Zustand, der verschwindet, sobald du es bearbeitet hast.
create or replace function public.admin_attention_count() returns integer
language plpgsql stable security definer set search_path = '' as $$
declare v_seen timestamptz;
begin
  if not public.is_platform_admin() then return 0; end if;
  select coalesce((select n.seen_at from public.admin_newsletter_seen n where n.admin_user_id = auth.uid()), pg_catalog.now() - interval '7 days') into v_seen;
  return (select count(*) from public.product_feedback f where not exists (
            select 1 from public.admin_feedback_reads r where r.feedback_id = f.id and r.admin_user_id = auth.uid()))::integer
       + (select count(*) from public.network_reports where status = 'open')::integer
       + (select count(*) from public.radar_signals where review_status = 'new')::integer
       + (select count(*) from public.network_recommendations where status = 'review')::integer
       + (select count(*) from public.ecosystem_events where status = 'pending')::integer
       + (select count(*) from public.newsletter_subscriptions where status = 'confirmed' and confirmed_at > v_seen)::integer;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_save_blog_post(uuid, jsonb)', 'admin_list_blog_categories()', 'admin_save_blog_category(uuid, jsonb)', 'admin_delete_blog_category(uuid)',
    'admin_newsletter_stats()', 'admin_mark_newsletter_seen()', 'admin_attention_count()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['public_list_blog_categories(text)', 'public_blog_category_sitemap()', 'public_list_blog_posts(text, text)', 'public_get_blog_post(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  revoke all on function public.blog_post_problem(public.blog_posts) from public, anon, authenticated;
end $$;

commit;
