/**
 * Testhilfe: synthetische Profile (docs/research/synthetic, ohne Holdout-Personen) -> Engine-Eingaben.
 * Die Fixtures enthalten Modellausgaben des eingefrorenen Python-Codes, keine Labels.
 * Annahme der Spec (§5): Alle synthetischen Personen haben der Capability-Nutzung zugestimmt.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import type { IdfSnapshot } from "@/lib/matching/v01/idf";
import type {
  CapabilityVisibility,
  ConnectListingInput,
  ConnectOfferInput,
  FamilyOfArea,
  FindPersonInput,
  OwnershipWish,
} from "@/lib/matching/v01/types";

const FIXTURES = path.join(import.meta.dirname, "..", "fixtures");

export function readFixture<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8")) as T;
}

type RawListing = {
  id: string; direction: "seeking" | "offering"; category: string; title: string; summary: string;
  topics: string[] | null; industries: string[] | null; locations: string[] | null; geographic_scope: string | null;
  remote_mode: string | null; status: string; visibility: string; published_at: string | null; expires_at: string | null;
};
export type RawProfile = {
  id: string;
  person_core: { location_region: string | null; remote_mode: string | null; expertise: string[] | null; industries: string[] | null;
    capability_disclosure: string | null };
  profiles: { roles: string[] };
  capability_entries: { area_id: string; application_level: number | null; ownership_wish: OwnershipWish | null }[] | null;
  find_profile: null | {
    status: string; own_roles: string[] | null; seeking_roles: string[] | null; availability_hours_per_week: number | null;
    availability_flexibility: string | null; commitment_level: string | null; venture_stage: string | null; venture_goal: string | null;
    search_intent: string | null; start_horizon: string | null; must_haves: Record<string, unknown> | null;
  };
  connect_profile: null | { status: string; suggestable: boolean; visibility: string };
  connect_listings: RawListing[];
};

export const synthetic = readFixture<{ meta: { now: string }; family_of: FamilyOfArea; profiles: RawProfile[] }>("synthetic-profiles-v01.json");
export const NOW = synthetic.meta.now;
export const profilesById = new Map(synthetic.profiles.map((p) => [p.id, p]));

const list = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

export function findPerson(raw: RawProfile, opts: { consent?: boolean } = {}): FindPersonInput {
  const fp = raw.find_profile;
  if (!fp) throw new Error(`kein FIND-Profil: ${raw.id}`);
  const m = fp.must_haves ?? {};
  const disclosure = raw.person_core.capability_disclosure;
  const visible: CapabilityVisibility = disclosure === "areas" || disclosure === "areas_depth_on_contact" ? "areas" : "none";
  return {
    personId: raw.id,
    inputVersion: null,
    publishedAt: null,
    findProfileStatus: fp.status,
    isFounder: raw.profiles.roles.includes("founder"),
    ownRoles: list(fp.own_roles),
    seekingRoles: list(fp.seeking_roles),
    availabilityHoursPerWeek: fp.availability_hours_per_week,
    availabilityFlexibility: fp.availability_flexibility,
    commitmentLevel: fp.commitment_level,
    ventureStage: fp.venture_stage,
    ventureGoal: fp.venture_goal,
    searchIntent: fp.search_intent,
    startHorizon: fp.start_horizon,
    industries: list(raw.person_core.industries),
    expertise: list(raw.person_core.expertise),
    locationRegion: raw.person_core.location_region,
    remoteMode: raw.person_core.remote_mode,
    mustHaves: {
      requiredRolesAny: list(m.requiredRolesAny),
      minimumAvailabilityHoursPerWeek: (m.minimumAvailabilityHoursPerWeek as number | undefined) ?? null,
      acceptedRemoteModes: list(m.acceptedRemoteModes),
      desiredLocationRegion: (m.desiredLocationRegion as string | undefined) ?? null,
      acceptedSearchIntents: list(m.acceptedSearchIntents),
      acceptedStartHorizons: list(m.acceptedStartHorizons),
      requiredCapabilityAreasAny: list(m.requiredCapabilityAreasAny),
      requiredExpertiseAny: list(m.requiredExpertiseAny),
    },
    capabilities: {
      matchingAllowed: opts.consent ?? true,
      entries: (raw.capability_entries ?? []).map((c) => ({ areaId: c.area_id, applicationLevel: c.application_level, ownershipWish: c.ownership_wish })),
      visibleToCounterpart: visible,
    },
  };
}

export function listing(raw: RawListing, ownerId: string): ConnectListingInput {
  return {
    listingId: raw.id,
    ownerId,
    inputVersion: null,
    direction: raw.direction,
    category: raw.category,
    title: raw.title,
    summary: raw.summary,
    topics: raw.topics ?? [],
    industries: raw.industries ?? [],
    locations: raw.locations ?? [],
    geographicScope: raw.geographic_scope,
    remoteMode: raw.remote_mode,
    status: raw.status,
    visibility: raw.visibility,
    publishedAt: raw.published_at,
    expiresAt: raw.expires_at,
  };
}

export const regression = readFixture<{
  pool_ids: string[];
  stress_owners: RawProfile[];
  find: Record<string, { pair: { a: string; b: string }; gate_state: string; rank_b_for_a: Rank | null; rank_a_for_b: Rank | null }>;
  connect: Record<string, { pair: { a_listing: string; b_listing: string }; gate_state: string; rank: Rank | null }>;
  stress: { case: string; kind: string; seek: string; criteria: (string | number)[][]; python_passed: boolean; expect: string[] }[];
}>("regression-v01.json");
export type Rank = { optimistic: number; pessimistic: number };

export const listingsById = new Map<string, { raw: RawListing; owner: RawProfile }>();
for (const p of [...synthetic.profiles, ...regression.stress_owners]) for (const l of p.connect_listings) listingsById.set(l.id, { raw: l, owner: p });

export function seekInput(id: string): ConnectListingInput {
  const hit = listingsById.get(id);
  if (!hit) throw new Error(`Eintrag fehlt: ${id}`);
  return listing(hit.raw, hit.owner.id);
}

export function offerInput(id: string): ConnectOfferInput {
  const hit = listingsById.get(id);
  if (!hit) throw new Error(`Eintrag fehlt: ${id}`);
  return {
    listing: listing(hit.raw, hit.owner.id),
    owner: {
      personId: hit.owner.id,
      profileStatus: hit.owner.connect_profile?.status ?? null,
      suggestable: hit.owner.connect_profile?.suggestable ?? false,
      expertise: hit.owner.person_core.expertise ?? [],
    },
  };
}

export function syntheticIdfSnapshot(name = "idf-synthetic-v03-all-listings.json"): IdfSnapshot {
  const s = readFixture<{ idf_corpus_version: string; normalization_version: string; n: number; df: Record<string, number>; sha256: string }>(
    name,
  );
  return { idfCorpusVersion: s.idf_corpus_version, normalizationVersion: s.normalization_version, n: s.n, df: s.df, sha256: s.sha256 };
}
