import "server-only";

import { getDisclosedOwnCapabilityAreas } from "@/features/connect/savedSearchData";
import { getNotificationRecipientEmail } from "@/lib/email/notificationRecipient";
import { sendDiscoverySavedSearchEmail } from "@/lib/email/sendDiscoverySavedSearchEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient } from "@/lib/supabase/server";
import {
  matchDiscoverySavedSearches,
  type DiscoverySavedSearchCriteria,
  type SearchableDiscoveryProfile,
} from "./discoverySavedSearchMatching";

/**
 * Der Abgleich, wenn ein Suchprofil veroeffentlicht wird.
 *
 * Gleiche Bauart wie in Connect: im Moment des Erscheinens, ohne Zeitplan,
 * bestenfalls, hoechstens einmal je Treffer.
 *
 * Was hier anders ist: Es geht um Menschen, nicht um Eintraege. Deshalb
 * traegt die Mail den Namen und die Headline - beides sieht ohnehin jedes
 * Mitglied, das die Suche oeffnet - aber nichts darueber hinaus. Und wenn die
 * Suche einen Alignment-Filter traegt, steht das dabei: Die Tendenz wird erst
 * beim Ansehen verglichen, weil dafuer die eigenen Antworten gebraucht werden.
 */
export async function notifyDiscoverySavedSearchMatches(profile: SearchableDiscoveryProfile) {
  try {
    const client = await createClient();

    const { data, error } = await client.rpc("list_saved_searches_for_matching", {
      p_context: "discovery",
      p_author_user_id: profile.userId,
    });
    if (error || !data) return;

    const searches: DiscoverySavedSearchCriteria[] = (
      data as {
        id: string;
        user_id: string;
        query: string;
        topics: string[];
        industries: string[];
        locations: string[];
        remote_mode: string | null;
        capability_area_ids: string[];
        alignment_dimensions: string[];
      }[]
    ).map((row) => ({
      id: row.id,
      userId: row.user_id,
      query: row.query,
      topics: row.topics,
      industries: row.industries,
      locations: row.locations,
      remoteMode: row.remote_mode,
      capabilityAreaIds: row.capability_area_ids,
      alignmentDimensions: row.alignment_dimensions,
    }));
    if (!searches.length) return;

    // Nur freigegebene Faehigkeiten - ein Treffer auf eine zurueckgehaltene
    // Angabe waere eine Weitergabe durch die Hintertuer.
    const capabilityAreaIds = await getDisclosedOwnCapabilityAreas(client, profile.userId);
    const matches = matchDiscoverySavedSearches(searches, { ...profile, capabilityAreaIds });
    if (!matches.length) return;

    const origin = getPublicAppOrigin();
    const locale = await getRequestLocale();

    for (const match of matches) {
      const { data: claimed, error: claimError } = await client.rpc("claim_saved_search_hit", {
        p_saved_search_id: match.searchId,
        p_subject_kind: "profile",
        p_subject_id: profile.userId,
      });
      if (claimError || claimed !== true) continue;

      const recipientEmail = await getNotificationRecipientEmail(match.userId);
      if (!recipientEmail) continue;

      await sendDiscoverySavedSearchEmail({
        recipientEmail,
        displayName: profile.displayName,
        headline: profile.headline,
        reasons: match.reasons,
        hasAlignmentFilter: match.hasAlignmentFilter,
        url: `${origin}/discovery`,
        locale,
      });
    }
  } catch {
    // Stumm: Der Abgleich ist eine Beigabe, kein Teil des Veroeffentlichens.
  }
}
