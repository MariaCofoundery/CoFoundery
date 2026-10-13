/**
 * Adapter von den REALEN Made2Found-Strukturen auf die Engine-Eingaben.
 *
 * Jede Eingabe wird FELDWEISE aufgebaut. Alles, was eine DB-Zeile darüber hinaus trägt
 * (Bio, Headline, Evidence-Narrative, Research, Workstyle …), fällt dadurch weg.
 *
 * CAPABILITY-FREIGABE: Es gibt im Produkt noch keine Matching-Freigabe (Spec §5). Deshalb ist
 * `capabilityMatchingAllowed` hier standardmäßig false. `capability_disclosure` (Sichtbarkeit) wird
 * NICHT als Matching-Freigabe gelesen – sie bestimmt nur, was Reasons zeigen dürfen.
 *
 * MUST-HAVES: Das eingefrorene Gate prüft genau acht Kriterien. `requiredIndustriesAny`,
 * `acceptedCommitmentLevels`, `acceptedVentureStages`, `acceptedVentureGoals` existieren im Produkt,
 * sind aber nicht Teil von v0.1 und werden hier nicht übernommen.
 *
 * Nicht angeschlossen: kein Produktpfad ruft diese Funktionen auf.
 */
import type { CapabilityDisclosure, OwnershipWish as ProductOwnershipWish } from "@/features/capability/capabilityTypes";
import type { ConnectListing, ConnectProfile } from "@/features/connect/connectTypes";
import type { DiscoveryMustHaves, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import type {
  CapabilityEntryInput,
  CapabilityVisibility,
  ConnectListingInput,
  ConnectOfferInput,
  FindMustHavesInput,
  FindPersonInput,
} from "@/lib/matching/v01/types";

/** Minimale Capability-Zeile: passt auf CapabilityEntry und DisclosedCapabilityRow; Evidence wird nie gelesen. */
export type CapabilityRowLike = Readonly<{
  area_id: string;
  application_level: number | null;
  ownership_wish: ProductOwnershipWish | null;
}>;

export const EMPTY_MUST_HAVES: FindMustHavesInput = Object.freeze({
  requiredRolesAny: [],
  minimumAvailabilityHoursPerWeek: null,
  acceptedRemoteModes: [],
  desiredLocationRegion: null,
  acceptedSearchIntents: [],
  acceptedStartHorizons: [],
  requiredCapabilityAreasAny: [],
  requiredExpertiseAny: [],
});

export function mustHavesFromDiscovery(m: Partial<DiscoveryMustHaves> | null | undefined): FindMustHavesInput {
  if (!m) return EMPTY_MUST_HAVES;
  return {
    requiredRolesAny: [...(m.requiredRolesAny ?? [])],
    minimumAvailabilityHoursPerWeek: m.minimumAvailabilityHoursPerWeek ?? null,
    acceptedRemoteModes: [...(m.acceptedRemoteModes ?? [])],
    desiredLocationRegion: m.desiredLocationRegion ?? null,
    acceptedSearchIntents: [...(m.acceptedSearchIntents ?? [])],
    acceptedStartHorizons: [...(m.acceptedStartHorizons ?? [])],
    requiredCapabilityAreasAny: [...(m.requiredCapabilityAreasAny ?? [])],
    requiredExpertiseAny: [...(m.requiredExpertiseAny ?? [])],
  };
}

export function capabilityEntriesFromRows(rows: readonly CapabilityRowLike[]): CapabilityEntryInput[] {
  return rows.map((r) => ({ areaId: r.area_id, applicationLevel: r.application_level, ownershipWish: r.ownership_wish }));
}

/** Sichtbarkeit (Frage B) aus `capability_disclosure` und Kontaktstand – nur für Reasons. */
export function capabilityVisibility(disclosure: CapabilityDisclosure | null, hasContact: boolean): CapabilityVisibility {
  if (disclosure === "areas") return "areas";
  if (disclosure === "areas_depth_on_contact") return hasContact ? "areas_and_depth" : "areas";
  return "none";
}

export function findPersonFromDiscovery(input: {
  profile: FounderDiscoveryProfile;
  mustHaves: Partial<DiscoveryMustHaves> | null;
  isFounder: boolean;
  capabilityRows: readonly CapabilityRowLike[];
  capabilityDisclosure: CapabilityDisclosure | null;
  hasContact?: boolean;
  /** Ausdrückliche Matching-Freigabe. Im Produkt nicht vorhanden -> false. */
  capabilityMatchingAllowed?: boolean;
}): FindPersonInput {
  const p = input.profile;
  return {
    personId: p.userId,
    inputVersion: p.updatedAt,
    publishedAt: p.publishedAt,
    findProfileStatus: p.status,
    isFounder: input.isFounder,
    ownRoles: [...p.ownRoles],
    seekingRoles: [...p.seekingRoles],
    availabilityHoursPerWeek: p.availabilityHoursPerWeek,
    availabilityFlexibility: p.availabilityFlexibility,
    commitmentLevel: p.commitmentLevel,
    ventureStage: p.ventureStage,
    ventureGoal: p.ventureGoal,
    searchIntent: p.searchIntent ?? null,
    startHorizon: p.startHorizon ?? null,
    industries: [...p.industries],
    expertise: [...p.expertise],
    locationRegion: p.locationRegion,
    remoteMode: p.remoteMode,
    mustHaves: mustHavesFromDiscovery(input.mustHaves),
    capabilities: {
      matchingAllowed: input.capabilityMatchingAllowed === true,
      entries: capabilityEntriesFromRows(input.capabilityRows),
      visibleToCounterpart: capabilityVisibility(input.capabilityDisclosure, input.hasContact === true),
    },
  };
}

export function connectListingFromRow(l: ConnectListing): ConnectListingInput {
  return {
    listingId: l.id,
    ownerId: l.owner_user_id,
    inputVersion: l.updated_at,
    direction: l.direction,
    category: l.category,
    title: l.title,
    summary: l.summary,
    topics: [...(l.topics ?? [])],
    industries: [...(l.industries ?? [])],
    locations: [...(l.locations ?? [])],
    geographicScope: l.geographic_scope,
    remoteMode: l.remote_mode,
    status: l.status,
    visibility: l.visibility,
    publishedAt: l.published_at,
    expiresAt: l.expires_at,
  };
}

export function connectOfferFromRows(listing: ConnectListing, owner: ConnectProfile): ConnectOfferInput {
  return {
    listing: connectListingFromRow(listing),
    owner: { personId: owner.user_id, profileStatus: owner.status, suggestable: owner.suggestable, expertise: [...(owner.expertise ?? [])] },
  };
}
