-- Teamraum: eigene Notizen - privat, auf Wunsch mit dem Team geteilt.
--
-- Wunsch von Maria (05.11.2026): "Man soll eigene Notizen haben, die sollen auch privat bleiben, und
-- man soll Notizen teilen koennen."
--
-- Eine Notiz ist eine Teamraum-Seite (20270313120000) mit visibility = 'private':
--   - Sehen und bearbeiten kann sie NUR, wer sie geschrieben hat - auch nicht die Fuehrung.
--   - Sie steht fuer sich: keine Oberseite, keine Unterseiten, keine Vorlage.
--   - Teilen macht sie zu einer normalen Seite des Teams (oberste Ebene). Zurueck auf privat geht
--     nur, solange sie keine Unterseiten hat, und nur durch die Person, die sie geschrieben hat.
--   - Eine Haekchen-Zeile kann auch hier eine Aufgabe werden; die Aufgabe gehoert dem Team, der Name
--     der Notiz bleibt den anderen verborgen (die Zeilensicherheit liefert die Notiz nicht).

begin;

alter table public.advisor_org_pages
  add column visibility text not null default 'team',
  add constraint advisor_org_pages_visibility check (visibility in ('team', 'private')),
  add constraint advisor_org_pages_private_alone check (visibility = 'team' or (parent_id is null and not is_template));
create index advisor_org_pages_private_idx on public.advisor_org_pages (created_by_user_id) where visibility = 'private';

drop policy advisor_org_pages_members_read on public.advisor_org_pages;
create policy advisor_org_pages_members_read on public.advisor_org_pages
  for select to authenticated using (
    public.is_advisor_org_member(org_id)
    and (visibility = 'team' or created_by_user_id = auth.uid())
  );

-- Darf diese Person mit der Seite arbeiten? Mitglied einer aktiven Organisation, und bei einer
-- privaten Notiz nur, wer sie geschrieben hat.
create or replace function public.can_use_org_page(p_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_org_pages p
    where p.id = p_page_id
      and public.can_work_in_org(p.org_id)
      and (p.visibility = 'team' or p.created_by_user_id = auth.uid())
  );
$$;
revoke all on function public.can_use_org_page(uuid) from public, anon, authenticated;

-- save_org_page bekommt die Sichtbarkeit fuer NEUE Seiten (bestehende aendert set_org_page_visibility).
drop function public.save_org_page(uuid, uuid, uuid, text, text, uuid, boolean, timestamptz);
create or replace function public.save_org_page(
  p_page_id uuid,
  p_org_id uuid,
  p_parent_id uuid,
  p_title text,
  p_body text,
  p_event_id uuid default null,
  p_is_template boolean default false,
  p_expected_updated_at timestamptz default null,
  p_visibility text default 'team'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := p_org_id;
  v_old public.advisor_org_pages%rowtype;
  v_private boolean;
  v_id uuid;
begin
  if p_page_id is not null then
    select * into v_old from public.advisor_org_pages p where p.id = p_page_id for update;
    if v_old.id is null then
      raise exception 'org_page_not_found' using errcode = 'P0002';
    end if;
    v_org := v_old.org_id;
    if not public.can_use_org_page(p_page_id) then
      raise exception 'org_page_not_yours' using errcode = '42501';
    end if;
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if p_page_id is not null and p_expected_updated_at is distinct from v_old.updated_at then
    raise exception 'org_page_changed' using errcode = '40001';
  end if;
  v_private := case when p_page_id is null then coalesce(p_visibility, 'team') = 'private' else v_old.visibility = 'private' end;
  if coalesce(p_visibility, 'team') not in ('team', 'private') then
    raise exception 'org_page_invalid' using errcode = '22023';
  end if;
  -- Eine Notiz steht fuer sich.
  if v_private and (p_parent_id is not null or coalesce(p_is_template, false)) then
    raise exception 'org_page_invalid' using errcode = '22023';
  end if;
  if p_parent_id is not null then
    -- Unter eine private Notiz kommt nichts.
    if not exists (select 1 from public.advisor_org_pages p where p.id = p_parent_id and p.org_id = v_org and p.visibility = 'team') then
      raise exception 'org_page_invalid' using errcode = '22023';
    end if;
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
    insert into public.advisor_org_pages (org_id, parent_id, title, body, is_template, event_id, visibility, created_by_user_id, updated_by_user_id)
    values (v_org, p_parent_id, btrim(coalesce(p_title, '')), coalesce(p_body, ''), coalesce(p_is_template, false), p_event_id,
            case when v_private then 'private' else 'team' end, auth.uid(), auth.uid())
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
revoke all on function public.save_org_page(uuid, uuid, uuid, text, text, uuid, boolean, timestamptz, text) from public, anon;
grant execute on function public.save_org_page(uuid, uuid, uuid, text, text, uuid, boolean, timestamptz, text) to authenticated;

-- Teilen oder wieder privat machen - nur, wer die Seite geschrieben hat.
create or replace function public.set_org_page_visibility(p_page_id uuid, p_visibility text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page public.advisor_org_pages%rowtype;
begin
  select * into v_page from public.advisor_org_pages p where p.id = p_page_id for update;
  if v_page.id is null or not public.can_work_in_org(v_page.org_id) or v_page.created_by_user_id is distinct from auth.uid() then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if p_visibility not in ('team', 'private') then
    raise exception 'org_page_invalid' using errcode = '22023';
  end if;
  if p_visibility = 'private' and exists (select 1 from public.advisor_org_pages c where c.parent_id = p_page_id) then
    raise exception 'org_page_has_children' using errcode = '55000';
  end if;
  update public.advisor_org_pages
  set visibility = p_visibility,
      parent_id = case when p_visibility = 'private' then null else parent_id end,
      is_template = case when p_visibility = 'private' then false else is_template end,
      updated_at = pg_catalog.now(),
      updated_by_user_id = auth.uid()
  where id = p_page_id;
end;
$$;
revoke all on function public.set_org_page_visibility(uuid, text) from public, anon;
grant execute on function public.set_org_page_visibility(uuid, text) to authenticated;

-- Loeschen, abhaken, Aufgabe machen: bei einer Notiz nur, wer sie geschrieben hat (Stand 20270313120000).
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
  if not public.can_use_org_page(p_page_id)
     or not (v_page.created_by_user_id = auth.uid() or (v_page.visibility = 'team' and public.is_advisor_org_owner_of(v_page.org_id))) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if exists (select 1 from public.advisor_org_pages c where c.parent_id = p_page_id) then
    raise exception 'org_page_has_children' using errcode = '55000';
  end if;
  delete from public.advisor_org_pages where id = p_page_id;
  return true;
end;
$$;

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
  if v_page.id is null or not public.can_use_org_page(p_page_id) then
    raise exception 'org_page_not_yours' using errcode = '42501';
  end if;
  if public.org_page_item_at(v_page.body, p_item) is distinct from btrim(coalesce(p_text, '')) then
    raise exception 'org_page_changed' using errcode = '40001';
  end if;
  perform public.set_org_page_items_done(p_page_id, p_text, p_done);
  update public.advisor_org_tasks t
  set status = case when p_done then 'done' else 'open' end,
      done_at = case when p_done then coalesce(t.done_at, pg_catalog.now()) end,
      updated_at = pg_catalog.now()
  where t.page_id = p_page_id and btrim(t.title) = btrim(p_text)
    and (t.status = 'done') is distinct from coalesce(p_done, false);
  return true;
end;
$$;

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
  if v_page.id is null or not public.can_use_org_page(p_page_id) then
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

commit;
