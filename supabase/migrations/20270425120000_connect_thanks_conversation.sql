-- Connect Stufe 1: Der Dank haengt am GESPRAECH, nicht an der Kontaktanfrage.
--
-- Ein Gespraech entsteht auf zwei Wegen: aus einer angenommenen Kontaktanfrage oder aus einem angenommenen Interesse an einem Gesuch
-- (network_conversations hat genau eines von beiden). Wer sich bedanken will, soll das in beiden Faellen koennen.
begin;

alter table public.network_thanks add column conversation_id uuid references public.network_conversations (id) on delete cascade;
update public.network_thanks t set conversation_id = c.id from public.network_conversations c where c.contact_request_id = t.request_id;
delete from public.network_thanks where conversation_id is null;
alter table public.network_thanks alter column conversation_id set not null;
alter table public.network_thanks alter column request_id drop not null;
alter table public.network_thanks drop constraint network_thanks_once;
alter table public.network_thanks add constraint network_thanks_once unique (conversation_id, thanker_user_id);

drop function public.send_network_thanks(uuid, text[], text, text, boolean);
create or replace function public.send_network_thanks(
  p_conversation_id uuid, p_help_types text[], p_outcome text, p_body text, p_show boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_conv public.network_conversations%rowtype;
  v_helper uuid;
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_id uuid;
begin
  if v_me is null then raise exception 'thanks_not_allowed' using errcode = '42501'; end if;
  select * into v_conv from public.network_conversations where id = p_conversation_id;
  if not found or v_me not in (v_conv.participant_a_user_id, v_conv.participant_b_user_id) then
    raise exception 'thanks_not_allowed' using errcode = '42501';
  end if;
  v_helper := case when v_conv.participant_a_user_id = v_me then v_conv.participant_b_user_id else v_conv.participant_a_user_id end;
  if p_help_types is null or cardinality(p_help_types) < 1 then raise exception 'thanks_invalid' using errcode = '22023'; end if;
  insert into public.network_thanks (request_id, conversation_id, thanker_user_id, helper_user_id, help_types, outcome, body, show_on_profile)
  values (v_conv.contact_request_id, p_conversation_id, v_me, v_helper, p_help_types, nullif(p_outcome, ''), v_body, coalesce(p_show, false) and v_body is not null)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'thanks_exists' using errcode = '23505';
end;
$$;
revoke all on function public.send_network_thanks(uuid, text[], text, text, boolean) from public, anon;
grant execute on function public.send_network_thanks(uuid, text[], text, text, boolean) to authenticated;

drop function public.list_my_network_thanks();
create or replace function public.list_my_network_thanks()
returns table (
  id uuid, conversation_id uuid, direction text, help_types text[], outcome text, body text,
  show_on_profile boolean, helper_hidden boolean, other_name text, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select t.id, t.conversation_id,
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
