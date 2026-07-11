import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";

export type EmailLocaleInput = AppLocale | string | null | undefined;

export function resolveEmailLocale(locale: EmailLocaleInput): AppLocale {
  return locale ? normalizeLocale(locale) : DEFAULT_LOCALE;
}
