-- Teamraum Stufe 2: Seiten - Handbuch, Checklisten, Protokolle, wie in Notion, aber schlicht.
--
-- Regeln (dieselben wie fuer Aufgaben, 20270312120000):
--   - Lesen: aktive Mitglieder der Organisation. Nie Teams im Programm, nie jemand von aussen.
--   - Schreiben nur ueber die Funktionen hier, nur in einer aktiven Organisation.
--   - Ein Baum mit hoechstens drei Ebenen. Eine Seite mit Unterseiten loescht man nicht - erst die
--     Unterseiten verschieben oder loeschen, damit nichts unbemerkt mitgeht.
--   - Loeschen: wer die Seite angelegt hat, oder die Fuehrung.
--   - Niemand ueberschreibt still: Wer speichert, nennt den Stand, den er bearbeitet hat. Hat
--     jemand anderes inzwischen gespeichert, lehnt die Datenbank ab ('org_page_changed').
--   - Haekchen-Zeilen ("[ ] Raum bestaetigen") koennen Aufgaben werden. Seite und Aufgabe halten
--     sich auf dem gleichen Stand: abhaken auf der Seite erledigt die Aufgabe, erledigen auf dem
--     Board hakt die Zeile ab. Verbunden sind sie ueber die Seite und den Text der Zeile.
--   - Konto geloescht: angelegt/geaendert verlieren die Verknuepfung (set null).

begin;

create table public.advisor_org_pages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  parent_id uuid references public.advisor_org_pages (id) on delete cascade,
  title text not null,
  body text not null default '',
  is_template boolean not null default false,
  event_id uuid references public.team_program_events (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  updated_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_org_pages_title check (char_length(btrim(title)) between 1 and 160),
  constraint advisor_org_pages_body check (char_length(body) <= 50000),
  constraint advisor_org_pages_not_own_parent check (parent_id is null or parent_id <> id)
);
create index advisor_org_pages_org_idx on public.advisor_org_pages (org_id, parent_id);
create index advisor_org_pages_parent_idx on public.advisor_org_pages (parent_id) where parent_id is not null;
create index advisor_org_pages_event_idx on public.advisor_org_pages (event_id) where event_id is not null;
create index advisor_org_pages_created_by_idx on public.advisor_org_pages (created_by_user_id);
create index advisor_org_pages_updated_by_idx on public.advisor_org_pages (updated_by_user_id);

alter table public.advisor_org_pages enable row level security;
revoke all on public.advisor_org_pages from anon, authenticated;
grant select on public.advisor_org_pages to authenticated;
create policy advisor_org_pages_members_read on public.advisor_org_pages
  for select to authenticated using (public.is_advisor_org_member(org_id));

alter table public.advisor_org_tasks
  add column page_id uuid references public.advisor_org_pages (id) on delete set null;
create index advisor_org_tasks_page_idx on public.advisor_org_tasks (page_id) where page_id is not null;

-- Der Text einer Haekchen-Zeile ohne "- [ ] " davor; null, wenn die Zeile keine ist.
create or replace function public.org_page_item_text(p_line text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_line ~ '^\s*(-\s*)?\[( |x|X)\]'
    then btrim(regexp_replace(p_line, '^\s*(-\s*)?\[( |x|X)\]\s*', '')) end;
$$;
revoke all on function public.org_page_item_text(text) from public, anon, authenticated;

-- Die k-te Haekchen-Zeile (ab 0) einer Seite.
create or replace function public.org_page_item_at(p_body text, p_item integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select item.text from (
    select public.org_page_item_text(l.line) as text, row_number() over (order by l.ord) - 1 as idx
    from regexp_split_to_table(coalesce(p_body, ''), E'\n') with ordinality as l(line, ord)
    where public.org_page_item_text(l.line) is not null
  ) item
  where item.idx = p_item;
$$;
revoke all on function public.org_page_item_at(text, integer) from public, anon, authenticated;

-- Alle Haekchen-Zeilen mit diesem Text auf erledigt oder offen setzen. Nur die Klammer aendert sich.
create or replace function public.set_org_page_items_done(p_page_id uuid, p_text text, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.advisor_org_pages page
  set body = (
        select string_agg(
          case when public.org_page_item_text(l.line) = btrim(p_text)
            then regexp_replace(l.line, '\[( |x|X)\]', case when p_done then '[x]' else '[ ]' end)
            else l.line end,
          E'\n' order by l.ord)
        from regexp_split_to_table(page.body, E'\n') with ordinality as l(line, ord)
      ),
      updated_at = pg_catalog.now(),
      updated_by_user_id = coalesce(auth.uid(), page.updated_by_user_id)
  where page.id = p_page_id
    and exists (
      select 1 from regexp_split_to_table(page.body, E'\n') as l(line)
      where public.org_page_item_text(l.line) = btrim(p_text)
        and (l.line ~ '\[(x|X)\]') is distinct from coalesce(p_done, false)
    );
end;
$$;
revoke all on function public.set_org_page_items_done(uuid, text, boolean) from public, anon, authenticated;

-- Wie tief liegt eine Seite? Oberste Ebene = 1.
create or replace function public.org_page_depth(p_page_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with recursive chain as (
    select id, parent_id, 1 as depth from public.advisor_org_pages where id = p_page_id
    union all
    select p.id, p.parent_id, chain.depth + 1 from public.advisor_org_pages p join chain on p.id = chain.parent_id
    where chain.depth < 10
  )
  select coalesce(max(depth), 0) from chain;
$$;
revoke all on function public.org_page_depth(uuid) from public, anon, authenticated;

-- Wie tief reicht der Teilbaum unter einer Seite? Nur die Seite selbst = 1.
create or replace function public.org_page_subtree_height(p_page_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with recursive tree as (
    select id, 1 as height from public.advisor_org_pages where id = p_page_id
    union all
    select p.id, tree.height + 1 from public.advisor_org_pages p join tree on p.parent_id = tree.id
    where tree.height < 10
  )
  select coalesce(max(height), 0) from tree;
$$;
revoke all on function public.org_page_subtree_height(uuid) from public, anon, authenticated;

-- Anlegen (p_page_id null) oder speichern. p_expected_updated_at: der Stand, den man bearbeitet hat.
create or replace function public.save_org_page(
  p_page_id uuid,
  p_org_id uuid,
  p_parent_id uuid,
  p_title text,
  p_body text,
  p_event_id uuid default null,
  p_is_template boolean default false,
  p_expected_updated_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := p_org_id;
  v_old public.advisor_org_pages%rowtype;
  v_id uuid;
begin
  if p_page_id is not null then
    select * into v_old from public.advisor_org_pages p where p.id = p_page_id for update;
    if v_old.id is null then
      raise exception 'org_page_not_found' using errcode = 'P0002';
    end if;
    v_org := v_old.org_id;
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if p_page_id is not null and p_expected_updated_at is distinct from v_old.updated_at then
    raise exception 'org_page_changed' using errcode = '40001';
  end if;
  if p_parent_id is not null then
    if not exists (select 1 from public.advisor_org_pages p where p.id = p_parent_id and p.org_id = v_org) then
      raise exception 'org_page_invalid' using errcode = '22023';
    end if;
    -- Keine Schleife: die neue Oberseite darf nicht unter dieser Seite liegen.
    if p_page_id is not null and exists (
      with recursive chain as (
        select id, parent_id from public.advisor_org_pages where id = p_parent_id
        union all
        select p.id, p.parent_id from public.advisor_org_pages p join chain on p.id = chain.parent_id
      )
      select 1 from chain where id = p_page_id
    ) then
      raise exception 'org_page_invalid' using errcode = '22023';
    end if;
    if public.org_page_depth(p_parent_id) + (case when p_page_id is null then 1 else public.org_page_subtree_height(p_page_id) end) > 3 then
      raise exception 'org_page_too_deep' using errcode = '22023';
    end if;
  end if;
  if p_event_id is not null and not exists (
    select 1 from public.team_program_events e where e.id = p_event_id and e.org_id = v_org
  ) then
    raise exception 'org_page_invalid' using errcode = '22023';
  end if;

  if p_page_id is null then
    insert into public.advisor_org_pages (org_id, parent_id, title, body, is_template, event_id, created_by_user_id, updated_by_user_id)
    values (v_org, p_parent_id, btrim(coalesce(p_title, '')), coalesce(p_body, ''), coalesce(p_is_template, false), p_event_id, auth.uid(), auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_pages
    set parent_id = p_parent_id,
        title = btrim(coalesce(p_title, '')),
        body = coalesce(p_body, ''),
        is_template = coalesce(p_is_template, false),
        event_id = p_event_id,
        updated_by_user_id = auth.uid(),
        updated_at = pg_catalog.now()
    where id = p_page_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_org_page(uuid, uuid, uuid, text, text, uuid, boolean, timestamptz) from public, anon;
grant execute on function public.save_org_page(uuid, uuid, uuid, text, text, uuid, boolean, timestamptz) to authenticated;

create or replace function public.delete_org_page(p_page_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.advisor_org_pages%rowtype;
begin
  select * into v_page from public.advisor_org_pages p where p.id = p_page_id;
  if v_page.id is null then
    return false;
  end if;
  if not public.can_work_in_org(v_page.org_id)
     or not (v_page.created_by_user_id = auth.uid() or public.is_advisor_org_owner_of(v_page.org_id)) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if exists (select 1 from public.advisor_org_pages c where c.parent_id = p_page_id) then
    raise exception 'org_page_has_children' using errcode = '55000';
  end if;
  delete from public.advisor_org_pages where id = p_page_id;
  return true;
end;
$$;
revoke all on function public.delete_org_page(uuid) from public, anon;
grant execute on function public.delete_org_page(uuid) to authenticated;

-- Eine Haekchen-Zeile abhaken. p_text schuetzt davor, dass sich die Seite inzwischen verschoben hat.
create or replace function public.check_org_page_item(p_page_id uuid, p_item integer, p_text text, p_done boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.advisor_org_pages%rowtype;
begin
  select * into v_page from public.advisor_org_pages p where p.id = p_page_id;
  if v_page.id is null or not public.can_work_in_org(v_page.org_id) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if public.org_page_item_at(v_page.body, p_item) is distinct from btrim(coalesce(p_text, '')) then
    raise exception 'org_page_changed' using errcode = '40001';
  end if;
  perform public.set_org_page_items_done(p_page_id, p_text, p_done);
  -- Die verbundene Aufgabe zieht mit.
  update public.advisor_org_tasks t
  set status = case when p_done then 'done' else 'open' end,
      done_at = case when p_done then coalesce(t.done_at, pg_catalog.now()) end,
      updated_at = pg_catalog.now()
  where t.page_id = p_page_id and btrim(t.title) = btrim(p_text)
    and (t.status = 'done') is distinct from coalesce(p_done, false);
  return true;
end;
$$;
revoke all on function public.check_org_page_item(uuid, integer, text, boolean) from public, anon;
grant execute on function public.check_org_page_item(uuid, integer, text, boolean) to authenticated;

-- Aus einer Haekchen-Zeile eine Aufgabe machen. Gibt es sie schon, kommt die bestehende zurueck.
create or replace function public.create_org_task_from_page_item(p_page_id uuid, p_item integer, p_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.advisor_org_pages%rowtype;
  v_text text := left(btrim(coalesce(p_text, '')), 200);
  v_id uuid;
begin
  select * into v_page from public.advisor_org_pages p where p.id = p_page_id;
  if v_page.id is null or not public.can_work_in_org(v_page.org_id) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if v_text = '' or public.org_page_item_at(v_page.body, p_item) is distinct from btrim(coalesce(p_text, '')) then
    raise exception 'org_page_changed' using errcode = '40001';
  end if;
  select t.id into v_id from public.advisor_org_tasks t where t.page_id = p_page_id and btrim(t.title) = v_text limit 1;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.advisor_org_tasks (org_id, title, status, page_id, event_id, created_by_user_id)
  values (v_page.org_id, v_text, 'open', p_page_id, v_page.event_id, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_org_task_from_page_item(uuid, integer, text) from public, anon;
grant execute on function public.create_org_task_from_page_item(uuid, integer, text) to authenticated;

-- Erledigt auf dem Board hakt die Zeile auf der Seite ab (und umgekehrt beim Wiederoeffnen).
create or replace function public.sync_org_page_item_from_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.page_id is not null and (new.status = 'done') is distinct from (old.status = 'done') then
    perform public.set_org_page_items_done(new.page_id, new.title, new.status = 'done');
  end if;
  return new;
end;
$$;
revoke all on function public.sync_org_page_item_from_task() from public, anon, authenticated;
create trigger sync_org_page_item_from_task
after update of status on public.advisor_org_tasks
for each row execute function public.sync_org_page_item_from_task();

commit;
