import type { AppLocale } from "@/i18n/config";
import { workstyleAreas } from "@/features/reporting/workstyle/display";
import { validProductProfile, type ProductProfile } from "@/features/reporting/workstyle/model";
import { individualNarratives } from "@/features/reporting/workstyle/narrative";

/**
 * Die Saetze der Karte „Wie du arbeitest" unter „Auf einen Blick".
 *
 * Dieselbe Auswertung wie in `WorkstyleProfileSummary` (`narrative.ts`) - nichts neu gerechnet, nichts gedeutet:
 * die Bereiche, in denen die Antworten durchgehend in eine Richtung zeigen, und wie viele von der Situation
 * abhaengen. Eigene Datei, damit die Profilseite selbst keine Erzaehlungen des Interviews beruehrt.
 */
export function workGlanceLines(
  profile: ProductProfile | null | undefined,
  locale: AppLocale,
  t: (key: string, values?: Record<string, string | number>) => string
): string[] {
  if (!profile || !validProductProfile(profile)) return [];
  const areas = workstyleAreas(locale);
  const items = individualNarratives(profile, locale);
  const consistent = items
    .filter(({ narrative: n }) => n.pattern.kind === "direction" && n.pattern.band !== "middle" && n.pattern.strength === "all")
    .map(({ area }) => areas.find((entry) => entry.key === area.key)?.team ?? area.key);
  const mixed = items.filter(({ narrative: n }) => n.pattern.kind === "mixed").length;
  const lines: string[] = [];
  if (consistent.length > 0) lines.push(t("glance.work.consistent", { areas: consistent.join(" · ") }));
  if (mixed > 0) lines.push(t("glance.work.mixed", { count: mixed }));
  if (lines.length === 0) lines.push(t("glance.work.ready"));
  return lines;
}
