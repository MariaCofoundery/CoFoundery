import type { FounderMatchingMarkerClass } from "@/features/reporting/founderMatchingMarkers";

export type WorkbookStepImpulseContent = {
  questions: string[];
  matchingImpulses: string[];
};

type WorkbookMarkerImpulseKey = FounderMatchingMarkerClass | "default";

export function buildWorkbookStepImpulseContent(
  questions: readonly string[],
  markerImpulses: Record<WorkbookMarkerImpulseKey, string[]>,
  markerClass: FounderMatchingMarkerClass | null
): WorkbookStepImpulseContent {
  return {
    questions: [...questions],
    matchingImpulses: [
      ...(markerImpulses[markerClass ?? "default"] ?? markerImpulses.default),
    ],
  };
}
