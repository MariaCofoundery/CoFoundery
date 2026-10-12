import type { AppLocale } from "@/i18n/config";
import { AREAS } from "@/features/reporting/workstyle/model";
import { AREAS_EN, POLES_EN } from "@/features/reporting/workstyle/displayCopyEn";
import { AREA_POLES } from "@/features/reporting/workstyle/narrative";

export function workstyleAreas(locale: AppLocale) {
  return AREAS.map(area => ({ ...area, ...(locale === "en" ? AREAS_EN[area.key] : {}) }));
}
export function workstylePoles(locale: AppLocale) {
  return locale === "en" ? POLES_EN : AREA_POLES;
}
/** For static presentation copy only. Never pass user text or persisted codes here. */
export function reportText(locale: AppLocale, de: string, en: string) {
  return locale === "en" ? en : de;
}
