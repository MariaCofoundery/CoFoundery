/**
 * Confidence (Spec §14): Wie viel relevante Information liegt vor? Keine Matchqualität,
 * kein Score-Bestandteil, keine Nutzerstufen. Fehlende Daten verändern die Relevanz nie.
 */
import { matchableCapabilities } from "@/lib/matching/v01/permissions";
import type { ConnectListingInput, EvidenceSummary, FindPersonInput } from "@/lib/matching/v01/types";

function summarize(fields: ReadonlyArray<readonly [string, boolean]>): EvidenceSummary {
  const present = fields.filter(([, ok]) => ok).map(([name]) => name);
  const missing = fields.filter(([, ok]) => !ok).map(([name]) => name);
  return { score: present.length / fields.length, present, missing };
}

const has = (v: unknown) => v !== null && v !== undefined;

/** c(P) – Anteil vorhandener Felder. Capabilities zählen nur mit Matching-Freigabe. */
export function findPersonEvidence(p: FindPersonInput): EvidenceSummary {
  return summarize([
    ["own_roles", p.ownRoles.length > 0],
    ["seeking_roles", p.seekingRoles.length > 0],
    ["capabilities", matchableCapabilities(p).length > 0],
    ["industries", p.industries.length > 0],
    ["expertise", p.expertise.length > 0],
    ["search_intent", has(p.searchIntent)],
    ["start_horizon", has(p.startHorizon)],
    ["location_region", has(p.locationRegion)],
    ["remote_mode", has(p.remoteMode)],
  ]);
}

/** c(L) – Anteil vorhandener Felder eines CONNECT-Eintrags. */
export function connectListingEvidence(l: ConnectListingInput): EvidenceSummary {
  return summarize([
    ["topics", l.topics.length > 0],
    ["industries", l.industries.length > 0],
    ["locations", l.locations.length > 0],
    ["geographic_scope", has(l.geographicScope)],
  ]);
}
