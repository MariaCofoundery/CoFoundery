-- Content-Report und Partnerliste (Entwurf 10.11.2026).
--
-- BEITRAG: laufende Nummer je Organisation (B-001 ...), Beitragslink und freiwillige Ergebnisse (Aufrufe, Reaktionen, Klicks, Notiz).
-- KAMPAGNE: Marke, Ziel, Ansprechpartner, wichtige Termine.
-- PARTNERLISTE: interne Liste (Partner, Investoren, Speaker, Mentoren) - NUR fuer Mitglieder mit dem Recht `people`; nie fuer
-- Teams, Gaeste, andere Organisationen oder Connect. Speaker lassen sich Events zuordnen.
--
-- WER DARF WAS: Link und Ergebnisse tragen alle mit Zugang zum Teamraum (`room`) ein, wie Beitraege selbst. Kampagnen-Angaben
-- ebenfalls. Die Partnerliste lesen und pflegen nur Mitglieder mit `people`.

begin;

-- Beitrag ---------------------------------------------------------------------------------------------------------------
alter table public.advisor_org_posts
  add column post_no integer,
  add column published_url text,
  add column result_views integer,
  add column result_reactions integer,
  add column result_clicks integer,
  add column result_note text,
  add constraint advisor_org_posts_published_url check (published_url is null or (published_url ~ '^https://[^ ]+$' and char_length(published_url) <= 500)),
  add constraint advisor_org_posts_results check (
    (result_views is null or result_views between 0 and 1000000000)
    and (result_reactions is null or result_reactions between 0 and 1000000000)
    and (result_clicks is null or result_clicks between 0 and 1000000000)
  ),
  add constraint advisor_org_posts_result_note check (result_note is null or char_length(result_note) <= 300);

-- Bestehende Beitraege einmalig nach Anlagedatum durchnummerieren.
update public.advisor_org_posts p set post_no = n.rn
from (select id, row_number() over (partition by org_id order by created_at, id) as rn from public.advisor_org_posts) n
where n.id = p.id;
alter table public.advisor_org_posts alter column post_no set not null;
create unique index advisor_org_posts_no_unique on public.advisor_org_posts (org_id, post_no);

create or replace function public.assign_org_post_no()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Eine Sperre je Organisation, damit zwei gleichzeitige Beitraege nicht dieselbe Nummer bekommen.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.org_id::text, 0));
  select coalesce(max(p.post_no), 0) + 1 into new.post_no from public.advisor_org_posts p where p.org_id = new.org_id;
  return new;
end;
$$;
revoke all on function public.assign_org_post_no() from public, anon, authenticated;
create trigger advisor_org_posts_assign_no before insert on public.advisor_org_posts
  for each row execute function public.assign_org_post_no();

-- Nummer nie aendern lassen.
create or replace function public.keep_org_post_no()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.post_no := old.post_no;
  return new;
end;
$$;
revoke all on function public.keep_org_post_no() from public, anon, authenticated;
create trigger advisor_org_posts_keep_no before update on public.advisor_org_posts
  for each row execute function public.keep_org_post_no();

create or replace function public.set_org_post_result(
  p_post_id uuid, p_published_url text, p_views integer, p_reactions integer, p_clicks integer, p_note text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select p.org_id into v_org from public.advisor_org_posts p where p.id = p_post_id;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  update public.advisor_org_posts
  set published_url = nullif(btrim(coalesce(p_published_url, '')), ''), result_views = p_views, result_reactions = p_reactions,
      result_clicks = p_clicks, result_note = nullif(left(btrim(coalesce(p_note, '')), 300), ''), updated_at = pg_catalog.now()
  where id = p_post_id;
  return true;
exception
  when check_violation then
    raise exception 'org_post_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.set_org_post_result(uuid, text, integer, integer, integer, text) from public, anon;
grant execute on function public.set_org_post_result(uuid, text, integer, integer, integer, text) to authenticated;

-- Kampagne ----------------------------------------------------------------------------------------------------------------
alter table public.advisor_org_campaigns
  add column brand_id uuid references public.advisor_org_content_items (id) on delete set null,
  add column goal text,
  add column contact_user_id uuid references auth.users (id) on delete set null,
  add column key_dates jsonb not null default '[]'::jsonb,
  add constraint advisor_org_campaigns_goal check (goal is null or char_length(goal) <= 200),
  add constraint advisor_org_campaigns_key_dates check (jsonb_typeof(key_dates) = 'array' and jsonb_array_length(key_dates) <= 10);
create index advisor_org_campaigns_brand_idx on public.advisor_org_campaigns (brand_id);
create index advisor_org_campaigns_contact_idx on public.advisor_org_campaigns (contact_user_id);

create or replace function public.set_org_campaign_details(
  p_campaign_id uuid, p_brand_id uuid, p_goal text, p_contact_user_id uuid, p_key_dates jsonb
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_dates jsonb;
begin
  select c.org_id into v_org from public.advisor_org_campaigns c where c.id = p_campaign_id;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  if p_brand_id is not null and not exists (select 1 from public.advisor_org_content_items i where i.id = p_brand_id and i.org_id = v_org and i.kind = 'brand') then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if p_contact_user_id is not null and not exists (select 1 from public.advisor_org_members m where m.org_id = v_org and m.user_id = p_contact_user_id and m.status = 'active') then
    raise exception 'org_task_assignee_not_member' using errcode = '22023';
  end if;
  -- Termine: nur Tag und Bezeichnung, hoechstens zehn, nach Tag sortiert.
  select coalesce(jsonb_agg(jsonb_build_object('on', e.on_day, 'label', e.label) order by e.on_day), '[]'::jsonb) into v_dates
  from (
    select (x ->> 'on')::date as on_day, left(btrim(x ->> 'label'), 80) as label
    from jsonb_array_elements(case when jsonb_typeof(p_key_dates) = 'array' then p_key_dates else '[]'::jsonb end) x
    where x ->> 'on' ~ '^\d{4}-\d{2}-\d{2}$' and char_length(btrim(coalesce(x ->> 'label', ''))) > 0
    limit 10
  ) e;
  update public.advisor_org_campaigns
  set brand_id = p_brand_id, goal = nullif(left(btrim(coalesce(p_goal, '')), 200), ''), contact_user_id = p_contact_user_id, key_dates = v_dates
  where id = p_campaign_id;
  return true;
exception
  when check_violation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'org_post_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.set_org_campaign_details(uuid, uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.set_org_campaign_details(uuid, uuid, text, uuid, jsonb) to authenticated;

-- Partnerliste ---------------------------------------------------------------------------------------------------------
create table public.advisor_org_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  name text not null,
  kinds text[] not null default '{}'::text[],
  company text,
  email text,
  phone text,
  url text,
  notes text,
  status text not null default 'asked',
  owner_user_id uuid references auth.users (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint advisor_org_contacts_name check (char_length(btrim(name)) between 1 and 120),
  constraint advisor_org_contacts_kinds check (kinds <@ array['partner', 'investor', 'speaker', 'mentor', 'other']::text[] and cardinality(kinds) between 1 and 3),
  constraint advisor_org_contacts_company check (company is null or char_length(company) <= 120),
  constraint advisor_org_contacts_email check (email is null or char_length(email) <= 200),
  constraint advisor_org_contacts_phone check (phone is null or char_length(phone) <= 60),
  constraint advisor_org_contacts_url check (url is null or (url ~ '^https://[^ ]+$' and char_length(url) <= 300)),
  constraint advisor_org_contacts_notes check (notes is null or char_length(notes) <= 2000),
  constraint advisor_org_contacts_status check (status in ('asked', 'talking', 'committed', 'active', 'paused'))
);
create index advisor_org_contacts_org_idx on public.advisor_org_contacts (org_id);
create index advisor_org_contacts_owner_idx on public.advisor_org_contacts (owner_user_id);
create index advisor_org_contacts_created_by_idx on public.advisor_org_contacts (created_by_user_id);
alter table public.advisor_org_contacts enable row level security;
revoke all on public.advisor_org_contacts from anon, authenticated;
grant select on public.advisor_org_contacts to authenticated;
create policy advisor_org_contacts_people_read on public.advisor_org_contacts
  for select to authenticated using (public.org_has_right(org_id, 'people'));

create table public.advisor_org_contact_events (
  contact_id uuid not null references public.advisor_org_contacts (id) on delete cascade,
  event_id uuid not null references public.team_program_events (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  role text,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (contact_id, event_id),
  constraint advisor_org_contact_events_role check (role is null or char_length(role) <= 60)
);
create index advisor_org_contact_events_event_idx on public.advisor_org_contact_events (event_id);
create index advisor_org_contact_events_org_idx on public.advisor_org_contact_events (org_id);
alter table public.advisor_org_contact_events enable row level security;
revoke all on public.advisor_org_contact_events from anon, authenticated;
grant select on public.advisor_org_contact_events to authenticated;
create policy advisor_org_contact_events_people_read on public.advisor_org_contact_events
  for select to authenticated using (public.org_has_right(org_id, 'people'));

create or replace function public.save_org_contact(
  p_contact_id uuid, p_org_id uuid, p_name text, p_kinds text[], p_company text, p_email text, p_phone text,
  p_url text, p_notes text, p_status text, p_owner_user_id uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := p_org_id;
  v_id uuid;
begin
  if p_contact_id is not null then
    select c.org_id into v_org from public.advisor_org_contacts c where c.id = p_contact_id;
  end if;
  if v_org is null or not public.org_has_right(v_org, 'people') then
    raise exception 'contact_not_yours' using errcode = '42501';
  end if;
  if p_owner_user_id is not null and not exists (select 1 from public.advisor_org_members m where m.org_id = v_org and m.user_id = p_owner_user_id and m.status = 'active') then
    raise exception 'contact_invalid' using errcode = '22023';
  end if;
  if p_contact_id is null then
    insert into public.advisor_org_contacts (org_id, name, kinds, company, email, phone, url, notes, status, owner_user_id, created_by_user_id)
    values (v_org, btrim(coalesce(p_name, '')), coalesce(p_kinds, '{}'), nullif(btrim(coalesce(p_company, '')), ''), nullif(btrim(coalesce(p_email, '')), ''),
            nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_url, '')), ''), nullif(btrim(coalesce(p_notes, '')), ''),
            coalesce(p_status, 'asked'), p_owner_user_id, auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_contacts
    set name = btrim(coalesce(p_name, '')), kinds = coalesce(p_kinds, '{}'), company = nullif(btrim(coalesce(p_company, '')), ''),
        email = nullif(btrim(coalesce(p_email, '')), ''), phone = nullif(btrim(coalesce(p_phone, '')), ''), url = nullif(btrim(coalesce(p_url, '')), ''),
        notes = nullif(btrim(coalesce(p_notes, '')), ''), status = coalesce(p_status, 'asked'), owner_user_id = p_owner_user_id, updated_at = pg_catalog.now()
    where id = p_contact_id
    returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'contact_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_contact(uuid, uuid, text, text[], text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.save_org_contact(uuid, uuid, text, text[], text, text, text, text, text, text, uuid) to authenticated;

create or replace function public.delete_org_contact(p_contact_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select c.org_id into v_org from public.advisor_org_contacts c where c.id = p_contact_id;
  if v_org is null or not public.org_has_right(v_org, 'people') then
    raise exception 'contact_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_contacts where id = p_contact_id;
  return true;
end;
$$;
revoke all on function public.delete_org_contact(uuid) from public, anon;
grant execute on function public.delete_org_contact(uuid) to authenticated;

-- Event zuordnen oder wieder loesen.
create or replace function public.set_org_contact_event(p_contact_id uuid, p_event_id uuid, p_role text, p_on boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select c.org_id into v_org from public.advisor_org_contacts c where c.id = p_contact_id;
  if v_org is null or not public.org_has_right(v_org, 'people') then
    raise exception 'contact_not_yours' using errcode = '42501';
  end if;
  if not exists (select 1 from public.team_program_events e where e.id = p_event_id and e.org_id = v_org) then
    raise exception 'contact_invalid' using errcode = '22023';
  end if;
  if coalesce(p_on, true) then
    insert into public.advisor_org_contact_events (contact_id, event_id, org_id, role)
    values (p_contact_id, p_event_id, v_org, nullif(left(btrim(coalesce(p_role, '')), 60), ''))
    on conflict (contact_id, event_id) do update set role = excluded.role;
  else
    delete from public.advisor_org_contact_events where contact_id = p_contact_id and event_id = p_event_id;
  end if;
  return true;
end;
$$;
revoke all on function public.set_org_contact_event(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.set_org_contact_event(uuid, uuid, text, boolean) to authenticated;

commit;
