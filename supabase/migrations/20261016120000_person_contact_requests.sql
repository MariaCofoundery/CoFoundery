begin;

-- ---------------------------------------------------------------------------
-- Jemanden anschreiben, ohne dass er gerade etwas ausgeschrieben hat
-- ---------------------------------------------------------------------------
--
-- BESPROCHEN AM 21.09.2026. Bis hierher war eine Kontaktanfrage an eine
-- ANZEIGE gebunden - `listing_id` war `not null`. Wer also niemanden fand, der
-- gerade etwas ausgeschrieben hatte, konnte niemanden erreichen; die
-- Profilseite eines Mitglieds endete in dem Satz, dass es noch nicht geht.
--
-- DIE REGEL, die Maria entschieden hat: Anschreiben darf, wer selbst ein
-- veroeffentlichtes Profil hat. Nicht als Huerde, sondern als Gegenseitigkeit -
-- wer angeschrieben wird, soll sehen koennen, wer da schreibt. "Ich bin hier,
-- aber still" bleibt damit moeglich: Wer sein Profil im Entwurf laesst, ist
-- unsichtbar UND schreibt nicht an.
--
-- Diese Regel ist nicht neu, sie war nur unvollstaendig: Fuer Anzeigen gilt sie
-- seit dem 03.09.2026 (`network_contact_sender_profile_required`). Sie steht in
-- der Datenbank und nicht in der Oberflaeche - eine Bedingung, die nur ein
-- Formular kennt, ist keine Bedingung.
--
-- WAS SICH AM MODELL AENDERT: `listing_id` darf jetzt null sein, und dann ist
-- es eine Anfrage an einen MENSCHEN. Beides in einer Tabelle und nicht in
-- zwei: Es ist dieselbe Sache mit demselben Verlauf (offen, angenommen,
-- abgelehnt), derselben Meldung, demselben Postfach und derselben
-- Berichtsfunktion. Zwei Tabellen waeren zwei Zustandsmaschinen fuer einen
-- Vorgang.
-- ---------------------------------------------------------------------------

alter table public.network_contact_requests
  alter column listing_id drop not null;

-- Der Titel der Anzeige war Teil des Nachweises, was jemand angefragt hat.
-- Ohne Anzeige gibt es ihn nicht - und ein Platzhaltertext waere eine
-- Behauptung ueber einen Vorgang, den es nicht gab.
alter table public.network_contact_requests
  alter column listing_title_snapshot drop not null;

alter table public.network_contact_requests
  drop constraint network_contact_requests_snapshot_check;

alter table public.network_contact_requests
  add constraint network_contact_requests_snapshot_check check (
    (listing_id is null) = (listing_title_snapshot is null)
    and (
      listing_title_snapshot is null
      or char_length(btrim(listing_title_snapshot)) between 1 and 100
    )
    and char_length(btrim(sender_display_name_snapshot)) between 1 and 80
    and char_length(sender_headline_snapshot) <= 160
    and char_length(btrim(recipient_display_name_snapshot)) between 1 and 80
  );

comment on column public.network_contact_requests.listing_id is
  'Die Anzeige, auf die sich die Anfrage bezieht. Null bedeutet: an die Person selbst, ohne Anzeige.';

-- ---------------------------------------------------------------------------
-- Hoechstens eine offene Anfrage je Paar
-- ---------------------------------------------------------------------------
-- Fuer Anzeigen gilt das seit immer ueber unique(sender_user_id, listing_id).
-- Ohne Anzeige greift dieser Schluessel nicht (null ist in Postgres nicht
-- gleich null), und ohne Ersatz koennte jemand denselben Menschen beliebig oft
-- anschreiben. Ein Teilindex nur auf OFFENE: Eine abgelehnte Anfrage soll ein
-- spaeteres, zweites Ansprechen nicht fuer immer verhindern - Menschen und
-- Umstaende aendern sich.
create unique index network_contact_requests_open_person_unique
  on public.network_contact_requests (sender_user_id, recipient_user_id)
  where listing_id is null and status = 'pending';

-- ---------------------------------------------------------------------------
-- Die Anfrage an einen Menschen
-- ---------------------------------------------------------------------------
/**
 * Eine eigene Funktion und keine Erweiterung von `request_network_contact`.
 *
 * Der Weg ueber die Anzeige funktioniert, ist geprueft und wird taeglich
 * benutzt; ihn fuer einen zweiten Fall umzubauen waere ein Risiko ohne
 * Gegenwert. Die Bedingungen sind hier dieselben, in derselben Reihenfolge -
 * nur ohne die Anzeige.
 */
create or replace function public.request_network_person_contact(
  p_recipient_user_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_user_id uuid := auth.uid();
  v_sender_profile public.network_profiles%rowtype;
  v_recipient_profile public.network_profiles%rowtype;
  v_message text := btrim(coalesce(p_message, ''));
  v_existing_id uuid;
  v_request_id uuid;
begin
  if v_sender_user_id is null or not public.is_network_member(v_sender_user_id) then
    raise exception 'network_membership_required' using errcode = '42501';
  end if;

  if p_recipient_user_id is null or p_recipient_user_id = v_sender_user_id then
    raise exception 'network_contact_self_request_forbidden' using errcode = '23514';
  end if;

  if not public.is_network_member(p_recipient_user_id) then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;

  -- Blockierung zuerst, wie beim Weg ueber die Anzeige: Wer blockiert hat,
  -- soll nicht einmal erfahren, dass jemand es versucht hat.
  if public.is_network_interaction_blocked(v_sender_user_id, p_recipient_user_id) then
    raise exception 'network_contact_interaction_blocked' using errcode = '42501';
  end if;

  -- DIE REGEL: nur mit eigenem veroeffentlichten Profil.
  select * into v_sender_profile from public.network_profiles profile
  where profile.user_id = v_sender_user_id and profile.status = 'active';
  if not found then
    raise exception 'network_contact_sender_profile_required' using errcode = '23514';
  end if;

  -- Und nur an Menschen, die eines haben: Ein Entwurf ist niemandes Adresse.
  select * into v_recipient_profile from public.network_profiles profile
  where profile.user_id = p_recipient_user_id and profile.status = 'active';
  if not found then
    raise exception 'network_contact_recipient_unavailable' using errcode = '42501';
  end if;

  if char_length(v_message) < 10 or char_length(v_message) > 500 then
    raise exception 'network_contact_message_invalid' using errcode = '23514';
  end if;

  -- Laeuft schon eine, ist das keine zweite. Dieselbe Kennung zurueckgeben,
  -- damit ein doppelter Klick nicht wie ein Fehler aussieht.
  select request.id into v_existing_id
  from public.network_contact_requests request
  where request.sender_user_id = v_sender_user_id
    and request.recipient_user_id = p_recipient_user_id
    and request.listing_id is null
    and request.status = 'pending';
  if found then
    return v_existing_id;
  end if;

  insert into public.network_contact_requests(
    listing_id, sender_user_id, recipient_user_id, message,
    listing_title_snapshot, sender_display_name_snapshot,
    sender_headline_snapshot, recipient_display_name_snapshot
  ) values (
    null, v_sender_user_id, p_recipient_user_id, v_message,
    null, v_sender_profile.display_name,
    v_sender_profile.headline, v_recipient_profile.display_name
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.request_network_person_contact(uuid, text) from public, anon;
grant execute on function public.request_network_person_contact(uuid, text) to authenticated;

comment on function public.request_network_person_contact(uuid, text) is
  'Kontaktanfrage an einen Menschen, ohne Anzeige. Setzt ein eigenes veroeffentlichtes Profil voraus - dieselbe Bedingung wie beim Weg ueber eine Anzeige.';

commit;
