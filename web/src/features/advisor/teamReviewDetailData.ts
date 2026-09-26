import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdvisorGroupReadout, type AdvisorGroupReadout } from "@/features/advisor/groupReadoutData";
import { getAdvisorPersonAlignment, getAdvisorPersonBaseName } from "@/features/advisor/personViewData";
import type { AlignmentPerson } from "@/features/advisor/AlignmentSideBySide";
import { getAdvisorTeamReviews } from "@/features/advisor/teamReviewData";

/**
 * Der Inhalt einer gemeinsamen Auswertung.
 *
 * ---------------------------------------------------------------------------
 * ZWEI EINWILLIGUNGEN, NICHT EINE
 * ---------------------------------------------------------------------------
 *
 * Die gemeinsame Auswertung entsperrt KEINE neuen Daten. Sie entsperrt das
 * Nebeneinanderstellen. Was von jeder Person zu sehen ist, entscheidet
 * weiterhin ihre eigene Einzelfreigabe:
 *
 *   Die Teamzustimmung sagt: "Ihr dürft uns zusammen ansehen."
 *   Die Einzelfreigabe sagt: "Das hier von mir dürft ihr sehen."
 *
 * Beides muss vorliegen. Wer der gemeinsamen Auswertung zugestimmt, aber
 * seinen Fragebogen nie freigegeben hat, erscheint in der Rollenlage und
 * nicht im Nebeneinander der Selbstbilder - und das steht dann auch dort.
 *
 * Diese Trennung ist der Grund, warum die Teamzustimmung kein Umfang in der
 * Freigabeliste geworden ist: Ein Umfang hätte beides vermischt.
 */

export type TeamReviewDetail = {
  reviewId: string;
  group: AdvisorGroupReadout | null;
  alignment: AlignmentPerson[];
  /** Wer zugestimmt hat, aber seinen Fragebogen nicht freigegeben hat. */
  withoutAlignment: string[];
};

export async function getTeamReviewDetail(
  client: SupabaseClient,
  reviewId: string
): Promise<TeamReviewDetail | null> {
  // Zuerst die Frage, ob es diese Auswertung für diesen Halter überhaupt
  // gibt - und ob alle zugestimmt haben. Die Antwort kommt aus der Datenbank,
  // nicht aus einer Prüfung hier.
  const reviews = await getAdvisorTeamReviews(client);
  const review = reviews.find((entry) => entry.reviewId === reviewId);
  if (!review || review.status !== "active") return null;

  const [group, perPerson] = await Promise.all([
    getAdvisorGroupReadout(client, review.subjectUserIds),
    Promise.all(
      review.subjectUserIds.map(async (userId) => {
        const [name, alignment] = await Promise.all([
          getAdvisorPersonBaseName(client, userId),
          getAdvisorPersonAlignment(client, userId),
        ]);
        return { userId, name, alignment };
      })
    ),
  ]);

  const alignment: AlignmentPerson[] = [];
  const withoutAlignment: string[] = [];

  for (const entry of perPerson) {
    // Ohne Namen kein Punkt in der Grafik: "jemand liegt hier" ist keine
    // Auskunft, und bei mehreren Namenlosen nicht einmal unterscheidbar.
    if (!entry.name) continue;
    if (entry.alignment) {
      alignment.push({ userId: entry.userId, name: entry.name, scores: entry.alignment.scores });
    } else {
      withoutAlignment.push(entry.name);
    }
  }

  return {
    reviewId,
    group,
    // Ein einzelner Punkt je Achse ist kein Nebeneinander, sondern ein
    // Einzelreport an der falschen Stelle.
    alignment: alignment.length >= 2 ? alignment : [],
    withoutAlignment,
  };
}
