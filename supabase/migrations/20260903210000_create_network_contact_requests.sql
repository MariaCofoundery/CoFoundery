begin;

create table public.network_contact_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.network_listings(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  status text not null default 'pending',
  listing_title_snapshot text not null,
  sender_display_name_snapshot text not null,
  sender_headline_snapshot text not null default '',
  recipient_display_name_snapshot text not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint network_contact_requests_status_check
    check (status in ('pending','accepted','declined','canceled')),
  constraint network_contact_requests_distinct_users_check
    check (sender_user_id <> recipient_user_id),
  constraint network_contact_requests_message_check
    check (char_length(btrim(message)) between 10 and 500),
  constraint network_contact_requests_snapshot_check
    check (
      char_length(btrim(listing_title_snapshot)) between 1 and 100
      and char_length(btrim(sender_display_name_snapshot)) between 1 and 80
      and char_length(sender_headline_snapshot) <= 160
      and char_length(btrim(recipient_display_name_snapshot)) between 1 and 80
    ),
  constraint network_contact_requests_response_time_check
    check (
      (status in ('accepted','declined') and responded_at is not null)
      or (status in ('pending','canceled') and responded_at is null)
    ),
  constraint network_contact_requests_sender_listing_unique unique(sender_user_id, listing_id)
);

create index network_contact_requests_recipient_status_idx
  on public.network_contact_requests(recipient_user_id, status, created_at desc);
create index network_contact_requests_sender_created_idx
  on public.network_contact_requests(sender_user_id, created_at desc);

create trigger network_contact_requests_updated_at
before update on public.network_contact_requests
for each row execute function public.set_network_updated_at();

alter table public.network_contact_requests enable row level security;

create policy network_contact_requests_select_participants
on public.network_contact_requests for select to authenticated
using (
  public.is_network_member()
  and auth.uid() in (sender_user_id, recipient_user_id)
);

revoke all on public.network_contact_requests from anon;
revoke insert, update, delete on public.network_contact_requests from authenticated;
grant select on public.network_contact_requests to authenticated;

create or replace function public.request_network_contact(
  p_listing_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_user_id uuid := auth.uid();
  v_listing public.network_listings%rowtype;
  v_sender_profile public.network_profiles%rowtype;
  v_recipient_profile public.network_profiles%rowtype;
  v_existing_id uuid;
  v_message text := btrim(coalesce(p_message, ''));
  v_request_id uuid;
begin
  if v_sender_user_id is null or not public.is_network_member(v_sender_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  select * into v_listing
  from public.network_listings listing
  where listing.id = p_listing_id;
  if not found
    or v_listing.status <> 'active'
    or v_listing.expires_at is null
    or v_listing.expires_at <= now() then
    raise exception 'network_contact_listing_unavailable' using errcode = '42501';
  end if;
  if v_listing.owner_user_id = v_sender_user_id then
    raise exception 'network_contact_self_request_forbidden' using errcode = '23514';
  end if;
  if not public.is_network_member(v_listing.owner_user_id) then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;

  select * into v_sender_profile from public.network_profiles profile
  where profile.user_id = v_sender_user_id and profile.status = 'active';
  if not found then
    raise exception 'network_contact_sender_profile_required' using errcode = '23514';
  end if;
  select * into v_recipient_profile from public.network_profiles profile
  where profile.user_id = v_listing.owner_user_id and profile.status = 'active';
  if not found then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;
  if char_length(v_message) < 10 or char_length(v_message) > 500 then
    raise exception 'network_contact_message_invalid' using errcode = '23514';
  end if;

  select request.id into v_existing_id
  from public.network_contact_requests request
  where request.sender_user_id = v_sender_user_id
    and request.listing_id = p_listing_id;
  if found then
    return v_existing_id;
  end if;

  insert into public.network_contact_requests(
    listing_id, sender_user_id, recipient_user_id, message,
    listing_title_snapshot, sender_display_name_snapshot,
    sender_headline_snapshot, recipient_display_name_snapshot
  ) values (
    v_listing.id, v_sender_user_id, v_listing.owner_user_id, v_message,
    v_listing.title, v_sender_profile.display_name,
    v_sender_profile.headline, v_recipient_profile.display_name
  )
  on conflict (sender_user_id, listing_id) do nothing
  returning id into v_request_id;
  if v_request_id is null then
    select request.id into v_request_id
    from public.network_contact_requests request
    where request.sender_user_id = v_sender_user_id
      and request.listing_id = p_listing_id;
  end if;
  return v_request_id;
end;
$$;

create or replace function public.respond_network_contact(
  p_request_id uuid,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
begin
  if not public.is_network_member() then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  if p_response not in ('accepted','declined') then
    raise exception 'network_contact_response_invalid' using errcode = '23514';
  end if;
  select * into v_request from public.network_contact_requests request
  where request.id = p_request_id for update;
  if not found or v_request.recipient_user_id <> auth.uid() then
    raise exception 'network_contact_response_forbidden' using errcode = '42501';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'network_contact_not_pending' using errcode = '23514';
  end if;
  update public.network_contact_requests
  set status = p_response, responded_at = now()
  where id = p_request_id;
end;
$$;

create or replace function public.cancel_network_contact(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
begin
  if not public.is_network_member() then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  select * into v_request from public.network_contact_requests request
  where request.id = p_request_id for update;
  if not found or v_request.sender_user_id <> auth.uid() then
    raise exception 'network_contact_cancel_forbidden' using errcode = '42501';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'network_contact_not_pending' using errcode = '23514';
  end if;
  update public.network_contact_requests
  set status = 'canceled', responded_at = null
  where id = p_request_id;
end;
$$;

revoke all on function public.request_network_contact(uuid,text) from public, anon;
revoke all on function public.respond_network_contact(uuid,text) from public, anon;
revoke all on function public.cancel_network_contact(uuid) from public, anon;
grant execute on function public.request_network_contact(uuid,text) to authenticated, service_role;
grant execute on function public.respond_network_contact(uuid,text) to authenticated, service_role;
grant execute on function public.cancel_network_contact(uuid) to authenticated, service_role;

comment on table public.network_contact_requests is
  'Private listing-scoped contact intent between Network members. Accepted status creates no Founder relationship, team, chat, or product grant.';
comment on column public.network_contact_requests.message is
  'Participant-private plain-text message; excluded from Network browse and listing projections.';

commit;
