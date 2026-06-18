export type OwnDiscoveryAssessmentSignalReadiness = {
  includeAssessmentSignals: boolean;
  hasSubmittedBaseAssessment: boolean;
  isAssessmentSignalReady: boolean;
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
