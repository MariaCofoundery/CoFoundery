begin;

-- ---------------------------------------------------------------------------
-- Mitteilungen auf das Geraet
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 20.09.2026, nachdem die Seite auf einem iPhone auf dem
-- Startbildschirm lag: "Dann waere es natuerlich cool mit den Mitteilungen."
--
-- Was hier gespeichert wird, ist KEINE Einstellung, sondern eine Adresse: Der
-- Browser vergibt beim Einwilligen einen Endpunkt beim Push-Dienst seines
-- Herstellers (Apple, Google, Mozilla) und zwei Schluessel, mit denen der
-- Inhalt fuer genau dieses Geraet verschluesselt wird. Ohne diese drei Werte
-- laesst sich nichts zustellen; mit ihnen laesst sich an dieses eine Geraet
-- zustellen.
--
-- JE GERAET, NICHT JE PERSON:
--   Wer das Telefon einrichtet, hat damit nicht den Rechner eingerichtet. Das
--   ist keine Unschoenheit des Modells, sondern wie Web Push funktioniert -
--   die Einwilligung gehoert dem Browser, nicht dem Konto. Deshalb eine Zeile
--   je Geraet und eine Abmeldung, die nur das eigene Geraet betrifft.
--
-- WAS HIER NICHT ENTSCHIEDEN WIRD:
--   OB jemand benachrichtigt wird, entscheidet weiterhin
--   `claim_network_notification` mit den Abbestellungen aus
--   `notification_opt_outs`. Diese Tabelle sagt nur, WOHIN. Ein Geraet
--   anzumelden bestellt nichts zusaetzlich - es gibt die bestehenden
--   Benachrichtigungen auf einem zweiten Weg.
--
-- WARUM DIE ZEILEN NICHT UEBER RLS EINGEFUEGT WERDEN:
--   Ein Endpunkt gehoert zu einem Browser, nicht zu einem Konto. Meldet sich
--   auf demselben Geraet eine andere Person an, kommt derselbe Endpunkt mit
--   einem anderen Konto zurueck - und muss WECHSELN, sonst bekaeme die
--   vorherige Person die Mitteilungen der neuen. Ein Upsert scheitert in
--   diesem Fall an der Zeilensicherheit der fremden Zeile. Deshalb eine enge
--   Funktion, die den Endpunkt zuerst raeumt.
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Die Adresse beim Push-Dienst. Sie ist ein Geheimnis: Wer sie hat, kann an
  -- das Geraet zustellen.
  endpoint text not null unique,
  -- Der oeffentliche Schluessel des Geraets und das Authentifizierungsgeheimnis
  -- aus der Subscription, beide base64url. Ohne sie ist der Inhalt nicht
  -- verschluesselbar (RFC 8291).
  p256dh text not null,
  auth text not null,
  -- Damit in der Liste der eigenen Geraete etwas Wiedererkennbares steht.
  -- Gekuerzt, weil ein User-Agent ein Fingerabdruck ist und nicht laenger
  -- sein muss als noetig.
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Aufeinanderfolgende Fehlversuche. Ein Push-Dienst antwortet mit 404 oder
  -- 410, wenn eine Subscription nicht mehr gilt - dann wird die Zeile
  -- geloescht. Zaehlt also nur, was voruebergehend aussieht.
  failure_count integer not null default 0,
  constraint push_subscriptions_endpoint_check check (
    endpoint like 'https://%' and char_length(endpoint) between 20 and 2000
  ),
  constraint push_subscriptions_p256dh_check check (char_length(p256dh) between 20 and 200),
  constraint push_subscriptions_auth_check check (char_length(auth) between 8 and 100),
  constraint push_subscriptions_user_agent_check check (char_length(user_agent) <= 300)
);

comment on table public.push_subscriptions is
  'Zustelladressen fuer Web Push, eine Zeile je Geraet. Sagt WOHIN eine Benachrichtigung geht, nicht OB - das entscheidet claim_network_notification mit notification_opt_outs.';

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Lesen und loeschen darf man die eigenen Zeilen: Die Geraeteliste im Konto
-- soll ohne privilegierten Zugang auskommen, und eine Abmeldung ebenso.
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

-- Kein insert und kein update ueber die Tabelle: Beides laeuft ueber
-- register_push_subscription, damit der Wechsel eines Geraets zwischen Konten
-- nicht an einer fremden Zeile haengen bleibt.

-- ---------------------------------------------------------------------------
-- Anmelden
-- ---------------------------------------------------------------------------
/**
 * Meldet das aufrufende Konto mit diesem Endpunkt an.
 *
 * Der Endpunkt wird zuerst geraeumt - auch wenn er einem anderen Konto
 * gehoerte. Das ist kein Loch, sondern die Auflösung eines echten Falls: Wer
 * den Endpunkt vorlegen kann, hat ihn von diesem Geraet, und wer an dieses
 * Geraet zustellen kann, braucht die Zeile dafuer nicht. Bliebe die alte Zeile
 * dagegen stehen, bekaeme die vorherige Person auf einem geteilten Geraet die
 * Mitteilungen der neuen - das ist der Schaden, der hier verhindert wird.
 */
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user, p_endpoint, p_p256dh, p_auth, left(nullif(btrim(coalesce(p_user_agent, '')), ''), 300))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Abmelden
-- ---------------------------------------------------------------------------
/**
 * Meldet ein Geraet ab. Nur eigene Zeilen - anders als beim Anmelden gibt es
 * hier keinen Fall, der fremde braeuchte.
 */
create or replace function public.unregister_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deleted integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = v_user;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.unregister_push_subscription(text) from public, anon;
grant execute on function public.unregister_push_subscription(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Eine Abbestellung gilt jetzt fuer zwei Wege
-- ---------------------------------------------------------------------------
--
-- `wants_email_notification` heisst nach der Mail, entscheidet aber ueber
-- `claim_network_notification` seit dem 20.09.2026 auch ueber die Mitteilung
-- auf dem Geraet. Das ist Absicht und keine Nachlaessigkeit: Wer eine Art
-- abbestellt, hat sie abbestellt - nicht einen Zustellweg davon. Ein zweiter
-- Schalter daneben waere die Stelle, an der beide Wege auseinanderlaufen.
--
-- Der Name bleibt, weil drei weitere Aufrufer ihn tragen (gespeicherte Suchen,
-- Read my Mind, Founder in the Wild), die tatsaechlich nur Mail verschicken.
-- Umbenennen waere eine Aenderung an fuenf Stellen fuer eine Silbe.
comment on function public.wants_email_notification(uuid, text) is
  'Ob diese Person diese Benachrichtigungsart bekommen moechte. Gibt true zurueck, solange keine Abbestellung vorliegt - auch fuer eine Art, die es beim Anlegen der Zeile noch nicht gab. Gilt ueber claim_network_notification fuer BEIDE Wege: Mail und Mitteilung auf das Geraet (push_subscriptions). Der Name stammt aus der Zeit, als es nur den einen Weg gab.';

commit;
