export type DiscoveryAssessmentConsentState = {
  includeAssessmentSignals: boolean;
  assessmentSignalsConsentedAt: string | null;
};

export function resolveDiscoveryAssessmentConsentState(params: {
  includeAssessmentSignals: boolean;
  existingConsentedAt?: string | null;
  now: string;
}): DiscoveryAssessmentConsentState {
  if (!params.includeAssessmentSignals) {
    return {
      includeAssessmentSignals: false,
      assessmentSignalsConsentedAt: null,
    };
  }

  return {
    includeAssessmentSignals: true,
    assessmentSignalsConsentedAt: params.existingConsentedAt ?? params.now,
  };
}
