import { FOUNDER_LIBRARY_TERMS } from "@/features/founderLibrary/founderLibraryRegistry";
import type { FounderSetupItem } from "@/features/teams/founderSetupModel";
import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * "Mit einer Beratung klaeren": die Themen, bei denen eine Vereinbarung unter
 * Gruendern rechtliche Folgen hat (Katalog: legalNote).
 *
 * KEINE NEUE TABELLE, KEIN NEUER STATUS. Die Liste ist eine Sicht auf das, was
 * das Setup schon weiss. Dabei zaehlt als "bestaetigt" nur, was die AKTUELLE
 * Runde bestaetigt hat - `currentConfirmedRevision` ist im Lesemodell schon
 * darauf geprueft. Eine Bestaetigung der frueheren Runde reicht nicht, sie
 * steht hier als "neu zu bestaetigen".
 *
 * Die Liste sagt nicht, was rechtlich richtig ist. Sie sagt, welche Punkte
 * jemand mit Fachwissen ansehen sollte, bevor man sich darauf verlaesst.
 */
export type FounderSetupLegalReviewStatus = "open" | "discussed" | "reconfirm" | "confirmed";

export type FounderSetupLegalReviewEntry = {
  key: FounderSetupItemKey;
  status: FounderSetupLegalReviewStatus;
  /** Slug des ersten verfuegbaren Begriffs der Founder Library zu diesem Thema. */
  libraryTermSlug: string | null;
};

/**
 * Der Begriff, der das Thema am besten einfuehrt: der, der so heisst wie das
 * Thema. Gibt es keinen (bei der Rechtsform waere jede Wahl eine Empfehlung
 * fuer GmbH, UG oder GbR), zeigt der Link keinen einzelnen Begriff.
 */
function leadTermSlug(key: FounderSetupItemKey): string | null {
  const covers = (term: { setupTopicKeys?: readonly FounderSetupItemKey[] }) => Boolean(term.setupTopicKeys?.includes(key));
  const sameName = FOUNDER_LIBRARY_TERMS.find(
    (term) => term.status === "available" && term.id === key.replace(/s$/, "")
  );
  if (sameName && covers(sameName)) return sameName.slug;
  const only = FOUNDER_LIBRARY_TERMS.filter(
    (term) => term.status === "available" && covers(term)
  );
  return only.length === 1 ? only[0].slug : null;
}

export function founderSetupLegalReviewStatus(item: FounderSetupItem): FounderSetupLegalReviewStatus {
  if (item.currentConfirmedRevision) return "confirmed";
  if (item.rosterConfirmationMissing) return "reconfirm";
  if (item.stage === "discussing" || item.stage === "awaiting_confirmation") return "discussed";
  return "open";
}

export function buildFounderSetupLegalReview(items: readonly FounderSetupItem[]): FounderSetupLegalReviewEntry[] {
  return items
    .filter((item) => item.legalNote)
    .map((item) => ({
      key: item.key,
      status: founderSetupLegalReviewStatus(item),
      libraryTermSlug: leadTermSlug(item.key),
    }));
}
