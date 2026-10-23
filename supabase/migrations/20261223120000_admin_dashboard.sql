begin;

-- ---------------------------------------------------------------------------
-- ADMIN-DASHBOARD: Feedback lesen, Zaehler, Laufzeiten der Cronjobs
-- ---------------------------------------------------------------------------

-- Zweite Wochenerinnerung: der manuelle Datenbank-Dump.
alter table public.admin_reminders drop constraint admin_reminders_reminder_key_check;
alter table public.admin_reminders add constraint admin_reminders_reminder_key_check
  check (reminder_key in ('problem_research', 'db_dump'));
insert into public.admin_reminders (reminder_key) values ('db_dump') on conflict do nothing;

-- "Gelesen" gilt pro Admin: Jede Person sieht, was fuer sie neu ist.
create table public.admin_feedback_reads (
  feedback_id uuid not null references public.product_feedback on delete cascade,
  admin_user_id uuid not null references auth.users on delete cascade,
  read_at timestamptz not null default now(),
  primary key (feedback_id, admin_user_id)
);
alter table public.admin_feedback_reads enable row level security;
revoke all on public.admin_feedback_reads from public, anon, authenticated;
-- Was bis jetzt hereingekommen ist, zaehlt fuer die heutigen Admins als gelesen:
-- Es kam per Mail, und das Dashboard soll mit "Neu" beginnen, nicht mit einem Berg.
insert into public.admin_feedback_reads (feedback_id, admin_user_id)
  select f.id, a.user_id from public.product_feedback f cross join public.platform_admins a
  on conflict do nothing;

-- Wann ein geplanter Lauf zuletzt fertig war. Geschrieben nur von den Cron-Routen
-- (Service-Role), gelesen nur im Dashboard.
create table public.cron_heartbeats (
  job text primary key check (job in ('connect-suggestions', 'privacy-retention')),
  last_run_at timestamptz not null default now(),
  last_ok boolean not null
);
alter table public.cron_heartbeats enable row level security;
revoke all on public.cron_heartbeats from public, anon, authenticated;

create function public.record_cron_heartbeat(p_job text, p_ok boolean) returns void
language sql security definer set search_path = '' as $$
  insert into public.cron_heartbeats (job, last_run_at, last_ok) values (p_job, now(), coalesce(p_ok, false))
  on conflict (job) do update set last_run_at = now(), last_ok = excluded.last_ok;
$$;
revoke all on function public.record_cron_heartbeat(text, boolean) from public, anon, authenticated;
grant execute on function public.record_cron_heartbeat(text, boolean) to service_role;

-- ---- Feedback --------------------------------------------------------------

create function public.admin_feedback_counts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return jsonb_build_object(
    'all', (select count(*) from public.product_feedback),
    'new', (select count(*) from public.product_feedback f where not exists (
              select 1 from public.admin_feedback_reads r where r.feedback_id = f.id and r.admin_user_id = auth.uid())));
end $$;

create function public.admin_list_feedback(p_tab text, p_offset integer) returns setof jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  return query
    select jsonb_build_object(
      'id', f.id, 'created_at', f.created_at, 'source', f.source,
      'sender_name', pc.display_name, 'account_since', pc.created_at,
      'q1', f.q1_value, 'q2', f.q2_value, 'q3', f.q3_value,
      'q4_choice', f.q4_choice, 'q4_other_text', f.q4_other_text, 'q5', f.q5_text,
      'is_new', r.feedback_id is null)
    from public.product_feedback f
    left join public.person_core pc on pc.user_id = f.user_id
    left join public.admin_feedback_reads r on r.feedback_id = f.id and r.admin_user_id = auth.uid()
    where case coalesce(p_tab, 'new') when 'new' then r.feedback_id is null when 'read' then r.feedback_id is not null else true end
    order by f.created_at desc, f.id
    limit 26 offset greatest(0, least(coalesce(p_offset, 0), 100000));
end $$;

create function public.admin_mark_feedback_read(p_id uuid, p_read boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.radar_require_admin();
  if coalesce(p_read, true) then
    insert into public.admin_feedback_reads (feedback_id, admin_user_id) select id, auth.uid() from public.product_feedback where id = p_id
    on conflict do nothing;
  else
    delete from public.admin_feedback_reads where feedback_id = p_id and admin_user_id = auth.uid();
  end if;
end $$;

-- ---- Zaehler und "Zu tun" ---------------------------------------------------

create function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_week timestamptz := now() - interval '7 days'; v_prev timestamptz := now() - interval '14 days';
begin
  perform public.radar_require_admin();
  return jsonb_build_object(
    'accounts_week', (select count(*) from public.person_core where created_at >= v_week),
    'accounts_prev_week', (select count(*) from public.person_core where created_at >= v_prev and created_at < v_week),
    'onboarded_week', (select count(*) from public.person_core where created_at >= v_week and onboarding_completed_at is not null),
    'highlight_consent', (select count(*) from public.network_profiles where status = 'active' and highlightable),
    'connect_week', jsonb_build_object(
      'seeking', (select count(*) from public.network_listings where status = 'active' and direction = 'seeking' and published_at >= v_week),
      'offering', (select count(*) from public.network_listings where status = 'active' and direction = 'offering' and published_at >= v_week),
      'problems', (select count(*) from public.network_problems where status = 'active' and not moderation_blocked and published_at >= v_week),
      'ventures', (select count(*) from public.network_ventures where status = 'active' and created_at >= v_week)),
    'open_reports', (select count(*) from public.network_reports where status = 'open'),
    'radar_new', (select count(*) from public.radar_signals where review_status = 'new'),
    'highlights_ending', (select count(*) from public.connect_highlight_placements where starts_at <= now() and ends_at > now() and ends_at <= now() + interval '3 days'),
    'cron', coalesce((select jsonb_object_agg(job, jsonb_build_object('last_run_at', last_run_at, 'ok', last_ok)) from public.cron_heartbeats), '{}'::jsonb));
end $$;

-- Die Zahl am Menuepunkt "Admin": neues Feedback plus offene Meldungen. Fuer
-- alle anderen 0 statt eines Fehlers - das Layout fragt nur bei Admins, aber
-- ein Fehler dort darf nie eine Seite kosten.
create function public.admin_attention_count() returns integer
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then return 0; end if;
  return (select count(*) from public.product_feedback f where not exists (
            select 1 from public.admin_feedback_reads r where r.feedback_id = f.id and r.admin_user_id = auth.uid()))::integer
       + (select count(*) from public.network_reports where status = 'open')::integer;
end $$;

revoke all on function public.admin_feedback_counts(), public.admin_list_feedback(text, integer),
  public.admin_mark_feedback_read(uuid, boolean), public.admin_dashboard_stats(), public.admin_attention_count() from public, anon;
grant execute on function public.admin_feedback_counts(), public.admin_list_feedback(text, integer),
  public.admin_mark_feedback_read(uuid, boolean), public.admin_dashboard_stats(), public.admin_attention_count() to authenticated;

notify pgrst, 'reload schema';
commit;
