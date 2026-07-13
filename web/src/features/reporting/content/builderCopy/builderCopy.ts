import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";
import { REPORT_BUILDER_COPY_DE } from "@/features/reporting/content/builderCopy/builderCopy.de";
import { REPORT_BUILDER_COPY_EN } from "@/features/reporting/content/builderCopy/builderCopy.en";

export type BuilderDimensionContentKey =
  | "Unternehmenslogik"
  | "Entscheidungslogik"
  | "Risikoorientierung"
  | "Arbeitsstruktur & Zusammenarbeit"
  | "Commitment"
  | "Konfliktstil";

export type ExecutiveSummaryStateKey =
  | "insufficientData"
  | "sharedBlindSpot"
  | "strongBase"
  | "strategicCloseOperationalClarify"
  | "everydayCloseStrategicTension"
  | "highClarification"
  | "partial";

export type ReportBuilderCopy = {
  executiveSummary: {
    dimensionLabels: Record<BuilderDimensionContentKey, string>;
    dimensionPrefix: {
      withDimension: string;
      fallback: string;
    };
    headlines: Record<ExecutiveSummaryStateKey, string>;
    intro: {
      fit: Record<ExecutiveSummaryStateKey, string>;
      strengthWithDimension: string;
      strengthFallback: string;
      complementaryWithDimension: string;
      sharedBlindSpotWithDimension: string;
      sharedBlindSpotFallback: string;
      tensionOppositeWithDimension: string;
      tensionCoordinationWithDimension: string;
      tensionFallback: string;
      closing: {
        preFounder: string;
        existingTeam: string;
      };
    };
    topMessages: {
      strength: string;
      complementaryDynamic: string;
      tension: string;
      sharedBlindSpotTension: string;
    };
    fallbackFocus: string[];
    focusPromptsByDimension: Record<BuilderDimensionContentKey, string[]>;
    dynamicFocus: {
      complementaryFallback: string;
      protectStrengthPreFounder: string;
      protectStrengthExistingTeam: string;
    };
  };
  enPilotExamples: {
    fallbackSummary: string;
    focusPrompt: string;
    sectionInterpretation: string;
  };
};

export const REPORT_BUILDER_COPY_BY_LOCALE: Record<AppLocale, ReportBuilderCopy> = {
  de: REPORT_BUILDER_COPY_DE,
  en: REPORT_BUILDER_COPY_EN,
};

export function getReportBuilderCopy(locale?: string | null): ReportBuilderCopy {
  return REPORT_BUILDER_COPY_BY_LOCALE[normalizeLocale(locale ?? DEFAULT_LOCALE)];
}
