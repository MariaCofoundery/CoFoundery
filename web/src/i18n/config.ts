export const SUPPORTED_LOCALES = ["de", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "de";
export const LOCALE_COOKIE_NAME = "cofoundery_locale";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function normalizeLocale(value: string | null | undefined): AppLocale {
  if (!value) return DEFAULT_LOCALE;

  const normalized = value.trim().toLowerCase();
  if (isAppLocale(normalized)) return normalized;

  const baseLocale = normalized.split("-")[0] ?? "";
  return isAppLocale(baseLocale) ? baseLocale : DEFAULT_LOCALE;
}

export function resolveLocalePreference(
  cookieLocale: string | null | undefined,
  acceptLanguage: string | null | undefined
): AppLocale {
  const normalizedCookieLocale = normalizeLocale(cookieLocale);
  if (cookieLocale && normalizedCookieLocale !== DEFAULT_LOCALE) {
    return normalizedCookieLocale;
  }

  if (cookieLocale && isAppLocale(cookieLocale.trim().toLowerCase())) {
    return normalizedCookieLocale;
  }

  const browserLocale = acceptLanguage
    ?.split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .find(Boolean);

  return normalizeLocale(browserLocale);
}
