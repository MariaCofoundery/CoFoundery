-- Feierabend: Zeiten, in denen keine Mitteilung aufs Geraet kommt.
--
-- Wunsch von Maria (05.11.2026): "Wenn ich Feierabend hab, will ich keine Nachrichten bekommen - aber
-- eine Person, die um 22 Uhr arbeitet, kann mir trotzdem schreiben, ohne dass mich das stresst."
--
-- Regeln:
--   - Gilt fuer ALLE Mitteilungen aufs Geraet (Chat, Aufgaben, Check-ins, Connect ...), weil die
--     Pruefung an der einen Stelle sitzt, ueber die jede Mitteilung geht (deliverPushToUser).
--   - Der Hinweis in der App und die Nachricht selbst kommen immer an - nur das Telefon bleibt still.
--     Es wird nichts nachgeholt: Wer morgens die App oeffnet, sieht, was liegt.
--   - Einstellbar: ein taegliches Zeitfenster (darf ueber Mitternacht gehen, z. B. 18:00 - 08:00),
--     ganze Tage (z. B. Samstag und Sonntag) und "jetzt Feierabend bis ..." als Schnellschalter.
--   - Die Uhrzeit gilt in der Zeitzone der Person (vom Browser beim Speichern mitgegeben).
--   - Nur die Person selbst liest und schreibt ihre Zeiten.

begin;

create table public.notification_quiet_hours (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  quiet_from time,
  quiet_until time,
  -- 0 = Sonntag ... 6 = Samstag (wie extract(dow)).
  quiet_days smallint[] not null default '{}'::smallint[],
  timezone text not null default 'Europe/Berlin',
  paused_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint notification_quiet_hours_window check ((quiet_from is null) = (quiet_until is null)),
  constraint notification_quiet_hours_days check (quiet_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  constraint notification_quiet_hours_timezone check (char_length(timezone) between 1 and 64)
);

alter table public.notification_quiet_hours enable row level security;
revoke all on public.notification_quiet_hours from anon, authenticated;
grant select on public.notification_quiet_hours to authenticated;
create policy notification_quiet_hours_own on public.notification_quiet_hours
  for select to authenticated using (user_id = auth.uid());

-- Ist bei dieser Person gerade Feierabend? Fuer den Versand (Service) und fuer die eigene Anzeige.
create or replace function public.is_quiet_now(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select
      (q.paused_until is not null and q.paused_until > pg_catalog.now())
      or (q.enabled and (
        extract(dow from (pg_catalog.now() at time zone q.timezone))::smallint = any (q.quiet_days)
        or (q.quiet_from is not null and (
          case
            when q.quiet_from <= q.quiet_until
              then (pg_catalog.now() at time zone q.timezone)::time >= q.quiet_from
               and (pg_catalog.now() at time zone q.timezone)::time < q.quiet_until
            else (pg_catalog.now() at time zone q.timezone)::time >= q.quiet_from
              or (pg_catalog.now() at time zone q.timezone)::time < q.quiet_until
          end
        ))
      ))
    from public.notification_quiet_hours q
    where q.user_id = p_user_id
  ), false);
$$;
revoke all on function public.is_quiet_now(uuid) from public, anon, authenticated;
grant execute on function public.is_quiet_now(uuid) to service_role;

create or replace function public.am_i_quiet_now()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and public.is_quiet_now(auth.uid());
$$;
revoke all on function public.am_i_quiet_now() from public, anon;
grant execute on function public.am_i_quiet_now() to authenticated;

create or replace function public.save_my_quiet_hours(
  p_enabled boolean, p_quiet_from time, p_quiet_until time, p_quiet_days smallint[], p_timezone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = p_timezone) then
    raise exception 'quiet_hours_invalid' using errcode = '22023';
  end if;
  if (p_quiet_from is null) <> (p_quiet_until is null) or p_quiet_from = p_quiet_until then
    raise exception 'quiet_hours_invalid' using errcode = '22023';
  end if;
  insert into public.notification_quiet_hours (user_id, enabled, quiet_from, quiet_until, quiet_days, timezone)
  values (auth.uid(), coalesce(p_enabled, false), p_quiet_from, p_quiet_until,
          coalesce((select array_agg(distinct d order by d) from unnest(coalesce(p_quiet_days, '{}'::smallint[])) d where d between 0 and 6), '{}'::smallint[]),
          p_timezone)
  on conflict (user_id) do update
  set enabled = excluded.enabled, quiet_from = excluded.quiet_from, quiet_until = excluded.quiet_until,
      quiet_days = excluded.quiet_days, timezone = excluded.timezone, updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.save_my_quiet_hours(boolean, time, time, smallint[], text) from public, anon;
grant execute on function public.save_my_quiet_hours(boolean, time, time, smallint[], text) to authenticated;

-- Schnellschalter: "Feierabend bis ..." (null beendet ihn). Hoechstens drei Tage, damit ihn niemand vergisst.
create or replace function public.pause_my_notifications(p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_until is not null and (p_until <= pg_catalog.now() or p_until > pg_catalog.now() + interval '3 days') then
    raise exception 'quiet_hours_invalid' using errcode = '22023';
  end if;
  insert into public.notification_quiet_hours (user_id, paused_until)
  values (auth.uid(), p_until)
  on conflict (user_id) do update set paused_until = excluded.paused_until, updated_at = pg_catalog.now();
end;
$$;
revoke all on function public.pause_my_notifications(timestamptz) from public, anon;
grant execute on function public.pause_my_notifications(timestamptz) to authenticated;

commit;
