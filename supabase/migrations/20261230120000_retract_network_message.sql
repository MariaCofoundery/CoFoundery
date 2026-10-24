begin;

-- ---------------------------------------------------------------------------
-- Einzelne Nachrichten zurueckziehen
-- ---------------------------------------------------------------------------
-- Eine Nachricht, die man selbst gesendet hat, laesst sich zuruecknehmen: Der Text wird
-- GELOESCHT (nicht nur ausgeblendet), die Zeile bleibt als leere Huelle mit `retracted_at`,
-- damit der Verlauf fuer beide nicht springt. Die Oberflaeche zeigt dann "Nachricht
-- zurueckgenommen". Es gibt kein Zurueck: Der Text ist weg.
--
-- Nur die sendende Person, nur in einem Gespraech, das sie noch benutzen darf. Die
-- Gegenseite behaelt nichts - was sie schon gelesen hat, laesst sich nicht loeschen,
-- aber der Text liegt nicht mehr in der Datenbank.
alter table public.network_messages add column retracted_at timestamptz;

alter table public.network_messages drop constraint network_messages_body_check;
alter table public.network_messages add constraint network_messages_body_check
  check (
    (retracted_at is null and char_length(btrim(body)) between 1 and 2000)
    or (retracted_at is not null and body = '')
  );

create function public.retract_network_message(p_message_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select m.conversation_id into v_conversation
  from public.network_messages m
  where m.id = p_message_id and m.sender_user_id = v_user_id;
  -- Fremde oder unbekannte Nachricht: dieselbe Antwort, damit nichts ueber fremde Verlaeufe verraten wird.
  if v_conversation is null then raise exception 'message_not_found' using errcode = 'P0002'; end if;
  if not public.can_use_network_conversation(v_conversation, v_user_id) then
    raise exception 'network_conversation_access_denied' using errcode = '42501';
  end if;
  update public.network_messages
  set body = '', retracted_at = now()
  where id = p_message_id and retracted_at is null;
  return true;
end $$;
revoke all on function public.retract_network_message(uuid) from public, anon;
grant execute on function public.retract_network_message(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
