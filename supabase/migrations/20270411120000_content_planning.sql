-- Content-Planung (Entwurf 09.11.2026): Marken, Saeulen und Formate der Organisation, Standard fuer neue Beitraege,
-- neue Felder am Beitrag (Marke, Saeule, Format, Link, Freigabe durch, offene Informationen), Stand "Zur Freigabe" und
-- die Verknuepfung eines Beitrags mit Aufgaben des Teamraums.
--
-- WER DARF WAS: Marken/Saeulen/Formate und Standard pflegt, wer das Recht `plan` hat (Admin, Koordination, auf Wunsch
-- Advisor). Beitraege schreiben wie bisher alle mit Zugang zum Teamraum. "Freigabe durch" ist nur eine Angabe, kein
-- Sperrmechanismus: niemand wird am Veroeffentlichen gehindert.
--
-- AUFGABEN: Ein Beitrag kann mehrere Aufgaben haben, eine Aufgabe mehrere Beitraege. Verknuepft werden nur Aufgaben fuer das
-- Team - eine private Aufgabe bleibt bei ihrer Person (`org_private_tasks`), auch wenn jemand ihre Kennung kennt.

begin;

create table public.advisor_org_content_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  kind text not null,
  name text not null,
  color text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint advisor_org_content_items_kind check (kind in ('brand', 'pillar', 'format')),
  constraint advisor_org_content_items_name check (char_length(btrim(name)) between 1 and 60),
  constraint advisor_org_content_items_color check (color is null or color in ('violet', 'sky', 'amber', 'emerald', 'rose', 'slate'))
);
create unique index advisor_org_content_items_unique on public.advisor_org_content_items (org_id, kind, lower(btrim(name)));
alter table public.advisor_org_content_items enable row level security;
revoke all on public.advisor_org_content_items from anon, authenticated;
grant select on public.advisor_org_content_items to authenticated;
create policy advisor_org_content_items_members_read on public.advisor_org_content_items
  for select to authenticated using (public.is_advisor_org_member(org_id));

create table public.advisor_org_content_defaults (
  org_id uuid primary key references public.advisor_orgs (id) on delete cascade,
  brand_id uuid references public.advisor_org_content_items (id) on delete set null,
  pillar_id uuid references public.advisor_org_content_items (id) on delete set null,
  format_id uuid references public.advisor_org_content_items (id) on delete set null,
  channel text,
  approver_user_id uuid references auth.users (id) on delete set null,
  status text,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint advisor_org_content_defaults_status check (status is null or status in ('idea', 'draft', 'review', 'planned', 'published'))
);
alter table public.advisor_org_content_defaults enable row level security;
revoke all on public.advisor_org_content_defaults from anon, authenticated;
grant select on public.advisor_org_content_defaults to authenticated;
create policy advisor_org_content_defaults_members_read on public.advisor_org_content_defaults
  for select to authenticated using (public.is_advisor_org_member(org_id));

-- Beitrag: neue Felder und der Stand "Zur Freigabe".
alter table public.advisor_org_posts
  add column brand_id uuid references public.advisor_org_content_items (id) on delete set null,
  add column pillar_id uuid references public.advisor_org_content_items (id) on delete set null,
  add column format_id uuid references public.advisor_org_content_items (id) on delete set null,
  add column material_url text,
  add column approver_user_id uuid references auth.users (id) on delete set null,
  add column open_info text,
  add constraint advisor_org_posts_material_url check (material_url is null or (material_url ~ '^https://' and char_length(material_url) <= 500)),
  add constraint advisor_org_posts_open_info check (open_info is null or char_length(open_info) <= 1000);
alter table public.advisor_org_posts drop constraint advisor_org_posts_status;
alter table public.advisor_org_posts add constraint advisor_org_posts_status check (status in ('idea', 'draft', 'review', 'planned', 'published'));

-- Marken, Saeulen, Formate anlegen/aendern/loeschen: wer `plan` darf.
create or replace function public.save_content_item(p_org_id uuid, p_id uuid, p_kind text, p_name text, p_color text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'plan') then
    raise exception 'content_not_yours' using errcode = '42501';
  end if;
  if p_kind not in ('brand', 'pillar', 'format') then
    raise exception 'content_invalid' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.advisor_org_content_items (org_id, kind, name, color)
    values (p_org_id, p_kind, btrim(coalesce(p_name, '')), nullif(p_color, '')) returning id into v_id;
  else
    update public.advisor_org_content_items set name = btrim(coalesce(p_name, '')), color = nullif(p_color, '')
    where id = p_id and org_id = p_org_id returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation or unique_violation then
    raise exception 'content_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_content_item(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.save_content_item(uuid, uuid, text, text, text) to authenticated;

create or replace function public.delete_content_item(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select i.org_id into v_org from public.advisor_org_content_items i where i.id = p_id;
  if v_org is null then
    return false;
  end if;
  if auth.uid() is null or not public.org_has_right(v_org, 'plan') then
    raise exception 'content_not_yours' using errcode = '42501';
  end if;
  -- Beitraege und Standard behalten ihre Zeile; die Angabe faellt weg (on delete set null).
  delete from public.advisor_org_content_items where id = p_id;
  return true;
end;
$$;
revoke all on function public.delete_content_item(uuid) from public, anon;
grant execute on function public.delete_content_item(uuid) to authenticated;

create or replace function public.save_content_defaults(
  p_org_id uuid, p_brand_id uuid, p_pillar_id uuid, p_format_id uuid, p_channel text, p_approver_user_id uuid, p_status text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.org_has_right(p_org_id, 'plan') then
    raise exception 'content_not_yours' using errcode = '42501';
  end if;
  if (p_brand_id is not null and not exists (select 1 from public.advisor_org_content_items i where i.id = p_brand_id and i.org_id = p_org_id and i.kind = 'brand'))
     or (p_pillar_id is not null and not exists (select 1 from public.advisor_org_content_items i where i.id = p_pillar_id and i.org_id = p_org_id and i.kind = 'pillar'))
     or (p_format_id is not null and not exists (select 1 from public.advisor_org_content_items i where i.id = p_format_id and i.org_id = p_org_id and i.kind = 'format'))
     or (p_approver_user_id is not null and not exists (select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = p_approver_user_id and m.status = 'active'))
     or (p_channel is not null and p_channel <> '' and p_channel not in ('linkedin', 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'newsletter', 'website', 'other'))
     or (p_status is not null and p_status <> '' and p_status not in ('idea', 'draft', 'review', 'planned', 'published')) then
    raise exception 'content_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_org_content_defaults (org_id, brand_id, pillar_id, format_id, channel, approver_user_id, status, updated_at)
  values (p_org_id, p_brand_id, p_pillar_id, p_format_id, nullif(p_channel, ''), p_approver_user_id, nullif(p_status, ''), pg_catalog.now())
  on conflict (org_id) do update
    set brand_id = excluded.brand_id, pillar_id = excluded.pillar_id, format_id = excluded.format_id, channel = excluded.channel,
        approver_user_id = excluded.approver_user_id, status = excluded.status, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.save_content_defaults(uuid, uuid, uuid, uuid, text, uuid, text) from public, anon;
grant execute on function public.save_content_defaults(uuid, uuid, uuid, uuid, text, uuid, text) to authenticated;

-- Beitrag speichern: bisherige Angaben plus die neuen (alle optional, damit alte Aufrufe weiterlaufen).
drop function public.save_org_post(uuid, uuid, text, text, text[], date, time, text, uuid, uuid, uuid);
create function public.save_org_post(
  p_post_id uuid, p_org_id uuid, p_title text, p_body text, p_channels text[], p_planned_on date, p_planned_time time,
  p_status text, p_campaign_id uuid, p_event_id uuid, p_assignee_user_id uuid,
  p_brand_id uuid default null, p_pillar_id uuid default null, p_format_id uuid default null,
  p_material_url text default null, p_approver_user_id uuid default null, p_open_info text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := p_org_id;
  v_id uuid;
  v_url text := nullif(btrim(coalesce(p_material_url, '')), '');
  v_info text := nullif(btrim(coalesce(p_open_info, '')), '');
begin
  if p_post_id is not null then
    select p.org_id into v_org from public.advisor_org_posts p where p.id = p_post_id;
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  if p_planned_on is null or coalesce(p_status, 'idea') not in ('idea', 'draft', 'review', 'planned', 'published') then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if p_campaign_id is not null and not exists (select 1 from public.advisor_org_campaigns c where c.id = p_campaign_id and c.org_id = v_org) then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if p_event_id is not null and not exists (select 1 from public.team_program_events e where e.id = p_event_id and e.org_id = v_org) then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if (p_brand_id is not null and not exists (select 1 from public.advisor_org_content_items i where i.id = p_brand_id and i.org_id = v_org and i.kind = 'brand'))
     or (p_pillar_id is not null and not exists (select 1 from public.advisor_org_content_items i where i.id = p_pillar_id and i.org_id = v_org and i.kind = 'pillar'))
     or (p_format_id is not null and not exists (select 1 from public.advisor_org_content_items i where i.id = p_format_id and i.org_id = v_org and i.kind = 'format')) then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if p_assignee_user_id is not null and not exists (
    select 1 from public.advisor_org_members m where m.org_id = v_org and m.user_id = p_assignee_user_id and m.status = 'active'
  ) then
    raise exception 'org_task_assignee_not_member' using errcode = '22023';
  end if;
  if p_approver_user_id is not null and not exists (
    select 1 from public.advisor_org_members m where m.org_id = v_org and m.user_id = p_approver_user_id and m.status = 'active'
  ) then
    raise exception 'org_task_assignee_not_member' using errcode = '22023';
  end if;
  if p_post_id is null then
    insert into public.advisor_org_posts (org_id, title, body, channels, planned_on, planned_time, status, campaign_id, event_id, assignee_user_id, created_by_user_id,
                                          brand_id, pillar_id, format_id, material_url, approver_user_id, open_info)
    values (v_org, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_body, '')), ''), public.clean_post_channels(p_channels), p_planned_on, p_planned_time,
            coalesce(p_status, 'idea'), p_campaign_id, p_event_id, p_assignee_user_id, auth.uid(),
            p_brand_id, p_pillar_id, p_format_id, v_url, p_approver_user_id, v_info)
    returning id into v_id;
  else
    update public.advisor_org_posts
    set title = btrim(coalesce(p_title, '')), body = nullif(btrim(coalesce(p_body, '')), ''), channels = public.clean_post_channels(p_channels),
        planned_on = p_planned_on, planned_time = p_planned_time, status = coalesce(p_status, 'idea'), campaign_id = p_campaign_id,
        event_id = p_event_id, assignee_user_id = p_assignee_user_id, brand_id = p_brand_id, pillar_id = p_pillar_id, format_id = p_format_id,
        material_url = v_url, approver_user_id = p_approver_user_id, open_info = v_info, updated_at = pg_catalog.now()
    where id = p_post_id
    returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'org_post_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_post(uuid, uuid, text, text, text[], date, time, text, uuid, uuid, uuid, uuid, uuid, uuid, text, uuid, text) from public, anon;
grant execute on function public.save_org_post(uuid, uuid, text, text, text[], date, time, text, uuid, uuid, uuid, uuid, uuid, uuid, text, uuid, text) to authenticated;

create or replace function public.move_org_post(p_post_id uuid, p_planned_on date, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_work_in_org((select p.org_id from public.advisor_org_posts p where p.id = p_post_id)) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('idea', 'draft', 'review', 'planned', 'published') then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  update public.advisor_org_posts
  set planned_on = coalesce(p_planned_on, planned_on), status = coalesce(p_status, status), updated_at = pg_catalog.now()
  where id = p_post_id;
end;
$$;

-- Aufgaben an einem Beitrag.
create table public.advisor_org_post_tasks (
  post_id uuid not null references public.advisor_org_posts (id) on delete cascade,
  task_id uuid not null references public.advisor_org_tasks (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (post_id, task_id)
);
create index advisor_org_post_tasks_task_idx on public.advisor_org_post_tasks (task_id);
alter table public.advisor_org_post_tasks enable row level security;
revoke all on public.advisor_org_post_tasks from anon, authenticated;
grant select on public.advisor_org_post_tasks to authenticated;
-- Lesen: Mitglieder, und nur Aufgaben, die sie ohnehin sehen (die Zeilensicherheit der Aufgaben gilt in der Unterabfrage).
create policy advisor_org_post_tasks_members_read on public.advisor_org_post_tasks
  for select to authenticated using (
    public.is_advisor_org_member(org_id) and exists (select 1 from public.advisor_org_tasks t where t.id = task_id)
  );

create or replace function public.link_org_post_task(p_post_id uuid, p_task_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_task public.advisor_org_tasks%rowtype;
begin
  select p.org_id into v_org from public.advisor_org_posts p where p.id = p_post_id;
  select * into v_task from public.advisor_org_tasks t where t.id = p_task_id;
  if v_org is null or v_task.id is null or v_task.org_id <> v_org or not public.can_work_in_org(v_org) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  -- Eine private Aufgabe gehoert ihrer Person allein und wird nie an einen Beitrag fuers Team gehaengt.
  if v_task.visibility <> 'team' then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_org_post_tasks (post_id, task_id, org_id) values (p_post_id, p_task_id, v_org) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.link_org_post_task(uuid, uuid) from public, anon;
grant execute on function public.link_org_post_task(uuid, uuid) to authenticated;

create or replace function public.unlink_org_post_task(p_post_id uuid, p_task_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select l.org_id into v_org from public.advisor_org_post_tasks l where l.post_id = p_post_id and l.task_id = p_task_id;
  if v_org is null then
    return false;
  end if;
  if not public.can_work_in_org(v_org) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_post_tasks where post_id = p_post_id and task_id = p_task_id;
  return true;
end;
$$;
revoke all on function public.unlink_org_post_task(uuid, uuid) from public, anon;
grant execute on function public.unlink_org_post_task(uuid, uuid) to authenticated;

commit;
