-- Connect Stufe 1: Danke und Herz (Entwurf 15.11.2026).
--
-- Wer geholfen bekommen hat, kann Danke sagen: wobei (Wissen, Feedback, Kontakt, Zeit, Ressource, Mitarbeit), was daraus wurde
-- (Treffen, Vermittlung, noch offen - freiwillig) und ein paar Worte (freiwillig). Die Worte sind privat, solange die dankende Person
-- sie nicht ausdruecklich fuer das Profil der anderen freigibt; die Geholfene kann einen freigegebenen Dank jederzeit ausblenden.
--
-- DAS HERZ ist ein Zeichen, keine Zahl: "hat schon geholfen" = es gibt mindestens einen Dank. Es gibt absichtlich KEINE Funktion,
-- die Dankeschoens zaehlt, auflistet oder sortiert. Kein Wert, keine Rangliste, kein Zaehler.
begin;

create table public.network_thanks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.network_contact_requests (id) on delete cascade,
  thanker_user_id uuid not null references auth.users (id) on delete cascade,
  helper_user_id uuid not null references auth.users (id) on delete cascade,
  help_types text[] not null,
  outcome text,
  body text,
  show_on_profile boolean not null default false,
  helper_hidden boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  constraint network_thanks_once unique (request_id, thanker_user_id),
  constraint network_thanks_distinct check (thanker_user_id <> helper_user_id),
  constraint network_thanks_types check (
    cardinality(help_types) between 1 and 6
    and help_types <@ array['knowledge','feedback','contact','time','resource','collaboration']::text[]
  ),
  constraint network_thanks_outcome check (outcome is null or outcome in ('meeting', 'introduction', 'open')),
  constraint network_thanks_body check (body is null or char_length(body) between 1 and 280),
  constraint network_thanks_show_needs_body check (not show_on_profile or body is not null)
);
create index network_thanks_helper_idx on public.network_thanks (helper_user_id);
alter table public.network_thanks enable row level security;
revoke all on public.network_thanks from anon, authenticated;
grant select on public.network_thanks to authenticated;
create policy network_thanks_participants_read on public.network_thanks
  for select to authenticated using (auth.uid() in (thanker_user_id, helper_user_id));

-- Danke sagen: nur eine Beteiligte einer ANGENOMMENEN Anfrage, nur an die andere Person, je Anfrage einmal.
create or replace function public.send_network_thanks(
  p_request_id uuid, p_help_types text[], p_outcome text, p_body text, p_show boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_req public.network_contact_requests%rowtype;
  v_helper uuid;
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_id uuid;
begin
  if v_me is null then raise exception 'thanks_not_allowed' using errcode = '42501'; end if;
  select * into v_req from public.network_contact_requests where id = p_request_id;
  if not found or v_req.status <> 'accepted' or v_me not in (v_req.sender_user_id, v_req.recipient_user_id) then
    raise exception 'thanks_not_allowed' using errcode = '42501';
  end if;
  v_helper := case when v_req.sender_user_id = v_me then v_req.recipient_user_id else v_req.sender_user_id end;
  if p_help_types is null or cardinality(p_help_types) < 1 then raise exception 'thanks_invalid' using errcode = '22023'; end if;
  insert into public.network_thanks (request_id, thanker_user_id, helper_user_id, help_types, outcome, body, show_on_profile)
  values (p_request_id, v_me, v_helper, p_help_types, nullif(p_outcome, ''), v_body, coalesce(p_show, false) and v_body is not null)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'thanks_exists' using errcode = '23505';
end;
$$;
revoke all on function public.send_network_thanks(uuid, text[], text, text, boolean) from public, anon;
grant execute on function public.send_network_thanks(uuid, text[], text, text, boolean) to authenticated;

-- Ausblenden / wieder zeigen: nur die, der gedankt wurde.
create or replace function public.set_network_thanks_hidden(p_thanks_id uuid, p_hidden boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.network_thanks set helper_hidden = coalesce(p_hidden, false)
  where id = p_thanks_id and helper_user_id = auth.uid();
  if not found then raise exception 'thanks_not_yours' using errcode = '42501'; end if;
  return true;
end;
$$;
revoke all on function public.set_network_thanks_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_network_thanks_hidden(uuid, boolean) to authenticated;

-- Das Herz: ja oder nein, fuer angemeldete Mitglieder. Keine Zahl.
create or replace function public.has_network_heart(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.network_thanks t where t.helper_user_id = p_user_id);
$$;
revoke all on function public.has_network_heart(uuid) from public, anon;
grant execute on function public.has_network_heart(uuid) to authenticated;

-- Worte auf dem Profil: nur freigegebene, nicht ausgeblendete, mit Vornamen der dankenden Person. Hoechstens drei, neueste zuerst.
create or replace function public.list_profile_thanks(p_user_id uuid)
returns table (help_types text[], outcome text, body text, thanker_first_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.help_types, t.outcome, t.body,
         coalesce(nullif(pg_catalog.split_part(pg_catalog.btrim(p.display_name), ' ', 1), ''), ''),
         t.created_at
  from public.network_thanks t
  left join public.network_profiles p on p.user_id = t.thanker_user_id
  where auth.uid() is not null and t.helper_user_id = p_user_id and t.show_on_profile and not t.helper_hidden and t.body is not null
  order by t.created_at desc
  limit 3;
$$;
revoke all on function public.list_profile_thanks(uuid) from public, anon;
grant execute on function public.list_profile_thanks(uuid) to authenticated;

-- Fuer die Kontakte-Seite: Dank, den ich bekommen habe (mit Namen der dankenden Person), und bei welchen Anfragen ich schon gedankt habe.
create or replace function public.list_my_network_thanks()
returns table (
  id uuid, request_id uuid, direction text, help_types text[], outcome text, body text,
  show_on_profile boolean, helper_hidden boolean, other_name text, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.request_id,
         case when t.helper_user_id = auth.uid() then 'received' else 'sent' end,
         t.help_types, t.outcome, t.body, t.show_on_profile, t.helper_hidden,
         coalesce(p.display_name, ''), t.created_at
  from public.network_thanks t
  left join public.network_profiles p on p.user_id = case when t.helper_user_id = auth.uid() then t.thanker_user_id else t.helper_user_id end
  where auth.uid() is not null and auth.uid() in (t.thanker_user_id, t.helper_user_id)
  order by t.created_at desc;
$$;
revoke all on function public.list_my_network_thanks() from public, anon;
grant execute on function public.list_my_network_thanks() to authenticated;

commit;
