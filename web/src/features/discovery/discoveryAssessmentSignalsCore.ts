export type OwnDiscoveryAssessmentSignalReadiness = {
  includeAssessmentSignals: boolean;
  hasSubmittedBaseAssessment: boolean;
  isAssessmentSignalReady: boolean;
};

export type DiscoveryAssessmentSignalAvailability = {
  ownerReady: boolean;
  candidateReady: boolean;
  bothReady: boolean;
};

export type CandidateDiscoveryAssessmentSignalReadinessInput = {
  userId: string;
  includeAssessmentSignals: boolean;
  hasSubmittedBaseAssessment: boolean;
};

const DEFAULT_CANDIDATE_LIMIT = 20;

export function resolveOwnDiscoveryAssessmentSignalReadiness(params: {
  includeAssessmentSignals: boolean;
  hasSubmittedBaseAssessment: boolean;
}): OwnDiscoveryAssessmentSignalReadiness {
  return {
    includeAssessmentSignals: params.includeAssessmentSignals,
    hasSubmittedBaseAssessment: params.hasSubmittedBaseAssessment,
    isAssessmentSignalReady:
      params.includeAssessmentSignals && params.hasSubmittedBaseAssessment,
  };
}

export function resolveDiscoveryAssessmentSignalAvailability(params: {
  ownerReadiness?: Pick<OwnDiscoveryAssessmentSignalReadiness, "isAssessmentSignalReady"> | null;
  candidateReadiness?: Pick<OwnDiscoveryAssessmentSignalReadiness, "isAssessmentSignalReady"> | null;
}): DiscoveryAssessmentSignalAvailability {
  const ownerReady = params.ownerReadiness?.isAssessmentSignalReady === true;
  const candidateReady = params.candidateReadiness?.isAssessmentSignalReady === true;

  return {
    ownerReady,
    candidateReady,
    bothReady: ownerReady && candidateReady,
  };
}

export function normalizeDiscoveryAssessmentSignalCandidateUserIds(params: {
  ownerUserId: string;
  candidateUserIds: string[];
  limit?: number;
}) {
  const normalizedOwnerUserId = params.ownerUserId.trim();
  const limit = Math.max(0, params.limit ?? DEFAULT_CANDIDATE_LIMIT);
  const seen = new Set<string>();
  const ids: string[] = [];

  for (const userId of params.candidateUserIds) {
    const normalized = userId.trim();
    if (!normalized || normalized === normalizedOwnerUserId || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    ids.push(normalized);
    if (ids.length >= limit) {
      break;
    }
  }

  return ids;
}

export function buildDiscoveryAssessmentSignalAvailabilityMap(params: {
  ownerReadiness?: Pick<OwnDiscoveryAssessmentSignalReadiness, "isAssessmentSignalReady"> | null;
  candidateUserIds: string[];
  candidateReadiness: CandidateDiscoveryAssessmentSignalReadinessInput[];
}): Map<string, DiscoveryAssessmentSignalAvailability> {
  const candidateReadinessByUserId = new Map(
    params.candidateReadiness.map((entry) => [
      entry.userId,
      resolveOwnDiscoveryAssessmentSignalReadiness({
        includeAssessmentSignals: entry.includeAssessmentSignals,
        hasSubmittedBaseAssessment: entry.hasSubmittedBaseAssessment,
      }),
    ])
  );

  return new Map(
    params.candidateUserIds.map((userId) => [
      userId,
      resolveDiscoveryAssessmentSignalAvailability({
        ownerReadiness: params.ownerReadiness ?? null,
        candidateReadiness: candidateReadinessByUserId.get(userId) ?? null,
      }),
    ])
  );
}
