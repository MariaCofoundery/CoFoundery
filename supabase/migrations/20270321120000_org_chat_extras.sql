-- Teamraum-Chat, Stufe 2: eigene Gruppen, Reaktionen, Suche, Bilder und Dateien, Ungelesen im Menue.
--
-- Wunsch von Maria (05.11.2026). Regeln wie im Chat (20270318120000) - nur Mitglieder, nie die Startups:
--   - GRUPPEN: ein Name und eine Mitgliederliste aus dem Team. Lesen und schreiben nur, wer in der
--     Gruppe UND aktives Mitglied der Organisation ist. Anlegen darf jedes Mitglied (es ist selbst dabei);
--     Name und Mitglieder aendern, wer die Gruppe angelegt hat, oder die Fuehrung. Austreten kann jeder.
--   - REAKTIONEN: eine kleine feste Auswahl, je Person und Zeichen eine; sichtbar fuer alle im Chat.
--   - SUCHE: nur in Chats, die man lesen darf; zurueckgenommene Nachrichten nicht.
--   - ANHAENGE: ein privater Speicher (org-chat-files) ohne Policies - die Anwendung prueft ueber die
--     Funktionen hier und schreibt/liest mit dem Dienstschluessel. Pfad: <user>/<org>/<chat>/<datei>, damit
--     die Kontoloeschung die eigenen Dateien findet. Hoechstens 10 MB; Bilder, PDF, Office, Text.

begin;

-- ---------------------------------------------------------------------------
-- Gruppen
-- ---------------------------------------------------------------------------
alter table public.advisor_org_chats
  add column name text,
  add column created_by_user_id uuid references auth.users (id) on delete set null;
alter table public.advisor_org_chats drop constraint advisor_org_chats_kind;
alter table public.advisor_org_chats drop constraint advisor_org_chats_pair;
alter table public.advisor_org_chats
  add constraint advisor_org_chats_kind check (kind in ('team', 'direct', 'group')),
  add constraint advisor_org_chats_pair check (
    (kind = 'team' and direct_a is null and direct_b is null and name is null)
    or (kind = 'direct' and direct_a is not null and direct_b is not null and direct_a < direct_b and name is null)
    or (kind = 'group' and direct_a is null and direct_b is null and char_length(btrim(name)) between 1 and 80)
  );
create index advisor_org_chats_created_by_idx on public.advisor_org_chats (created_by_user_id) where created_by_user_id is not null;

create table public.advisor_org_chat_members (
  chat_id uuid not null references public.advisor_org_chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);
create index advisor_org_chat_members_user_idx on public.advisor_org_chat_members (user_id);
alter table public.advisor_org_chat_members enable row level security;
revoke all on public.advisor_org_chat_members from anon, authenticated;
grant select on public.advisor_org_chat_members to authenticated;

create or replace function public.can_read_org_chat(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_org_chats c
    where c.id = p_chat_id
      and public.is_advisor_org_member(c.org_id)
      and (
        c.kind = 'team'
        or (c.kind = 'direct' and auth.uid() in (c.direct_a, c.direct_b))
        or (c.kind = 'group' and exists (select 1 from public.advisor_org_chat_members gm where gm.chat_id = c.id and gm.user_id = auth.uid()))
      )
  );
$$;

create policy advisor_org_chat_members_read on public.advisor_org_chat_members
  for select to authenticated using (public.can_read_org_chat(chat_id));

-- Mitglieder einer Gruppe: nur aktive Mitglieder der Organisation, die aufrufende Person immer dabei.
create or replace function public.clean_group_members(p_org_id uuid, p_member_ids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct m.user_id), '{}'::uuid[])
  from public.advisor_org_members m
  where m.org_id = p_org_id and m.status = 'active'
    and (m.user_id = any (coalesce(p_member_ids, '{}'::uuid[])) or m.user_id = auth.uid());
$$;
revoke all on function public.clean_group_members(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.create_org_chat_group(p_org_id uuid, p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.can_work_in_org(p_org_id) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'org_chat_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_org_chats (org_id, kind, name, created_by_user_id)
  values (p_org_id, 'group', btrim(p_name), auth.uid())
  returning id into v_id;
  insert into public.advisor_org_chat_members (chat_id, user_id)
  select v_id, member from unnest(public.clean_group_members(p_org_id, p_member_ids)) as member;
  return v_id;
end;
$$;
revoke all on function public.create_org_chat_group(uuid, text, uuid[]) from public, anon;
grant execute on function public.create_org_chat_group(uuid, text, uuid[]) to authenticated;

create or replace function public.update_org_chat_group(p_chat_id uuid, p_name text, p_member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chat public.advisor_org_chats%rowtype;
  v_members uuid[];
begin
  select * into v_chat from public.advisor_org_chats c where c.id = p_chat_id and c.kind = 'group';
  if v_chat.id is null or not public.can_work_in_org(v_chat.org_id) or not public.can_read_org_chat(p_chat_id)
     or not (v_chat.created_by_user_id = auth.uid() or public.is_advisor_org_owner_of(v_chat.org_id)) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'org_chat_invalid' using errcode = '22023';
  end if;
  v_members := public.clean_group_members(v_chat.org_id, p_member_ids);
  update public.advisor_org_chats set name = btrim(p_name) where id = p_chat_id;
  delete from public.advisor_org_chat_members where chat_id = p_chat_id and not (user_id = any (v_members));
  insert into public.advisor_org_chat_members (chat_id, user_id)
  select p_chat_id, member from unnest(v_members) as member
  on conflict do nothing;
end;
$$;
revoke all on function public.update_org_chat_group(uuid, text, uuid[]) from public, anon;
grant execute on function public.update_org_chat_group(uuid, text, uuid[]) to authenticated;

create or replace function public.leave_org_chat_group(p_chat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.advisor_org_chat_members gm
  using public.advisor_org_chats c
  where gm.chat_id = p_chat_id and gm.user_id = auth.uid() and c.id = gm.chat_id and c.kind = 'group';
  -- Eine leere Gruppe hat niemanden mehr, der sie liest: sie geht.
  delete from public.advisor_org_chats c
  where c.id = p_chat_id and c.kind = 'group'
    and not exists (select 1 from public.advisor_org_chat_members gm where gm.chat_id = c.id);
end;
$$;
revoke all on function public.leave_org_chat_group(uuid) from public, anon;
grant execute on function public.leave_org_chat_group(uuid) to authenticated;

-- Wer die Organisation verlaesst, verlaesst auch ihre Gruppen (lesen koennte er sie ohnehin nicht mehr).
create or replace function public.leave_org_chat_groups_on_member_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or (new.status <> 'active' and old.status = 'active') then
    delete from public.advisor_org_chat_members gm
    using public.advisor_org_chats c
    where gm.chat_id = c.id and c.org_id = coalesce(new.org_id, old.org_id) and gm.user_id = coalesce(new.user_id, old.user_id);
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.leave_org_chat_groups_on_member_end() from public, anon, authenticated;
create trigger leave_org_chat_groups_on_member_end
after update of status or delete on public.advisor_org_members
for each row execute function public.leave_org_chat_groups_on_member_end();

-- ---------------------------------------------------------------------------
-- Anhaenge
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-chat-files', 'org-chat-files', false, 10485760, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
  'application/pdf', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.advisor_org_chat_messages
  add column attachment_path text,
  add column attachment_name text,
  add column attachment_type text,
  add column attachment_size integer;
alter table public.advisor_org_chat_messages drop constraint advisor_org_chat_messages_body;
alter table public.advisor_org_chat_messages
  add constraint advisor_org_chat_messages_body check (
    char_length(body) <= 4000
    and (retracted_at is not null or char_length(btrim(body)) >= 1 or attachment_path is not null)
  ),
  add constraint advisor_org_chat_messages_attachment check (
    (attachment_path is null and attachment_name is null and attachment_type is null and attachment_size is null)
    or (attachment_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
        and char_length(attachment_name) between 1 and 200
        and char_length(attachment_type) between 1 and 120
        and attachment_size between 1 and 10485760)
  );

-- Darf diese Person hier gerade schreiben? (Fuer das Hochladen, bevor es eine Nachricht gibt.)
create or replace function public.can_write_org_chat(p_chat_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chat public.advisor_org_chats%rowtype;
  v_other uuid;
begin
  select * into v_chat from public.advisor_org_chats c where c.id = p_chat_id;
  if v_chat.id is null or not public.can_read_org_chat(p_chat_id) or not public.can_work_in_org(v_chat.org_id) then
    return false;
  end if;
  if v_chat.kind = 'direct' then
    v_other := case when v_chat.direct_a = auth.uid() then v_chat.direct_b else v_chat.direct_a end;
    return exists (select 1 from public.advisor_org_members m where m.org_id = v_chat.org_id and m.user_id = v_other and m.status = 'active');
  end if;
  return true;
end;
$$;
revoke all on function public.can_write_org_chat(uuid) from public, anon;
grant execute on function public.can_write_org_chat(uuid) to authenticated;

-- Senden, jetzt auch mit Anhang. Der Pfad muss der aufrufenden Person in diesem Chat gehoeren.
drop function public.send_org_chat_message(uuid, text);
create or replace function public.send_org_chat_message(
  p_chat_id uuid, p_body text,
  p_attachment_path text default null, p_attachment_name text default null, p_attachment_type text default null, p_attachment_size integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chat public.advisor_org_chats%rowtype;
  v_id uuid;
begin
  select * into v_chat from public.advisor_org_chats c where c.id = p_chat_id;
  if v_chat.id is null or not public.can_read_org_chat(p_chat_id) or not public.can_work_in_org(v_chat.org_id) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  if not public.can_write_org_chat(p_chat_id) then
    raise exception 'org_chat_not_member' using errcode = '22023';
  end if;
  if p_attachment_path is not null and split_part(p_attachment_path, '/', 1) || '/' || split_part(p_attachment_path, '/', 2) || '/' || split_part(p_attachment_path, '/', 3)
       <> auth.uid()::text || '/' || v_chat.org_id::text || '/' || p_chat_id::text then
    raise exception 'org_chat_invalid' using errcode = '22023';
  end if;
  if char_length(coalesce(p_body, '')) > 4000 or (char_length(btrim(coalesce(p_body, ''))) = 0 and p_attachment_path is null) then
    raise exception 'org_chat_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_org_chat_messages (chat_id, org_id, author_user_id, body, attachment_path, attachment_name, attachment_type, attachment_size)
  values (p_chat_id, v_chat.org_id, auth.uid(), btrim(coalesce(p_body, '')), p_attachment_path, p_attachment_name, p_attachment_type, p_attachment_size)
  returning id into v_id;
  update public.advisor_org_chats set last_message_at = pg_catalog.now() where id = p_chat_id;
  insert into public.advisor_org_chat_reads (chat_id, user_id, last_read_at) values (p_chat_id, auth.uid(), pg_catalog.now())
  on conflict (chat_id, user_id) do update set last_read_at = excluded.last_read_at;
  return v_id;
exception
  when check_violation then
    raise exception 'org_chat_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.send_org_chat_message(uuid, text, text, text, text, integer) from public, anon;
grant execute on function public.send_org_chat_message(uuid, text, text, text, text, integer) to authenticated;

-- Zuruecknehmen: Text UND Anhang weg. Gibt den Pfad zurueck, damit die Anwendung die Datei loescht.
drop function public.retract_org_chat_message(uuid);
create or replace function public.retract_org_chat_message(p_message_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  select attachment_path into v_path from public.advisor_org_chat_messages
  where id = p_message_id and author_user_id = auth.uid() and retracted_at is null;
  if not found then
    return null;
  end if;
  update public.advisor_org_chat_messages
  set body = '', retracted_at = pg_catalog.now(), attachment_path = null, attachment_name = null, attachment_type = null, attachment_size = null
  where id = p_message_id;
  return coalesce(v_path, '');
end;
$$;
revoke all on function public.retract_org_chat_message(uuid) from public, anon;
grant execute on function public.retract_org_chat_message(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Reaktionen
-- ---------------------------------------------------------------------------
create table public.advisor_org_chat_reactions (
  message_id uuid not null references public.advisor_org_chat_messages (id) on delete cascade,
  chat_id uuid not null references public.advisor_org_chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji),
  constraint advisor_org_chat_reactions_emoji check (emoji in ('👍', '❤️', '😂', '🎉', '🙏', '👀'))
);
create index advisor_org_chat_reactions_chat_idx on public.advisor_org_chat_reactions (chat_id);
create index advisor_org_chat_reactions_user_idx on public.advisor_org_chat_reactions (user_id);
alter table public.advisor_org_chat_reactions enable row level security;
revoke all on public.advisor_org_chat_reactions from anon, authenticated;
grant select on public.advisor_org_chat_reactions to authenticated;
create policy advisor_org_chat_reactions_read on public.advisor_org_chat_reactions
  for select to authenticated using (public.can_read_org_chat(chat_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.advisor_org_chat_reactions';
  end if;
end;
$$;
-- Damit die Echtzeit beim Entfernen einer Reaktion sagt, welche es war.
alter table public.advisor_org_chat_reactions replica identity full;

create or replace function public.toggle_org_chat_reaction(p_message_id uuid, p_emoji text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chat uuid;
begin
  select m.chat_id into v_chat from public.advisor_org_chat_messages m where m.id = p_message_id and m.retracted_at is null;
  if v_chat is null or not public.can_write_org_chat(v_chat) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  delete from public.advisor_org_chat_reactions where message_id = p_message_id and user_id = auth.uid() and emoji = p_emoji;
  if found then
    return false;
  end if;
  insert into public.advisor_org_chat_reactions (message_id, chat_id, user_id, emoji) values (p_message_id, v_chat, auth.uid(), p_emoji);
  return true;
exception
  when check_violation then
    raise exception 'org_chat_invalid' using errcode = '22023';
end;
$$;
revoke all on function public.toggle_org_chat_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_org_chat_reaction(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Suche, Liste, Ungelesen
-- ---------------------------------------------------------------------------
create or replace function public.search_org_chat_messages(p_org_id uuid, p_query text)
returns table (message_id uuid, chat_id uuid, author_user_id uuid, body text, created_at timestamptz, attachment_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.chat_id, m.author_user_id, left(m.body, 300), m.created_at, m.attachment_name
  from public.advisor_org_chat_messages m
  where m.org_id = p_org_id
    and m.retracted_at is null
    and char_length(btrim(coalesce(p_query, ''))) >= 2
    and (
      m.body ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      or m.attachment_name ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
    and public.can_read_org_chat(m.chat_id)
  order by m.created_at desc
  limit 50;
$$;
revoke all on function public.search_org_chat_messages(uuid, text) from public, anon;
grant execute on function public.search_org_chat_messages(uuid, text) to authenticated;

drop function public.list_my_org_chats(uuid);
create or replace function public.list_my_org_chats(p_org_id uuid)
returns table (
  chat_id uuid, kind text, name text, other_user_id uuid, member_count integer, created_by_user_id uuid, last_message_at timestamptz,
  last_body text, last_author_user_id uuid, unread integer, muted boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind, c.name,
    case when c.kind = 'direct' then (case when c.direct_a = auth.uid() then c.direct_b else c.direct_a end) end,
    case when c.kind = 'group' then (select count(*)::integer from public.advisor_org_chat_members gm where gm.chat_id = c.id) end,
    c.created_by_user_id,
    c.last_message_at,
    last.body, last.author_user_id,
    (select count(*)::integer from public.advisor_org_chat_messages m
      where m.chat_id = c.id and m.author_user_id <> auth.uid() and m.retracted_at is null
        and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)),
    coalesce(r.muted, false)
  from public.advisor_org_chats c
  left join public.advisor_org_chat_reads r on r.chat_id = c.id and r.user_id = auth.uid()
  left join lateral (
    select case when m.retracted_at is null then coalesce(nullif(left(m.body, 140), ''), m.attachment_name) end as body, m.author_user_id
    from public.advisor_org_chat_messages m where m.chat_id = c.id order by m.created_at desc limit 1
  ) last on true
  where c.org_id = p_org_id and public.can_read_org_chat(c.id)
  order by (c.kind = 'team') desc, c.last_message_at desc nulls last;
$$;
revoke all on function public.list_my_org_chats(uuid) from public, anon;
grant execute on function public.list_my_org_chats(uuid) to authenticated;

-- Fuer das Hauptmenue: ungelesene Nachrichten in allen eigenen Chats (stummgeschaltete zaehlen nicht).
create or replace function public.count_my_unread_org_chats()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(count(*)::integer, 0)
  from public.advisor_org_chat_messages m
  join public.advisor_org_chats c on c.id = m.chat_id
  left join public.advisor_org_chat_reads r on r.chat_id = c.id and r.user_id = auth.uid()
  where auth.uid() is not null
    and m.author_user_id <> auth.uid()
    and m.retracted_at is null
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
    and not coalesce(r.muted, false)
    and m.created_at > pg_catalog.now() - interval '60 days'
    and public.can_read_org_chat(c.id);
$$;
revoke all on function public.count_my_unread_org_chats() from public, anon;
grant execute on function public.count_my_unread_org_chats() to authenticated;

-- Mitteilungen aufs Geraet: Gruppen nur an die Gruppe (Stand 20270318120000 plus Gruppen).
create or replace function public.org_chat_push_recipients(p_message_id uuid)
returns table (recipient_user_id uuid, chat_id uuid, org_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, c.id, c.org_id
  from public.advisor_org_chat_messages msg
  join public.advisor_org_chats c on c.id = msg.chat_id
  join public.advisor_org_members m on m.org_id = c.org_id and m.status = 'active'
  left join public.advisor_org_chat_reads r on r.chat_id = c.id and r.user_id = m.user_id
  where msg.id = p_message_id
    and msg.author_user_id = auth.uid()
    and msg.created_at > pg_catalog.now() - interval '2 minutes'
    and m.user_id <> auth.uid()
    and (
      c.kind = 'team'
      or (c.kind = 'direct' and m.user_id in (c.direct_a, c.direct_b))
      or (c.kind = 'group' and exists (select 1 from public.advisor_org_chat_members gm where gm.chat_id = c.id and gm.user_id = m.user_id))
    )
    and not coalesce(r.muted, false)
    and public.wants_email_notification(m.user_id, 'org_chat');
$$;

commit;
