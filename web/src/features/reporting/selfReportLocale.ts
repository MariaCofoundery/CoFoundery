import { normalizeLocale, type AppLocale } from "@/i18n/config";

export type SelfReportLocaleInput = AppLocale | string | null | undefined;

export function resolveSelfReportLocale(locale: SelfReportLocaleInput): AppLocale {
  return normalizeLocale(locale);
}
