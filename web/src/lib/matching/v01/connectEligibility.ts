/**
 * CONNECT – Pool-Voraussetzungen und Gate (Spec §10). Ort-Regel exakt wie
 * matching_models_v03.gate_connect_v03.
 *
 * Fehlender Themenbezug ist KEIN Gate – er wirkt über die Relevanz (C1-Deckel).
 * Gründe aus Produktregeln (Blockierung, Sichtbarkeit, suggestable) werden nie angezeigt.
 */
import { normalizePlace, samePlace } from "@/lib/matching/v01/normalization";
import type { ConnectContext, ConnectGateCode, ConnectListingInput, ConnectOfferInput, GateReason, GateStatus } from "@/lib/matching/v01/types";

type Reason = GateReason<ConnectGateCode>;

const hidden = (code: ConnectGateCode, field: string): Reason => ({ code, kind: "conflict", conditionOwner: "pair", field, visibleTo: [] });
const shown = (code: ConnectGateCode, kind: Reason["kind"], field: string): Reason => ({
  code,
  kind,
  conditionOwner: "pair",
  field,
  visibleTo: ["a", "b"],
});

/** expires_at ≥ jetzt (Spec §10). Reines Datum wird als Kalendertag verglichen; null läuft nicht ab. */
export function notExpired(expiresAt: string | null, now: string): boolean {
  if (expiresAt === null) return true;
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return expiresAt >= now.slice(0, 10);
  const t = Date.parse(expiresAt);
  const n = Date.parse(now);
  if (Number.isNaN(t) || Number.isNaN(n)) return false;
  return t >= n;
}

function locationGate(x: ConnectListingInput, y: ConnectListingInput): "conflict" | "unknown" | null {
  if (x.geographicScope !== "regional" || x.remoteMode !== "onsite") return null;
  const px = x.locations.map(normalizePlace).filter((p) => p !== null && !p.wild);
  if (px.length === 0) return null;
  const py = y.locations.map(normalizePlace).filter((p) => p !== null);
  if (py.length === 0) return "unknown";
  return px.some((p) => py.some((q) => samePlace(p, q) === true)) ? null : "conflict";
}

export function connectEligibility(
  seek: ConnectListingInput,
  offer: ConnectOfferInput,
  ctx: ConnectContext,
): Readonly<{ status: GateStatus; reasons: readonly Reason[] }> {
  const o = offer.listing;
  const pool: Reason[] = [];
  if (seek.direction !== "seeking" || o.direction !== "offering") pool.push(hidden("CONNECT_GATE_DIRECTION", "direction"));
  if (seek.ownerId === o.ownerId || seek.listingId === o.listingId) pool.push(hidden("CONNECT_GATE_OWN_LISTING", "owner_user_id"));
  if (ctx.blockedOwnerIds.has(o.ownerId)) pool.push(hidden("CONNECT_GATE_BLOCKED", "block"));
  if (!(o.visibility === "public" || (o.visibility === "members_only" && ctx.viewerIsNetworkMember))) {
    pool.push(hidden("CONNECT_GATE_NOT_VISIBLE", "visibility"));
  }
  if (o.status !== "active") pool.push(shown("CONNECT_GATE_OFFER_NOT_ACTIVE", "conflict", "status"));
  if (!notExpired(o.expiresAt, ctx.now)) pool.push(shown("CONNECT_GATE_OFFER_EXPIRED", "conflict", "expires_at"));
  if (offer.owner.profileStatus !== "active") pool.push(hidden("CONNECT_GATE_OWNER_PROFILE_NOT_ACTIVE", "network_profiles.status"));
  if (ctx.purpose === "person_suggestion" && !offer.owner.suggestable) pool.push(hidden("CONNECT_GATE_NOT_SUGGESTABLE", "suggestable"));
  if (pool.length > 0) return { status: "ineligible", reasons: pool };

  const unknown: Reason[] = [];
  for (const [x, y] of [[seek, o], [o, seek]] as const) {
    const state = locationGate(x, y);
    if (state === "conflict") return { status: "ineligible", reasons: [shown("CONNECT_GATE_LOCATION", "conflict", "locations")] };
    if (state === "unknown") unknown.push(shown("CONNECT_GATE_LOCATION", "unknown", "locations"));
  }
  return { status: unknown.length > 0 ? "uncertain" : "eligible", reasons: unknown };
}
