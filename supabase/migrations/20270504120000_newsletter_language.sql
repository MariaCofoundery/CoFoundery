-- Newsletter: Sprache je Ausgabe (17.11.2026).
--
-- Jede Ausgabe ist deutsch ODER englisch (nie zweisprachig in einer Mail). Sie geht nur an bestaetigte Abonnent:innen, deren Kontosprache
-- (person_core.locale) dazu passt; wer keine Sprache gespeichert hat, bekommt Deutsch. Der Versand bleibt "hoechstens einmal je Person und Ausgabe":
-- eine deutsche und eine englische Ausgabe erreichen nie dieselbe Person doppelt, weil jede nur ihre Sprache beliefert.
begin;

alter table public.newsletter_issues
  add column language text not null default 'de',
  add constraint newsletter_issues_language check (language in ('de', 'en'));

-- Speichern: wie bisher, plus Sprache.
create or replace function public.admin_save_newsletter_issue(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.newsletter_issues (title, subject, preheader, look, accent, header_mode, header_image_path, header_alt, font, button_style, heading_case, blocks, language)
    values (
      coalesce(p->>'title', ''), coalesce(p->>'subject', ''), coalesce(p->>'preheader', ''), coalesce(p->>'look', 'night'), coalesce(p->>'accent', '#5b3df5'),
      coalesce(p->>'header_mode', 'gradient'), nullif(p->>'header_image_path', ''), coalesce(p->>'header_alt', ''), coalesce(p->>'font', 'serif'),
      coalesce(p->>'button_style', 'round'), coalesce(p->>'heading_case', 'normal'), coalesce(p->'blocks', '[]'::jsonb), coalesce(p->>'language', 'de')
    ) returning id into v_id;
    return v_id;
  end if;
  select status into v_status from public.newsletter_issues where id = p_id;
  if v_status is null then raise exception 'newsletter_not_found' using errcode = 'P0002'; end if;
  if v_status <> 'draft' then raise exception 'newsletter_locked' using errcode = '55000'; end if;
  update public.newsletter_issues set
    title = coalesce(p->>'title', title), subject = coalesce(p->>'subject', subject), preheader = coalesce(p->>'preheader', preheader),
    look = coalesce(p->>'look', look), accent = coalesce(p->>'accent', accent), header_mode = coalesce(p->>'header_mode', header_mode),
    header_image_path = case when p ? 'header_image_path' then nullif(p->>'header_image_path', '') else header_image_path end,
    header_alt = coalesce(p->>'header_alt', header_alt), font = coalesce(p->>'font', font), button_style = coalesce(p->>'button_style', button_style),
    heading_case = coalesce(p->>'heading_case', heading_case), blocks = coalesce(p->'blocks', blocks), language = coalesce(p->>'language', language),
    updated_at = pg_catalog.now()
  where id = p_id;
  return p_id;
end;
$$;

-- Automatische Entwuerfe: Sprache aus dem JSON (Standard Deutsch).
create or replace function public.service_create_newsletter_draft(p jsonb, p_variant text, p_batch uuid, p_notes text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select count(*) from public.newsletter_issues where origin = 'auto' and created_at > pg_catalog.now() - interval '1 day') >= 9 then
    raise exception 'newsletter_auto_limit' using errcode = '54000';
  end if;
  insert into public.newsletter_issues (title, subject, preheader, look, accent, header_mode, header_image_path, header_alt, font, button_style, heading_case, blocks,
                                        origin, variant, batch_id, notes, language)
  values (
    coalesce(p->>'title', ''), coalesce(p->>'subject', ''), coalesce(p->>'preheader', ''), coalesce(p->>'look', 'light'), coalesce(p->>'accent', '#5b3df5'),
    coalesce(p->>'header_mode', 'gradient'), nullif(p->>'header_image_path', ''), coalesce(p->>'header_alt', ''), coalesce(p->>'font', 'serif'),
    coalesce(p->>'button_style', 'round'), coalesce(p->>'heading_case', 'normal'), coalesce(p->'blocks', '[]'::jsonb),
    'auto', left(coalesce(p_variant, ''), 40), p_batch, left(coalesce(p_notes, ''), 4000), coalesce(p->>'language', 'de')
  ) returning id into v_id;
  return v_id;
end;
$$;

-- Liste: mit Sprache.
drop function public.admin_list_newsletter_issues();
create function public.admin_list_newsletter_issues()
returns table (id uuid, title text, subject text, status text, scheduled_for timestamptz, sent_at timestamptz, updated_at timestamptz, delivered bigint,
               origin text, variant text, batch_id uuid, language text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select i.id, i.title, i.subject, i.status, i.scheduled_for, i.sent_at, i.updated_at,
    (select count(*) from public.newsletter_deliveries d where d.issue_id = i.id), i.origin, i.variant, i.batch_id, i.language
  from public.newsletter_issues i order by i.created_at desc;
end;
$$;
revoke all on function public.admin_list_newsletter_issues() from public, anon;
grant execute on function public.admin_list_newsletter_issues() to authenticated;

-- Zahlen: zusaetzlich die Bestaetigten je Sprache (nur Mengen).
drop function public.admin_newsletter_stats();
create function public.admin_newsletter_stats()
returns table (confirmed bigint, pending bigint, unsubscribed bigint, confirmed_de bigint, confirmed_en bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select
    count(*) filter (where s.status = 'confirmed'), count(*) filter (where s.status = 'pending'), count(*) filter (where s.status = 'unsubscribed'),
    count(*) filter (where s.status = 'confirmed' and coalesce(pc.locale, 'de') <> 'en'),
    count(*) filter (where s.status = 'confirmed' and pc.locale = 'en')
  from public.newsletter_subscriptions s left join public.person_core pc on pc.user_id = s.user_id;
end;
$$;
revoke all on function public.admin_newsletter_stats() from public, anon;
grant execute on function public.admin_newsletter_stats() to authenticated;

-- Versand: nur Bestaetigte, deren Sprache zur Ausgabe passt.
create or replace function public.claim_newsletter_batch(p_issue_id uuid, p_limit integer)
returns table (user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_lang text;
begin
  select i.language into v_lang from public.newsletter_issues i where i.id = p_issue_id and i.status = 'sending';
  if v_lang is null then return; end if;
  return query
    with picked as (
      select s.user_id from public.newsletter_subscriptions s
      left join public.person_core pc on pc.user_id = s.user_id
      where s.status = 'confirmed'
        and (case when coalesce(pc.locale, 'de') = 'en' then 'en' else 'de' end) = v_lang
        and not exists (select 1 from public.newsletter_deliveries d where d.issue_id = p_issue_id and d.user_id = s.user_id)
      order by s.confirmed_at
      limit greatest(least(p_limit, 200), 1)
      for update of s skip locked
    )
    insert into public.newsletter_deliveries (issue_id, user_id) select p_issue_id, picked.user_id from picked
    on conflict do nothing returning newsletter_deliveries.user_id;
end;
$$;

create or replace function public.finish_newsletter_if_done(p_issue_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_lang text;
begin
  select i.language into v_lang from public.newsletter_issues i where i.id = p_issue_id;
  if v_lang is null then return false; end if;
  if exists (
    select 1 from public.newsletter_subscriptions s
    left join public.person_core pc on pc.user_id = s.user_id
    where s.status = 'confirmed'
      and (case when coalesce(pc.locale, 'de') = 'en' then 'en' else 'de' end) = v_lang
      and not exists (select 1 from public.newsletter_deliveries d where d.issue_id = p_issue_id and d.user_id = s.user_id)
  ) then return false; end if;
  update public.newsletter_issues set status = 'sent', sent_at = pg_catalog.now(), updated_at = pg_catalog.now() where id = p_issue_id and status = 'sending';
  return found;
end;
$$;

revoke all on function public.admin_save_newsletter_issue(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_newsletter_issue(uuid, jsonb) to authenticated;
revoke all on function public.service_create_newsletter_draft(jsonb, text, uuid, text) from public, anon, authenticated;
grant execute on function public.service_create_newsletter_draft(jsonb, text, uuid, text) to service_role;
revoke all on function public.claim_newsletter_batch(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_newsletter_batch(uuid, integer) to service_role;
revoke all on function public.finish_newsletter_if_done(uuid) from public, anon, authenticated;
grant execute on function public.finish_newsletter_if_done(uuid) to service_role;

commit;
