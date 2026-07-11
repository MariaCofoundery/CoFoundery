import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";
import { REPORT_CONTENT_DE } from "@/features/reporting/content/reportContent.de";
import { REPORT_CONTENT_EN } from "@/features/reporting/content/reportContent.en";

export type ReportDimensionContent = {
  canonicalName: string;
  shortLabel: string;
  uiLeftPole: string;
  reportLeftPole: string;
  centerLabel: string;
  uiRightPole: string;
  reportRightPole: string;
  description: string;
};

export type ReportDimensionContentKey =
  | "Unternehmenslogik"
  | "Entscheidungslogik"
  | "Risikoorientierung"
  | "Arbeitsstruktur & Zusammenarbeit"
  | "Commitment"
  | "Konfliktstil";

export type ReportDimensionStatusLabelKey =
  | "nah"
  | "ergänzend"
  | "abstimmung_nötig"
  | "kritisch";

export type ReportDimensionReadingKey =
  | "insufficientData"
  | "sharedBlindSpot"
  | ReportDimensionStatusLabelKey;

export type ReportContent = {
  dimensions: Record<ReportDimensionContentKey, ReportDimensionContent>;
  headings: {
    centralPatterns: string;
    dynamicsOverview: string;
    executiveSummary: string;
    conversationPrompts: string;
    conversationPromptsIntro: string;
    nextStep: string;
    valuesFocus: string;
  };
  centralPatternLabels: {
    corePattern: string;
    everydayImpact: string;
    consequence: string;
  };
  statusLabels: Record<ReportDimensionStatusLabelKey, string>;
  dimensionReadings: Record<ReportDimensionReadingKey, string>;
  dimensionBusinessMeanings: Record<
    ReportDimensionContentKey,
    {
      critical: string;
      default: string;
    }
  >;
  sectionLabels: {
    strength: string;
    complement: string;
    clarificationField: string;
    possibleTensionFields: string;
  };
  valuesLabels: {
    sharedBasis: string;
    differenceUnderPressure: string;
    guardrail: string;
  };
};

export const REPORT_CONTENT_BY_LOCALE: Record<AppLocale, ReportContent> = {
  de: REPORT_CONTENT_DE,
  en: REPORT_CONTENT_EN,
};
export type ReportContentLocale = AppLocale;

export function getReportContent(locale?: string | null): ReportContent {
  return REPORT_CONTENT_BY_LOCALE[normalizeLocale(locale ?? DEFAULT_LOCALE)];
}
