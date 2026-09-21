"use server";

import { createClient } from "@/lib/supabase/server";

import { countOpenConnectSuggestions } from "./connectSuggestionData";
import { deliverSuggestionNotification } from "./suggestionNotifications";

/**
 * "Zeig mir mal, wie das aussieht."
 *
 * GEWUENSCHT AM 21.09.2026: "Und dann haette ich gerne mal, dass du auf meinen
 * Account auch sowas wie eine Testbenachrichtigung vorschlaegst."
 *
 * WARUM ES DEN KNOPF BRAUCHT: Der Zeitplan laeuft einmal am Tag, und ob er
 * ankommt, haengt an einer Kette - Erlaubnis im Browser, VAPID-Schluessel,
 * Push-Dienst, Mailversand, und dazu zwei Schalter mit zwei verschiedenen
 * Voreinstellungen. Ohne diesen Knopf muesste man einen Tag warten, um zu
 * erfahren, dass irgendwo darin etwas fehlt - und dann raten, wo.
 *
 * ER NIMMT DENSELBEN WEG WIE DAS ECHTE. Keine eigene Nachricht, kein eigener
 * Text: `deliverSuggestionNotification` ist dieselbe Funktion, die der
 * Zeitplan ruft. Ein Testknopf mit eigenem Weg prueft sich selbst.
 *
 * UND ER UEBERGEHT DIE SCHALTER NICHT. Wer der Mail nicht zugestimmt hat,
 * bekommt hier auch keine - die Antwort sagt es dann. Ein Test, der mehr darf
 * als der Ernstfall, beweist das Falsche.
 *
 * Empfaenger ist ausschliesslich das aufrufende Konto. Niemand kann damit
 * jemand anderen anschreiben, und es wird nichts gestempelt: Ein Test soll
 * keinen echten Vorschlag als "gemeldet" verbuchen.
 */
export async function sendTestSuggestionNotificationAction(): Promise<{
  ok: boolean;
  pushed: number;
  mailed: number;
  emailAllowed: boolean;
}> {
  const nothing = { ok: false, pushed: 0, mailed: 0, emailAllowed: false };

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return nothing;

  // Nur fuer Menschen mit Connect-Zugang: Vorschlaege gibt es ohne ihn nicht,
  // und ein Knopf, der etwas ueber einen Bereich behauptet, den jemand nicht
  // hat, ist eine Irritation.
  const { data: isMember } = await client.rpc("has_network_account");
  if (isMember !== true) return nothing;

  // DIE ZUSTIMMUNG WIRD DIREKT GELESEN, nicht ueber `wants_email_channel`:
  // Jene Funktion nimmt eine beliebige Kennung und ist (wie
  // `wants_email_notification` seit je) fuer alle Angemeldeten ausfuehrbar,
  // weil eine Benachrichtigung normalerweise durch die Handlung eines ANDEREN
  // entsteht und der Weg dann ueber dessen Anfrage laeuft. Hier geht es um die
  // eigene Zustimmung - und die steht ueber die Zeilensicherheit ohnehin zur
  // Verfuegung. Was man selbst lesen darf, holt man selbst.
  const { data: optIn } = await client
    .from("notification_opt_ins")
    .select("kind")
    .eq("user_id", user.id)
    .eq("kind", "connect_suggestions_email")
    .maybeSingle();

  const { data: optOut } = await client
    .from("notification_opt_outs")
    .select("kind")
    .eq("user_id", user.id)
    .eq("kind", "connect_suggestions")
    .maybeSingle();

  // Der allgemeine Schalter sticht die Zustimmung - dieselbe Regel wie in
  // `wants_email_channel`. Sie steht hier zum zweiten Mal, und das ist der
  // Preis dafuer, dass der Test ohne Umweg ueber fremde Kennungen auskommt;
  // ein pgTAP-Fall haelt die Regel an ihrer eigentlichen Stelle fest.
  const emailAllowed = Boolean(optIn) && !optOut;

  // Die echte Zahl, damit der Test zeigt, was wirklich ankaeme - und
  // mindestens eins, weil es eine Meldung ueber null Vorschlaege nicht gibt.
  const open = await countOpenConnectSuggestions(client);

  const result = await deliverSuggestionNotification({
    recipientUserId: user.id,
    count: Math.max(1, open),
    withEmail: emailAllowed,
  });

  return {
    ok: result.pushed > 0 || result.mailed > 0,
    pushed: result.pushed,
    mailed: result.mailed,
    emailAllowed,
  };
}
