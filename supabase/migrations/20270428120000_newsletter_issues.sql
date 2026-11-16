-- Newsletter "Aus dem Netzwerk": Ausgaben, Versand, Bildspeicher, Häkchen "darf in Mails erscheinen" (Entwurf 16.11.2026).
--
-- Eine Ausgabe ist ein Entwurf aus Bausteinen (blocks als JSON) mit einem Look. Gelesen und geschrieben wird nur ueber Funktionen:
-- die Admin-Funktionen pruefen is_platform_admin(), die Versand-Funktionen gehoeren dem Dienst (service_role).
-- VERSAND: Wer eine Ausgabe bekommen soll, wird in newsletter_deliveries eingetragen, BEVOR gesendet wird (hoechstens einmal je Person
-- und Ausgabe, auch bei Absturz oder doppeltem Lauf). Es bekommen nur Personen mit bestaetigter Zustimmung (newsletter_subscriptions).
begin;

-- Bildspeicher: oeffentlich lesbar (die Mail zeigt die Bilder per Link), geschrieben nur ueber den Dienst nach Admin-Pruefung.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletter', 'newsletter', true, 1048576, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- "Darf in Mails erscheinen": Standard aus. Nur solche Eintraege koennen in den Newsletter, und dann ohne Namen.
alter table public.network_listings add column allow_in_mails boolean not null default false;
alter table public.network_problems add column allow_in_mails boolean not null default false;

create or replace function public.set_allow_in_mails(p_kind text, p_id uuid, p_allow boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'mails_not_allowed' using errcode = '42501'; end if;
  if p_kind = 'listing' then
    update public.network_listings set allow_in_mails = coalesce(p_allow, false) where id = p_id and owner_user_id = auth.uid();
  elsif p_kind = 'problem' then
    update public.network_problems set allow_in_mails = coalesce(p_allow, false) where id = p_id and author_user_id = auth.uid();
  else
    raise exception 'mails_invalid' using errcode = '22023';
  end if;
  if not found then raise exception 'mails_not_yours' using errcode = '42501'; end if;
  return true;
end;
$$;
revoke all on function public.set_allow_in_mails(text, uuid, boolean) from public, anon;
grant execute on function public.set_allow_in_mails(text, uuid, boolean) to authenticated;

create table public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subject text not null default '',
  preheader text not null default '',
  look text not null default 'night',
  accent text not null default '#5b3df5',
  header_mode text not null default 'gradient',
  header_image_path text,
  header_alt text not null default '',
  font text not null default 'serif',
  button_style text not null default 'round',
  heading_case text not null default 'normal',
  blocks jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint newsletter_issues_look check (look in ('light', 'night', 'plain')),
  constraint newsletter_issues_header_mode check (header_mode in ('gradient', 'image', 'none')),
  constraint newsletter_issues_font check (font in ('serif', 'sans')),
  constraint newsletter_issues_button check (button_style in ('round', 'square', 'outline')),
  constraint newsletter_issues_heading_case check (heading_case in ('normal', 'upper')),
  constraint newsletter_issues_accent check (accent ~ '^#[0-9a-fA-F]{6}$'),
  constraint newsletter_issues_status check (status in ('draft', 'scheduled', 'sending', 'sent')),
  constraint newsletter_issues_blocks check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 40),
  constraint newsletter_issues_subject check (char_length(subject) <= 120 and char_length(preheader) <= 200 and char_length(title) <= 120)
);
alter table public.newsletter_issues enable row level security;
revoke all on public.newsletter_issues from public, anon, authenticated;

create table public.newsletter_deliveries (
  issue_id uuid not null references public.newsletter_issues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default pg_catalog.now(),
  primary key (issue_id, user_id)
);
alter table public.newsletter_deliveries enable row level security;
revoke all on public.newsletter_deliveries from public, anon, authenticated;

create or replace function public.admin_list_newsletter_issues()
returns table (id uuid, title text, subject text, status text, scheduled_for timestamptz, sent_at timestamptz, updated_at timestamptz, delivered bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select i.id, i.title, i.subject, i.status, i.scheduled_for, i.sent_at, i.updated_at,
    (select count(*) from public.newsletter_deliveries d where d.issue_id = i.id)
  from public.newsletter_issues i order by i.created_at desc;
end;
$$;

create or replace function public.admin_get_newsletter_issue(p_id uuid)
returns setof public.newsletter_issues
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select * from public.newsletter_issues where id = p_id;
end;
$$;

-- Zahlen fuer die Uebersicht: nur Mengen, keine Personen.
create or replace function public.admin_newsletter_stats()
returns table (confirmed bigint, pending bigint, unsubscribed bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select count(*) filter (where status = 'confirmed'), count(*) filter (where status = 'pending'), count(*) filter (where status = 'unsubscribed')
  from public.newsletter_subscriptions;
end;
$$;

-- Speichern (neu oder bestehend). Nur eine Ausgabe, die noch Entwurf ist, laesst sich aendern.
create or replace function public.admin_save_newsletter_issue(p_id uuid, p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_status text;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.newsletter_issues (title, subject, preheader, look, accent, header_mode, header_image_path, header_alt, font, button_style, heading_case, blocks)
    values (
      coalesce(p->>'title', ''), coalesce(p->>'subject', ''), coalesce(p->>'preheader', ''), coalesce(p->>'look', 'night'), coalesce(p->>'accent', '#5b3df5'),
      coalesce(p->>'header_mode', 'gradient'), nullif(p->>'header_image_path', ''), coalesce(p->>'header_alt', ''), coalesce(p->>'font', 'serif'),
      coalesce(p->>'button_style', 'round'), coalesce(p->>'heading_case', 'normal'), coalesce(p->'blocks', '[]'::jsonb)
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
    heading_case = coalesce(p->>'heading_case', heading_case), blocks = coalesce(p->'blocks', blocks), updated_at = pg_catalog.now()
  where id = p_id;
  return p_id;
end;
$$;

-- Einplanen / zurueck zum Entwurf. Einplanen braucht einen Betreff und einen Zeitpunkt in der Zukunft.
create or replace function public.admin_set_newsletter_status(p_id uuid, p_status text, p_scheduled_for timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.newsletter_issues%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  select * into v from public.newsletter_issues where id = p_id;
  if not found then raise exception 'newsletter_not_found' using errcode = 'P0002'; end if;
  if p_status = 'scheduled' then
    if v.status <> 'draft' then raise exception 'newsletter_locked' using errcode = '55000'; end if;
    if pg_catalog.btrim(v.subject) = '' or jsonb_array_length(v.blocks) = 0 then raise exception 'newsletter_incomplete' using errcode = '23514'; end if;
    if p_scheduled_for is null or p_scheduled_for < pg_catalog.now() - interval '1 minute' then raise exception 'newsletter_time' using errcode = '22023'; end if;
    update public.newsletter_issues set status = 'scheduled', scheduled_for = p_scheduled_for, updated_at = pg_catalog.now() where id = p_id;
  elsif p_status = 'draft' then
    if v.status <> 'scheduled' then raise exception 'newsletter_locked' using errcode = '55000'; end if;
    update public.newsletter_issues set status = 'draft', scheduled_for = null, updated_at = pg_catalog.now() where id = p_id;
  else
    raise exception 'newsletter_invalid' using errcode = '22023';
  end if;
  return true;
end;
$$;

-- Eintraege, die der Newsletter zeigen darf: Haekchen gesetzt, veroeffentlicht, nicht abgelaufen, juengste zuerst. Kein Name, keine Person.
create or replace function public.admin_newsletter_candidates(p_days integer default 21)
returns table (kind text, id uuid, title text, published_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  return query
    select 'listing'::text, l.id, l.title, l.published_at from public.network_listings l
    where l.allow_in_mails and l.status = 'active' and l.expires_at > pg_catalog.now() and l.published_at > pg_catalog.now() - make_interval(days => greatest(p_days, 1))
    union all
    select 'problem'::text, p.id, p.title, p.published_at from public.network_problems p
    where p.allow_in_mails and p.status = 'active' and p.published_at > pg_catalog.now() - make_interval(days => greatest(p_days, 1))
    order by 4 desc limit 40;
end;
$$;

-- Dienst: faellige Ausgaben (geplant, Zeitpunkt erreicht) oder laufende (weitere Pakete). Setzt geplante auf "sending".
create or replace function public.due_newsletter_issues()
returns table (id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  update public.newsletter_issues set status = 'sending', updated_at = pg_catalog.now() where status = 'scheduled' and scheduled_for <= pg_catalog.now();
  return query select i.id from public.newsletter_issues i where i.status = 'sending' order by i.scheduled_for;
end;
$$;

-- Dienst: das naechste Paket. Traegt ein, BEVOR gesendet wird. Nur bestaetigte Zustimmung, nur wer diese Ausgabe noch nicht bekam.
create or replace function public.claim_newsletter_batch(p_issue_id uuid, p_limit integer)
returns table (user_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.newsletter_issues where id = p_issue_id and status = 'sending') then return; end if;
  return query
    with picked as (
      select s.user_id from public.newsletter_subscriptions s
      where s.status = 'confirmed'
        and not exists (select 1 from public.newsletter_deliveries d where d.issue_id = p_issue_id and d.user_id = s.user_id)
      order by s.confirmed_at
      limit greatest(least(p_limit, 200), 1)
      for update of s skip locked
    )
    insert into public.newsletter_deliveries (issue_id, user_id) select p_issue_id, picked.user_id from picked
    on conflict do nothing returning newsletter_deliveries.user_id;
end;
$$;

-- Dienst: ist niemand mehr offen, gilt die Ausgabe als gesendet.
create or replace function public.finish_newsletter_if_done(p_issue_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.newsletter_subscriptions s
    where s.status = 'confirmed' and not exists (select 1 from public.newsletter_deliveries d where d.issue_id = p_issue_id and d.user_id = s.user_id)
  ) then return false; end if;
  update public.newsletter_issues set status = 'sent', sent_at = pg_catalog.now(), updated_at = pg_catalog.now() where id = p_issue_id and status = 'sending';
  return found;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_list_newsletter_issues()', 'admin_get_newsletter_issue(uuid)', 'admin_newsletter_stats()', 'admin_save_newsletter_issue(uuid, jsonb)',
    'admin_set_newsletter_status(uuid, text, timestamptz)', 'admin_newsletter_candidates(integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['due_newsletter_issues()', 'claim_newsletter_batch(uuid, integer)', 'finish_newsletter_if_done(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

commit;
