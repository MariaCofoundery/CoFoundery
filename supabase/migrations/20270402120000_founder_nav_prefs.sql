-- Die Seitenleiste in der Founder-Ansicht selbst einrichten: ausblenden und sortieren, je Person.
--
-- Gleiche Regeln wie bei der Advisor-Leiste (20270331120000): eine Zeile je Person, auf allen Geraeten gleich;
-- hidden = ausgeblendete Bereiche, item_order = die gewuenschte Reihenfolge. Reine Darstellung - sie gibt weder Zugang
-- noch nimmt sie einen: Ein ausgeblendeter Bereich bleibt ueber Suche, Links und Adresse erreichbar. "Start" laesst
-- sich nicht ausblenden. Nur die Person selbst liest und schreibt ihre Zeile. Eine eigene Tabelle, damit die
-- Advisor-Leiste und die Founder-Leiste einander nichts ueberschreiben.

begin;

create table public.founder_nav_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hidden text[] not null default '{}',
  item_order text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint founder_nav_prefs_sizes check (cardinality(hidden) <= 10 and cardinality(item_order) <= 10)
);

alter table public.founder_nav_prefs enable row level security;
revoke all on public.founder_nav_prefs from anon, authenticated;
grant select on public.founder_nav_prefs to authenticated;
create policy founder_nav_prefs_own_read on public.founder_nav_prefs
  for select to authenticated using (user_id = auth.uid());

create or replace function public.save_founder_nav_prefs(p_hidden text[], p_order text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_keys constant text[] := array['home', 'align', 'find', 'connect', 'events'];
  v_hidden text[] := coalesce(p_hidden, '{}');
  v_order text[] := coalesce(p_order, '{}');
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  -- Nur bekannte Bereiche; "Start" nie ausgeblendet; jeder Bereich hoechstens einmal.
  if not (v_hidden <@ v_keys) or not (v_order <@ v_keys) or 'home' = any (v_hidden)
     or cardinality(v_hidden) <> (select count(distinct x) from unnest(v_hidden) as x)
     or cardinality(v_order) <> (select count(distinct x) from unnest(v_order) as x) then
    raise exception 'nav_prefs_invalid' using errcode = '22023';
  end if;
  insert into public.founder_nav_prefs (user_id, hidden, item_order, updated_at)
  values (auth.uid(), v_hidden, v_order, pg_catalog.now())
  on conflict (user_id) do update set hidden = excluded.hidden, item_order = excluded.item_order, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.save_founder_nav_prefs(text[], text[]) from public, anon;
grant execute on function public.save_founder_nav_prefs(text[], text[]) to authenticated;

commit;
