import type { MatchingSessionModule } from "@/features/matchingCore/matchingCoreTypes";

export type MatchingReportRun = {
  id: string;
  matchingSessionId: string;
  modules: MatchingSessionModule[];
  inputAssessmentIds: string[];
  payload: Record<string, unknown>;
  createdByUserId: string;
  createdAt: string;
};

export type MatchingReportRunSummary = {
  reportRun: MatchingReportRun;
};

export function isMatchingReportRunPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return (value as Record<string, unknown>).reportType === "founder_alignment_v1";
}
