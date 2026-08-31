import type {
  DiscoveryAlignmentDimension,
  DiscoveryCandidate,
  DiscoveryMustHaves,
  DiscoveryPracticalMatch,
  FounderDiscoveryProfile,
} from "@/features/discovery/discoveryTypes";

export function attachDiscoveryV2AlignmentSimilarities(
  candidates: DiscoveryCandidate[],
  similaritiesByUserId: Map<string, DiscoveryAlignmentDimension[]>,
  candidateUserIdByProfileId: Map<string, string>
) {
  return candidates.map((candidate) => ({
    ...candidate,
    alignmentSimilarDimensions:
      similaritiesByUserId.get(candidateUserIdByProfileId.get(candidate.profile.id) ?? "") ?? [],
  }));
}

export function attachDiscoveryV2AlignmentSignals(
  candidates: DiscoveryCandidate[],
  signalsByUserId: Map<string, NonNullable<DiscoveryCandidate["alignmentSignals"]>>,
  candidateUserIdByProfileId: Map<string, string>
) {
  return candidates.map((candidate) => {
    const signals =
      signalsByUserId.get(candidateUserIdByProfileId.get(candidate.profile.id) ?? "") ?? [];
    return {
      ...candidate,
      alignmentSignals: signals,
      alignmentSimilarDimensions: signals
        .filter((entry) => entry.signal === "similar_tendency")
        .map((entry) => entry.dimension),
    };
  });
}

function normalizedSet(values: string[]) {
  return new Set(values.map((value) => value.trim().toLocaleLowerCase()).filter(Boolean));
}

function hasTextIntersection(left: string[], right: string[]) {
  const normalizedRight = normalizedSet(right);
  return left.some((value) => normalizedRight.has(value.trim().toLocaleLowerCase()));
}

export function getDiscoveryV2PracticalMatches(
  profile: FounderDiscoveryProfile,
  mustHaves: DiscoveryMustHaves
) {
  const matches: DiscoveryPracticalMatch[] = [];

  if (
    mustHaves.requiredRolesAny.length > 0 &&
    profile.ownRoles.some((role) => mustHaves.requiredRolesAny.includes(role))
  ) {
    matches.push("role");
  }
  if (
    mustHaves.requiredExpertiseAny.length > 0 &&
    hasTextIntersection(profile.expertise, mustHaves.requiredExpertiseAny)
  ) {
    matches.push("expertise");
  }
  if (
    mustHaves.desiredLocationRegion &&
    profile.locationRegion?.trim().toLocaleLowerCase() ===
      mustHaves.desiredLocationRegion.trim().toLocaleLowerCase()
  ) {
    matches.push("location");
  }
  if (
    mustHaves.acceptedRemoteModes.length > 0 &&
    mustHaves.acceptedRemoteModes.includes(profile.remoteMode)
  ) {
    matches.push("remote");
  }
  if (
    mustHaves.minimumAvailabilityHoursPerWeek != null &&
    profile.availabilityHoursPerWeek != null &&
    profile.availabilityHoursPerWeek >= mustHaves.minimumAvailabilityHoursPerWeek
  ) {
    matches.push("availability");
  }

  return matches;
}

export function buildDiscoveryV2Candidate(
  profile: FounderDiscoveryProfile,
  mustHaves: DiscoveryMustHaves
): DiscoveryCandidate {
  return {
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      ownRoles: profile.ownRoles,
      seekingRoles: profile.seekingRoles,
      expertise: profile.expertise,
      industries: profile.industries,
      locationLabel: profile.locationLabel,
      locationRegion: profile.locationRegion,
      remoteMode: profile.remoteMode,
      availabilityHoursPerWeek: profile.availabilityHoursPerWeek,
      commitmentLevel: profile.commitmentLevel,
      ventureStage: profile.ventureStage,
      ventureGoal: profile.ventureGoal,
      searchIntent: profile.searchIntent ?? null,
      startHorizon: profile.startHorizon ?? null,
      publishedAt: profile.publishedAt,
    },
    reasons: [],
    conversationTopics: [],
    practicalMatches: getDiscoveryV2PracticalMatches(profile, mustHaves),
    alignmentSimilarDimensions: [],
    alignmentSignals: [],
  };
}
