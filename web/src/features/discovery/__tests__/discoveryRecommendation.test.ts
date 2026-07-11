import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscoveryCandidateRecommendations,
} from "@/features/discovery/discoveryRecommendation";
import type {
  DiscoveryMustHaves,
  DiscoveryPriorityWeights,
  FounderDiscoveryProfile,
  FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";

const DEFAULT_MUST_HAVES: DiscoveryMustHaves = {
  minimumAvailabilityHoursPerWeek: null,
  acceptedRemoteModes: [],
  requiredRolesAny: [],
  requiredIndustriesAny: [],
  acceptedCommitmentLevels: [],
  acceptedVentureStages: [],
  acceptedVentureGoals: [],
};

function createProfile(
  overrides: Partial<FounderDiscoveryProfile> = {}
): FounderDiscoveryProfile {
  return {
    id: overrides.id ?? "profile-default",
    userId: overrides.userId ?? "user-default",
    status: overrides.status ?? "active",
    displayName: overrides.displayName ?? "Founder Test",
    headline: overrides.headline ?? "Baue ein klares B2B-Produkt",
    bio: overrides.bio ?? "Kurzer Profiltext.",
    ownRoles: overrides.ownRoles ?? ["product"],
    seekingRoles: overrides.seekingRoles ?? ["tech"],
    industries: overrides.industries ?? ["SaaS"],
    locationLabel: overrides.locationLabel ?? "Berlin",
    remoteMode: overrides.remoteMode ?? "remote",
    availabilityHoursPerWeek: overrides.availabilityHoursPerWeek ?? 25,
    commitmentLevel: overrides.commitmentLevel ?? "part_time",
    ventureStage: overrides.ventureStage ?? "idea_validating",
    ventureGoal: overrides.ventureGoal ?? "venture_scale",
    publishedAt: overrides.publishedAt ?? "2026-06-18T10:00:00.000Z",
    createdAt: overrides.createdAt ?? "2026-06-18T09:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-18T10:00:00.000Z",
  };
}

function createPreferences(
  overrides: {
    priorityWeights?: DiscoveryPriorityWeights;
    mustHaves?: Partial<DiscoveryMustHaves>;
  } = {}
): FounderSearchPreferences {
  return {
    id: "preferences-default",
    userId: "owner-user",
    priorityWeights: overrides.priorityWeights ?? {},
    mustHaves: {
      ...DEFAULT_MUST_HAVES,
      ...(overrides.mustHaves ?? {}),
    },
    includeAssessmentSignals: false,
    assessmentSignalsConsentedAt: null,
    createdAt: "2026-06-18T09:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
  };
}

function recommend(
  candidateProfiles: FounderDiscoveryProfile[],
  preferences: FounderSearchPreferences | null = null,
  locale?: string | null
) {
  return buildDiscoveryCandidateRecommendations({
    ownProfile: createProfile({
      id: "own-profile",
      userId: "owner-user",
      displayName: "Owner Founder",
      ownRoles: ["product"],
      seekingRoles: ["tech"],
      industries: ["SaaS", "Climate"],
      remoteMode: "remote",
      availabilityHoursPerWeek: 25,
      commitmentLevel: "part_time",
      ventureStage: "idea_validating",
      ventureGoal: "venture_scale",
    }),
    candidateProfiles,
    preferences,
    locale,
  });
}

test("excludes the owner's own profile from recommendations", () => {
  const candidates = recommend([
    createProfile({ id: "own-profile-copy", userId: "owner-user", displayName: "Own Profile" }),
    createProfile({ id: "other-profile", userId: "other-user", displayName: "Other Profile" }),
  ]);

  assert.deepEqual(
    candidates.map((candidate) => candidate.profile.id),
    ["other-profile"]
  );
});

test("excludes draft and paused profiles from recommendations", () => {
  const candidates = recommend([
    createProfile({ id: "draft-profile", userId: "draft-user", status: "draft" }),
    createProfile({ id: "paused-profile", userId: "paused-user", status: "paused" }),
    createProfile({ id: "active-profile", userId: "active-user", status: "active" }),
  ]);

  assert.deepEqual(
    candidates.map((candidate) => candidate.profile.id),
    ["active-profile"]
  );
});

test("filters candidates below the minimum availability must-have", () => {
  const candidates = recommend(
    [
      createProfile({
        id: "low-availability",
        userId: "low-user",
        availabilityHoursPerWeek: 10,
      }),
      createProfile({
        id: "enough-availability",
        userId: "enough-user",
        availabilityHoursPerWeek: 20,
      }),
    ],
    createPreferences({
      mustHaves: { minimumAvailabilityHoursPerWeek: 20 },
    })
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate.profile.id),
    ["enough-availability"]
  );
});

test("filters candidates by required role must-have", () => {
  const candidates = recommend(
    [
      createProfile({ id: "design-founder", userId: "design-user", ownRoles: ["design"] }),
      createProfile({ id: "tech-founder", userId: "tech-user", ownRoles: ["tech"] }),
    ],
    createPreferences({
      mustHaves: { requiredRolesAny: ["tech"] },
    })
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate.profile.id),
    ["tech-founder"]
  );
});

test("filters candidates by accepted remote modes must-have", () => {
  const candidates = recommend(
    [
      createProfile({ id: "onsite-founder", userId: "onsite-user", remoteMode: "onsite" }),
      createProfile({ id: "remote-founder", userId: "remote-user", remoteMode: "remote" }),
    ],
    createPreferences({
      mustHaves: { acceptedRemoteModes: ["remote"] },
    })
  );

  assert.deepEqual(
    candidates.map((candidate) => candidate.profile.id),
    ["remote-founder"]
  );
});

test("prioritizes role complementarity when skill complementarity is important", () => {
  const candidates = recommend(
    [
      createProfile({
        id: "role-fit",
        userId: "role-fit-user",
        ownRoles: ["tech"],
        commitmentLevel: "full_time",
        ventureGoal: "profitable_business",
      }),
      createProfile({
        id: "role-gap",
        userId: "role-gap-user",
        ownRoles: ["marketing"],
        commitmentLevel: "part_time",
        ventureGoal: "venture_scale",
      }),
    ],
    createPreferences({
      priorityWeights: { skill_complementarity: 5 },
    })
  );

  assert.equal(candidates[0]?.profile.id, "role-fit");
  assert.ok(candidates[0]?.reasons.includes("Ihr ergänzt euch bei den Rollen."));
});

test("prioritizes similar commitment when commitment is important", () => {
  const candidates = recommend(
    [
      createProfile({
        id: "same-commitment",
        userId: "same-commitment-user",
        ownRoles: ["marketing"],
        commitmentLevel: "part_time",
        ventureGoal: "profitable_business",
      }),
      createProfile({
        id: "different-commitment",
        userId: "different-commitment-user",
        ownRoles: ["tech"],
        commitmentLevel: "full_time",
        ventureGoal: "profitable_business",
      }),
    ],
    createPreferences({
      priorityWeights: { commitment: 5 },
    })
  );

  assert.equal(candidates[0]?.profile.id, "same-commitment");
  assert.ok(candidates[0]?.reasons.includes("Euer Commitment wirkt ähnlich."));
});

test("prioritizes similar venture goal when venture goal is important", () => {
  const candidates = recommend(
    [
      createProfile({
        id: "same-goal",
        userId: "same-goal-user",
        ownRoles: ["marketing"],
        commitmentLevel: "full_time",
        ventureGoal: "venture_scale",
      }),
      createProfile({
        id: "different-goal",
        userId: "different-goal-user",
        ownRoles: ["tech"],
        commitmentLevel: "full_time",
        ventureGoal: "profitable_business",
      }),
    ],
    createPreferences({
      priorityWeights: { venture_goal: 5 },
    })
  );

  assert.equal(candidates[0]?.profile.id, "same-goal");
  assert.ok(candidates[0]?.reasons.includes("Euer Aufbauziel klingt in eine ähnliche Richtung."));
});

test("uses indirect priorities only for conversation topics, not artificial match claims", () => {
  const [candidate] = recommend(
    [
      createProfile({
        id: "indirect-priorities",
        userId: "indirect-user",
        ownRoles: ["marketing"],
        commitmentLevel: "part_time",
        ventureGoal: "venture_scale",
      }),
    ],
    createPreferences({
      priorityWeights: {
        communication: 5,
        work_style: 5,
        shared_vision: 5,
        exit_logic: 5,
        execution_strength: 5,
      },
    })
  );

  assert.ok(candidate);
  assert.ok(
    candidate.conversationTopics.includes(
      "Sprecht früh über Entscheidungsrhythmus, Tempo und Kommunikation."
    )
  );
  assert.equal(
    candidate.reasons.some((reason) =>
      /kommunikation|arbeitsstil|gemeinsames bild|exit|umsetzungskraft/i.test(reason)
    ),
    false
  );
});

test("keeps explainability bounded and free of scores or private preference text", () => {
  const [candidate] = recommend(
    [
      createProfile({
        id: "many-reasons",
        userId: "many-reasons-user",
        ownRoles: ["tech"],
        seekingRoles: ["product"],
        industries: ["SaaS", "Climate"],
        remoteMode: "remote",
        availabilityHoursPerWeek: 25,
        commitmentLevel: "part_time",
        ventureStage: "idea_validating",
        ventureGoal: "venture_scale",
      }),
    ],
    createPreferences({
      priorityWeights: {
        skill_complementarity: 5,
        commitment: 5,
        venture_goal: 5,
        availability: 5,
        industry: 5,
      },
      mustHaves: {
        minimumAvailabilityHoursPerWeek: 20,
        acceptedRemoteModes: ["remote"],
        requiredRolesAny: ["tech"],
      },
    })
  );

  assert.ok(candidate);
  assert.ok(candidate.reasons.length <= 3);
  assert.ok(candidate.conversationTopics.length <= 2);

  const visibleText = [...candidate.reasons, ...candidate.conversationTopics].join(" ");
  assert.equal(/\d+\s*%/.test(visibleText), false);
  assert.equal(/score|rohscore|priority|priorität|suchpräferenz/i.test(visibleText), false);
});

test("localizes recommendation reasons and topics when English locale is requested", () => {
  const [candidate] = recommend(
    [
      createProfile({
        id: "english-fit",
        userId: "english-fit-user",
        ownRoles: ["tech"],
        commitmentLevel: "part_time",
        ventureGoal: "venture_scale",
      }),
    ],
    createPreferences({
      priorityWeights: { skill_complementarity: 5, communication: 5 },
    }),
    "en"
  );

  assert.ok(candidate);
  assert.ok(candidate.reasons.includes("Your roles could complement each other."));
  assert.ok(candidate.conversationTopics.includes("Discuss decision rhythm, pace, and communication early."));
  assert.equal(
    [...candidate.reasons, ...candidate.conversationTopics].some((text) =>
      /Ihr|Sprecht|Kläre|Euer/.test(text)
    ),
    false
  );
});

test("falls back to German recommendation text for invalid locale without changing scores", () => {
  const candidatesDe = recommend(
    [createProfile({ id: "fallback-fit", userId: "fallback-fit-user", ownRoles: ["tech"] })],
    null,
    "de"
  );
  const candidatesInvalid = recommend(
    [createProfile({ id: "fallback-fit", userId: "fallback-fit-user", ownRoles: ["tech"] })],
    null,
    "fr"
  );

  assert.equal(candidatesInvalid[0]?.score, candidatesDe[0]?.score);
  assert.deepEqual(candidatesInvalid[0]?.reasons, candidatesDe[0]?.reasons);
  assert.deepEqual(candidatesInvalid[0]?.conversationTopics, candidatesDe[0]?.conversationTopics);
});
