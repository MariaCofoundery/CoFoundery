import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";
import { VALUES_CONTENT_DE } from "@/features/reporting/content/valuesContent.de";
import { VALUES_CONTENT_EN } from "@/features/reporting/content/valuesContent.en";
import type {
  FounderValuesSelection,
  FounderValuesThemeId,
} from "@/features/reporting/founderValuesSelection";

export type ValuesDifferenceLevel = FounderValuesSelection["unterschiedUnterDruck"]["level"];
export type ValuesGuardrailMode = FounderValuesSelection["leitplanke"]["mode"];
export type ValuesPattern = FounderValuesSelection["meta"]["pattern"];

export type ValuesContent = {
  intros: Record<ValuesPattern, string>;
  basisTitles: Record<FounderValuesThemeId, string>;
  differenceTitles: Record<FounderValuesThemeId, string>;
  guardrailTitles: Record<FounderValuesThemeId, string>;
  basisBodies: Record<FounderValuesThemeId, string>;
  differenceBodies: Record<
    FounderValuesThemeId,
    {
      clear: string;
      default: string;
    }
  >;
  differenceFollowUps: Record<ValuesDifferenceLevel, string>;
  guardrailBodies: Record<ValuesGuardrailMode, Record<FounderValuesThemeId, string>>;
};

export const VALUES_CONTENT_BY_LOCALE: Record<AppLocale, ValuesContent> = {
  de: VALUES_CONTENT_DE,
  en: VALUES_CONTENT_EN,
};

export function getValuesContent(locale?: string | null): ValuesContent {
  return VALUES_CONTENT_BY_LOCALE[normalizeLocale(locale ?? DEFAULT_LOCALE)];
}
