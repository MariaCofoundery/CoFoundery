begin;

alter table public.network_profiles
  add column photo_source text,
  add column photo_avatar_id text,
  add column photo_path text,
  add column photo_visibility text not null default 'platform_only';

alter table public.network_profiles
  add constraint network_profiles_photo_visibility_check
    check (photo_visibility in ('platform_only', 'public_allowed')),
  add constraint network_profiles_photo_contract_check
    check (
      (photo_source is null and photo_avatar_id is null and photo_path is null)
      or (
        photo_source = 'profile_avatar'
        and photo_avatar_id ~ '^avatar-(0[1-9]|[12][0-9]|30)$'
        and photo_path is null
      )
      or (
        photo_source = 'network_upload'
        and photo_avatar_id is null
        and photo_path is not null
        and photo_path like user_id::text || '/%'
      )
    );

comment on column public.network_profiles.photo_visibility is
  'Owner preference only. public_allowed never publishes a profile, listing, or object without a separate future publication contract.';
comment on column public.network_profiles.photo_path is
  'Private object path in network-profile-images. It is never a public URL.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'network-profile-images',
  'network-profile-images',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_read_network_profile_photo(p_object_name text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select auth.uid() is not null
    and public.is_network_member(auth.uid())
    and (
      split_part(p_object_name, '/', 1) = auth.uid()::text
      or exists (
        select 1
        from public.network_profiles profile
        where profile.status = 'active'
          and profile.photo_path = p_object_name
      )
    );
$$;

create policy network_profile_images_member_read
on storage.objects for select to authenticated
using (
  bucket_id = 'network-profile-images'
  and public.can_read_network_profile_photo(name)
);

create policy network_profile_images_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'network-profile-images'
  and public.is_network_member()
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy network_profile_images_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'network-profile-images'
  and public.is_network_member()
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'network-profile-images'
  and public.is_network_member()
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy network_profile_images_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'network-profile-images'
  and public.is_network_member()
  and split_part(name, '/', 1) = auth.uid()::text
);

revoke all on function public.can_read_network_profile_photo(text) from public, anon;
grant execute on function public.can_read_network_profile_photo(text) to authenticated, service_role;

create table public.network_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint network_blocks_no_self_check check (blocker_user_id <> blocked_user_id)
);

create index network_blocks_blocked_user_idx
  on public.network_blocks(blocked_user_id, blocker_user_id);

create table public.network_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  contact_request_id uuid not null references public.network_contact_requests(id) on delete cascade,
  category text not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint network_reports_distinct_users_check check (reporter_user_id <> reported_user_id),
  constraint network_reports_category_check
    check (category in ('spam', 'harassment', 'misleading', 'other')),
  constraint network_reports_comment_check
    check (comment is null or char_length(btrim(comment)) between 1 and 1000),
  constraint network_reports_one_per_context_unique unique(reporter_user_id, contact_request_id)
);

create index network_reports_review_idx
  on public.network_reports(created_at desc);

alter table public.network_blocks enable row level security;
alter table public.network_reports enable row level security;
revoke all on public.network_blocks, public.network_reports from public, anon, authenticated;
grant select, insert, update, delete on public.network_blocks, public.network_reports to service_role;

create or replace function public.is_network_interaction_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.network_blocks block
    where (block.blocker_user_id = p_user_a and block.blocked_user_id = p_user_b)
       or (block.blocker_user_id = p_user_b and block.blocked_user_id = p_user_a)
  );
$$;

create or replace function public.get_network_block_state(p_other_user_id uuid)
returns table (interaction_blocked boolean, blocked_by_current_user boolean)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  return query select
    public.is_network_interaction_blocked(v_user_id, p_other_user_id),
    exists (
      select 1 from public.network_blocks block
      where block.blocker_user_id = v_user_id
        and block.blocked_user_id = p_other_user_id
    );
end;
$$;

create or replace function public.block_network_user(p_blocked_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  if p_blocked_user_id is null or p_blocked_user_id = v_user_id then
    raise exception 'network_block_target_invalid' using errcode = '23514';
  end if;
  if not public.is_network_member(p_blocked_user_id) then
    raise exception 'network_block_target_unavailable' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.network_contact_requests request
    where (request.sender_user_id = v_user_id and request.recipient_user_id = p_blocked_user_id)
       or (request.sender_user_id = p_blocked_user_id and request.recipient_user_id = v_user_id)
  ) then
    raise exception 'network_block_relationship_required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(v_user_id::text, p_blocked_user_id::text) || greatest(v_user_id::text, p_blocked_user_id::text), 0)
  );

  insert into public.network_blocks(blocker_user_id, blocked_user_id)
  values (v_user_id, p_blocked_user_id)
  on conflict (blocker_user_id, blocked_user_id) do nothing;

  update public.network_contact_requests request
  set status = 'canceled', responded_at = null, updated_at = now()
  where request.status = 'pending'
    and (
      (request.sender_user_id = v_user_id and request.recipient_user_id = p_blocked_user_id)
      or (request.sender_user_id = p_blocked_user_id and request.recipient_user_id = v_user_id)
    );

  update public.network_messages message
  set read_at = coalesce(message.read_at, now())
  from public.network_conversations conversation
  where message.conversation_id = conversation.id
    and message.read_at is null
    and (
      (conversation.participant_a_user_id = v_user_id and conversation.participant_b_user_id = p_blocked_user_id)
      or (conversation.participant_a_user_id = p_blocked_user_id and conversation.participant_b_user_id = v_user_id)
    );
end;
$$;

create or replace function public.unblock_network_user(p_blocked_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  delete from public.network_blocks block
  where block.blocker_user_id = v_user_id
    and block.blocked_user_id = p_blocked_user_id;
end;
$$;

create or replace function public.list_network_blocks()
returns table (blocked_user_id uuid, display_name text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  return query
  select block.blocked_user_id,
    coalesce(
      nullif(profile.display_name, ''),
      (
        select case when request.sender_user_id = block.blocked_user_id
          then request.sender_display_name_snapshot else request.recipient_display_name_snapshot end
        from public.network_contact_requests request
        where v_user_id in (request.sender_user_id, request.recipient_user_id)
          and block.blocked_user_id in (request.sender_user_id, request.recipient_user_id)
        order by request.created_at desc limit 1
      ),
      'Network member'
    ),
    block.created_at
  from public.network_blocks block
  left join public.network_profiles profile on profile.user_id = block.blocked_user_id
  where block.blocker_user_id = v_user_id
  order by block.created_at desc;
end;
$$;

create or replace function public.report_network_interaction(
  p_contact_request_id uuid,
  p_category text,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.network_contact_requests%rowtype;
  v_reported_user_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_report_id uuid;
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;
  if p_category not in ('spam', 'harassment', 'misleading', 'other')
    or (v_comment is not null and char_length(v_comment) > 1000) then
    raise exception 'network_report_invalid' using errcode = '23514';
  end if;
  select * into v_request from public.network_contact_requests request
  where request.id = p_contact_request_id;
  if not found or v_user_id not in (v_request.sender_user_id, v_request.recipient_user_id) then
    raise exception 'network_report_context_denied' using errcode = '42501';
  end if;
  v_reported_user_id := case when v_request.sender_user_id = v_user_id
    then v_request.recipient_user_id else v_request.sender_user_id end;

  insert into public.network_reports(
    reporter_user_id, reported_user_id, contact_request_id, category, comment
  ) values (
    v_user_id, v_reported_user_id, p_contact_request_id, p_category, v_comment
  )
  on conflict (reporter_user_id, contact_request_id) do update
    set category = excluded.category, comment = excluded.comment
  returning id into v_report_id;
  return v_report_id;
end;
$$;

create or replace function public.request_network_contact(p_listing_id uuid, p_message text)
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
  select * into v_listing from public.network_listings listing where listing.id = p_listing_id;
  if not found or v_listing.status <> 'active' or v_listing.expires_at is null or v_listing.expires_at <= now() then
    raise exception 'network_contact_listing_unavailable' using errcode = '42501';
  end if;
  if v_listing.owner_user_id = v_sender_user_id then
    raise exception 'network_contact_self_request_forbidden' using errcode = '23514';
  end if;
  if not public.is_network_member(v_listing.owner_user_id) then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(v_sender_user_id::text, v_listing.owner_user_id::text) || greatest(v_sender_user_id::text, v_listing.owner_user_id::text), 0)
  );
  if public.is_network_interaction_blocked(v_sender_user_id, v_listing.owner_user_id) then
    raise exception 'network_contact_interaction_blocked' using errcode = '42501';
  end if;
  select * into v_sender_profile from public.network_profiles profile
  where profile.user_id = v_sender_user_id and profile.status = 'active';
  if not found then raise exception 'network_contact_sender_profile_required' using errcode = '23514'; end if;
  select * into v_recipient_profile from public.network_profiles profile
  where profile.user_id = v_listing.owner_user_id and profile.status = 'active';
  if not found then raise exception 'network_contact_recipient_unavailable' using errcode = '42501'; end if;
  if char_length(v_message) < 10 or char_length(v_message) > 500 then
    raise exception 'network_contact_message_invalid' using errcode = '23514';
  end if;
  select request.id into v_existing_id from public.network_contact_requests request
  where request.sender_user_id = v_sender_user_id and request.listing_id = p_listing_id;
  if found then return v_existing_id; end if;
  insert into public.network_contact_requests(
    listing_id, sender_user_id, recipient_user_id, message,
    listing_title_snapshot, sender_display_name_snapshot,
    sender_headline_snapshot, recipient_display_name_snapshot
  ) values (
    v_listing.id, v_sender_user_id, v_listing.owner_user_id, v_message,
    v_listing.title, v_sender_profile.display_name,
    v_sender_profile.headline, v_recipient_profile.display_name
  ) on conflict (sender_user_id, listing_id) do nothing returning id into v_request_id;
  if v_request_id is null then
    select request.id into v_request_id from public.network_contact_requests request
    where request.sender_user_id = v_sender_user_id and request.listing_id = p_listing_id;
  end if;
  return v_request_id;
end;
$$;

create or replace function public.respond_network_contact(p_request_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.network_contact_requests%rowtype;
begin
  if not public.is_network_member() then raise exception 'network_membership_required' using errcode = '42501'; end if;
  if p_response not in ('accepted','declined') then raise exception 'network_contact_response_invalid' using errcode = '23514'; end if;
  select * into v_request from public.network_contact_requests request where request.id = p_request_id for update;
  if not found or v_request.recipient_user_id <> auth.uid() then raise exception 'network_contact_response_forbidden' using errcode = '42501'; end if;
  if public.is_network_interaction_blocked(v_request.sender_user_id, v_request.recipient_user_id) then
    raise exception 'network_contact_interaction_blocked' using errcode = '42501';
  end if;
  if v_request.status = 'accepted' and p_response = 'accepted' then
    insert into public.network_conversations(contact_request_id, participant_a_user_id, participant_b_user_id, created_at)
    values(v_request.id, v_request.sender_user_id, v_request.recipient_user_id, coalesce(v_request.responded_at, v_request.updated_at, v_request.created_at))
    on conflict (contact_request_id) do nothing;
    return;
  end if;
  if v_request.status <> 'pending' then raise exception 'network_contact_not_pending' using errcode = '23514'; end if;
  update public.network_contact_requests set status = p_response, responded_at = now() where id = p_request_id;
  if p_response = 'accepted' then
    insert into public.network_conversations(contact_request_id, participant_a_user_id, participant_b_user_id)
    values(v_request.id, v_request.sender_user_id, v_request.recipient_user_id)
    on conflict (contact_request_id) do nothing;
  end if;
end;
$$;

create or replace function public.send_network_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_other_user_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_message_id uuid;
  v_created_at timestamptz := now();
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then raise exception 'network_membership_required' using errcode = '42501'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'network_message_body_invalid' using errcode = '23514'; end if;
  select case when conversation.participant_a_user_id = v_user_id then conversation.participant_b_user_id else conversation.participant_a_user_id end
  into v_other_user_id
  from public.network_conversations conversation
  join public.network_contact_requests request on request.id = conversation.contact_request_id
  where conversation.id = p_conversation_id and request.status = 'accepted'
    and v_user_id in (conversation.participant_a_user_id, conversation.participant_b_user_id);
  if not found then raise exception 'network_conversation_access_denied' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(v_user_id::text, v_other_user_id::text) || greatest(v_user_id::text, v_other_user_id::text), 0)
  );
  if public.is_network_interaction_blocked(v_user_id, v_other_user_id) then
    raise exception 'network_message_interaction_blocked' using errcode = '42501';
  end if;
  insert into public.network_messages(conversation_id, sender_user_id, body, created_at)
  values (p_conversation_id, v_user_id, v_body, v_created_at) returning id into v_message_id;
  update public.network_conversations set last_message_at = v_created_at where id = p_conversation_id;
  return v_message_id;
end;
$$;

create or replace function public.get_unread_network_message_count()
returns bigint
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  if v_user_id is null or not public.is_network_member(v_user_id) then raise exception 'network_membership_required' using errcode = '42501'; end if;
  select count(*) into v_count
  from public.network_messages message
  join public.network_conversations conversation on conversation.id = message.conversation_id
  join public.network_contact_requests request on request.id = conversation.contact_request_id
  where request.status = 'accepted'
    and v_user_id in (conversation.participant_a_user_id, conversation.participant_b_user_id)
    and not public.is_network_interaction_blocked(conversation.participant_a_user_id, conversation.participant_b_user_id)
    and message.sender_user_id <> v_user_id and message.read_at is null;
  return v_count;
end;
$$;

revoke all on function public.is_network_interaction_blocked(uuid,uuid) from public, anon, authenticated;
revoke all on function public.get_network_block_state(uuid) from public, anon;
revoke all on function public.block_network_user(uuid) from public, anon;
revoke all on function public.unblock_network_user(uuid) from public, anon;
revoke all on function public.list_network_blocks() from public, anon;
revoke all on function public.report_network_interaction(uuid,text,text) from public, anon;
grant execute on function public.is_network_interaction_blocked(uuid,uuid) to service_role;
grant execute on function public.get_network_block_state(uuid) to authenticated, service_role;
grant execute on function public.block_network_user(uuid) to authenticated, service_role;
grant execute on function public.unblock_network_user(uuid) to authenticated, service_role;
grant execute on function public.list_network_blocks() to authenticated, service_role;
grant execute on function public.report_network_interaction(uuid,text,text) to authenticated, service_role;

comment on table public.network_blocks is
  'Private owner-controlled symmetric interaction stop. It is not an account sanction or public trust signal.';
comment on table public.network_reports is
  'Confidential participant reports for restricted beta operations review; reports never alter permissions automatically.';

commit;
