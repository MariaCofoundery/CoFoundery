/**
 * FIND – Pool-Voraussetzungen und Gate v03 (Spec §7, §7.1). Exakte Portierung von
 * matching_models_v03.gate_find_v03.
 *
 * Drei Zustände: Konflikt -> ineligible; sonst UNKNOWN -> uncertain; sonst eligible.
 * Kein Bonus für eine erfüllte Bedingung. Fehlende Werte sind nie ein Konflikt.
 */
import { normalizePlace, normalizeTerms, samePlace, sameTerm } from "@/lib/matching/v01/normalization";
import { gateReasonVisibleTo, matchableCapabilities } from "@/lib/matching/v01/permissions";
import type { FindContext, FindEligibility, FindGateCode, FindPersonInput, GateReason, Side } from "@/lib/matching/v01/types";

type Reason = GateReason<FindGateCode>;

function reason(code: FindGateCode, kind: Reason["kind"], conditionOwner: Side | "pair", field: string): Reason {
  return { code, kind, conditionOwner, field, visibleTo: gateReasonVisibleTo(conditionOwner) };
}

/** Pool-Voraussetzungen (Produktregeln vor dem Gate, Spec §7). Nie sichtbar begründet. */
function poolReasons(a: FindPersonInput, b: FindPersonInput, ctx: FindContext): Reason[] {
  const out: Reason[] = [];
  const hidden = (code: FindGateCode, field: string): Reason => ({ code, kind: "conflict", conditionOwner: "pair", field, visibleTo: [] });
  if (a.personId === b.personId) out.push(hidden("POOL_SAME_PERSON", "person_id"));
  if (a.findProfileStatus !== "active" || b.findProfileStatus !== "active") out.push(hidden("POOL_PROFILE_NOT_ACTIVE", "status"));
  if (!a.isFounder || !b.isFounder) out.push(hidden("POOL_NOT_FOUNDER", "profiles.roles"));
  if (ctx.blocked) out.push(hidden("POOL_BLOCKED", "block"));
  return out;
}

/** X ist remote-kompatibel, wenn remote/flexibel oder remote in den eigenen akzeptierten Modi. */
function remoteCompatible(x: FindPersonInput): boolean {
  return x.remoteMode === "remote" || x.remoteMode === "flexible" || x.mustHaves.acceptedRemoteModes.includes("remote");
}

/** Bedingungen von X, die Y erfüllen muss. */
function directedReasons(x: FindPersonInput, y: FindPersonInput, owner: Side): Reason[] {
  const out: Reason[] = [];
  const m = x.mustHaves;
  const conflict = (code: FindGateCode, field: string) => out.push(reason(code, "conflict", owner, field));
  const unknown = (code: FindGateCode, field: string) => out.push(reason(code, "unknown", owner, field));

  if (m.requiredRolesAny.length > 0) {
    if (y.ownRoles.length === 0) unknown("GATE_REQUIRED_ROLES", "requiredRolesAny");
    else if (!m.requiredRolesAny.some((r) => y.ownRoles.includes(r))) conflict("GATE_REQUIRED_ROLES", "requiredRolesAny");
  }
  if (m.minimumAvailabilityHoursPerWeek) {
    if (y.availabilityHoursPerWeek === null) unknown("GATE_MIN_HOURS", "minimumAvailabilityHoursPerWeek");
    else if (y.availabilityHoursPerWeek < m.minimumAvailabilityHoursPerWeek) conflict("GATE_MIN_HOURS", "minimumAvailabilityHoursPerWeek");
  }
  if (m.acceptedRemoteModes.length > 0) {
    if (y.remoteMode === null) unknown("GATE_REMOTE_MODE", "acceptedRemoteModes");
    else if (y.remoteMode !== "flexible" && !m.acceptedRemoteModes.includes(y.remoteMode)) conflict("GATE_REMOTE_MODE", "acceptedRemoteModes");
  }
  if (m.desiredLocationRegion) {
    const want = normalizePlace(m.desiredLocationRegion);
    if (want !== null && !want.wild) {
      // Nur ein KONKRETER Ort ist eine Bedingung (Spec §7.1 A).
      const have = normalizePlace(y.locationRegion);
      if (have === null) unknown("GATE_LOCATION", "desiredLocationRegion");
      else if (samePlace(want, have) === false && !remoteCompatible(x)) conflict("GATE_LOCATION", "desiredLocationRegion");
    }
  }
  if (m.acceptedSearchIntents.length > 0) {
    if (y.searchIntent === null) unknown("GATE_SEARCH_INTENT", "acceptedSearchIntents");
    else if (!m.acceptedSearchIntents.includes(y.searchIntent)) conflict("GATE_SEARCH_INTENT", "acceptedSearchIntents");
  }
  if (m.acceptedStartHorizons.length > 0) {
    if (y.startHorizon === null) unknown("GATE_START_HORIZON", "acceptedStartHorizons");
    else if (!m.acceptedStartHorizons.includes(y.startHorizon)) conflict("GATE_START_HORIZON", "acceptedStartHorizons");
  }
  if (m.requiredCapabilityAreasAny.length > 0) {
    // Ohne Matching-Freigabe hat Y für das Matching keine Bereiche -> UNKNOWN, nie Ausschluss (Spec §5).
    const caps = matchableCapabilities(y);
    if (caps.length === 0) unknown("GATE_CAPABILITY_AREAS", "requiredCapabilityAreasAny");
    else if (!caps.some((c) => m.requiredCapabilityAreasAny.includes(c.areaId))) conflict("GATE_CAPABILITY_AREAS", "requiredCapabilityAreasAny");
  }
  if (m.requiredExpertiseAny.length > 0) {
    if (y.expertise.length === 0) unknown("GATE_EXPERTISE", "requiredExpertiseAny");
    else {
      const want = normalizeTerms(m.requiredExpertiseAny, "topic");
      const have = normalizeTerms(y.expertise, "topic");
      if (!want.some((w) => have.some((h) => sameTerm(w, h)))) conflict("GATE_EXPERTISE", "requiredExpertiseAny");
    }
  }
  return out;
}

export function findEligibility(a: FindPersonInput, b: FindPersonInput, ctx: FindContext): FindEligibility {
  const pool = poolReasons(a, b, ctx);
  if (pool.length > 0) return { status: "ineligible", reasons: pool };

  const reasons = [...directedReasons(a, b, "a"), ...directedReasons(b, a, "b")];
  if (a.remoteMode === "onsite" && b.remoteMode === "onsite") {
    const pa = normalizePlace(a.locationRegion);
    const pb = normalizePlace(b.locationRegion);
    if (pa === null || pb === null) reasons.push(reason("GATE_BOTH_ONSITE_DIFFERENT_PLACE", "unknown", "pair", "location_region"));
    else if (samePlace(pa, pb) === false) reasons.push(reason("GATE_BOTH_ONSITE_DIFFERENT_PLACE", "conflict", "pair", "location_region"));
  }
  const conflicts = reasons.filter((r) => r.kind === "conflict");
  if (conflicts.length > 0) return { status: "ineligible", reasons: conflicts };
  return { status: reasons.length > 0 ? "uncertain" : "eligible", reasons };
}
