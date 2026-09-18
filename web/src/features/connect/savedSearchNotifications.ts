import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendSavedSearchEmail } from "@/lib/email/sendSavedSearchEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import {
  getDisclosedOwnCapabilityAreas,
  getSavedSearchesForMatching,
} from "./savedSearchData";
import { matchSavedSearches, type SearchableConnectSubject } from "./savedSearchMatching";

/**
 * Der Abgleich, der beim Veroeffentlichen laeuft.
 *
 * Kein Zeitplan, kein Hintergrundlauf: Was neu erscheint, wird in dem Moment
 * verglichen, in dem es erscheint. Das braucht keine Infrastruktur, wirkt
 * sofort und erreicht auch Menschen, die gerade nicht eingeloggt sind.
 *
 * Bestenfalls, wie alle Benachrichtigungen: Wer etwas veroeffentlicht, hat es
 * veroeffentlicht - auch wenn kein Abgleich zustande kommt.
 *
 * Wenn die Zahl der gespeicherten Suchen einmal in die Tausende geht, gehoert
 * das hier in einen Hintergrundlauf. Bei den Groessenordnungen einer Beta ist
 * es eine Abfrage und ein paar Vergleiche im Speicher.
 */
export async function notifySavedSearchMatches(
  client: SupabaseClient,
  subject: Omit<SearchableConnectSubject, "capabilityAreaIds">
) {
  try {
    const [searches, capabilityAreaIds] = await Promise.all([
      getSavedSearchesForMatching(client, "connect", subject.ownerUserId),
      getDisclosedOwnCapabilityAreas(client, subject.ownerUserId),
    ]);
    if (!searches.length) return;

    const matches = matchSavedSearches(searches, { ...subject, capabilityAreaIds });
    if (!matches.length) return;

    const origin = getPublicAppOrigin();
    const path =
      subject.kind === "listing"
        ? `/connect/listings/${subject.id}`
        : `/connect/problems/${subject.id}`;

    for (const match of matches) {
      // Hoechstens einmal je Treffer: Ein erneutes Veroeffentlichen - etwa nach
      // dem Verlaengern - loest keine zweite Meldung aus.
      const { data: claimed, error } = await client.rpc("claim_saved_search_hit", {
        p_saved_search_id: match.searchId,
        p_subject_kind: subject.kind,
        p_subject_id: subject.id,
      });
      if (error || claimed !== true) continue;

      // Neu am 18.09.2026: Suchtreffer haben einen eigenen Schalter. Vorher
      // kamen sie auch bei abgeschalteten Connect-Benachrichtigungen an.
      const { data: wanted } = await client.rpc("wants_email_notification", {
        p_user_id: match.userId,
        p_kind: "connect_saved_search",
      });
      if (wanted !== true) continue;

      const recipient = await getNotificationRecipient(match.userId);
      if (!recipient) continue;

      await sendSavedSearchEmail({
        recipientEmail: recipient.email,
        subjectKind: subject.kind,
        title: subject.title,
        reasons: match.reasons,
        url: `${origin}${path}`,
        locale: recipient.locale,
      });
    }
  } catch {
    // Stumm: Der Abgleich ist eine Beigabe, kein Teil des Veroeffentlichens.
  }
}
