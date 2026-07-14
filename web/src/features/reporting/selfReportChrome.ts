import deReportMessages from "../../../messages/de/report.json";
import enReportMessages from "../../../messages/en/report.json";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";

export type SelfReportChrome = typeof deReportMessages.individual;

const SELF_REPORT_CHROME_BY_LOCALE: Record<AppLocale, SelfReportChrome> = {
  de: deReportMessages.individual,
  en: enReportMessages.individual,
};

export function getSelfReportChrome(locale?: string | null): SelfReportChrome {
  return SELF_REPORT_CHROME_BY_LOCALE[normalizeLocale(locale ?? DEFAULT_LOCALE)] ?? deReportMessages.individual;
}
