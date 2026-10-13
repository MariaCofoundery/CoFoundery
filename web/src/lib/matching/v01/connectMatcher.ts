/**
 * CONNECT-Matcher (Spec §6): Gate -> C1 (Themenpflicht) -> Confidence -> Reasons. Gerichtet: Gesuch -> Angebot.
 */
import { connectListingEvidence } from "@/lib/matching/v01/confidence";
import { connectEligibility } from "@/lib/matching/v01/connectEligibility";
import { c1Relevance } from "@/lib/matching/v01/connectRelevance";
import { connectExplanations } from "@/lib/matching/v01/explanations";
import type { IdfIndex } from "@/lib/matching/v01/idf";
import { rankWithTies } from "@/lib/matching/v01/ranking";
import type { ConnectContext, ConnectListingInput, ConnectMatchResult, ConnectOfferInput, Ranked } from "@/lib/matching/v01/types";
import { MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

export function matchConnect(seek: ConnectListingInput, offer: ConnectOfferInput, ctx: ConnectContext, idf: IdfIndex): ConnectMatchResult {
  const eligibility = connectEligibility(seek, offer, ctx);
  const c1 = c1Relevance(seek, offer, idf);
  const es = connectListingEvidence(seek);
  const eo = connectListingEvidence(offer.listing);
  return {
    matchingVersion: MATCHING_VERSION,
    normalizationVersion: NORMALIZATION_VERSION,
    idfCorpusVersion: idf.idfCorpusVersion,
    context: "connect",
    computedAt: ctx.computedAt,
    inputVersions: { seekListing: seek.inputVersion, offerListing: offer.listing.inputVersion },
    subject: { seekListing: seek.listingId, offerListing: offer.listing.listingId },
    eligibility,
    relevance: {
      score: c1.score,
      components: { topic: c1.topic, text: c1.text, industry: c1.industry, category: c1.category, cappedNoTopic: c1.cappedNoTopic },
    },
    confidence: { score: Math.min(es.score, eo.score), evidence: { seek: es, offer: eo } },
    explanations: connectExplanations(seek, offer, eligibility.status, c1, c1.offerTokens),
  };
}

/** Rangliste der Angebote für ein Gesuch. `ineligible` erscheint nicht; Gleichstände werden ausgewiesen. */
export function rankConnectOffers(
  seek: ConnectListingInput,
  offers: readonly ConnectOfferInput[],
  ctx: ConnectContext,
  idf: IdfIndex,
): Ranked<ConnectMatchResult>[] {
  const items = offers
    .map((offer) => ({ offer, result: matchConnect(seek, offer, ctx, idf) }))
    .filter(({ result }) => result.eligibility.status !== "ineligible")
    .map(({ offer, result }) => ({ result, score: result.relevance.score, publishedAt: offer.listing.publishedAt, id: offer.listing.listingId }));
  return rankWithTies(items);
}
