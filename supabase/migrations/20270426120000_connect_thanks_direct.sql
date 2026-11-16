-- Connect Stufe 1: Danke sagen gilt ueberall in Connect, auch ohne Gespraech.
--
-- Ein Dank kann jetzt auch an ein Mitglied gehen, mit dem es kein Gespraech gibt: von einem Profil, einem Gesuch, einem Problem oder
-- einem Unternehmen aus. Dann steht in `via_kind` / `via_label`, woran er sich knuepft (Abschrift, falls der Eintrag spaeter
-- verschwindet). `verified` unterscheidet intern: true = es gab ein Gespraech. Sichtbar ist das Herz fuer beide gleich; die
-- Unterscheidung ist fuer spaetere Prämien da und taucht in keiner Oberflaeche auf.
--
-- GRENZEN (Entwurf 16.11.2026): einmal je Person alle 90 Tage, hoechstens fuenf Dankeschoens am Tag (alle Wege zusammen gezaehlt
-- nur fuer direkte Danks), kein Dank an sich selbst, nicht an Blockierte, nur an Mitglieder mit aktivem Profil.
begin;

alter table public.network_thanks alter column conversation_id drop not null;
alter table public.network_thanks add column via_kind text not null default 'conversation';
alter table public.network_thanks add column via_label text;
alter table public.network_thanks add column verified boolean not null default true;
alter table public.network_thanks add constraint network_thanks_via_kind check (via_kind in ('conversation', 'person', 'listing', 'problem', 'venture'));
alter table public.network_thanks add constraint network_thanks_via_label check (via_label is null or char_length(via_label) between 1 and 120);
alter table public.network_thanks add constraint network_thanks_anchor check ((conversation_id is not null) = (via_kind = 'conversation'));
create index network_thanks_thanker_idx on public.network_thanks (thanker_user_id, created_at desc);

create or replace function public.send_network_thanks_direct(
  p_helper_user_id uuid, p_via_kind text, p_via_id uuid, p_help_types text[], p_outcome text, p_body text, p_show boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_label text;
  v_id uuid;
begin
  if v_me is null or not public.is_network_member(v_me) then raise exception 'thanks_not_allowed' using errcode = '42501'; end if;
  if p_helper_user_id is null or p_helper_user_id = v_me then raise exception 'thanks_not_allowed' using errcode = '42501'; end if;
  if p_via_kind not in ('person', 'listing', 'problem', 'venture') then raise exception 'thanks_invalid' using errcode = '22023'; end if;
  if p_help_types is null or cardinality(p_help_types) < 1 then raise exception 'thanks_invalid' using errcode = '22023'; end if;
  -- Nur an Mitglieder mit aktivem Profil, nie an Blockierte (in beide Richtungen).
  if not exists (select 1 from public.network_profiles p where p.user_id = p_helper_user_id and p.status = 'active')
     or public.is_network_interaction_blocked(v_me, p_helper_user_id) then
    raise exception 'thanks_not_allowed' using errcode = '42501';
  end if;
  -- Woran sich der Dank knuepft: muss der gedankten Person gehoeren.
  if p_via_kind = 'listing' then
    select l.title into v_label from public.network_listings l where l.id = p_via_id and l.owner_user_id = p_helper_user_id;
    if not found then raise exception 'thanks_invalid' using errcode = '22023'; end if;
  elsif p_via_kind = 'problem' then
    select p.title into v_label from public.network_problems p where p.id = p_via_id and p.author_user_id = p_helper_user_id;
    if not found then raise exception 'thanks_invalid' using errcode = '22023'; end if;
  elsif p_via_kind = 'venture' then
    select v.name into v_label from public.network_ventures v where v.id = p_via_id and v.owner_user_id = p_helper_user_id;
    if not found then raise exception 'thanks_invalid' using errcode = '22023'; end if;
  end if;
  v_label := nullif(pg_catalog.left(pg_catalog.btrim(coalesce(v_label, '')), 120), '');
  -- Grenzen.
  if exists (select 1 from public.network_thanks t where t.thanker_user_id = v_me and t.helper_user_id = p_helper_user_id and t.created_at > pg_catalog.now() - interval '90 days') then
    raise exception 'thanks_recent' using errcode = '23505';
  end if;
  if (select count(*) from public.network_thanks t where t.thanker_user_id = v_me and t.via_kind <> 'conversation' and t.created_at > pg_catalog.now() - interval '1 day') >= 5 then
    raise exception 'thanks_limit' using errcode = '54000';
  end if;
  insert into public.network_thanks (request_id, conversation_id, thanker_user_id, helper_user_id, help_types, outcome, body, show_on_profile, via_kind, via_label, verified)
  values (null, null, v_me, p_helper_user_id, p_help_types, nullif(p_outcome, ''), v_body, coalesce(p_show, false) and v_body is not null, p_via_kind, v_label, false)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.send_network_thanks_direct(uuid, text, uuid, text[], text, text, boolean) from public, anon;
grant execute on function public.send_network_thanks_direct(uuid, text, uuid, text[], text, text, boolean) to authenticated;

-- Ausgaben um "woran" erweitern.
drop function public.list_profile_thanks(uuid);
create or replace function public.list_profile_thanks(p_user_id uuid)
returns table (help_types text[], outcome text, body text, thanker_first_name text, created_at timestamptz, via_kind text, via_label text)
language sql stable security definer set search_path = '' as $$
  select t.help_types, t.outcome, t.body,
         coalesce(nullif(pg_catalog.split_part(pg_catalog.btrim(p.display_name), ' ', 1), ''), ''),
         t.created_at, t.via_kind, t.via_label
  from public.network_thanks t
  left join public.network_profiles p on p.user_id = t.thanker_user_id
  where auth.uid() is not null and t.helper_user_id = p_user_id and t.show_on_profile and not t.helper_hidden and t.body is not null
  order by t.created_at desc
  limit 3;
$$;
revoke all on function public.list_profile_thanks(uuid) from public, anon;
grant execute on function public.list_profile_thanks(uuid) to authenticated;

drop function public.list_my_network_thanks();
create or replace function public.list_my_network_thanks()
returns table (
  id uuid, conversation_id uuid, direction text, help_types text[], outcome text, body text,
  show_on_profile boolean, helper_hidden boolean, other_name text, created_at timestamptz, via_kind text, via_label text, other_user_id uuid
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.conversation_id,
         case when t.helper_user_id = auth.uid() then 'received' else 'sent' end,
         t.help_types, t.outcome, t.body, t.show_on_profile, t.helper_hidden,
         coalesce(p.display_name, ''), t.created_at, t.via_kind, t.via_label,
         case when t.helper_user_id = auth.uid() then t.thanker_user_id else t.helper_user_id end
  from public.network_thanks t
  left join public.network_profiles p on p.user_id = case when t.helper_user_id = auth.uid() then t.thanker_user_id else t.helper_user_id end
  where auth.uid() is not null and auth.uid() in (t.thanker_user_id, t.helper_user_id)
  order by t.created_at desc;
$$;
revoke all on function public.list_my_network_thanks() from public, anon;
grant execute on function public.list_my_network_thanks() to authenticated;

commit;
