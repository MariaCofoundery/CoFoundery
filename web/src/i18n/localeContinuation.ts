import { normalizeLocale, type AppLocale } from "@/i18n/config";

export function buildLocaleContinuationPath(nextPath: string, locale: AppLocale) {
  const normalizedNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("\\")
      ? nextPath
      : "/";
  const params = new URLSearchParams({
    locale: normalizeLocale(locale),
    next: normalizedNextPath,
  });
  return `/locale/continue?${params.toString()}`;
}
