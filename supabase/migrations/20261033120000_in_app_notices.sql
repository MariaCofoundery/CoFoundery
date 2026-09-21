begin;

-- ---------------------------------------------------------------------------
-- "Dein potenzieller Co-Founder hat XY ausgefüllt. Du bist dran."
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 21.09.2026: "Es wäre voll gut, wenn diese Benachrichtigung
-- eben auch in der App angezeigt wird. [...] Sobald eine Person in dem
-- Verbindungsbereich irgendwas ausgefüllt hat, sollte eine Nachricht an die
-- andere Person rausgehen."
--
-- WAS ES SCHON GAB UND WAS FEHLTE: Mail und Mitteilung aufs Gerät gibt es seit
-- Wochen, und sie funktionieren - Maria hat die Mail bekommen. In der
-- Anwendung selbst stand nichts. Wer die Mail wegklickt oder sie in einem
-- anderen Postfach hat, erfährt nie, dass er dran ist; und wer gerade in der
-- Anwendung IST, sieht dort am wenigsten.
--
-- DER DRITTE WEG, NICHT DER ERSTE. Diese Tabelle ersetzt nichts: Sie ist die
-- Ablage für denselben Anlass, der auch die Mail ausgelöst hat. Deshalb steht
-- hier auch keine zweite Entscheidung darüber, WER etwas bekommt - das
-- entscheiden weiterhin die Schalter im Konto und die Anspruchsvergabe an der
-- auslösenden Stelle.
--
-- EIN ANLASS, EINE ZEILE. Der Schlüssel ist (Empfänger, Art, Vorgang): Ein
-- zweiter Aufruf zum selben Vorgang legt keine zweite Zeile an. Ohne das würde
-- eine Seite, die zweimal gerendert wird, zwei Hinweise erzeugen - und eine
-- Liste, die sich selbst vollschreibt, liest niemand.
-- ---------------------------------------------------------------------------

create table public.in_app_notices (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  /**
   * Wer es ausgeloest hat. `on delete set null`: Wer geht, nimmt den Hinweis
   * nicht mit - er ist bei der Empfaengerin eingegangen und gehoert ihr.
   * Angezeigt wird dann ein neutraler Satz, kein erfundener Name.
   */
  actor_user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  /** Der Vorgang - je Vorgang und Empfaenger genau ein Hinweis. */
  subject_id uuid not null,
  /** Wohin ein Antippen fuehrt. Ein Pfad, keine vollstaendige Adresse. */
  path text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,

  constraint in_app_notices_unique unique (recipient_user_id, kind, subject_id),
  -- Die Werteliste muss mit IN_APP_NOTICE_KINDS im Code uebereinstimmen; ein
  -- Test vergleicht beide. Waere sie hier kuerzer, liefe ein Hinweis in einen
  -- Constraint-Fehler; waere sie laenger, gaebe es eine Art ohne Text.
  constraint in_app_notices_kind_check check (kind in (
    -- Connect und Find - dieselben Anlaesse, die auch Mail und Mitteilung
    -- ausloesen, MIT EINER AUSNAHME: 'message' fehlt hier absichtlich. Das
    -- Postfach zeigt ungelesene Nachrichten schon selbst, je Gespraech mit
    -- Zaehler. Eine zweite Liste, die neben der Liste steht und sagt "da ist
    -- eine Nachricht", ist kein Hinweis, sondern Rauschen.
    'contact_request',
    'problem_interest',
    'approach_interest',
    'discovery_intro_request',
    'discovery_intro_accepted',
    -- Align: jemand hat etwas ausgefuellt und die andere Seite ist dran.
    'read_my_mind_handoff',
    'founder_in_the_wild_handoff'
  )),
  -- EIN PFAD IM PRODUKT, NICHTS ANDERES. Das zweite Zeichen muss ein
  -- Buchstabe, eine Ziffer oder ein Unterstrich sein - sonst waere `//fremde-
  -- seite.de` ein gueltiger "Pfad", und ein Browser liest das als Adresse mit
  -- weggelassenem Protokoll. Der Pfad kommt als Parameter herein; ein Hinweis
  -- waere damit eine Weiterleitung nach draussen auf einem Link, den die
  -- Empfaengerin anklickt, weil sie ihm vertraut.
  --
  -- Die Laenge steht als Laengenpruefung da und nicht als Wiederholungszahl im
  -- Muster: Postgres laesst in `{n,m}` hoechstens 255 zu und lehnt ein
  -- `{0,300}` als ungueltigen Ausdruck ab - der Check schlug dann bei JEDEM
  -- Hinweis fehl, nicht nur bei einem langen Pfad.
  constraint in_app_notices_path_check check (
    path ~ '^/[A-Za-z0-9_][A-Za-z0-9/_#?=&.-]*$' and length(path) <= 300
  ),
  -- Kein Text in der Zeile: Was dasteht, entsteht beim Anzeigen aus der Art
  -- und dem Namen. Eine gespeicherte Formulierung waere in der falschen
  -- Sprache, sobald jemand seine Sprache aendert - genau der Fehler, der bei
  -- den Mails am 18.09.2026 behoben wurde.
  constraint in_app_notices_read_at check (read_at is null or read_at >= created_at)
);

comment on table public.in_app_notices is
  'Hinweise in der Anwendung: dieselben Anlaesse, die auch Mail und Mitteilung ausloesen. Enthaelt keinen Text - der entsteht beim Anzeigen in der Sprache der lesenden Person.';

create index in_app_notices_unread_idx
  on public.in_app_notices (recipient_user_id, created_at desc)
  where read_at is null;

alter table public.in_app_notices enable row level security;
revoke all on public.in_app_notices from anon, authenticated;
-- KEIN INSERT FUER ANGEMELDETE: Ein Hinweis entsteht ausschliesslich in
-- `create_in_app_notice`, und die prueft die Beziehung. Ohne diese Grenze
-- koennte jeder jedem etwas in die Liste schreiben.
grant select on public.in_app_notices to authenticated;
grant update (read_at) on public.in_app_notices to authenticated;
grant delete on public.in_app_notices to authenticated;

create policy in_app_notices_select_self on public.in_app_notices
  for select to authenticated using (recipient_user_id = auth.uid());
create policy in_app_notices_update_self on public.in_app_notices
  for update to authenticated using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());
create policy in_app_notices_delete_self on public.in_app_notices
  for delete to authenticated using (recipient_user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Einen Hinweis hinterlegen
-- ---------------------------------------------------------------------------
/**
 * WER DARF WEM? Nicht "wir kennen uns irgendwie", sondern: DIESER VORGANG
 * ZEIGT WIRKLICH VON MIR ZU DIR.
 *
 * Die Funktion glaubt dem Aufrufer kein Wort. Fuer jede Art rechnet sie nach,
 * dass `p_subject_id` eine echte Zeile ist, dass sie von der handelnden Person
 * ausgeht und dass sie bei genau dieser Empfaengerin ankommt. Eine erfundene
 * ID ist damit wertlos.
 *
 * WARUM NICHT EINFACH "BEZIEHUNG VORHANDEN": So stand es zuerst hier -
 * gemeinsames Team, angenommene Kontaktanfrage, angenommene
 * Vorstellungsanfrage. Das war an beiden Enden falsch. Zu eng, weil eine
 * ERSTE Kontaktanfrage noch keine angenommene Beziehung ist - also haette
 * gerade der haeufigste Anlass keinen Hinweis erzeugt. Und zu weit, weil eine
 * einmal abgelehnte Anfrage fuer immer die Tuer offen gehalten haette: Die
 * Vorgangs-ID kommt vom Aufrufer, und mit beliebigen IDs waeren beliebig viele
 * Zeilen moeglich gewesen. Die Eindeutigkeit je (Empfaenger, Art, Vorgang)
 * haette das nicht verhindert, sie zaehlt ja dieselbe erfundene ID nur einmal.
 *
 * Dasselbe Prinzip wie bei den KI-Vorschlaegen: Nicht der Aufrufer behauptet
 * die Fundstelle, die Datenbank rechnet sie nach.
 *
 * UND EINE BLOCKIERUNG GILT. Wer blockiert hat, will von dieser Person nichts
 * mehr - auch keinen Hinweis darauf, dass sie etwas ausgefuellt hat.
 *
 * Gibt false zurueck, wenn nichts angelegt wurde (Vorgang passt nicht,
 * blockiert, oder der Hinweis existiert schon). Kein Fehler: Ein Hinweis ist
 * eine Beigabe und darf die Handlung nicht mit sich reissen, die ihn
 * ausgeloest hat.
 */
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

  -- Je Art der eine Vorgang, der sie rechtfertigt. Eine unbekannte Art faellt
  -- in `else false` - sie kaeme ohnehin nicht durch den Constraint, aber die
  -- Funktion soll nicht davon abhaengen, dass eine andere Regel greift.
  -- Suchende Form (`case when p_kind = ...`), weil die kurze Form
  -- (`case p_kind when 'a', 'b'`) in SQL keine Aufzaehlung erlaubt.
  v_verified := case
    -- Connect: die Anfrage geht von mir an dich.
    when p_kind = 'contact_request' then exists (
      select 1 from public.network_contact_requests request
      where request.id = p_subject_id
        and request.sender_user_id = v_actor
        and request.recipient_user_id = p_recipient_user_id
    )
    -- Mein Interesse an DEINEM Problem.
    when p_kind = 'problem_interest' then exists (
      select 1
      from public.network_problem_interests interest
      join public.network_problems problem on problem.id = interest.problem_id
      where interest.id = p_subject_id
        and interest.user_id = v_actor
        and problem.author_user_id = p_recipient_user_id
    )
    -- Mein Interesse an DEINEM Ansatz. Zwei Arten, weil zwei verschiedene
    -- Menschen sie lesen - siehe connectNotifications.ts.
    when p_kind = 'approach_interest' then exists (
      select 1
      from public.network_problem_interests interest
      join public.network_problem_approaches approach on approach.id = interest.approach_id
      where interest.id = p_subject_id
        and interest.user_id = v_actor
        and approach.author_user_id = p_recipient_user_id
    )
    -- Find: die Anfrage von mir an dich ...
    when p_kind = 'discovery_intro_request' then exists (
      select 1 from public.discovery_intro_requests intro
      where intro.id = p_subject_id
        and intro.requester_user_id = v_actor
        and intro.recipient_user_id = p_recipient_user_id
    )
    -- ... und die Zusage zurueck, also mit vertauschten Seiten.
    when p_kind = 'discovery_intro_accepted' then exists (
      select 1 from public.discovery_intro_requests intro
      where intro.id = p_subject_id
        and intro.recipient_user_id = v_actor
        and intro.requester_user_id = p_recipient_user_id
    )
    -- Align: eine Runde, in der wir beide stehen. Beide Erlebnisse liegen in
    -- derselben Tabelle, deshalb eine Pruefung fuer beide Arten. Der Zustand
    -- wird absichtlich nicht geprueft: Bei Read My Mind ist die Gegenseite
    -- gerade `pending` - das IST der Anlass.
    when p_kind in ('read_my_mind_handoff', 'founder_in_the_wild_handoff') then exists (
      select 1
      from public.collaboration_experience_round_participants mine
      join public.collaboration_experience_round_participants theirs
        on theirs.round_id = mine.round_id
      where mine.round_id = p_subject_id
        and mine.founder_user_id = v_actor
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

commit;
