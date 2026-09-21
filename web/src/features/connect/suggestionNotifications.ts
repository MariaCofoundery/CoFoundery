import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNetworkNotificationEmail } from "@/lib/email/sendNetworkNotificationEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

/**
 * Der Lauf, der Vorschlaege entstehen laesst und darueber Bescheid gibt.
 *
 * WARUM ES DIESEN LAUF GIBT: Vorschlaege entstanden bis zum 21.09.2026 nur
 * beim Hinsehen. Eine Meldung darueber ginge damit an jemanden, der sie in
 * diesem Moment schon ansieht - also an niemanden. Damit ein Hinweis etwas
 * bedeutet, muessen Vorschlaege OHNE Zutun entstehen.
 *
 * ZWEI KANAELE, ZWEI VOREINSTELLUNGEN, und die Entscheidung darueber faellt
 * nicht hier, sondern in der Datenbank (`prepare_suggestion_notifications`):
 *
 *   Mitteilung aufs Geraet - an, solange nicht abbestellt. Dass die Zeile
 *   ueberhaupt zurueckkommt, IST die Antwort auf diese Frage.
 *
 *   Mail - nur mit ausdruecklicher Zustimmung. `wants_email` traegt sie.
 *
 * Diese Datei fragt nichts nachtraeglich nach und entscheidet nichts neu: Zwei
 * Stellen, die dasselbe beurteilen, waere genau die Stelle, an der ein
 * Versprechen auseinanderlaeuft.
 *
 * WAS IN DER MELDUNG STEHT: eine Zahl. Nicht, WER oder WAS vorgeschlagen
 * wurde. Eine Mail landet in Postfaechern, die wir nicht kennen, und eine
 * Mitteilung auf einem Sperrbildschirm, den jeder sieht, der das Telefon in
 * der Hand haelt. Wer vorgeschlagen wurde, steht in CoFoundery.
 */

const SUGGESTIONS_PATH = "/connect/suggestions";

type PreparedRow = {
  recipient_user_id: string;
  new_count: number;
  wants_email: boolean;
};

export type SuggestionNotificationResult =
  | { ok: true; prepared: number; pushed: number; mailed: number }
  | { ok: false; reason: "missing_service_role" | "prepare_failed" };

function privilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Meldet einen Schwung Vorschlaege an eine Person - auf den Wegen, die sie
 * erlaubt hat.
 *
 * Getrennt vom Lauf, weil der Testknopf im Konto denselben Weg nimmt: Ein
 * zweiter Zustellweg fuer dieselbe Meldung waere ein zweiter Ort, an dem der
 * Text und die Regeln auseinanderlaufen koennen.
 */
export async function deliverSuggestionNotification(params: {
  recipientUserId: string;
  count: number;
  withEmail: boolean;
}) {
  const recipient = await getNotificationRecipient(params.recipientUserId);
  if (!recipient) return { pushed: 0, mailed: 0 };

  // Derselbe Text auf beiden Wegen, aus derselben Quelle - wie bei allen
  // uebrigen Benachrichtigungen.
  const copy = getNetworkNotificationEmailCopy(recipient.locale, {
    kind: "connect_suggestions",
    senderName: null,
    count: params.count,
  });

  const [push, mail] = await Promise.all([
    deliverPushToUser(params.recipientUserId, {
      title: copy.headline,
      body: copy.intro,
      url: SUGGESTIONS_PATH,
      // EINE MARKE FUER ALLE: Ein neuer Schwung ersetzt den Hinweis auf den
      // vorigen, statt sich daneben zu stapeln. Wer eine Woche nicht
      // hineingesehen hat, soll keinen Stapel vorfinden.
      tag: "connect_suggestions",
    }),
    params.withEmail
      ? sendNetworkNotificationEmail({
          recipientEmail: recipient.email,
          kind: "connect_suggestions",
          senderName: null,
          url: `${getPublicAppOrigin()}${SUGGESTIONS_PATH}`,
          locale: recipient.locale,
          count: params.count,
        })
      : Promise.resolve(null),
  ]);

  return {
    pushed: push.sent,
    mailed: mail?.ok ? 1 : 0,
  };
}

export async function runSuggestionNotifications(
  limit = 25
): Promise<SuggestionNotificationResult> {
  const client = privilegedClient();
  if (!client) return { ok: false, reason: "missing_service_role" };

  const { data, error } = await client.rpc("prepare_suggestion_notifications", {
    p_limit: limit,
  });
  if (error) return { ok: false, reason: "prepare_failed" };

  const rows = (data ?? []) as PreparedRow[];

  // NACHEINANDER, nicht nebenlaeufig: Ein Lauf schickt an alle, die
  // dranstehen, und gleichzeitig loszuschicken hiesse, mehrere Postfaecher und
  // Push-Dienste in derselben Sekunde anzusprechen. Das ist kein Gewinn - der
  // Lauf hat Zeit -, aber ein guter Weg, in eine Sperre zu laufen.
  let pushed = 0;
  let mailed = 0;

  for (const row of rows) {
    try {
      const result = await deliverSuggestionNotification({
        recipientUserId: row.recipient_user_id,
        count: row.new_count,
        withEmail: row.wants_email === true,
      });
      pushed += result.pushed;
      mailed += result.mailed;
    } catch {
      // Ein Fehlschlag bei einem Menschen darf den Lauf nicht beenden - die
      // uebrigen warten seit gestern. Der Vorschlag ist schon gestempelt, die
      // Meldung entfaellt also; das ist die gewollte Richtung.
    }
  }

  return { ok: true, prepared: rows.length, pushed, mailed };
}
