-- KI-Checkliste "So startet ihr KI-nativ" (Entwurf 09.11.2026): acht Fragen mit Haken und Notiz, dazu die Werkzeuge des
-- Teams und seine Ablaeufe (wer macht was, was laeuft von allein), und der Programmtipp einer Organisation.
--
-- DAS TEAM BESITZT SEINE ANGABEN. Haken, Notizen, Werkzeuge und Ablaeufe sehen nur Mitglieder des Teams - weder die
-- Organisation noch Advisor noch Admins. Ein Programmbeitritt gibt dafuer nichts frei. Die Organisation gibt nur einen
-- Hinweis und Links mit (`advisor_org_ai_tip`); was ihre Teams abgehakt haben, erfaehrt sie nicht.
--
-- Keine KI-Aufrufe, kein Wert, keine Rangfolge: die Seite erinnert und ordnet nur. Die Zugriffsangabe bei Werkzeugen nennt
-- Personen des Teams, keine Zugangsdaten.

begin;

create table public.team_ai_checklist_items (
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  item_key text not null,
  state text not null,
  note text,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (team_id, item_key),
  constraint team_ai_item_key check (item_key in ('repeat', 'data', 'owner', 'rules', 'small', 'document', 'review', 'tools')),
  constraint team_ai_item_state check (state in ('done', 'skip')),
  constraint team_ai_item_note check (note is null or char_length(note) <= 500)
);

create table public.team_ai_tools (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  name text not null,
  purpose text,
  access_user_ids uuid[] not null default '{}',
  mode text not null default 'hand',
  connected_to text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint team_ai_tools_name check (char_length(btrim(name)) between 1 and 80),
  constraint team_ai_tools_purpose check (purpose is null or char_length(purpose) <= 200),
  constraint team_ai_tools_connected check (connected_to is null or char_length(connected_to) <= 200),
  constraint team_ai_tools_mode check (mode in ('hand', 'part', 'auto')),
  constraint team_ai_tools_access check (cardinality(access_user_ids) <= 12)
);

create table public.team_ai_flows (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.founder_teams (id) on delete cascade,
  name text not null,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  constraint team_ai_flows_name check (char_length(btrim(name)) between 1 and 120),
  constraint team_ai_flows_steps check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 12)
);

alter table public.team_ai_checklist_items enable row level security;
alter table public.team_ai_tools enable row level security;
alter table public.team_ai_flows enable row level security;
revoke all on public.team_ai_checklist_items, public.team_ai_tools, public.team_ai_flows from anon, authenticated;
grant select on public.team_ai_checklist_items, public.team_ai_tools, public.team_ai_flows to authenticated;
create policy team_ai_items_team_read on public.team_ai_checklist_items for select to authenticated using (public.is_current_user_founder_team_member(team_id));
create policy team_ai_tools_team_read on public.team_ai_tools for select to authenticated using (public.is_current_user_founder_team_member(team_id));
create policy team_ai_flows_team_read on public.team_ai_flows for select to authenticated using (public.is_current_user_founder_team_member(team_id));

-- Frage abhaken, ueberspringen oder zuruecksetzen (state null = wieder offen).
create or replace function public.save_team_ai_item(p_team_id uuid, p_item_key text, p_state text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_ai_not_yours' using errcode = '42501';
  end if;
  if p_state is null or p_state = '' then
    -- Offen heisst: keine Zeile - nur die Notiz bleibt nicht allein stehen.
    delete from public.team_ai_checklist_items where team_id = p_team_id and item_key = p_item_key;
    return;
  end if;
  insert into public.team_ai_checklist_items (team_id, item_key, state, note, updated_by_user_id)
  values (p_team_id, p_item_key, p_state, nullif(btrim(coalesce(p_note, '')), ''), auth.uid())
  on conflict (team_id, item_key) do update
    set state = excluded.state, note = excluded.note, updated_by_user_id = excluded.updated_by_user_id, updated_at = pg_catalog.now();
exception
  when check_violation then
    raise exception 'team_ai_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_team_ai_item(uuid, text, text, text) from public, anon;
grant execute on function public.save_team_ai_item(uuid, text, text, text) to authenticated;

create or replace function public.save_team_ai_tool(
  p_team_id uuid, p_id uuid, p_name text, p_purpose text, p_access_user_ids uuid[], p_mode text, p_connected_to text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_access uuid[];
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_ai_not_yours' using errcode = '42501';
  end if;
  -- Zugriff nur fuer Personen des Teams; andere Kennungen fallen weg.
  select coalesce(array_agg(distinct m.user_id), '{}') into v_access
  from public.founder_team_members m where m.team_id = p_team_id and m.user_id = any (coalesce(p_access_user_ids, '{}'));
  if p_id is null then
    insert into public.team_ai_tools (team_id, name, purpose, access_user_ids, mode, connected_to)
    values (p_team_id, btrim(coalesce(p_name, '')), nullif(btrim(coalesce(p_purpose, '')), ''), v_access, coalesce(p_mode, 'hand'), nullif(btrim(coalesce(p_connected_to, '')), ''))
    returning id into v_id;
  else
    update public.team_ai_tools
    set name = btrim(coalesce(p_name, '')), purpose = nullif(btrim(coalesce(p_purpose, '')), ''), access_user_ids = v_access,
        mode = coalesce(p_mode, 'hand'), connected_to = nullif(btrim(coalesce(p_connected_to, '')), '')
    where id = p_id and team_id = p_team_id returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'team_ai_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_team_ai_tool(uuid, uuid, text, text, uuid[], text, text) from public, anon;
grant execute on function public.save_team_ai_tool(uuid, uuid, text, text, uuid[], text, text) to authenticated;

create or replace function public.delete_team_ai_tool(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_team uuid;
begin
  select t.team_id into v_team from public.team_ai_tools t where t.id = p_id;
  if v_team is null then return false; end if;
  if auth.uid() is null or not public.is_current_user_founder_team_member(v_team) then
    raise exception 'team_ai_not_yours' using errcode = '42501';
  end if;
  delete from public.team_ai_tools where id = p_id;
  return true;
end;
$$;
revoke all on function public.delete_team_ai_tool(uuid) from public, anon;
grant execute on function public.delete_team_ai_tool(uuid) to authenticated;

-- Ablauf: Schritte [{text, who, mode}] - `who` ist "system" oder die Kennung einer Person des Teams, `mode` hand oder auto.
create or replace function public.save_team_ai_flow(p_team_id uuid, p_id uuid, p_name text, p_steps jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_clean jsonb;
begin
  if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then
    raise exception 'team_ai_not_yours' using errcode = '42501';
  end if;
  if p_steps is null or jsonb_typeof(p_steps) <> 'array' then
    raise exception 'team_ai_invalid' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('text', left(btrim(s.item ->> 'text'), 120), 'who', s.who, 'mode', case when s.item ->> 'mode' = 'auto' then 'auto' else 'hand' end) order by s.ord), '[]'::jsonb)
  into v_clean
  from (
    select item, ord,
      case
        when item ->> 'who' = 'system' then 'system'
        when item ->> 'who' ~ '^[0-9a-f-]{36}$' and exists (select 1 from public.founder_team_members m where m.team_id = p_team_id and m.user_id = (item ->> 'who')::uuid) then item ->> 'who'
        else null
      end as who
    from jsonb_array_elements(p_steps) with ordinality as e(item, ord)
    where btrim(coalesce(item ->> 'text', '')) <> ''
  ) s;
  if p_id is null then
    insert into public.team_ai_flows (team_id, name, steps) values (p_team_id, btrim(coalesce(p_name, '')), v_clean) returning id into v_id;
  else
    update public.team_ai_flows set name = btrim(coalesce(p_name, '')), steps = v_clean where id = p_id and team_id = p_team_id returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'team_ai_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_team_ai_flow(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.save_team_ai_flow(uuid, uuid, text, jsonb) to authenticated;

create or replace function public.delete_team_ai_flow(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_team uuid;
begin
  select f.team_id into v_team from public.team_ai_flows f where f.id = p_id;
  if v_team is null then return false; end if;
  if auth.uid() is null or not public.is_current_user_founder_team_member(v_team) then
    raise exception 'team_ai_not_yours' using errcode = '42501';
  end if;
  delete from public.team_ai_flows where id = p_id;
  return true;
end;
$$;
revoke all on function public.delete_team_ai_flow(uuid) from public, anon;
grant execute on function public.delete_team_ai_flow(uuid) to authenticated;

-- Programmtipp: die Organisation gibt Hinweis und Links mit. Pflegen darf, wer die Programmseite pflegt (Recht `profile`).
create table public.advisor_org_ai_tip (
  org_id uuid primary key references public.advisor_orgs (id) on delete cascade,
  enabled boolean not null default false,
  note text,
  links jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint advisor_org_ai_tip_note check (note is null or char_length(note) <= 500),
  constraint advisor_org_ai_tip_links check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 8)
);
alter table public.advisor_org_ai_tip enable row level security;
revoke all on public.advisor_org_ai_tip from anon, authenticated;
grant select on public.advisor_org_ai_tip to authenticated;
create policy advisor_org_ai_tip_members_read on public.advisor_org_ai_tip for select to authenticated using (public.is_advisor_org_member(org_id));

create or replace function public.save_org_ai_tip(p_org_id uuid, p_enabled boolean, p_note text, p_links jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_clean jsonb;
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'profile') then
    raise exception 'org_tip_not_yours' using errcode = '42501';
  end if;
  if p_links is null or jsonb_typeof(p_links) <> 'array' then
    raise exception 'org_tip_invalid' using errcode = '22023';
  end if;
  -- Nur https-Links mit Beschriftung.
  select coalesce(jsonb_agg(jsonb_build_object('label', left(btrim(l.item ->> 'label'), 80), 'url', btrim(l.item ->> 'url')) order by l.ord), '[]'::jsonb)
  into v_clean
  from jsonb_array_elements(p_links) with ordinality as l(item, ord)
  where btrim(coalesce(l.item ->> 'label', '')) <> '' and btrim(coalesce(l.item ->> 'url', '')) ~ '^https://[^ ]+$' and char_length(btrim(l.item ->> 'url')) <= 400;
  insert into public.advisor_org_ai_tip (org_id, enabled, note, links, updated_at)
  values (p_org_id, coalesce(p_enabled, false), nullif(btrim(coalesce(p_note, '')), ''), v_clean, pg_catalog.now())
  on conflict (org_id) do update set enabled = excluded.enabled, note = excluded.note, links = excluded.links, updated_at = excluded.updated_at;
exception
  when check_violation then
    raise exception 'org_tip_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_ai_tip(uuid, boolean, text, jsonb) from public, anon;
grant execute on function public.save_org_ai_tip(uuid, boolean, text, jsonb) to authenticated;

-- Fuer ein Team im Programm: die Tipps der Organisationen, in deren aktivem Programm es steht. Nichts ueber andere Teams.
create or replace function public.get_my_program_ai_tips()
returns table (program_id uuid, team_id uuid, org_name text, note text, links jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.team_id, o.name, t.note, t.links
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id and o.status = 'active'
  join public.advisor_org_ai_tip t on t.org_id = p.org_id and t.enabled
  where auth.uid() is not null and p.status = 'active' and public.team_program_is_active(p.id)
    and public.is_current_user_founder_team_member(p.team_id)
  order by o.name;
$$;
revoke all on function public.get_my_program_ai_tips() from public, anon;
grant execute on function public.get_my_program_ai_tips() to authenticated;

commit;
