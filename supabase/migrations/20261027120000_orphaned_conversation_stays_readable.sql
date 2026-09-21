begin;

-- ---------------------------------------------------------------------------
-- Vierte Schicht: der Verlauf muss lesbar bleiben
-- ---------------------------------------------------------------------------
--
-- Die letzte der vier Zusagen, die am 08.10.2026 beim Erweitern auf drei
-- Ursprünge verloren gingen - und die einzige, die nicht eine Löschung
-- abbrach, sondern still etwas wegnahm.
--
-- DAS VERSPRECHEN VOM 24.09.2026 lautete: Wenn die Gegenseite ihr Konto
-- löscht, bleibt der Verlauf der verbliebenen Person lesbar. Genau das steht
-- dort als Kommentar in `can_use_network_conversation`:
--
--   "Verwaist: Die Gegenseite ist gegangen, der Ursprung mit ihr. Der Verlauf
--    bleibt lesbar - das Schreiben verhindert der Nachrichtenvertrag, nicht
--    diese Regel."
--
-- Der Grund dafür war ausdrücklich: Bis dahin nahm eine Kontolöschung die
-- ganze Unterhaltung mit, einschließlich der Nachrichten der anderen Person -
-- "das löschte Worte, die ihr gehören, von jemandem, der nicht gefragt wurde".
--
-- SEIT DEM 08.10.2026 fehlten die zwei Zeilen wieder. Die Unterhaltung
-- existierte weiter (die Fremdschlüssel lösen sich ja korrekt), aber die
-- verbliebene Person kam nicht mehr an sie heran: nicht in der Liste, und beim
-- Öffnen `network_conversation_access_denied`. Der Verlauf war also da und
-- unerreichbar - schlimmer als gelöscht, weil niemand es merkt.
--
-- Wiederhergestellt, mit dem dritten Ursprung darin. Das Schreiben bleibt
-- verweigert - dafür sorgt `enforce_network_message_contract`
-- (20261026120000) mit `network_conversation_counterpart_gone`.
-- ---------------------------------------------------------------------------

-- Der Standardwert muss mit: `create or replace` darf vorhandene
-- Parameterstandards nicht entfernen (42P13), und die Funktion wird an
-- mehreren Stellen mit nur einem Argument gerufen.
create or replace function public.can_use_network_conversation(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.network_conversations conversation
    left join public.network_contact_requests request
      on request.id = conversation.contact_request_id
    left join public.discovery_intro_requests intro
      on intro.id = conversation.discovery_intro_request_id
    where conversation.id = p_conversation_id
      and p_user_id in (
        conversation.participant_a_user_id,
        conversation.participant_b_user_id
      )
      and (
        (conversation.contact_request_id is not null and request.status = 'accepted')
        or conversation.problem_interest_id is not null
        or (conversation.discovery_intro_request_id is not null and intro.status = 'accepted')
        -- WIEDERHERGESTELLT VOM 24.09.2026: Verwaist - die Gegenseite ist
        -- gegangen, der Ursprung mit ihr. Der Verlauf bleibt lesbar; das
        -- Schreiben verhindert der Nachrichtenvertrag, nicht diese Regel.
        or conversation.participant_a_user_id is null
        or conversation.participant_b_user_id is null
      )
  );
$$;

comment on function public.can_use_network_conversation(uuid, uuid) is
  'Ob diese Person diese Unterhaltung benutzen darf. Erlaubt sie auch, wenn die Gegenseite ihr Konto geloescht hat: Der Verlauf gehoert zur Haelfte der Person, die bleibt. Das Schreiben verhindert enforce_network_message_contract.';

commit;
