begin;

-- ---------------------------------------------------------------------------
-- Wie Benachrichtigungen ankommen: gebündelt, sofort oder ruhig (18.11.2026)
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 18.11.2026: Wer drei Aufgaben offen hat, bekam drei
-- Mitteilungen. Gewollt: kommen mehrere kurz nacheinander, eine gemeinsame;
-- an verschiedenen Zeitpunkten einzeln; und das einstellbar.
--
-- KEIN ZEITPLAN NOETIG. Vercel Hobby erlaubt zwei Laeufe, beide sind belegt. Das
-- Buendeln braucht deshalb keinen: Es geschieht beim Entstehen. Die erste
-- Mitteilung eines Zeitfensters geht sofort raus; jede weitere im selben Fenster
-- ersetzt sie still (gleiche Marke, hier gezaehlt). Nur die Morgenuebersicht per
-- Mail haengt am bestehenden Lauf um 07:00.
--
-- DEFAULT OHNE ZEILE: "gebuendelt", Zahl am Symbol an. Wer nichts einstellt, hat
-- keine Zeile - die Abwesenheit ist der Standard, nicht ein Fehlen.

create table public.notification_delivery_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mode text not null default 'bundled',
  badge boolean not null default true,
  -- Wann zuletzt eine Morgenuebersicht vorbereitet wurde. Gestempelt, BEVOR gesendet wird:
  -- lieber eine Uebersicht zu wenig als zwei.
  last_digest_at timestamptz,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint notification_delivery_prefs_mode_check check (mode in ('bundled', 'instant', 'quiet'))
);

comment on table public.notification_delivery_prefs is
  'Rhythmus der Benachrichtigungen je Konto: gebuendelt (Standard), sofort, ruhig. Keine Zeile heisst gebuendelt.';

alter table public.notification_delivery_prefs enable row level security;
revoke all on public.notification_delivery_prefs from anon, authenticated;
grant select on public.notification_delivery_prefs to authenticated;
create policy notification_delivery_prefs_own on public.notification_delivery_prefs
  for select to authenticated using (user_id = auth.uid());

-- Das laufende Buendel-Fenster je Person. Nur der Dienst schreibt und liest; keine Policy.
create table public.push_bundle_windows (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null,
  bundled_count integer not null default 1,
  constraint push_bundle_windows_count check (bundled_count >= 1)
);
alter table public.push_bundle_windows enable row level security;
revoke all on public.push_bundle_windows from anon, authenticated;


create or replace function public.save_my_notification_delivery(p_mode text, p_badge boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('bundled', 'instant', 'quiet') then
    raise exception 'delivery_invalid' using errcode = '22023';
  end if;
  insert into public.notification_delivery_prefs (user_id, mode, badge)
  values (auth.uid(), p_mode, coalesce(p_badge, true))
  on conflict (user_id) do update
  set mode = excluded.mode, badge = excluded.badge, updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.save_my_notification_delivery(text, boolean) from public, anon;
grant execute on function public.save_my_notification_delivery(text, boolean) to authenticated;


-- ---------------------------------------------------------------------------
-- Den Platz fuer eine Mitteilung vergeben
-- ---------------------------------------------------------------------------
-- action: 'send' (neue Mitteilung), 'join' (ersetzt still die laufende), 'skip' (ruhig).
-- Atomar in einer Anweisung: Zwei Anlaesse im selben Augenblick zaehlen beide.
create or replace function public.claim_push_slot(p_user_id uuid, p_window_minutes integer default 180)
returns table (action text, bundled_count integer, badge_count integer, badge boolean, window_epoch bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode text;
  v_badge boolean;
  v_unread integer;
  v_count integer;
  v_started timestamptz;
begin
  v_mode := coalesce((select p.mode from public.notification_delivery_prefs p where p.user_id = p_user_id), 'bundled');
  v_badge := coalesce((select p.badge from public.notification_delivery_prefs p where p.user_id = p_user_id), true);
  v_unread := (select count(*)::integer from public.in_app_notices n where n.recipient_user_id = p_user_id and n.read_at is null);

  if v_mode = 'quiet' then
    return query select 'skip'::text, 0, v_unread, v_badge, 0::bigint;
    return;
  end if;

  if v_mode = 'instant' then
    return query select 'send'::text, 1, greatest(v_unread, 1), v_badge, 0::bigint;
    return;
  end if;

  insert into public.push_bundle_windows as w (user_id, window_started_at, bundled_count)
  values (p_user_id, pg_catalog.now(), 1)
  on conflict (user_id) do update
  set window_started_at = case
        when w.window_started_at < pg_catalog.now() - pg_catalog.make_interval(mins => greatest(p_window_minutes, 1))
          then pg_catalog.now() else w.window_started_at end,
      bundled_count = case
        when w.window_started_at < pg_catalog.now() - pg_catalog.make_interval(mins => greatest(p_window_minutes, 1))
          then 1 else w.bundled_count + 1 end
  returning w.bundled_count, w.window_started_at into v_count, v_started;

  return query select
    case when v_count = 1 then 'send' else 'join' end,
    v_count,
    greatest(v_unread, v_count),
    v_badge,
    extract(epoch from v_started)::bigint;
end;
$$;
revoke all on function public.claim_push_slot(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_push_slot(uuid, integer) to service_role;


-- ---------------------------------------------------------------------------
-- Die Morgenuebersicht vorbereiten
-- ---------------------------------------------------------------------------
-- Wer bekommt sie: 'quiet' (alle ungelesenen Arten) und 'bundled' (nur die Arten, deren einzelne
-- Mail im gebuendelten Modus entfaellt: Kontaktanfrage, Interesse, Vorstellung in Find - alles, was
-- ueber notifyNetwork laeuft. Danke, Check-in und die Align-Uebergaben behalten ihre eigene Mail.) 'instant' bekam jede Mail einzeln - nichts zu sammeln.
-- Gezaehlt wird nur, was UNGELESEN ist und seit der letzten Uebersicht (hoechstens 2 Tage zurueck)
-- entstand: Ein Hinweis, den jemand schon gesehen hat, steht nicht mehr in der Post.
-- Abbestellte Arten (notification_opt_outs) zaehlen nicht.
create or replace function public.prepare_notification_digests(p_limit integer default 200)
returns table (user_id uuid, counts jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run timestamptz := pg_catalog.now();
begin
  return query
  with candidates as (
    select
      n.recipient_user_id as uid,
      n.kind,
      coalesce(p.mode, 'bundled') as mode,
      case n.kind
        when 'org_task_assigned' then 'org_tasks'
        when 'org_task_comment' then 'org_tasks'
        when 'org_task_due' then 'org_tasks'
        when 'approach_interest' then 'problem_interest'
        when 'read_my_mind_handoff' then 'read_my_mind'
        when 'founder_in_the_wild_handoff' then 'founder_in_the_wild'
        when 'program_task_assigned' then 'program_update'
        when 'program_task_comment' then 'program_update'
        when 'program_update_due' then 'program_update'
        else n.kind
      end as opt_kind
    from public.in_app_notices n
    left join public.notification_delivery_prefs p on p.user_id = n.recipient_user_id
    where n.read_at is null
      and n.created_at > greatest(coalesce(p.last_digest_at, v_run - interval '2 days'), v_run - interval '2 days')
      and coalesce(p.mode, 'bundled') <> 'instant'
  ), allowed as (
    select c.uid, c.kind
    from candidates c
    where (c.mode = 'quiet' or c.kind in (
            'contact_request', 'problem_interest', 'approach_interest',
            'discovery_intro_request', 'discovery_intro_accepted'))
      and not exists (
        select 1 from public.notification_opt_outs o where o.user_id = c.uid and o.kind = c.opt_kind
      )
  ), per_user as (
    select a.uid, a.kind, count(*)::integer as cnt from allowed a group by a.uid, a.kind
  ), grouped as (
    select pu.uid, pg_catalog.jsonb_object_agg(pu.kind, pu.cnt) as counts
    from per_user pu group by pu.uid
    order by pu.uid
    limit greatest(p_limit, 1)
  ), stamped as (
    insert into public.notification_delivery_prefs as d (user_id, last_digest_at)
    select g.uid, v_run from grouped g
    on conflict on constraint notification_delivery_prefs_pkey do update set last_digest_at = excluded.last_digest_at
    returning d.user_id
  )
  select g.uid, g.counts from grouped g join stamped s on s.user_id = g.uid;
end;
$$;
revoke all on function public.prepare_notification_digests(integer) from public, anon, authenticated;
grant execute on function public.prepare_notification_digests(integer) to service_role;

commit;
