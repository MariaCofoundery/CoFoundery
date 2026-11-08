-- Die Seitenleiste selbst einrichten: ausblenden und sortieren, je Person.
--
-- Wunsch von Maria (08.11.2026): Im Onboarding soll man die linke Leiste einrichten koennen - was da ist, was man nicht
-- braucht, und die Reihenfolge selbst bestimmen.
--
-- Eine Zeile je Person (auf allen Geraeten gleich): hidden = ausgeblendete Stationen, item_order = die gewuenschte
-- Reihenfolge der Stationen. Reine Darstellung - sie gibt weder Zugang noch nimmt sie einen: Eine ausgeblendete Station
-- bleibt ueber Suche, Links und Adresse erreichbar. "Heute" und "Einrichten" lassen sich nicht ausblenden, damit sich
-- niemand aussperrt. Nur die Person selbst liest und schreibt ihre Zeile.

begin;

create table public.advisor_nav_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hidden text[] not null default '{}',
  item_order text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint advisor_nav_prefs_sizes check (cardinality(hidden) <= 20 and cardinality(item_order) <= 20)
);

alter table public.advisor_nav_prefs enable row level security;
revoke all on public.advisor_nav_prefs from anon, authenticated;
grant select on public.advisor_nav_prefs to authenticated;
create policy advisor_nav_prefs_own_read on public.advisor_nav_prefs
  for select to authenticated using (user_id = auth.uid());

create or replace function public.save_advisor_nav_prefs(p_hidden text[], p_order text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_keys constant text[] := array['home', 'tasks', 'chat', 'calendar', 'pages', 'teams', 'plan', 'social', 'report', 'funding', 'follow', 'content', 'events', 'setup', 'myProgram'];
  v_hidden text[] := coalesce(p_hidden, '{}');
  v_order text[] := coalesce(p_order, '{}');
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  -- Nur bekannte Stationen; "Heute" und "Einrichten" nie ausgeblendet; jede Station hoechstens einmal.
  if not (v_hidden <@ v_keys) or not (v_order <@ v_keys) or 'home' = any (v_hidden) or 'setup' = any (v_hidden)
     or cardinality(v_hidden) <> (select count(distinct x) from unnest(v_hidden) as x)
     or cardinality(v_order) <> (select count(distinct x) from unnest(v_order) as x) then
    raise exception 'nav_prefs_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_nav_prefs (user_id, hidden, item_order, updated_at)
  values (auth.uid(), v_hidden, v_order, pg_catalog.now())
  on conflict (user_id) do update set hidden = excluded.hidden, item_order = excluded.item_order, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.save_advisor_nav_prefs(text[], text[]) from public, anon;
grant execute on function public.save_advisor_nav_prefs(text[], text[]) to authenticated;

commit;
