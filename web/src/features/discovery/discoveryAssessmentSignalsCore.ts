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
