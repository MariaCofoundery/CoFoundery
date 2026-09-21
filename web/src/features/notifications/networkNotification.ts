import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";
import { createInAppNotice } from "@/features/notifications/inAppNotice";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNetworkNotificationEmail } from "@/lib/email/sendNetworkNotificationEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

/**
 * Der eine Weg, auf dem eine Benachrichtigung entsteht.
 *
 * Bis zum 20.09.2026 stand das in `connectNotifications.ts`. Umgezogen ist es,
 * als Find dieselbe Mechanik brauchte: Vier Regeln, die fuer jede
 * Benachrichtigung gelten, gehoeren nicht in die Datei eines Bereichs.
 *
 *   Bestenfalls. Ein fehlgeschlagener Versand darf die Handlung nicht
 *   scheitern lassen - wer eine Anfrage stellt, hat sie gestellt, auch wenn
 *   die Mail nicht rausgeht.
 *
 *   Hoechstens einmal. Der Anspruch wird in der Datenbank genommen, bevor
 *   gesendet wird. Lieber eine Benachrichtigung zu wenig als zwei.
 *
 *   Nur was bestellt ist. Wer eine Art abgeschaltet hat, bekommt sie nicht -
 *   das prueft dieselbe Funktion, die den Anspruch vergibt.
 *
 *   Ein Anspruch, zwei Wege. Mail und Mitteilung auf das Geraet haengen an
 *   demselben Anspruch. Ein eigener Zaehler fuer den zweiten Weg waere ein
 *   zweites Regelwerk fuer dieselbe Frage - und die Abbestellungen aus dem
 *   Konto wuerden fuer ihn nicht gelten.
 *
 * SEIT DEM 21.09.2026 EIN DRITTER WEG, UND ZWAR AUSSERHALB DIESER VIER REGELN:
 * der Hinweis in der Anwendung. Er steht vor dem Anspruch, nicht dahinter -
 * denn der Anspruch prueft `wants_email_notification`, und wer die MAILS
 * abbestellt hat, hat nicht die Anwendung abbestellt. Sein "hoechstens einmal"
 * kommt aus der Eindeutigkeit seiner Tabelle. Begruendung in `inAppNotice.ts`.
 */

export type NetworkNotificationKind =
  | "contact_request"
  | "problem_interest"
  | "approach_interest"
  | "message"
  | "discovery_intro_request"
  | "discovery_intro_accepted";

async function claim(
  client: SupabaseClient,
  kind: NetworkNotificationKind,
  subjectId: string,
  recipientUserId: string
) {
  const { data, error } = await client.rpc("claim_network_notification", {
    p_kind: kind,
    p_subject_id: subjectId,
    p_recipient_user_id: recipientUserId,
  });
  return !error && data === true;
}

export async function notifyNetwork(
  client: SupabaseClient,
  params: {
    kind: NetworkNotificationKind;
    /** Der Vorgang - je Vorgang und Empfaenger gibt es genau eine. */
    subjectId: string;
    recipientUserId: string;
    /** Wohin es fuehrt, als Pfad. */
    path: string;
    /**
     * Der Name, den die EMPFAENGERIN von dieser Person kennt - nicht
     * zwangslaeufig der aus person_core. In Find ist es der Name aus dem
     * Discovery-Profil: Was in einer Benachrichtigung steht, darf nicht mehr
     * sein als das, was auf der Seite steht.
     */
    senderName: string | null;
  }
) {
  try {
    // Zuerst der Weg, der niemanden draussen erreicht: Er haengt an keinem
    // Schalter, und er braucht auch keine Mailadresse.
    //
    // Ausser bei einer Nachricht: Die steht im Postfach, mit Zaehler je
    // Gespraech. Ein Hinweis daneben, der sagt "da ist eine Nachricht", waere
    // Rauschen neben der Sache selbst.
    if (params.kind !== "message") {
      await createInAppNotice(client, {
        kind: params.kind,
        recipientUserId: params.recipientUserId,
        subjectId: params.subjectId,
        path: params.path,
      });
    }

    if (!(await claim(client, params.kind, params.subjectId, params.recipientUserId))) return;

    const recipient = await getNotificationRecipient(params.recipientUserId);
    if (!recipient) return;

    // Derselbe Text auf beiden Wegen, aus derselben Quelle. Und derselbe
    // Grundsatz: was passiert ist und wer es war, nicht was geschrieben wurde.
    // Die Mail landet in fremden Postfaechern, die Mitteilung auf einem
    // Sperrbildschirm - beides sind Orte, die wir nicht kennen.
    const copy = getNetworkNotificationEmailCopy(recipient.locale, {
      kind: params.kind,
      senderName: params.senderName,
    });

    await Promise.all([
      sendNetworkNotificationEmail({
        recipientEmail: recipient.email,
        kind: params.kind,
        senderName: params.senderName,
        url: `${getPublicAppOrigin()}${params.path}`,
        // Die Sprache der EMPFAENGERIN. Vorher stand hier die der laufenden
        // Anfrage - also die der Person, die gerade geschrieben hat.
        locale: recipient.locale,
      }),
      deliverPushToUser(params.recipientUserId, {
        title: copy.headline,
        body: copy.intro,
        url: params.path,
        // Je Anlass und Ort eine Marke: Ein zweiter Hinweis zum selben
        // Gespraech ersetzt den ersten, statt sich daneben zu stapeln.
        tag: `${params.kind}:${params.path}`,
      }),
    ]);
  } catch {
    // Bewusst stumm: Eine Benachrichtigung ist eine Beigabe, kein Teil der
    // Handlung. Sie darf sie nicht mit sich reissen.
  }
}
