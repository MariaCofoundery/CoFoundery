import assert from "node:assert/strict";
import test from "node:test";
import { buildDiscoverySearchCriteria } from "@/features/discovery/savedSearchFromPreferences";
import type { FounderSearchPreferences } from "@/features/discovery/discoveryTypes";

type Input = Parameters<typeof buildDiscoverySearchCriteria>[0];

function preferences(overrides: Partial<FounderSearchPreferences["mustHaves"]> = {}, rest: Partial<{
  discoveryV2AlignmentEnabled: boolean;
  discoveryV2AlignmentDimensions: string[];
}> = {}): Input {
  return {
    mustHaves: {
      minimumAvailabilityHoursPerWeek: null,
      acceptedRemoteModes: [],
      requiredRolesAny: [],
      requiredExpertiseAny: [],
      desiredLocationRegion: null,
      requiredIndustriesAny: [],
      acceptedCommitmentLevels: [],
      acceptedVentureStages: [],
      acceptedVentureGoals: [],
      ...overrides,
    },
    discoveryV2AlignmentEnabled: rest.discoveryV2AlignmentEnabled ?? false,
    discoveryV2AlignmentDimensions: (rest.discoveryV2AlignmentDimensions ??
      []) as FounderSearchPreferences["discoveryV2AlignmentDimensions"],
  } as Input;
}

test("Rollen und Expertise landen gemeinsam in einem Feld", () => {
  const row = buildDiscoverySearchCriteria(
    preferences({ requiredRolesAny: ["tech"], requiredExpertiseAny: ["React", "B2B Sales"] })
  );
  assert.deepEqual(row.topics, ["tech", "React", "B2B Sales"]);
});

test("Eine einzelne verlangte Arbeitsweise wird zum Kriterium", () => {
  const row = buildDiscoverySearchCriteria(preferences({ acceptedRemoteModes: ["remote"] }));
  assert.equal(row.remote_mode, "remote");
});

test("Zwei zugelassene Arbeitsweisen grenzen nichts ein", () => {
  const row = buildDiscoverySearchCriteria(
    preferences({ acceptedRemoteModes: ["remote", "hybrid"] })
  );
  assert.equal(row.remote_mode, null);
});

test("Der Ort wird zu genau einem Eintrag", () => {
  assert.deepEqual(
    buildDiscoverySearchCriteria(preferences({ desiredLocationRegion: "Berlin" })).locations,
    ["Berlin"]
  );
  assert.deepEqual(buildDiscoverySearchCriteria(preferences()).locations, []);
});

test("Alignment-Dimensionen zaehlen nur, wenn Alignment eingeschaltet ist", () => {
  const off = buildDiscoverySearchCriteria(
    preferences({}, { discoveryV2AlignmentEnabled: false, discoveryV2AlignmentDimensions: ["decision_logic"] })
  );
  assert.deepEqual(off.alignment_dimensions, []);

  const on = buildDiscoverySearchCriteria(
    preferences({}, { discoveryV2AlignmentEnabled: true, discoveryV2AlignmentDimensions: ["decision_logic"] })
  );
  assert.deepEqual(on.alignment_dimensions, ["decision_logic"]);
});

test("Ohne Praeferenzen entsteht eine leere Suche - die Datenbank weist sie ab", () => {
  const row = buildDiscoverySearchCriteria(null);
  assert.deepEqual(row, {
    topics: [],
    industries: [],
    locations: [],
    remote_mode: null,
    alignment_dimensions: [],
  });
});
