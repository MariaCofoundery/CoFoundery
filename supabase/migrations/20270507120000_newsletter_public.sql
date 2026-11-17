-- Newsletter ohne Konto: Anmeldung nur mit E-Mail-Adresse (z. B. im Blog), getrennt von den Mitgliedern (17.11.2026).
--
-- EINE EIGENE LISTE, KEINE VERBINDUNG ZU KONTEN: Wer sich hier einträgt, hat kein Konto, und ein Eintrag macht niemanden zum Mitglied. Double-Opt-in:
-- Erst die Bestaetigung per Link in der Mail zaehlt. Die Adresse wird nur gespeichert, um den Newsletter zu schicken und eine Abmeldung zu
-- beachten (nach der Abmeldung bleibt der Eintrag als Sperre, damit niemand ungewollt wieder angeschrieben wird). Offene Anmeldungen ohne Bestaetigung
-- werden nach 14 Tagen geloescht. Alle Funktionen gehoeren dem Dienst (service_role): Ein Browser kommt nie direkt an diese Daten.
--
-- ZIELGRUPPE JE AUSGABE: eine Ausgabe geht an Mitglieder (members), an die Nur-Newsletter-Liste (public) oder an beide (all). Bei "all" bekommt
-- niemand die Ausgabe doppelt: Wer mit derselben Adresse auch als Mitglied bestaetigt hat, erhaelt sie als Mitglied.
begin;

create table public.newsletter_public_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  language text not null default 'de',
  status text not null default 'pending',
  source text not null default 'blog',
  created_at timestamptz not null default pg_catalog.now(),
  requested_at timestamptz not null default pg_catalog.now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  welcome_sent_at timestamptz,
  constraint newsletter_public_email check (email = pg_catalog.lower(email) and char_length(email) between 5 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint newsletter_public_language check (language in ('de', 'en')),
  constraint newsletter_public_status check (status in ('pending', 'confirmed', 'unsubscribed')),
  constraint newsletter_public_source check (source in ('blog')),
  constraint newsletter_public_confirmed check (status <> 'confirmed' or confirmed_at is not null)
);
create unique index newsletter_public_email_key on public.newsletter_public_subscribers (email);
create index newsletter_public_status_idx on public.newsletter_public_subscribers (status, confirmed_at);
alter table public.newsletter_public_subscribers enable row level security;
revoke all on public.newsletter_public_subscribers from public, anon, authenticated;

create table public.newsletter_public_deliveries (
  issue_id uuid not null references public.newsletter_issues (id) on delete cascade,
  subscriber_id uuid not null references public.newsletter_public_subscribers (id) on delete cascade,
  claimed_at timestamptz not null default pg_catalog.now(),
  primary key (issue_id, subscriber_id)
);
alter table public.newsletter_public_deliveries enable row level security;
revoke all on public.newsletter_public_deliveries from public, anon, authenticated;

alter table public.newsletter_issues
  add column audience text not null default 'members',
  add constraint newsletter_issues_audience check (audience in ('members', 'public', 'all'));

-- Anmeldung anfragen. Ergebnis: sent (Bestaetigungsmail schicken), already (nichts schicken), wait (gerade erst angefragt), rate (zu viele Anfragen), invalid.
create or replace function public.request_public_newsletter(p_email text, p_language text)
returns table (result text, subscriber_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''))); v_lang text := case when p_language = 'en' then 'en' else 'de' end; v public.newsletter_public_subscribers%rowtype; v_exists boolean;
begin
  if char_length(v_email) not between 5 and 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return query select 'invalid'::text, null::uuid; return; end if;
  delete from public.newsletter_public_subscribers where status = 'pending' and requested_at < pg_catalog.now() - interval '14 days';
  select * into v from public.newsletter_public_subscribers where email = v_email for update;
  v_exists := found;
  if v_exists then
    if v.status = 'confirmed' then return query select 'already'::text, v.id; return; end if;
    if v.status = 'pending' and v.requested_at > pg_catalog.now() - interval '10 minutes' then return query select 'wait'::text, v.id; return; end if;
  end if;
  -- Gegen Massenanfragen mit fremden Adressen: hoechstens 40 neue oder erneuerte Anfragen je Stunde fuer alle zusammen.
  if (select count(*) from public.newsletter_public_subscribers where requested_at > pg_catalog.now() - interval '1 hour' and status = 'pending') >= 40 then
    return query select 'rate'::text, null::uuid; return;
  end if;
  if v_exists then
    update public.newsletter_public_subscribers set status = 'pending', language = v_lang, requested_at = pg_catalog.now(), unsubscribed_at = null where id = v.id;
    return query select 'sent'::text, v.id; return;
  end if;
  insert into public.newsletter_public_subscribers (email, language) values (v_email, v_lang) returning id into v.id;
  return query select 'sent'::text, v.id;
end;
$$;

create or replace function public.get_public_newsletter_subscriber(p_id uuid)
returns table (email text, language text, status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select s.email, s.language, s.status from public.newsletter_public_subscribers s where s.id = p_id;
end;
$$;

-- Bestaetigen: true, wenn die Anmeldung dadurch NEU gilt.
create or replace function public.confirm_public_newsletter(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_public_subscribers set status = 'confirmed', confirmed_at = pg_catalog.now(), unsubscribed_at = null
  where id = p_id and status = 'pending';
  return found;
end;
$$;

create or replace function public.unsubscribe_public_newsletter(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_public_subscribers set status = 'unsubscribed', unsubscribed_at = pg_catalog.now() where id = p_id and status <> 'unsubscribed';
  return found;
end;
$$;

create or replace function public.claim_public_newsletter_welcome(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_public_subscribers set welcome_sent_at = pg_catalog.now() where id = p_id and status = 'confirmed' and welcome_sent_at is null;
  return found;
end;
$$;
create or replace function public.release_public_newsletter_welcome(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.newsletter_public_subscribers set welcome_sent_at = null where id = p_id;
$$;

-- Versand an die Nur-Newsletter-Liste: Paket holen, BEVOR gesendet wird. Sprache der Ausgabe = Sprache der Anmeldung; bei "all" ohne Doppelte.
create or replace function public.claim_newsletter_public_batch(p_issue_id uuid, p_limit integer)
returns table (subscriber_id uuid, email text, language text)
language plpgsql security definer set search_path = '' as $$
declare v_lang text; v_audience text;
begin
  select i.language, i.audience into v_lang, v_audience from public.newsletter_issues i where i.id = p_issue_id and i.status = 'sending';
  if v_lang is null or v_audience not in ('public', 'all') then return; end if;
  return query
    with picked as (
      select s.id, s.email, s.language from public.newsletter_public_subscribers s
      where s.status = 'confirmed' and s.language = v_lang
        and not exists (select 1 from public.newsletter_public_deliveries d where d.issue_id = p_issue_id and d.subscriber_id = s.id)
        and (v_audience = 'public' or not exists (
          select 1 from public.newsletter_subscriptions m join auth.users u on u.id = m.user_id where m.status = 'confirmed' and pg_catalog.lower(u.email) = s.email))
      order by s.confirmed_at
      limit greatest(least(p_limit, 200), 1)
      for update of s skip locked
    ), ins as (
      insert into public.newsletter_public_deliveries (issue_id, subscriber_id) select p_issue_id, picked.id from picked on conflict do nothing returning newsletter_public_deliveries.subscriber_id
    )
    select picked.id, picked.email, picked.language from picked join ins on ins.subscriber_id = picked.id;
end;
$$;

-- Mitglieder: bei Zielgruppe "public" kommt hier nichts mehr.
create or replace function public.claim_newsletter_batch(p_issue_id uuid, p_limit integer)
returns table (user_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_lang text; v_audience text;
begin
  select i.language, i.audience into v_lang, v_audience from public.newsletter_issues i where i.id = p_issue_id and i.status = 'sending';
  if v_lang is null or v_audience not in ('members', 'all') then return; end if;
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

-- Fertig, wenn in KEINER der gewaehlten Gruppen jemand offen ist.
create or replace function public.finish_newsletter_if_done(p_issue_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_lang text; v_audience text;
begin
  select i.language, i.audience into v_lang, v_audience from public.newsletter_issues i where i.id = p_issue_id;
  if v_lang is null then return false; end if;
  if v_audience in ('members', 'all') and exists (
    select 1 from public.newsletter_subscriptions s
    left join public.person_core pc on pc.user_id = s.user_id
    where s.status = 'confirmed'
      and (case when coalesce(pc.locale, 'de') = 'en' then 'en' else 'de' end) = v_lang
      and not exists (select 1 from public.newsletter_deliveries d where d.issue_id = p_issue_id and d.user_id = s.user_id)
  ) then return false; end if;
  if v_audience in ('public', 'all') and exists (
    select 1 from public.newsletter_public_subscribers s
    where s.status = 'confirmed' and s.language = v_lang
      and not exists (select 1 from public.newsletter_public_deliveries d where d.issue_id = p_issue_id and d.subscriber_id = s.id)
      and (v_audience = 'public' or not exists (
        select 1 from public.newsletter_subscriptions m join auth.users u on u.id = m.user_id where m.status = 'confirmed' and pg_catalog.lower(u.email) = s.email))
  ) then return false; end if;
  update public.newsletter_issues set status = 'sent', sent_at = pg_catalog.now(), updated_at = pg_catalog.now() where id = p_issue_id and status = 'sending';
  return found;
end;
$$;

-- Speichern: mit Zielgruppe.
create or replace function public.admin_save_newsletter_issue(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.newsletter_issues (title, subject, preheader, look, accent, header_mode, header_image_path, header_alt, font, button_style, heading_case, blocks, language, audience)
    values (
      coalesce(p->>'title', ''), coalesce(p->>'subject', ''), coalesce(p->>'preheader', ''), coalesce(p->>'look', 'night'), coalesce(p->>'accent', '#5b3df5'),
      coalesce(p->>'header_mode', 'gradient'), nullif(p->>'header_image_path', ''), coalesce(p->>'header_alt', ''), coalesce(p->>'font', 'serif'),
      coalesce(p->>'button_style', 'round'), coalesce(p->>'heading_case', 'normal'), coalesce(p->'blocks', '[]'::jsonb), coalesce(p->>'language', 'de'), coalesce(p->>'audience', 'members')
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
    audience = coalesce(p->>'audience', audience), updated_at = pg_catalog.now()
  where id = p_id;
  return p_id;
end;
$$;

-- Zahlen: Mitglieder und Nur-Newsletter getrennt; "neu seit dem letzten Blick" zaehlt beide.
drop function public.admin_newsletter_stats();
create function public.admin_newsletter_stats()
returns table (confirmed bigint, pending bigint, unsubscribed bigint, confirmed_de bigint, confirmed_en bigint, confirmed_week bigint, new_since_seen bigint,
               public_confirmed bigint, public_pending bigint, public_confirmed_de bigint, public_confirmed_en bigint, public_week bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_seen timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  select coalesce((select n.seen_at from public.admin_newsletter_seen n where n.admin_user_id = auth.uid()), pg_catalog.now() - interval '7 days') into v_seen;
  return query select
    m.confirmed, m.pending, m.unsubscribed, m.confirmed_de, m.confirmed_en, m.confirmed_week,
    m.new_since_seen + (select count(*) from public.newsletter_public_subscribers p where p.status = 'confirmed' and p.confirmed_at > v_seen),
    (select count(*) from public.newsletter_public_subscribers p where p.status = 'confirmed'),
    (select count(*) from public.newsletter_public_subscribers p where p.status = 'pending'),
    (select count(*) from public.newsletter_public_subscribers p where p.status = 'confirmed' and p.language = 'de'),
    (select count(*) from public.newsletter_public_subscribers p where p.status = 'confirmed' and p.language = 'en'),
    (select count(*) from public.newsletter_public_subscribers p where p.status = 'confirmed' and p.confirmed_at > pg_catalog.now() - interval '7 days')
  from (
    select
      count(*) filter (where s.status = 'confirmed') as confirmed, count(*) filter (where s.status = 'pending') as pending, count(*) filter (where s.status = 'unsubscribed') as unsubscribed,
      count(*) filter (where s.status = 'confirmed' and coalesce(pc.locale, 'de') <> 'en') as confirmed_de,
      count(*) filter (where s.status = 'confirmed' and pc.locale = 'en') as confirmed_en,
      count(*) filter (where s.status = 'confirmed' and s.confirmed_at > pg_catalog.now() - interval '7 days') as confirmed_week,
      count(*) filter (where s.status = 'confirmed' and s.confirmed_at > v_seen) as new_since_seen
    from public.newsletter_subscriptions s left join public.person_core pc on pc.user_id = s.user_id
  ) m;
end;
$$;

-- Das Herz: auch neue Nur-Newsletter-Anmeldungen.
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
       + (select count(*) from public.newsletter_subscriptions where status = 'confirmed' and confirmed_at > v_seen)::integer
       + (select count(*) from public.newsletter_public_subscribers where status = 'confirmed' and confirmed_at > v_seen)::integer;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'request_public_newsletter(text, text)', 'get_public_newsletter_subscriber(uuid)', 'confirm_public_newsletter(uuid)', 'unsubscribe_public_newsletter(uuid)',
    'claim_public_newsletter_welcome(uuid)', 'release_public_newsletter_welcome(uuid)', 'claim_newsletter_public_batch(uuid, integer)',
    'claim_newsletter_batch(uuid, integer)', 'finish_newsletter_if_done(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  foreach f in array array['admin_save_newsletter_issue(uuid, jsonb)', 'admin_newsletter_stats()', 'admin_attention_count()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
