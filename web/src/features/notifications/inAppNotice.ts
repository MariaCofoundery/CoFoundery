import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Der dritte Weg: ein Hinweis in der Anwendung selbst.
 *
 * GEWUENSCHT AM 21.09.2026, nachdem eine Uebergabe in Align per Mail ankam:
 * "Es waere voll gut, wenn diese Benachrichtigung eben auch in der App
 * angezeigt wird. Oder generell bei Nachrichten so, hey, dein potenzieller
 * Co-Founder hat XY ausgefuellt. Du bist dran."
 *
 * ER HAENGT NICHT AM MAIL-SCHALTER. Mail und Mitteilung haengen an einem
 * gemeinsamen Anspruch (`claim_network_notification`), und der prueft
 * `wants_email_notification`. Das ist fuer sie richtig: Beide gehen an Orte,
 * die wir nicht kennen - ein fremdes Postfach, ein Sperrbildschirm. Der
 * Hinweis in der App geht nirgendwo hin. Er wartet dort, wo die Person
 * ohnehin hinsieht, wenn sie hinsieht. Wer die Mails abbestellt, hat die
 * Anwendung nicht abbestellt - sonst waere das Abstellen der Mails ein
 * stilles Abstellen des Produkts.
 *
 * DIE ZAEHLUNG "HOECHSTENS EINMAL" BRAUCHT DESHALB KEINEN ANSPRUCH: Sie
 * steckt in der Eindeutigkeit je (Empfaenger, Art, Vorgang) in der Tabelle.
 * Ein zweiter Aufruf zum selben Vorgang legt keine zweite Zeile an.
 *
 * WAS ER NICHT ENTHAELT: keinen Text. In der Zeile stehen nur Art, Vorgang und
 * Pfad; die Worte entstehen beim Anzeigen in der Sprache der LESERIN. Eine
 * gespeicherte Formulierung waere in der falschen Sprache, sobald jemand seine
 * Sprache aendert - derselbe Fehler, der am 18.09.2026 bei den Mails behoben
 * wurde.
 */

/**
 * Muss mit dem Constraint `in_app_notices_kind_check` in der Migration
 * 20261033120000 uebereinstimmen. `message` steht ABSICHTLICH nicht darin:
 * Das Postfach zeigt ungelesene Nachrichten schon selbst, je Gespraech mit
 * Zaehler. Eine zweite Liste daneben, die sagt "da ist eine Nachricht", ist
 * kein Hinweis, sondern Rauschen. Weil die Art hier fehlt, verlangt
 * TypeScript in `notifyNetwork` eine ausdrueckliche Ausnahme - die
 * Entscheidung steht damit im Code und nicht nur in einem Kommentar. Waere die Liste hier kuerzer, gaebe es einen
 * Anlass ohne Hinweis; waere sie laenger, liefe ein Hinweis in einen
 * Constraint-Fehler. Ein Test vergleicht beide Listen.
 */
export const IN_APP_NOTICE_KINDS = [
  "contact_request",
  "problem_interest",
  "approach_interest",
  "discovery_intro_request",
  "discovery_intro_accepted",
  "read_my_mind_handoff",
  "founder_in_the_wild_handoff",
] as const;

export type InAppNoticeKind = (typeof IN_APP_NOTICE_KINDS)[number];

export async function createInAppNotice(
  client: SupabaseClient,
  params: {
    kind: InAppNoticeKind;
    recipientUserId: string;
    /** Die echte Zeile, um die es geht - die Datenbank rechnet sie nach. */
    subjectId: string;
    /** Wohin ein Antippen fuehrt. Ein Pfad, keine vollstaendige Adresse. */
    path: string;
  }
) {
  try {
    const { data } = await client.rpc("create_in_app_notice", {
      p_kind: params.kind,
      p_recipient_user_id: params.recipientUserId,
      p_subject_id: params.subjectId,
      p_path: params.path,
    });
    return data === true;
  } catch {
    // Bewusst stumm, wie bei Mail und Mitteilung: Ein Hinweis ist eine
    // Beigabe und darf die Handlung nicht mit sich reissen, die ihn ausgeloest
    // hat. Wer eine Anfrage gestellt hat, hat sie gestellt.
    return false;
  }
}
