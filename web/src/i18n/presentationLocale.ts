import { normalizeLocale, type AppLocale } from "@/i18n/config";

export function getPresentationLocale(locale: string | null | undefined): "de-DE" | "en-US" {
  return normalizeLocale(locale) === "en" ? "en-US" : "de-DE";
}

export function getSpeechRecognitionLocale(locale: string | null | undefined): "de-DE" | "en-US" {
  return getPresentationLocale(locale);
}

export function getAppLocale(locale: string | null | undefined): AppLocale {
  return normalizeLocale(locale);
}
