-- Teamraum: Chat - wie ein kleiner Messenger fuer das Team einer Organisation.
--
-- Wunsch von Maria (05.11.2026): "Eine Team-Chat-Funktion wie so ein kleiner Messenger in der App,
-- dass man das gut auf dem Handy benutzen kann - Nachrichten hin und her wie WhatsApp oder Signal."
--
-- Aufbau:
--   - Je Organisation ein Teamchat (alle aktiven Mitglieder) und Direktchats zwischen zwei Mitgliedern.
--   - Nachrichten kommen in Echtzeit (Supabase Realtime, Tabelle in der Publikation); die
--     Zeilensicherheit gilt dort genauso - wer den Chat nicht lesen darf, bekommt auch nichts geschickt.
--   - Gelesen-Stand und Stummschalten je Person und Chat.
--
-- Regeln:
--   - NUR MITGLIEDER. Lesen: aktive Mitglieder der Organisation; Direktchats nur die beiden. Teams im
--     Programm und Personen von aussen sehen nichts. Schreiben nur in einer aktiven Organisation.
--   - Eine Nachricht zuruecknehmen kann nur, wer sie geschrieben hat; es bleibt "zurueckgenommen" stehen,
--     der Text ist weg.
--   - Endet eine Mitgliedschaft, endet das Lesen (die Zeilensicherheit fragt die Mitgliedschaft).
--     In einen Direktchat mit jemandem, der nicht mehr Mitglied ist, schreibt man nicht mehr.
--   - Mitteilungen aufs Geraet: an die anderen im Chat, ausser wer den Chat stummgeschaltet oder
--     "Chat im Teamraum" abbestellt hat; Feierabend gilt (20270317120000). Auf dem Sperrbildschirm
--     steht nur, dass eine Nachricht da ist - nie der Text.
--   - Konto geloescht: eigene Nachrichten, Gelesen-Staende und Direktchats mit dieser Person gehen mit.

begin;

create table public.advisor_org_chats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  kind text not null,
  direct_a uuid references auth.users (id) on delete cascade,
  direct_b uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint advisor_org_chats_kind check (kind in ('team', 'direct')),
  constraint advisor_org_chats_pair check (
    (kind = 'team' and direct_a is null and direct_b is null)
    or (kind = 'direct' and direct_a is not null and direct_b is not null and direct_a < direct_b)
  )
);
create unique index advisor_org_chats_one_team on public.advisor_org_chats (org_id) where kind = 'team';
create unique index advisor_org_chats_one_pair on public.advisor_org_chats (org_id, direct_a, direct_b) where kind = 'direct';
create index advisor_org_chats_direct_a_idx on public.advisor_org_chats (direct_a) where direct_a is not null;
create index advisor_org_chats_direct_b_idx on public.advisor_org_chats (direct_b) where direct_b is not null;

create table public.advisor_org_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.advisor_org_chats (id) on delete cascade,
  org_id uuid not null references public.advisor_orgs (id) on delete cascade,
  author_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  retracted_at timestamptz,
  constraint advisor_org_chat_messages_body check (char_length(body) <= 4000 and (retracted_at is not null or char_length(btrim(body)) >= 1))
);
create index advisor_org_chat_messages_chat_idx on public.advisor_org_chat_messages (chat_id, created_at desc);
create index advisor_org_chat_messages_author_idx on public.advisor_org_chat_messages (author_user_id);
create index advisor_org_chat_messages_org_idx on public.advisor_org_chat_messages (org_id);

create table public.advisor_org_chat_reads (
  chat_id uuid not null references public.advisor_org_chats (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (chat_id, user_id)
);
create index advisor_org_chat_reads_user_idx on public.advisor_org_chat_reads (user_id);

-- Darf diese Person den Chat lesen?
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
      and (c.kind = 'team' or auth.uid() in (c.direct_a, c.direct_b))
  );
$$;
revoke all on function public.can_read_org_chat(uuid) from public, anon;
grant execute on function public.can_read_org_chat(uuid) to authenticated;

alter table public.advisor_org_chats enable row level security;
alter table public.advisor_org_chat_messages enable row level security;
alter table public.advisor_org_chat_reads enable row level security;
revoke all on public.advisor_org_chats from anon, authenticated;
revoke all on public.advisor_org_chat_messages from anon, authenticated;
revoke all on public.advisor_org_chat_reads from anon, authenticated;
grant select on public.advisor_org_chats to authenticated;
grant select on public.advisor_org_chat_messages to authenticated;
grant select on public.advisor_org_chat_reads to authenticated;
create policy advisor_org_chats_read on public.advisor_org_chats
  for select to authenticated using (public.can_read_org_chat(id));
create policy advisor_org_chat_messages_read on public.advisor_org_chat_messages
  for select to authenticated using (public.can_read_org_chat(chat_id));
create policy advisor_org_chat_reads_own on public.advisor_org_chat_reads
  for select to authenticated using (user_id = auth.uid());

-- Echtzeit: neue und zurueckgenommene Nachrichten. Die Zeilensicherheit oben gilt auch hier.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.advisor_org_chat_messages';
  end if;
end;
$$;

alter table public.notification_opt_outs drop constraint notification_opt_outs_kind_check;
alter table public.notification_opt_outs add constraint notification_opt_outs_kind_check
  check (kind in (
    'contact_request', 'message', 'problem_interest', 'connect_saved_search', 'discovery_saved_search',
    'read_my_mind', 'founder_in_the_wild', 'discovery_intro_request', 'discovery_intro_accepted',
    'connect_suggestions', 'team_check_in', 'program_update', 'org_tasks', 'org_chat'
  ));

-- Den Teamchat oder den Direktchat mit einer Person holen - und beim ersten Mal anlegen.
create or replace function public.open_org_chat(p_org_id uuid, p_with_user_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null or not public.is_advisor_org_member(p_org_id) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  if p_with_user_id is null then
    select c.id into v_id from public.advisor_org_chats c where c.org_id = p_org_id and c.kind = 'team';
    if v_id is null then
      insert into public.advisor_org_chats (org_id, kind) values (p_org_id, 'team')
      on conflict do nothing
      returning id into v_id;
      if v_id is null then
        select c.id into v_id from public.advisor_org_chats c where c.org_id = p_org_id and c.kind = 'team';
      end if;
    end if;
    return v_id;
  end if;
  if p_with_user_id = v_me or not exists (
    select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = p_with_user_id and m.status = 'active'
  ) then
    raise exception 'org_chat_not_member' using errcode = '22023';
  end if;
  v_a := least(v_me, p_with_user_id);
  v_b := greatest(v_me, p_with_user_id);
  select c.id into v_id from public.advisor_org_chats c where c.org_id = p_org_id and c.kind = 'direct' and c.direct_a = v_a and c.direct_b = v_b;
  if v_id is null then
    insert into public.advisor_org_chats (org_id, kind, direct_a, direct_b) values (p_org_id, 'direct', v_a, v_b)
    on conflict do nothing
    returning id into v_id;
    if v_id is null then
      select c.id into v_id from public.advisor_org_chats c where c.org_id = p_org_id and c.kind = 'direct' and c.direct_a = v_a and c.direct_b = v_b;
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.open_org_chat(uuid, uuid) from public, anon;
grant execute on function public.open_org_chat(uuid, uuid) to authenticated;

create or replace function public.send_org_chat_message(p_chat_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chat public.advisor_org_chats%rowtype;
  v_other uuid;
  v_id uuid;
begin
  select * into v_chat from public.advisor_org_chats c where c.id = p_chat_id;
  if v_chat.id is null or not public.can_read_org_chat(p_chat_id) or not public.can_work_in_org(v_chat.org_id) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  if v_chat.kind = 'direct' then
    v_other := case when v_chat.direct_a = auth.uid() then v_chat.direct_b else v_chat.direct_a end;
    if not exists (select 1 from public.advisor_org_members m where m.org_id = v_chat.org_id and m.user_id = v_other and m.status = 'active') then
      raise exception 'org_chat_not_member' using errcode = '22023';
    end if;
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'org_chat_invalid' using errcode = '22023';
  end if;
  insert into public.advisor_org_chat_messages (chat_id, org_id, author_user_id, body)
  values (p_chat_id, v_chat.org_id, auth.uid(), btrim(p_body))
  returning id into v_id;
  update public.advisor_org_chats set last_message_at = pg_catalog.now() where id = p_chat_id;
  -- Was man selbst schreibt, hat man gelesen.
  insert into public.advisor_org_chat_reads (chat_id, user_id, last_read_at) values (p_chat_id, auth.uid(), pg_catalog.now())
  on conflict (chat_id, user_id) do update set last_read_at = excluded.last_read_at;
  return v_id;
end;
$$;
revoke all on function public.send_org_chat_message(uuid, text) from public, anon;
grant execute on function public.send_org_chat_message(uuid, text) to authenticated;

create or replace function public.retract_org_chat_message(p_message_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.advisor_org_chat_messages
  set body = '', retracted_at = pg_catalog.now()
  where id = p_message_id and author_user_id = auth.uid() and retracted_at is null;
  return found;
end;
$$;
revoke all on function public.retract_org_chat_message(uuid) from public, anon;
grant execute on function public.retract_org_chat_message(uuid) to authenticated;

create or replace function public.mark_org_chat_read(p_chat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_read_org_chat(p_chat_id) then
    return;
  end if;
  insert into public.advisor_org_chat_reads (chat_id, user_id, last_read_at) values (p_chat_id, auth.uid(), pg_catalog.now())
  on conflict (chat_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;
revoke all on function public.mark_org_chat_read(uuid) from public, anon;
grant execute on function public.mark_org_chat_read(uuid) to authenticated;

create or replace function public.set_org_chat_muted(p_chat_id uuid, p_muted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_read_org_chat(p_chat_id) then
    raise exception 'org_chat_not_yours' using errcode = '42501';
  end if;
  -- Stummschalten heisst nicht gelesen: ein neuer Eintrag beginnt "noch nichts gelesen".
  insert into public.advisor_org_chat_reads (chat_id, user_id, muted, last_read_at) values (p_chat_id, auth.uid(), coalesce(p_muted, false), '-infinity')
  on conflict (chat_id, user_id) do update set muted = excluded.muted;
end;
$$;
revoke all on function public.set_org_chat_muted(uuid, boolean) from public, anon;
grant execute on function public.set_org_chat_muted(uuid, boolean) to authenticated;

-- Die Chats einer Organisation fuer diese Person: Teamchat und eigene Direktchats, mit der letzten
-- Nachricht (zurueckgenommene ohne Text) und der Zahl ungelesener.
create or replace function public.list_my_org_chats(p_org_id uuid)
returns table (
  chat_id uuid, kind text, other_user_id uuid, last_message_at timestamptz,
  last_body text, last_author_user_id uuid, unread integer, muted boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.kind,
    case when c.kind = 'direct' then (case when c.direct_a = auth.uid() then c.direct_b else c.direct_a end) end,
    c.last_message_at,
    last.body, last.author_user_id,
    (select count(*)::integer from public.advisor_org_chat_messages m
      where m.chat_id = c.id and m.author_user_id <> auth.uid() and m.retracted_at is null
        and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)),
    coalesce(r.muted, false)
  from public.advisor_org_chats c
  left join public.advisor_org_chat_reads r on r.chat_id = c.id and r.user_id = auth.uid()
  left join lateral (
    select case when m.retracted_at is null then left(m.body, 140) end as body, m.author_user_id
    from public.advisor_org_chat_messages m where m.chat_id = c.id order by m.created_at desc limit 1
  ) last on true
  where c.org_id = p_org_id and public.can_read_org_chat(c.id)
  order by (c.kind = 'team') desc, c.last_message_at desc nulls last;
$$;
revoke all on function public.list_my_org_chats(uuid) from public, anon;
grant execute on function public.list_my_org_chats(uuid) to authenticated;

-- An wen geht eine Mitteilung aufs Geraet fuer diese Nachricht? Nur fuer die Person, die sie eben
-- geschrieben hat. Gibt keine Inhalte heraus, nur wen.
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
    and (c.kind = 'team' or m.user_id in (c.direct_a, c.direct_b))
    and not coalesce(r.muted, false)
    and public.wants_email_notification(m.user_id, 'org_chat');
$$;
revoke all on function public.org_chat_push_recipients(uuid) from public, anon;
grant execute on function public.org_chat_push_recipients(uuid) to authenticated;

commit;
