-- Admin: das rosa Herz zaehlt ALLES, was im Admin-Bereich wartet oder passiert, und zeigt es je Bereich (17.11.2026).
--
-- admin_attention_breakdown() liefert die Teile einzeln (fuer die Herzen an den Bereichen), admin_attention_count() ist ihre Summe (fuer das Herz am Avatar).
-- Teile mit eigenem "offen"-Zustand verschwinden, sobald sie bearbeitet sind: Feedback (ungelesen), Meldungen (offen), Radar (neu), Empfehlungen (in Pruefung),
-- Events (vorgeschlagen), Highlights (enden in drei Tagen), Zeitgesteuerte Laeufe (zuletzt fehlgeschlagen). Teile ohne solchen Zustand - neue Konten und neue
-- Newsletter-Anmeldungen - zaehlen "seit deinem letzten Blick" in den jeweiligen Bereich (admin_area_seen, je Admin).
begin;

create table public.admin_area_seen (
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  area text not null,
  seen_at timestamptz not null default pg_catalog.now(),
  primary key (admin_user_id, area),
  constraint admin_area_seen_area check (area in ('accounts'))
);
alter table public.admin_area_seen enable row level security;
revoke all on public.admin_area_seen from public, anon, authenticated;

create or replace function public.admin_mark_area_seen(p_area text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_area <> 'accounts' then raise exception 'admin_area_invalid' using errcode = '22023'; end if;
  insert into public.admin_area_seen (admin_user_id, area, seen_at) values (auth.uid(), p_area, pg_catalog.now())
  on conflict (admin_user_id, area) do update set seen_at = excluded.seen_at;
  return true;
end;
$$;

create or replace function public.admin_attention_breakdown() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_news timestamptz; v_acc timestamptz;
begin
  if not public.is_platform_admin() then return '{}'::jsonb; end if;
  select coalesce((select n.seen_at from public.admin_newsletter_seen n where n.admin_user_id = auth.uid()), pg_catalog.now() - interval '7 days') into v_news;
  select coalesce((select a.seen_at from public.admin_area_seen a where a.admin_user_id = auth.uid() and a.area = 'accounts'), pg_catalog.now() - interval '7 days') into v_acc;
  return jsonb_build_object(
    'feedback', (select count(*) from public.product_feedback f where not exists (
                   select 1 from public.admin_feedback_reads r where r.feedback_id = f.id and r.admin_user_id = auth.uid())),
    'reports', (select count(*) from public.network_reports where status = 'open'),
    'radar', (select count(*) from public.radar_signals where review_status = 'new'),
    'recommendations', (select count(*) from public.network_recommendations where status = 'review'),
    'events', (select count(*) from public.ecosystem_events where status = 'pending'),
    'newsletter', (select count(*) from public.newsletter_subscriptions where status = 'confirmed' and confirmed_at > v_news)
                + (select count(*) from public.newsletter_public_subscribers where status = 'confirmed' and confirmed_at > v_news),
    'highlights', (select count(*) from public.connect_highlight_placements where starts_at <= pg_catalog.now() and ends_at > pg_catalog.now() and ends_at <= pg_catalog.now() + interval '3 days'),
    'cron', (select count(*) from public.cron_heartbeats where last_ok is false),
    'accounts', (select count(*) from public.person_core where created_at > v_acc)
  );
end;
$$;

create or replace function public.admin_attention_count() returns integer
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_platform_admin() then return 0; end if;
  v := public.admin_attention_breakdown();
  return (select coalesce(sum(value::text::integer), 0) from jsonb_each(v))::integer;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['admin_mark_area_seen(text)', 'admin_attention_breakdown()', 'admin_attention_count()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
