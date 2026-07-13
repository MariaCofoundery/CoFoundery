import { REPORT_BUILDER_COPY_DE } from "@/features/reporting/content/builderCopy/builderCopy.de";
import type { ReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";

export const REPORT_BUILDER_COPY_EN = {
  // The productive builder narratives intentionally stay on the German copy until
  // each section builder is migrated and golden-sample reviewed.
  executiveSummary: REPORT_BUILDER_COPY_DE.executiveSummary,
  enPilotExamples: {
    fallbackSummary:
      "Use this report as a careful starting point for a focused conversation, not as a final verdict.",
    focusPrompt:
      "Which concrete agreement would help you make the next decision more deliberately?",
    sectionInterpretation:
      "This working dynamic can become more useful when expectations are made explicit before pressure builds.",
  },
} as const satisfies ReportBuilderCopy;
