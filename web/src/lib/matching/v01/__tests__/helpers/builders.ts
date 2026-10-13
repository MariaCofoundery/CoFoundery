/** Testhilfe: kleine, ausdrückliche Engine-Eingaben für Unit-Tests. */
import type {
  CapabilityEntryInput,
  ConnectContext,
  ConnectListingInput,
  ConnectOfferInput,
  FindContext,
  FindMustHavesInput,
  FindPersonInput,
} from "@/lib/matching/v01/types";

export const NO_MUST_HAVES: FindMustHavesInput = {
  requiredRolesAny: [],
  minimumAvailabilityHoursPerWeek: null,
  acceptedRemoteModes: [],
  desiredLocationRegion: null,
  acceptedSearchIntents: [],
  acceptedStartHorizons: [],
  requiredCapabilityAreasAny: [],
  requiredExpertiseAny: [],
};

export const FAMILY_OF: Readonly<Record<string, string>> = {
  b2b_sales: "commercial_growth",
  partnerships: "commercial_growth",
  performance_marketing: "commercial_growth",
  backend_engineering: "technology_delivery",
  frontend_engineering: "technology_delivery",
  bookkeeping: "finance_funding",
  fundraising: "finance_funding",
  feedback_culture: "working_style",
  conflict_handling: "working_style",
};

export type PersonOverrides = Partial<Omit<FindPersonInput, "mustHaves" | "capabilities">> & {
  mustHaves?: Partial<FindMustHavesInput>;
  caps?: CapabilityEntryInput[];
  capabilityMatchingAllowed?: boolean;
  capabilityVisibility?: FindPersonInput["capabilities"]["visibleToCounterpart"];
};

export function person(id: string, o: PersonOverrides = {}): FindPersonInput {
  const { mustHaves, caps, capabilityMatchingAllowed, capabilityVisibility, ...rest } = o;
  return {
    personId: id,
    inputVersion: null,
    publishedAt: null,
    findProfileStatus: "active",
    isFounder: true,
    ownRoles: [],
    seekingRoles: [],
    availabilityHoursPerWeek: 20,
    availabilityFlexibility: null,
    commitmentLevel: "part_time",
    ventureStage: null,
    ventureGoal: null,
    searchIntent: null,
    startHorizon: null,
    industries: [],
    expertise: [],
    locationRegion: "Berlin",
    remoteMode: "hybrid",
    ...rest,
    mustHaves: { ...NO_MUST_HAVES, ...mustHaves },
    capabilities: {
      matchingAllowed: capabilityMatchingAllowed ?? true,
      entries: caps ?? [],
      visibleToCounterpart: capabilityVisibility ?? "areas_and_depth",
    },
  };
}

export const cap = (areaId: string, applicationLevel: number | null, ownershipWish: CapabilityEntryInput["ownershipWish"]): CapabilityEntryInput => ({
  areaId,
  applicationLevel,
  ownershipWish,
});

export const FIND_CTX: FindContext = { familyOfArea: FAMILY_OF, idfCorpusVersion: "test-idf-v1", blocked: false, computedAt: null };

export function seek(id: string, o: Partial<ConnectListingInput> = {}): ConnectListingInput {
  return {
    listingId: id,
    ownerId: `owner-${id}`,
    inputVersion: null,
    direction: "seeking",
    category: "expertise",
    title: "",
    summary: "",
    topics: [],
    industries: [],
    locations: [],
    geographicScope: null,
    remoteMode: null,
    status: "active",
    visibility: "members_only",
    publishedAt: null,
    expiresAt: null,
    ...o,
  };
}

export function offer(id: string, o: Partial<ConnectListingInput> = {}, owner: Partial<ConnectOfferInput["owner"]> = {}): ConnectOfferInput {
  return {
    listing: { ...seek(id, o), direction: "offering", ...o },
    owner: { personId: `owner-${id}`, profileStatus: "active", suggestable: true, expertise: [], ...owner },
  };
}

export const CONNECT_CTX: ConnectContext = {
  now: "2026-10-13",
  viewerIsNetworkMember: true,
  purpose: "listing_match",
  blockedOwnerIds: new Set(),
  computedAt: null,
};
