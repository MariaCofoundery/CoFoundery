begin;

-- ---------------------------------------------------------------------------
-- ADMIN: wiederkehrende Erinnerungen und die Themen-Sicht auf das Problembrett
-- ---------------------------------------------------------------------------

-- Eine Erinnerung ist nur ein Zeitstempel: wann zuletzt erledigt. Welche
-- Schluessel es gibt, steht in den Funktionen; unbekannte werden abgewiesen.
create table public.admin_reminders (
  reminder_key text primary key check (reminder_key in ('problem_research')),
  last_done_at timestamptz,
  done_by uuid references auth.users on delete set null
);
insert into public.admin_reminders (reminder_key) values ('problem_research');
alter table public.admin_reminders enable row level security;
revoke all on public.admin_reminders from public, anon, authenticated;

create function public.admin_reminder_status(p_key text) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode = '42501'; end if;
  return (select last_done_at from public.admin_reminders where reminder_key = p_key);
end $$;

create function public.admin_mark_reminder_done(p_key text, p_done boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode = '42501'; end if;
  update public.admin_reminders
    set last_done_at = case when coalesce(p_done, true) then now() else null end,
        done_by = case when coalesce(p_done, true) then auth.uid() else null end
    where reminder_key = p_key;
  if not found then raise exception 'unknown_reminder' using errcode = '22023'; end if;
end $$;

-- Die Themen des Problembretts fuer den Adminbereich: nur, was ohnehin jedes
-- Mitglied lesen darf (aktiv, nicht gesperrt), ohne Namen der Verfasser:innen.
-- Sortiert wird nach Thema, nicht nach Haeufigkeit: Eine Rangliste nach Zuspruch
-- soll das Brett nicht sein, auch nicht hier.
create function public.admin_problem_board_topics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'platform_admin_required' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('topic', g.topic, 'count', g.n, 'items', g.items) order by g.sort_key, g.topic)
    from (
      select t.topic, count(*) n,
             (t.topic is null)::int sort_key,
             (jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'published_at', t.published_at) order by t.published_at desc nulls last, t.id))
               as items
      from (
        select p.id, p.title, p.published_at, nullif(btrim(x.topic), '') as topic
        from public.network_problems p
        left join lateral unnest(case when cardinality(p.topics) = 0 then array[null::text] else p.topics end) as x(topic) on true
        where p.status = 'active' and not p.moderation_blocked
      ) t
      group by t.topic
    ) g), '[]'::jsonb);
end $$;

revoke all on function public.admin_reminder_status(text), public.admin_mark_reminder_done(text, boolean),
  public.admin_problem_board_topics() from public, anon;
grant execute on function public.admin_reminder_status(text), public.admin_mark_reminder_done(text, boolean),
  public.admin_problem_board_topics() to authenticated;

notify pgrst, 'reload schema';
commit;
