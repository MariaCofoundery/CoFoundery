begin;

-- ---------------------------------------------------------------------------
-- Benachrichtigungen fuer Connect
-- ---------------------------------------------------------------------------
--
-- Bisher erfuhr niemand etwas, ohne die Seite offen zu haben. Das Abzeichen in
-- der Leiste zaehlt zwar, aber niemand hat CoFoundery staendig offen. Bei einer
-- Handvoll Testnutzer geht das ueber Zuruf, ab zwanzig nicht mehr.
--
-- Drei Anlaesse, und bewusst nur diese drei: eine Kontaktanfrage, ein
-- bekundetes Interesse an einem Problem, und eine Nachricht. Alles andere
-- waere Verkehr, den niemand bestellt hat.
--
-- ZWEI VORKEHRUNGEN, ohne die es schadet statt zu helfen:
--
--   Abschaltbar. Eine Benachrichtigung ueber eigene Vorgaenge darf man
--   schicken - aber nicht gegen den Willen der Person.
--
--   Hoechstens einmal je Vorgang. Ein zweiter Versuch - Wiederholung,
--   Doppelklick, erneuter Aufruf - darf keine zweite Mail ausloesen. Dasselbe
--   Muster wie beim sequentiellen Handoff in 20260828220000.

alter table public.network_memberships
  add column if not exists email_notifications boolean not null default true;

comment on column public.network_memberships.email_notifications is
  'Ob diese Person Connect-Benachrichtigungen per Mail bekommt. Standard an; abschaltbar im Konto.';

-- ---------------------------------------------------------------------------
-- Hoechstens einmal je Vorgang
-- ---------------------------------------------------------------------------
create table public.network_notification_claims (
  kind text not null,
  subject_id uuid not null,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kind, subject_id, recipient_user_id),
  constraint network_notification_claims_kind_check
    check (kind in ('contact_request', 'problem_interest', 'message'))
);

comment on table public.network_notification_claims is
  'Wer wurde worueber schon benachrichtigt. Der Primaerschluessel ist die Garantie: ein Vorgang, eine Mail.';

alter table public.network_notification_claims enable row level security;
revoke all on public.network_notification_claims from anon, authenticated;

/**
 * Nimmt sich das Recht, eine Benachrichtigung zu verschicken.
 *
 * Gibt true genau einmal je (Art, Vorgang, Empfaenger) zurueck. Wer false
 * bekommt, schickt nichts - jemand anderes war schneller oder es ist schon
 * passiert. Der Einschub liegt VOR dem Versand: Lieber eine Mail zu wenig als
 * zwei, wenn der Versand mittendrin abbricht.
 */
create or replace function public.claim_network_notification(
  p_kind text,
  p_subject_id uuid,
  p_recipient_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wants boolean;
begin
  -- Wer keine will, bekommt keine - und es wird auch kein Anspruch vermerkt,
  -- damit ein spaeteres Einschalten nicht an alten Zeilen haengen bleibt.
  select membership.email_notifications into v_wants
  from public.network_memberships membership
  where membership.user_id = p_recipient_user_id and membership.status = 'active';

  if v_wants is distinct from true then
    return false;
  end if;

  insert into public.network_notification_claims(kind, subject_id, recipient_user_id)
  values (p_kind, p_subject_id, p_recipient_user_id)
  on conflict do nothing;

  return found;
end;
$$;

revoke all on function public.claim_network_notification(text, uuid, uuid) from public, anon;
grant execute on function public.claim_network_notification(text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Wann eine Nachricht eine Mail wert ist
-- ---------------------------------------------------------------------------
/**
 * Der Empfaenger einer Nachricht - aber nur, wenn er nicht ohnehin schon
 * ungelesene Post von derselben Person in diesem Gespraech hat.
 *
 * Sonst wuerde ein Hin und Her zu einer Mail je Zeile. Wer noch nicht gelesen
 * hat, was vorher kam, braucht keinen zweiten Hinweis darauf.
 *
 * Gibt null zurueck, wenn nicht benachrichtigt werden soll - auch bei
 * Blockierung, denn dann soll gar nichts mehr ankommen.
 */
create or replace function public.network_message_notification_recipient(p_message_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_message public.network_messages%rowtype;
  v_conversation public.network_conversations%rowtype;
  v_recipient uuid;
  v_earlier integer;
begin
  select * into v_message from public.network_messages message where message.id = p_message_id;
  if not found then return null; end if;

  select * into v_conversation from public.network_conversations conversation
  where conversation.id = v_message.conversation_id;
  if not found then return null; end if;

  v_recipient := case
    when v_conversation.participant_a_user_id = v_message.sender_user_id
      then v_conversation.participant_b_user_id
    else v_conversation.participant_a_user_id
  end;

  if public.is_network_interaction_blocked(v_message.sender_user_id, v_recipient) then
    return null;
  end if;

  select count(*) into v_earlier
  from public.network_messages earlier
  where earlier.conversation_id = v_message.conversation_id
    and earlier.sender_user_id = v_message.sender_user_id
    and earlier.read_at is null
    and earlier.id <> p_message_id;

  if v_earlier > 0 then return null; end if;

  return v_recipient;
end;
$$;

revoke all on function public.network_message_notification_recipient(uuid) from public, anon;
grant execute on function public.network_message_notification_recipient(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Abschalten
-- ---------------------------------------------------------------------------
create or replace function public.set_network_email_notifications(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  update public.network_memberships
  set email_notifications = coalesce(p_enabled, true)
  where user_id = auth.uid();
end;
$$;

revoke all on function public.set_network_email_notifications(boolean) from public, anon;
grant execute on function public.set_network_email_notifications(boolean) to authenticated;

create or replace function public.get_network_email_notifications()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select membership.email_notifications from public.network_memberships membership
     where membership.user_id = auth.uid()),
    true
  );
$$;

revoke all on function public.get_network_email_notifications() from public, anon;
grant execute on function public.get_network_email_notifications() to authenticated;

commit;
