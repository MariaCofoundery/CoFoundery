import type {
  DiscoveryCandidate,
  DiscoveryCommitmentLevel,
  DiscoveryFounderRole,
  DiscoveryMustHaves,
  DiscoveryPriorityKey,
  DiscoveryPriorityWeights,
  DiscoveryProfilePreview,
  DiscoveryRemoteMode,
  DiscoveryVentureGoal,
  DiscoveryVentureStage,
  FounderDiscoveryProfile,
  FounderSearchPreferences,
} from "@/features/discovery/discoveryTypes";

type RecommendationReason = {
  text: string;
  weight: number;
};

type RecommendationTopic = {
  text: string;
  weight: number;
};

type RecommendationInput = {
  ownProfile: FounderDiscoveryProfile;
  candidateProfile: FounderDiscoveryProfile;
  preferences: FounderSearchPreferences | null;
};

type RecommendationListInput = {
  ownProfile: FounderDiscoveryProfile;
  candidateProfiles: FounderDiscoveryProfile[];
  preferences: FounderSearchPreferences | null;
};

type MustHaveMatchInput = {
  candidateProfile: FounderDiscoveryProfile;
  mustHaves: DiscoveryMustHaves;
};

const INDIRECT_PRIORITY_KEYS: DiscoveryPriorityKey[] = [
  "communication",
  "work_style",
  "shared_vision",
  "exit_logic",
  "execution_strength",
];

function toDiscoveryProfilePreview(profile: FounderDiscoveryProfile): DiscoveryProfilePreview {
  return {
    id: profile.id,
    displayName: profile.displayName,
    headline: profile.headline,
    bio: profile.bio,
    ownRoles: profile.ownRoles,
    seekingRoles: profile.seekingRoles,
    industries: profile.industries,
    locationLabel: profile.locationLabel,
    remoteMode: profile.remoteMode,
    availabilityHoursPerWeek: profile.availabilityHoursPerWeek,
    commitmentLevel: profile.commitmentLevel,
    ventureStage: profile.ventureStage,
    ventureGoal: profile.ventureGoal,
    publishedAt: profile.publishedAt,
  };
}

function uniqueIntersection<T extends string>(left: readonly T[], right: readonly T[]) {
  const rightSet = new Set(right);
  return Array.from(new Set(left.filter((value) => rightSet.has(value))));
}

function normalizeComparableText(value: string) {
  return value.trim().toLowerCase();
}

function intersectTextValues(left: readonly string[], right: readonly string[]) {
  const rightValuesByNormalized = new Map(
    right.map((value) => [normalizeComparableText(value), value] as const)
  );
  const matches = left
    .map((value) => rightValuesByNormalized.get(normalizeComparableText(value)))
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(matches));
}

function remoteModesAreCompatible(
  ownMode: DiscoveryRemoteMode,
  candidateMode: DiscoveryRemoteMode
) {
  return (
    ownMode === candidateMode ||
    ownMode === "flexible" ||
    candidateMode === "flexible" ||
    (ownMode === "hybrid" && candidateMode === "onsite") ||
    (ownMode === "onsite" && candidateMode === "hybrid")
  );
}

function availabilityIsRoughlyAligned(
  ownAvailability: number | null,
  candidateAvailability: number | null
) {
  if (ownAvailability == null || candidateAvailability == null) {
    return false;
  }
  return Math.abs(ownAvailability - candidateAvailability) <= 10;
}

function availabilityMeetsOrExceeds(
  ownAvailability: number | null,
  candidateAvailability: number | null
) {
  if (candidateAvailability == null) {
    return false;
  }
  if (ownAvailability == null) {
    return true;
  }
  return candidateAvailability >= Math.max(1, ownAvailability - 5);
}

function hasValues<T>(values: readonly T[]) {
  return values.length > 0;
}

function getPriorityWeight(weights: DiscoveryPriorityWeights, key: DiscoveryPriorityKey) {
  return Math.max(0, Math.min(5, Math.round(weights[key] ?? 0)));
}

function addReason(reasons: RecommendationReason[], text: string, weight: number) {
  if (reasons.some((reason) => reason.text === text)) {
    return;
  }
  reasons.push({ text, weight });
}

function addTopic(topics: RecommendationTopic[], text: string, weight: number) {
  if (topics.some((topic) => topic.text === text)) {
    return;
  }
  topics.push({ text, weight });
}

function hasAnyMustHave(mustHaves: DiscoveryMustHaves) {
  return (
    mustHaves.minimumAvailabilityHoursPerWeek != null ||
    hasValues(mustHaves.acceptedRemoteModes) ||
    hasValues(mustHaves.requiredRolesAny) ||
    hasValues(mustHaves.requiredIndustriesAny) ||
    hasValues(mustHaves.acceptedCommitmentLevels) ||
    hasValues(mustHaves.acceptedVentureStages) ||
    hasValues(mustHaves.acceptedVentureGoals)
  );
}

function valueIsAccepted<T extends string>(value: T, acceptedValues: readonly T[]) {
  return acceptedValues.length === 0 || acceptedValues.includes(value);
}

export function candidateMatchesDiscoveryMustHaves({
  candidateProfile,
  mustHaves,
}: MustHaveMatchInput) {
  if (
    mustHaves.minimumAvailabilityHoursPerWeek != null &&
    (candidateProfile.availabilityHoursPerWeek == null ||
      candidateProfile.availabilityHoursPerWeek < mustHaves.minimumAvailabilityHoursPerWeek)
  ) {
    return false;
  }

  if (!valueIsAccepted(candidateProfile.remoteMode, mustHaves.acceptedRemoteModes)) {
    return false;
  }

  if (
    hasValues(mustHaves.requiredRolesAny) &&
    uniqueIntersection(
      candidateProfile.ownRoles,
      mustHaves.requiredRolesAny as DiscoveryFounderRole[]
    ).length === 0
  ) {
    return false;
  }

  if (
    hasValues(mustHaves.requiredIndustriesAny) &&
    intersectTextValues(candidateProfile.industries, mustHaves.requiredIndustriesAny).length === 0
  ) {
    return false;
  }

  if (
    !valueIsAccepted(
      candidateProfile.commitmentLevel,
      mustHaves.acceptedCommitmentLevels as DiscoveryCommitmentLevel[]
    )
  ) {
    return false;
  }

  if (
    !valueIsAccepted(
      candidateProfile.ventureStage,
      mustHaves.acceptedVentureStages as DiscoveryVentureStage[]
    )
  ) {
    return false;
  }

  return valueIsAccepted(
    candidateProfile.ventureGoal,
    mustHaves.acceptedVentureGoals as DiscoveryVentureGoal[]
  );
}

function buildRecommendationReasons({
  ownProfile,
  candidateProfile,
  preferences,
}: RecommendationInput) {
  const reasons: RecommendationReason[] = [];
  const weights = preferences?.priorityWeights ?? {};
  const mustHaves = preferences?.mustHaves ?? null;
  const sharedIndustries = intersectTextValues(ownProfile.industries, candidateProfile.industries);
  const candidateOffersRolesYouSeek = uniqueIntersection(
    ownProfile.seekingRoles,
    candidateProfile.ownRoles
  );
  const youOfferRolesCandidateSeeks = uniqueIntersection(
    ownProfile.ownRoles,
    candidateProfile.seekingRoles
  );
  const rolesComplementEachOther =
    candidateOffersRolesYouSeek.length > 0 || youOfferRolesCandidateSeeks.length > 0;
  const remoteCompatible = remoteModesAreCompatible(
    ownProfile.remoteMode,
    candidateProfile.remoteMode
  );
  const availabilityCompatible =
    availabilityIsRoughlyAligned(
      ownProfile.availabilityHoursPerWeek,
      candidateProfile.availabilityHoursPerWeek
    ) ||
    availabilityMeetsOrExceeds(
      ownProfile.availabilityHoursPerWeek,
      candidateProfile.availabilityHoursPerWeek
    );

  if (mustHaves && hasAnyMustHave(mustHaves)) {
    addReason(reasons, "Passt zu deinen gesetzten Grundkriterien.", 1.2);
  }

  if (rolesComplementEachOther) {
    addReason(
      reasons,
      "Ihr ergänzt euch bei den Rollen.",
      2 + getPriorityWeight(weights, "skill_complementarity")
    );
  }

  if (sharedIndustries.length > 0) {
    addReason(
      reasons,
      "Ihr habt Überschneidungen bei Themen oder Branchen.",
      1.5 + getPriorityWeight(weights, "industry")
    );
  }

  if (remoteCompatible) {
    addReason(
      reasons,
      "Euer Arbeitsrahmen wirkt kompatibel.",
      1.2 + getPriorityWeight(weights, "location")
    );
  }

  if (ownProfile.commitmentLevel === candidateProfile.commitmentLevel) {
    addReason(
      reasons,
      "Euer Commitment wirkt ähnlich.",
      1.8 + getPriorityWeight(weights, "commitment")
    );
  }

  if (ownProfile.ventureGoal === candidateProfile.ventureGoal) {
    addReason(
      reasons,
      "Euer Aufbauziel klingt in eine ähnliche Richtung.",
      1.8 + getPriorityWeight(weights, "venture_goal")
    );
  }

  if (availabilityCompatible) {
    addReason(
      reasons,
      "Eure verfügbare Zeit wirkt gut vereinbar.",
      1.5 + getPriorityWeight(weights, "availability")
    );
  }

  if (ownProfile.ventureStage === candidateProfile.ventureStage) {
    addReason(reasons, "Ihr seid in einer ähnlichen Venture-Phase.", 1);
  }

  return reasons.sort((left, right) => right.weight - left.weight || left.text.localeCompare(right.text));
}

function buildRecommendationTopics({
  ownProfile,
  candidateProfile,
  preferences,
}: RecommendationInput) {
  const topics: RecommendationTopic[] = [];
  const weights = preferences?.priorityWeights ?? {};
  const hasIndirectPriority = INDIRECT_PRIORITY_KEYS.some(
    (key) => getPriorityWeight(weights, key) > 0
  );

  if (
    ownProfile.availabilityHoursPerWeek !== candidateProfile.availabilityHoursPerWeek ||
    ownProfile.commitmentLevel !== candidateProfile.commitmentLevel
  ) {
    addTopic(
      topics,
      "Kläre früh, wie verbindlich ihr Zeit investieren wollt.",
      2 + Math.max(getPriorityWeight(weights, "availability"), getPriorityWeight(weights, "commitment"))
    );
  }

  if (ownProfile.ventureGoal !== candidateProfile.ventureGoal) {
    addTopic(
      topics,
      "Sprecht darüber, ob ihr eher schnell skalieren oder tragfähig aufbauen wollt.",
      2 + Math.max(getPriorityWeight(weights, "venture_goal"), getPriorityWeight(weights, "exit_logic"))
    );
  }

  if (
    uniqueIntersection(ownProfile.ownRoles, candidateProfile.ownRoles).length > 0 ||
    uniqueIntersection(ownProfile.seekingRoles, candidateProfile.seekingRoles).length > 0
  ) {
    addTopic(
      topics,
      "Besprecht, wie ihr Rollen und Verantwortlichkeiten verteilen würdet.",
      1.7 + getPriorityWeight(weights, "skill_complementarity")
    );
  }

  if (!remoteModesAreCompatible(ownProfile.remoteMode, candidateProfile.remoteMode)) {
    addTopic(
      topics,
      "Kläre, wie viel Nähe, Remote-Arbeit oder gemeinsame Präsenz ihr braucht.",
      1.7 + getPriorityWeight(weights, "location")
    );
  }

  if (hasIndirectPriority) {
    addTopic(
      topics,
      "Sprecht früh über Entscheidungsrhythmus, Tempo und Kommunikation.",
      1.5 +
        Math.max(
          getPriorityWeight(weights, "communication"),
          getPriorityWeight(weights, "work_style"),
          getPriorityWeight(weights, "execution_strength")
        )
    );
  }

  if (topics.length === 0) {
    addTopic(topics, "Besprecht, wie ihr Rollen und Verantwortlichkeiten verteilen würdet.", 1);
    addTopic(topics, "Kläre früh, wie viel Zeit ihr realistisch investieren wollt.", 0.8);
  }

  return topics.sort((left, right) => right.weight - left.weight || left.text.localeCompare(right.text));
}

export function buildDiscoveryCandidateRecommendation({
  ownProfile,
  candidateProfile,
  preferences,
}: RecommendationInput): DiscoveryCandidate {
  const reasons = buildRecommendationReasons({ ownProfile, candidateProfile, preferences });
  const topics = buildRecommendationTopics({ ownProfile, candidateProfile, preferences });
  const score =
    reasons.reduce((sum, reason) => sum + reason.weight, 0) +
    topics.reduce((sum, topic) => sum + topic.weight * 0.2, 0);

  return {
    profile: toDiscoveryProfilePreview(candidateProfile),
    reasons: reasons.slice(0, 3).map((reason) => reason.text),
    conversationTopics: topics.slice(0, 2).map((topic) => topic.text),
    score,
  };
}

export function buildDiscoveryCandidateRecommendations({
  ownProfile,
  candidateProfiles,
  preferences,
}: RecommendationListInput): DiscoveryCandidate[] {
  return candidateProfiles
    .filter((profile) => profile.status === "active")
    .filter((profile) => profile.userId !== ownProfile.userId)
    .filter((profile) =>
      preferences
        ? candidateMatchesDiscoveryMustHaves({
            candidateProfile: profile,
            mustHaves: preferences.mustHaves,
          })
        : true
    )
    .map((profile) =>
      buildDiscoveryCandidateRecommendation({
        ownProfile,
        candidateProfile: profile,
        preferences,
      })
    )
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}
