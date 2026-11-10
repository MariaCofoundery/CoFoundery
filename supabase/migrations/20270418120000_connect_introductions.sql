-- Connect: Vorstellungen (Stufe 2 der Tueren, Entwurf 10.11.2026).
--
-- Eine Vorstellung ist eine Kontaktanfrage an die Inhaberin einer Tuer - dieselbe Anfrage, derselbe Verlauf, dasselbe Postfach
-- (request_network_person_contact). Dazu kommt nur eine Seitentabelle, die sagt: Diese Anfrage ist eine Vorstellung, zu welcher
-- Art von Mensch (als Abschrift, falls die Tuer spaeter geloescht wird), und ob die Kennerin sie zurueckgestellt hat ("Spaeter").
--
-- REGELN: Hoechstens zwei offene Vorstellungen je Person. Nach 14 Tagen ohne Antwort schliesst sich die Anfrage still (Stand
-- "canceled"; ohne Grund, ohne Meldung). Bei pausierten Tueren (doors_open) gibt es keine Anfrage. Nach 14 Tagen fragt Connect
-- beide, ob es geklappt hat - die Antwort sieht nur, wer sie gibt (kein Zaehler, keine Liste, kein Wert).

begin;

create table public.network_introductions (
  request_id uuid primary key references public.network_contact_requests (id) on delete cascade,
  door_id uuid references public.network_doors (id) on delete set null,
  type_key text not null,
  other_label text,
  sector_key text,
  region text,
  snoozed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now()
);
create index network_introductions_door_idx on public.network_introductions (door_id);
alter table public.network_introductions enable row level security;
revoke all on public.network_introductions from anon, authenticated;
grant select on public.network_introductions to authenticated;
create policy network_introductions_participants_read on public.network_introductions
  for select to authenticated using (
    exists (select 1 from public.network_contact_requests r where r.id = request_id and auth.uid() in (r.sender_user_id, r.recipient_user_id))
  );

create table public.network_introduction_outcomes (
  request_id uuid not null references public.network_contact_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  outcome text not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (request_id, user_id),
  constraint network_introduction_outcomes_outcome check (outcome in ('yes', 'no', 'not_yet'))
);
create index network_introduction_outcomes_user_idx on public.network_introduction_outcomes (user_id);
alter table public.network_introduction_outcomes enable row level security;
revoke all on public.network_introduction_outcomes from anon, authenticated;
grant select on public.network_introduction_outcomes to authenticated;
create policy network_introduction_outcomes_own_read on public.network_introduction_outcomes for select to authenticated using (user_id = auth.uid());

-- Alles, was seit mehr als 14 Tagen unbeantwortet ist, schliesst sich still. Fuer eine Absenderin (beim Anfragen) und fuer alle (Cron).
create or replace function public.close_stale_introductions()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.network_contact_requests r set status = 'canceled'
  where r.status = 'pending' and exists (select 1 from public.network_introductions i where i.request_id = r.id and i.created_at < pg_catalog.now() - interval '14 days');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.close_stale_introductions() from public, anon, authenticated;
grant execute on function public.close_stale_introductions() to service_role;

create or replace function public.request_network_introduction(p_door_id uuid, p_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_door public.network_doors%rowtype;
  v_open boolean;
  v_count integer;
  v_id uuid;
begin
  if auth.uid() is null or not public.is_network_member() then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  select d.* into v_door from public.network_doors d where d.id = p_door_id;
  if not found or v_door.user_id = auth.uid() or not public.connect_owner_visible(v_door.user_id)
     or public.is_network_interaction_blocked(auth.uid(), v_door.user_id) then
    raise exception 'introduction_unavailable' using errcode = '42501';
  end if;
  select p.doors_open into v_open from public.network_profiles p where p.user_id = v_door.user_id and p.status = 'active';
  if not coalesce(v_open, false) then
    raise exception 'introduction_paused' using errcode = '23514';
  end if;
  -- Eigene unbeantwortete Vorstellungen nach 14 Tagen schliessen, dann zaehlen.
  update public.network_contact_requests r set status = 'canceled'
  where r.sender_user_id = auth.uid() and r.status = 'pending'
    and exists (select 1 from public.network_introductions i where i.request_id = r.id and i.created_at < pg_catalog.now() - interval '14 days');
  select count(*) into v_count from public.network_introductions i join public.network_contact_requests r on r.id = i.request_id
  where r.sender_user_id = auth.uid() and r.status = 'pending';
  if v_count >= 2 then
    raise exception 'introduction_limit' using errcode = '23514';
  end if;
  v_id := public.request_network_person_contact(v_door.user_id, p_message);
  insert into public.network_introductions (request_id, door_id, type_key, other_label, sector_key, region)
  values (v_id, v_door.id, v_door.type_key, v_door.other_label, v_door.sector_key, v_door.region)
  on conflict (request_id) do nothing;
  return v_id;
end;
$$;
revoke all on function public.request_network_introduction(uuid, text) from public, anon;
grant execute on function public.request_network_introduction(uuid, text) to authenticated;

-- "Spaeter, ich melde mich": die Anfrage bleibt offen, steht aber nicht mehr oben und zaehlt nicht mehr am Reiter.
create or replace function public.snooze_network_introduction(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.network_introductions i set snoozed_at = pg_catalog.now()
  where i.request_id = p_request_id and exists (
    select 1 from public.network_contact_requests r where r.id = i.request_id and r.recipient_user_id = auth.uid() and r.status = 'pending'
  );
  return found;
end;
$$;
revoke all on function public.snooze_network_introduction(uuid) from public, anon;
grant execute on function public.snooze_network_introduction(uuid) to authenticated;

-- "Hat es geklappt?": nur eine Beteiligte, nur bei angenommenen Vorstellungen. Die Antwort sieht nur, wer sie gibt.
create or replace function public.answer_network_introduction_outcome(p_request_id uuid, p_outcome text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_outcome not in ('yes', 'no', 'not_yet') then
    raise exception 'introduction_invalid' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.network_introductions i join public.network_contact_requests r on r.id = i.request_id
    where i.request_id = p_request_id and r.status = 'accepted' and auth.uid() in (r.sender_user_id, r.recipient_user_id)
  ) then
    raise exception 'introduction_not_yours' using errcode = '42501';
  end if;
  insert into public.network_introduction_outcomes (request_id, user_id, outcome) values (p_request_id, auth.uid(), p_outcome)
  on conflict (request_id, user_id) do update set outcome = excluded.outcome, created_at = pg_catalog.now();
  return true;
end;
$$;
revoke all on function public.answer_network_introduction_outcome(uuid, text) from public, anon;
grant execute on function public.answer_network_introduction_outcome(uuid, text) to authenticated;

-- Fuer die Kontakte-Seite: meine Vorstellungen (als Absenderin oder Kennerin) mit allem, was sie dort brauchen.
create or replace function public.list_network_introductions()
returns table (
  request_id uuid, role text, type_key text, other_label text, sector_key text, region text, snoozed_at timestamptz,
  status text, created_at timestamptz, responded_at timestamptz, answered boolean
)
language sql stable security definer set search_path = '' as $$
  select i.request_id, case when r.sender_user_id = auth.uid() then 'sender' else 'recipient' end, i.type_key, i.other_label, i.sector_key, i.region,
         i.snoozed_at, r.status, r.created_at, r.responded_at,
         exists (select 1 from public.network_introduction_outcomes o where o.request_id = i.request_id and o.user_id = auth.uid())
  from public.network_introductions i join public.network_contact_requests r on r.id = i.request_id
  where auth.uid() is not null and auth.uid() in (r.sender_user_id, r.recipient_user_id)
  order by r.created_at desc;
$$;
revoke all on function public.list_network_introductions() from public, anon;
grant execute on function public.list_network_introductions() to authenticated;

-- Die Zahl am Reiter "Kontakte": offene Anfragen an mich, ohne die zurueckgestellten Vorstellungen.
create or replace function public.count_network_incoming_pending()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.network_contact_requests r
  where auth.uid() is not null and r.recipient_user_id = auth.uid() and r.status = 'pending'
    and not exists (select 1 from public.network_introductions i where i.request_id = r.id and i.snoozed_at is not null);
$$;
revoke all on function public.count_network_incoming_pending() from public, anon;
grant execute on function public.count_network_incoming_pending() to authenticated;

commit;
