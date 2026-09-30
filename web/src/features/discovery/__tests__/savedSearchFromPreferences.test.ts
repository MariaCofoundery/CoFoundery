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

test("die Faehigkeitsbereiche kommen aus der Suche, nicht aus einem Formular", () => {
  // Bis zum 30.09.2026 wurden sie aus einem eigenen Feld gelesen. Seit sie in
  // "Deine Suche" stehen, waere das ein zweiter Ort fuer dieselbe Angabe.
  const row = buildDiscoverySearchCriteria(
    preferences({ requiredCapabilityAreasAny: ["b2b_sales", "fundraising"] })
  );
  assert.deepEqual(row.capability_area_ids, ["b2b_sales", "fundraising"]);
});

test("die Matching-Praeferenzen kommen mit - aber nur die gewichteten", () => {
  // Abschnitt 23: Die gespeicherte Suche enthaelt sie. "Egal" ist keine
  // Praeferenz, und sechs Zeilen "egal" waeren eine Aufzeichnung ohne Inhalt.
  const row = buildDiscoverySearchCriteria(preferences(), [
    { themeId: "decision_weighing", direction: "similar", importance: 3 },
    { themeId: "experimentation", direction: "neutral", importance: 0 },
  ]);
  assert.deepEqual(row.discovery_preferences, [
    { themeId: "decision_weighing", direction: "similar", importance: 3 },
  ]);
});

test("die alten Alignment-Dimensionen sind raus", () => {
  // Sie zaehlten als Kriterium und haben nie gefiltert: Eine Suche, in der NUR
  // sie standen, war ein Abonnement auf jedes neue Profil - genau das, was
  // Abschnitt 24 ausschliesst.
  const row = buildDiscoverySearchCriteria(preferences());
  assert.ok(!("alignment_dimensions" in row));
});

test("Ohne Praeferenzen entsteht eine leere Suche - die Datenbank weist sie ab", () => {
  const row = buildDiscoverySearchCriteria(null);
  assert.deepEqual(row, {
    topics: [],
    industries: [],
    locations: [],
    capability_area_ids: [],
    discovery_preferences: [],
    remote_mode: null,
  });
});
