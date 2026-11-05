-- Teamraum: Social-Media-Kalender - Postings planen, farbig je Kanal, mit den Veranstaltungen daneben.
--
-- Wunsch von Maria (05.11.2026): "Eine richtig coole, uebersichtliche Kalenderuebersicht ueber die
-- Postings fuer Social Media - farblich unterschieden, das geht auf LinkedIn, das auf Instagram - und
-- die Events aus dem Programm daneben, damit man sieht, wann dazu ein Posting rausgehen muesste."
--
-- Aufbau:
--   - Kampagnen (advisor_org_campaigns): Name, Zeitraum, Notiz.
--   - Postings (advisor_org_posts): Titel, Text, Kanaele (einer oder mehrere), Tag und optional Uhrzeit,
--     Stand (Idee, Entwurf, geplant, veroeffentlicht), optional Kampagne, Veranstaltung, Zustaendige.
--   - Veroeffentlicht wird hier nichts - der Kalender plant, gepostet wird auf der Plattform selbst.
--
-- Regeln wie im Teamraum (20270312120000): lesen alle aktiven Mitglieder, schreiben ueber die Funktionen
-- hier in einer aktiven Organisation, zustaendig nur Mitglieder, loeschen wer angelegt hat oder die
-- Fuehrung. Teams im Programm sehen nichts davon.

begin;

create table public.advisor_org_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  notes text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint advisor_org_campaigns_name check (char_length(btrim(name)) between 1 and 120),
  constraint advisor_org_campaigns_period check (ends_on is null or starts_on is null or ends_on >= starts_on),
  constraint advisor_org_campaigns_notes check (notes is null or char_length(notes) <= 2000)
);
create index advisor_org_campaigns_org_idx on public.advisor_org_campaigns (org_id);
create index advisor_org_campaigns_created_by_idx on public.advisor_org_campaigns (created_by_user_id);

create table public.advisor_org_posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  title text not null,
  body text,
  channels text[] not null default '{}'::text[],
  planned_on date not null,
  planned_time time,
  status text not null default 'idea',
  campaign_id uuid references public.advisor_org_campaigns (id) on delete set null,
  event_id uuid references public.team_program_events (id) on delete set null,
  assignee_user_id uuid references auth.users (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_org_posts_title check (char_length(btrim(title)) between 1 and 160),
  constraint advisor_org_posts_body check (body is null or char_length(body) <= 5000),
  constraint advisor_org_posts_status check (status in ('idea', 'draft', 'planned', 'published')),
  constraint advisor_org_posts_channels check (
    channels <@ array['linkedin', 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'newsletter', 'website', 'other']::text[]
    and cardinality(channels) <= 9
  )
);
create index advisor_org_posts_org_day_idx on public.advisor_org_posts (org_id, planned_on);
create index advisor_org_posts_campaign_idx on public.advisor_org_posts (campaign_id) where campaign_id is not null;
create index advisor_org_posts_event_idx on public.advisor_org_posts (event_id) where event_id is not null;
create index advisor_org_posts_assignee_idx on public.advisor_org_posts (assignee_user_id) where assignee_user_id is not null;
create index advisor_org_posts_created_by_idx on public.advisor_org_posts (created_by_user_id);

alter table public.advisor_org_campaigns enable row level security;
alter table public.advisor_org_posts enable row level security;
revoke all on public.advisor_org_campaigns from anon, authenticated;
revoke all on public.advisor_org_posts from anon, authenticated;
grant select on public.advisor_org_campaigns to authenticated;
grant select on public.advisor_org_posts to authenticated;
create policy advisor_org_campaigns_members_read on public.advisor_org_campaigns
  for select to authenticated using (public.is_advisor_org_member(org_id));
create policy advisor_org_posts_members_read on public.advisor_org_posts
  for select to authenticated using (public.is_advisor_org_member(org_id));

-- Kanaele saeubern: nur bekannte, jeder einmal, in fester Reihenfolge.
create or replace function public.clean_post_channels(p_channels text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(known.channel order by known.ord), '{}'::text[])
  from unnest(array['linkedin', 'instagram', 'facebook', 'x', 'tiktok', 'youtube', 'newsletter', 'website', 'other']::text[]) with ordinality as known(channel, ord)
  where known.channel = any (coalesce(p_channels, '{}'::text[]));
$$;
revoke all on function public.clean_post_channels(text[]) from public, anon, authenticated;

create or replace function public.save_org_campaign(p_campaign_id uuid, p_org_id uuid, p_name text, p_starts_on date, p_ends_on date, p_notes text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := p_org_id;
  v_id uuid;
begin
  if p_campaign_id is not null then
    select c.org_id into v_org from public.advisor_org_campaigns c where c.id = p_campaign_id;
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  if p_campaign_id is null then
    insert into public.advisor_org_campaigns (org_id, name, starts_on, ends_on, notes, created_by_user_id)
    values (v_org, btrim(coalesce(p_name, '')), p_starts_on, p_ends_on, nullif(btrim(coalesce(p_notes, '')), ''), auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_campaigns
    set name = btrim(coalesce(p_name, '')), starts_on = p_starts_on, ends_on = p_ends_on, notes = nullif(btrim(coalesce(p_notes, '')), '')
    where id = p_campaign_id
    returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'org_post_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_campaign(uuid, uuid, text, date, date, text) from public, anon;
grant execute on function public.save_org_campaign(uuid, uuid, text, date, date, text) to authenticated;

create or replace function public.save_org_post(
  p_post_id uuid, p_org_id uuid, p_title text, p_body text, p_channels text[], p_planned_on date, p_planned_time time,
  p_status text, p_campaign_id uuid, p_event_id uuid, p_assignee_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := p_org_id;
  v_id uuid;
begin
  if p_post_id is not null then
    select p.org_id into v_org from public.advisor_org_posts p where p.id = p_post_id;
  end if;
  if v_org is null or not public.can_work_in_org(v_org) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  if p_planned_on is null or coalesce(p_status, 'idea') not in ('idea', 'draft', 'planned', 'published') then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if p_campaign_id is not null and not exists (select 1 from public.advisor_org_campaigns c where c.id = p_campaign_id and c.org_id = v_org) then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if p_event_id is not null and not exists (select 1 from public.team_program_events e where e.id = p_event_id and e.org_id = v_org) then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  if p_assignee_user_id is not null and not exists (
    select 1 from public.advisor_org_members m where m.org_id = v_org and m.user_id = p_assignee_user_id and m.status = 'active'
  ) then
    raise exception 'org_task_assignee_not_member' using errcode = '22023';
  end if;
  if p_post_id is null then
    insert into public.advisor_org_posts (org_id, title, body, channels, planned_on, planned_time, status, campaign_id, event_id, assignee_user_id, created_by_user_id)
    values (v_org, btrim(coalesce(p_title, '')), nullif(btrim(coalesce(p_body, '')), ''), public.clean_post_channels(p_channels), p_planned_on, p_planned_time,
            coalesce(p_status, 'idea'), p_campaign_id, p_event_id, p_assignee_user_id, auth.uid())
    returning id into v_id;
  else
    update public.advisor_org_posts
    set title = btrim(coalesce(p_title, '')), body = nullif(btrim(coalesce(p_body, '')), ''), channels = public.clean_post_channels(p_channels),
        planned_on = p_planned_on, planned_time = p_planned_time, status = coalesce(p_status, 'idea'), campaign_id = p_campaign_id,
        event_id = p_event_id, assignee_user_id = p_assignee_user_id, updated_at = pg_catalog.now()
    where id = p_post_id
    returning id into v_id;
  end if;
  return v_id;
exception
  when check_violation then
    raise exception 'org_post_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.save_org_post(uuid, uuid, text, text, text[], date, time, text, uuid, uuid, uuid) from public, anon;
grant execute on function public.save_org_post(uuid, uuid, text, text, text[], date, time, text, uuid, uuid, uuid) to authenticated;

-- Verschieben (anderer Tag) und Stand setzen - die schnellen Handgriffe im Kalender.
create or replace function public.move_org_post(p_post_id uuid, p_planned_on date, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_work_in_org((select p.org_id from public.advisor_org_posts p where p.id = p_post_id)) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('idea', 'draft', 'planned', 'published') then
    raise exception 'org_post_invalid' using errcode = '22023';
  end if;
  update public.advisor_org_posts
  set planned_on = coalesce(p_planned_on, planned_on), status = coalesce(p_status, status), updated_at = pg_catalog.now()
  where id = p_post_id;
end;
$$;
revoke all on function public.move_org_post(uuid, date, text) from public, anon;
grant execute on function public.move_org_post(uuid, date, text) to authenticated;

create or replace function public.delete_org_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.advisor_org_posts%rowtype;
begin
  select * into v_post from public.advisor_org_posts p where p.id = p_post_id;
  if v_post.id is null then
    return false;
  end if;
  if not public.can_work_in_org(v_post.org_id) or not (v_post.created_by_user_id = auth.uid() or public.is_advisor_org_owner_of(v_post.org_id)) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_posts where id = p_post_id;
  return true;
end;
$$;
revoke all on function public.delete_org_post(uuid) from public, anon;
grant execute on function public.delete_org_post(uuid) to authenticated;

-- Eine Kampagne loeschen: die Postings bleiben (ohne Kampagne). Wer angelegt hat oder die Fuehrung.
create or replace function public.delete_org_campaign(p_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.advisor_org_campaigns%rowtype;
begin
  select * into v_campaign from public.advisor_org_campaigns c where c.id = p_campaign_id;
  if v_campaign.id is null then
    return false;
  end if;
  if not public.can_work_in_org(v_campaign.org_id) or not (v_campaign.created_by_user_id = auth.uid() or public.is_advisor_org_owner_of(v_campaign.org_id)) then
    raise exception 'org_post_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_campaigns where id = p_campaign_id;
  return true;
end;
$$;
revoke all on function public.delete_org_campaign(uuid) from public, anon;
grant execute on function public.delete_org_campaign(uuid) to authenticated;

-- Endet eine Mitgliedschaft, verlieren ihre Postings die Zustaendigkeit (Stand 20270312120000 plus Postings).
create or replace function public.release_org_work_on_member_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := coalesce(new.org_id, old.org_id);
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  if tg_op = 'DELETE' or (new.status <> 'active' and old.status = 'active') then
    update public.advisor_org_tasks set assignee_user_id = null, updated_at = pg_catalog.now()
    where org_id = v_org and assignee_user_id = v_user;
    update public.advisor_org_posts set assignee_user_id = null, updated_at = pg_catalog.now()
    where org_id = v_org and assignee_user_id = v_user;
    update public.advisor_org_member_presence set stand_in_user_id = null
    where org_id = v_org and stand_in_user_id = v_user;
    delete from public.advisor_org_member_presence where org_id = v_org and user_id = v_user;
  end if;
  return coalesce(new, old);
end;
$$;

commit;
