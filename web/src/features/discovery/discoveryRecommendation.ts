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
import { type AppLocale, normalizeLocale } from "@/i18n/config";

type RecommendationReason = {
  key: RecommendationReasonKey;
  text: string;
  weight: number;
};

type RecommendationTopic = {
  key: RecommendationTopicKey;
  text: string;
  weight: number;
};

type RecommendationInput = {
  ownProfile: FounderDiscoveryProfile;
  candidateProfile: FounderDiscoveryProfile;
  preferences: FounderSearchPreferences | null;
  locale?: string | null;
};

type RecommendationListInput = {
  ownProfile: FounderDiscoveryProfile;
  candidateProfiles: FounderDiscoveryProfile[];
  preferences: FounderSearchPreferences | null;
  locale?: string | null;
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

type RecommendationReasonKey =
  | "must_haves"
  | "role_complementarity"
  | "shared_industries"
  | "remote_compatible"
  | "commitment_aligned"
  | "venture_goal_aligned"
  | "availability_compatible"
  | "venture_stage_aligned";

type RecommendationTopicKey =
  | "commitment"
  | "venture_goal"
  | "roles"
  | "location"
  | "work_style"
  | "fallback_time";

const RECOMMENDATION_REASON_TEXTS: Record<AppLocale, Record<RecommendationReasonKey, string>> = {
  de: {
    must_haves: "Passt zu deinen gesetzten Grundkriterien.",
    role_complementarity: "Ihr ergänzt euch bei den Rollen.",
    shared_industries: "Ihr habt Überschneidungen bei Themen oder Branchen.",
    remote_compatible: "Euer Arbeitsrahmen wirkt kompatibel.",
    commitment_aligned: "Euer Commitment wirkt ähnlich.",
    venture_goal_aligned: "Euer Aufbauziel klingt in eine ähnliche Richtung.",
    availability_compatible: "Eure verfügbare Zeit wirkt gut vereinbar.",
    venture_stage_aligned: "Ihr seid in einer ähnlichen Venture-Phase.",
  },
  en: {
    must_haves: "Matches the basic criteria you set.",
    role_complementarity: "Your roles could complement each other.",
    shared_industries: "You have overlap in topics or industries.",
    remote_compatible: "Your working setup looks compatible.",
    commitment_aligned: "Your commitment levels look similar.",
    venture_goal_aligned: "Your venture goals point in a similar direction.",
    availability_compatible: "Your available time looks reasonably compatible.",
    venture_stage_aligned: "You are in a similar venture stage.",
  },
};

const RECOMMENDATION_TOPIC_TEXTS: Record<AppLocale, Record<RecommendationTopicKey, string>> = {
  de: {
    commitment: "Kläre früh, wie verbindlich ihr Zeit investieren wollt.",
    venture_goal: "Sprecht darüber, ob ihr eher schnell skalieren oder tragfähig aufbauen wollt.",
    roles: "Besprecht, wie ihr Rollen und Verantwortlichkeiten verteilen würdet.",
    location: "Kläre, wie viel Nähe, Remote-Arbeit oder gemeinsame Präsenz ihr braucht.",
    work_style: "Sprecht früh über Entscheidungsrhythmus, Tempo und Kommunikation.",
    fallback_time: "Kläre früh, wie viel Zeit ihr realistisch investieren wollt.",
  },
  en: {
    commitment: "Discuss early how much time you both want to commit.",
    venture_goal: "Talk about whether you want to scale quickly or build sustainably.",
    roles: "Discuss how you would divide roles and responsibilities.",
    location: "Clarify how much proximity, remote work, or shared presence you need.",
    work_style: "Discuss decision rhythm, pace, and communication early.",
    fallback_time: "Clarify early how much time you can realistically invest.",
  },
};

function getRecommendationLocale(locale: string | null | undefined): AppLocale {
  return normalizeLocale(locale);
}

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

function reasonText(key: RecommendationReasonKey, locale: AppLocale) {
  return RECOMMENDATION_REASON_TEXTS[locale]?.[key] ?? RECOMMENDATION_REASON_TEXTS.de[key];
}

function topicText(key: RecommendationTopicKey, locale: AppLocale) {
  return RECOMMENDATION_TOPIC_TEXTS[locale]?.[key] ?? RECOMMENDATION_TOPIC_TEXTS.de[key];
}

function addReason(
  reasons: RecommendationReason[],
  key: RecommendationReasonKey,
  weight: number,
  locale: AppLocale
) {
  if (reasons.some((reason) => reason.key === key)) {
    return;
  }
  reasons.push({ key, text: reasonText(key, locale), weight });
}

function addTopic(
  topics: RecommendationTopic[],
  key: RecommendationTopicKey,
  weight: number,
  locale: AppLocale
) {
  if (topics.some((topic) => topic.key === key)) {
    return;
  }
  topics.push({ key, text: topicText(key, locale), weight });
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
  locale,
}: RecommendationInput) {
  const reasons: RecommendationReason[] = [];
  const textLocale = getRecommendationLocale(locale);
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
    addReason(reasons, "must_haves", 1.2, textLocale);
  }

  if (rolesComplementEachOther) {
    addReason(
      reasons,
      "role_complementarity",
      2 + getPriorityWeight(weights, "skill_complementarity"),
      textLocale
    );
  }

  if (sharedIndustries.length > 0) {
    addReason(
      reasons,
      "shared_industries",
      1.5 + getPriorityWeight(weights, "industry"),
      textLocale
    );
  }

  if (remoteCompatible) {
    addReason(
      reasons,
      "remote_compatible",
      1.2 + getPriorityWeight(weights, "location"),
      textLocale
    );
  }

  if (ownProfile.commitmentLevel === candidateProfile.commitmentLevel) {
    addReason(
      reasons,
      "commitment_aligned",
      1.8 + getPriorityWeight(weights, "commitment"),
      textLocale
    );
  }

  if (ownProfile.ventureGoal === candidateProfile.ventureGoal) {
    addReason(
      reasons,
      "venture_goal_aligned",
      1.8 + getPriorityWeight(weights, "venture_goal"),
      textLocale
    );
  }

  if (availabilityCompatible) {
    addReason(
      reasons,
      "availability_compatible",
      1.5 + getPriorityWeight(weights, "availability"),
      textLocale
    );
  }

  if (ownProfile.ventureStage === candidateProfile.ventureStage) {
    addReason(reasons, "venture_stage_aligned", 1, textLocale);
  }

  return reasons.sort((left, right) => right.weight - left.weight || left.key.localeCompare(right.key));
}

function buildRecommendationTopics({
  ownProfile,
  candidateProfile,
  preferences,
  locale,
}: RecommendationInput) {
  const topics: RecommendationTopic[] = [];
  const textLocale = getRecommendationLocale(locale);
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
      "commitment",
      2 + Math.max(getPriorityWeight(weights, "availability"), getPriorityWeight(weights, "commitment")),
      textLocale
    );
  }

  if (ownProfile.ventureGoal !== candidateProfile.ventureGoal) {
    addTopic(
      topics,
      "venture_goal",
      2 + Math.max(getPriorityWeight(weights, "venture_goal"), getPriorityWeight(weights, "exit_logic")),
      textLocale
    );
  }

  if (
    uniqueIntersection(ownProfile.ownRoles, candidateProfile.ownRoles).length > 0 ||
    uniqueIntersection(ownProfile.seekingRoles, candidateProfile.seekingRoles).length > 0
  ) {
    addTopic(
      topics,
      "roles",
      1.7 + getPriorityWeight(weights, "skill_complementarity"),
      textLocale
    );
  }

  if (!remoteModesAreCompatible(ownProfile.remoteMode, candidateProfile.remoteMode)) {
    addTopic(
      topics,
      "location",
      1.7 + getPriorityWeight(weights, "location"),
      textLocale
    );
  }

  if (hasIndirectPriority) {
    addTopic(
      topics,
      "work_style",
      1.5 +
        Math.max(
          getPriorityWeight(weights, "communication"),
          getPriorityWeight(weights, "work_style"),
          getPriorityWeight(weights, "execution_strength")
        ),
      textLocale
    );
  }

  if (topics.length === 0) {
    addTopic(topics, "roles", 1, textLocale);
    addTopic(topics, "fallback_time", 0.8, textLocale);
  }

  return topics.sort((left, right) => right.weight - left.weight || left.key.localeCompare(right.key));
}

export function buildDiscoveryCandidateRecommendation({
  ownProfile,
  candidateProfile,
  preferences,
  locale,
}: RecommendationInput): DiscoveryCandidate {
  const reasons = buildRecommendationReasons({ ownProfile, candidateProfile, preferences, locale });
  const topics = buildRecommendationTopics({ ownProfile, candidateProfile, preferences, locale });
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
  locale,
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
        locale,
      })
    )
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}
