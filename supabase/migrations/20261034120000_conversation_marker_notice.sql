begin;

-- ---------------------------------------------------------------------------
-- "Darüber möchte ich sprechen" kommt bei der anderen Seite an
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 21.09.2026, nach einem Durchlauf mit zwei Profilen: "Ich habe
-- auch markiert, darüber möchte ich sprechen, aber da kam jetzt bei dem
-- anderen Profil noch keine Nachricht an. Das wäre natürlich cool, wenn da
-- dann ankommt: hey, der andere möchte darüber sprechen."
--
-- Sie hatte recht: Die Markierung stand nur auf der Reveal-Seite. Wer nicht
-- von sich aus dieselbe Karte noch einmal aufmachte, erfuhr nie, dass die
-- andere Seite über genau diesen Punkt reden will - und das ist der einzige
-- Zweck der Markierung.
--
-- EINE ART FUER BEIDE ERLEBNISSE: Read My Mind und Founder in the Wild
-- benutzen dieselbe Funktion (`mark_collaboration_prompt_for_conversation`)
-- und dieselbe Markierungstabelle. Der Vorgang ist der Prompt der Runde; wohin
-- der Hinweis fuehrt, weiss die Anwendung, weil die Adressen je Erlebnis
-- anders aussehen.
--
-- UND SIE WIRD ZURUECKGENOMMEN. Wer die Markierung entfernt, will nicht mehr
-- darueber sprechen. Ein Hinweis, der dann stehen bleibt, schickt die andere
-- Person zu einem Punkt, den es nicht mehr gibt - deshalb
-- `withdraw_in_app_notice`.
-- ---------------------------------------------------------------------------

alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  -- Connect und Find - dieselben Anlaesse, die auch Mail und Mitteilung
  -- ausloesen, MIT EINER AUSNAHME: 'message' fehlt absichtlich. Das Postfach
  -- zeigt ungelesene Nachrichten schon selbst, je Gespraech mit Zaehler.
  'contact_request',
  'problem_interest',
  'approach_interest',
  'discovery_intro_request',
  'discovery_intro_accepted',
  -- Align: jemand hat etwas ausgefuellt und die andere Seite ist dran.
  'read_my_mind_handoff',
  'founder_in_the_wild_handoff',
  -- Align: jemand will ueber einen bestimmten Punkt sprechen.
  'collaboration_conversation_marker'
));

-- ---------------------------------------------------------------------------
-- Die Pruefung fuer die neue Art
-- ---------------------------------------------------------------------------
-- Dieselbe Zusage wie fuer alle anderen: nicht "wir kennen uns irgendwie",
-- sondern DIESER VORGANG ZEIGT WIRKLICH VON MIR ZU DIR. Hier heisst das: Die
-- Markierung existiert, sie ist MEINE, und du stehst in derselben Runde. Eine
-- erfundene Prompt-Kennung ist wertlos.
create or replace function public.create_in_app_notice(
  p_kind text,
  p_recipient_user_id uuid,
  p_subject_id uuid,
  p_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_verified boolean;
begin
  if v_actor is null or p_recipient_user_id is null then
    return false;
  end if;

  -- Sich selbst benachrichtigen ist kein Hinweis, sondern Rauschen.
  if v_actor = p_recipient_user_id then
    return false;
  end if;

  if public.is_network_interaction_blocked(v_actor, p_recipient_user_id) then
    return false;
  end if;

  -- Dieselbe Regel wie der Constraint der Tabelle, hier aber als STILLE
  -- Absage. Der Constraint ist die Zusage gegenueber jedem Schreiber und
  -- bleibt; wuerde nur er greifen, waere die Antwort eine Ausnahme statt eines
  -- `false` - und ein Hinweis ist eine Beigabe, die nichts abbrechen darf.
  if p_path is null
     or length(p_path) > 300
     or p_path !~ '^/[A-Za-z0-9_][A-Za-z0-9/_#?=&.-]*$' then
    return false;
  end if;

  v_verified := case
    when p_kind = 'contact_request' then exists (
      select 1 from public.network_contact_requests request
      where request.id = p_subject_id
        and request.sender_user_id = v_actor
        and request.recipient_user_id = p_recipient_user_id
    )
    when p_kind = 'problem_interest' then exists (
      select 1
      from public.network_problem_interests interest
      join public.network_problems problem on problem.id = interest.problem_id
      where interest.id = p_subject_id
        and interest.user_id = v_actor
        and problem.author_user_id = p_recipient_user_id
    )
    when p_kind = 'approach_interest' then exists (
      select 1
      from public.network_problem_interests interest
      join public.network_problem_approaches approach on approach.id = interest.approach_id
      where interest.id = p_subject_id
        and interest.user_id = v_actor
        and approach.author_user_id = p_recipient_user_id
    )
    when p_kind = 'discovery_intro_request' then exists (
      select 1 from public.discovery_intro_requests intro
      where intro.id = p_subject_id
        and intro.requester_user_id = v_actor
        and intro.recipient_user_id = p_recipient_user_id
    )
    when p_kind = 'discovery_intro_accepted' then exists (
      select 1 from public.discovery_intro_requests intro
      where intro.id = p_subject_id
        and intro.recipient_user_id = v_actor
        and intro.requester_user_id = p_recipient_user_id
    )
    when p_kind in ('read_my_mind_handoff', 'founder_in_the_wild_handoff') then exists (
      select 1
      from public.collaboration_experience_round_participants mine
      join public.collaboration_experience_round_participants theirs
        on theirs.round_id = mine.round_id
      where mine.round_id = p_subject_id
        and mine.founder_user_id = v_actor
        and theirs.founder_user_id = p_recipient_user_id
    )
    -- NEU: Der Vorgang ist der Prompt der Runde. Die Markierung muss meine
    -- sein - dass ich das Reveal gesehen habe, hat die Markierungsfunktion
    -- schon geprueft, bevor die Zeile entstehen konnte.
    when p_kind = 'collaboration_conversation_marker' then exists (
      select 1
      from public.collaboration_experience_conversation_markers marker
      join public.collaboration_experience_round_participants theirs
        on theirs.round_id = marker.round_id
      where marker.round_prompt_id = p_subject_id
        and marker.participant_user_id = v_actor
        and theirs.founder_user_id = p_recipient_user_id
    )
    else false
  end;

  if not v_verified then
    return false;
  end if;

  insert into public.in_app_notices (
    recipient_user_id, actor_user_id, kind, subject_id, path
  )
  values (p_recipient_user_id, v_actor, p_kind, p_subject_id, p_path)
  on conflict (recipient_user_id, kind, subject_id) do nothing;

  return found;
end;
$$;

revoke all on function public.create_in_app_notice(text, uuid, uuid, text) from public, anon;
grant execute on function public.create_in_app_notice(text, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Einen eigenen Hinweis zurueckziehen
-- ---------------------------------------------------------------------------
/**
 * Fuer den Fall, dass der Anlass verschwindet - jemand nimmt seine Markierung
 * zurueck. Dann darf der Hinweis nicht stehen bleiben: Er schickte die andere
 * Person sonst zu einem Gespraechspunkt, den es nicht mehr gibt.
 *
 * NUR EIGENE. Geloescht wird ausschliesslich die Zeile, die diese Person
 * selbst ausgeloest hat (`actor_user_id = auth.uid()`). Sonst waere das ein
 * Weg, fremde Hinweise aus einer fremden Liste zu entfernen - also jemandem
 * unsichtbar zu machen, dass er dran ist.
 *
 * Das Loeschen geschieht unabhaengig davon, ob schon gelesen wurde. Wer
 * hingegangen ist, hat den Punkt gesehen; wer nicht, soll nicht mehr
 * hingeschickt werden.
 */
create or replace function public.withdraw_in_app_notice(
  p_kind text,
  p_recipient_user_id uuid,
  p_subject_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    return false;
  end if;

  delete from public.in_app_notices notice
  where notice.kind = p_kind
    and notice.subject_id = p_subject_id
    and notice.recipient_user_id = p_recipient_user_id
    and notice.actor_user_id = v_actor;

  return found;
end;
$$;

revoke all on function public.withdraw_in_app_notice(text, uuid, uuid) from public, anon;
grant execute on function public.withdraw_in_app_notice(text, uuid, uuid) to authenticated;

commit;
