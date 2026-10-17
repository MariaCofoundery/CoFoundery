import type { Venture } from "@/features/instruments/align/ventureResolution";

/**
 * „Deine Vorhaben" auf „Das bist du" (Phase 1, Profil).
 *
 * GEMELDET: Mehrere identische Knoepfe „Vorhaben ansehen". Ursache: Ein Team
 * ohne Namen bekam als Beschriftung den Knopftext - jedes namenlose Vorhaben
 * sah gleich aus. Dazu standen archivierte Teams mit in der Liste, ohne
 * Reihenfolge.
 *
 * Hier wird nur ausgewaehlt und geordnet, nichts erfunden:
 *   - archivierte Vorhaben (`founder_teams.archived_at`) entfallen;
 *   - Reihenfolge: zuletzt geaendert zuerst, dann zuletzt angelegt, dann ID;
 *   - ein Vorhaben ohne Namen behaelt `name: null` - die Seite beschriftet es
 *     mit dem Anlagedatum („Unbenanntes Vorhaben · angelegt am ...");
 *   - stehen danach zwei gleich da (gleicher Name oder unbenannt am selben
 *     Tag), bekommen sie eine laufende Nummer, damit jede Zeile eindeutig ist.
 *
 * Gefiltert wird NUR hier: `findVentures` liefert weiterhin alle - die
 * Vorhaben-Seiten, das Dashboard und die Navigation haengen daran.
 */

export type ProfileVenture = {
  id: string;
  name: string | null;
  createdAt: string | null;
  alone: boolean;
  /** Laufende Nummer, nur wenn sonst zwei Zeilen gleich aussaehen. */
  duplicateIndex: number | null;
};

const time = (value: string | null) => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Der Tag der Anlage (UTC) - so steht er auch in der Beschriftung. */
const day = (value: string | null) => (value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().slice(0, 10) : "");

export function profileVentures(ventures: readonly Venture[]): ProfileVenture[] {
  const visible = ventures
    .filter((venture) => !venture.archivedAt)
    .slice()
    .sort(
      (a, b) =>
        time(b.updatedAt ?? b.createdAt) - time(a.updatedAt ?? a.createdAt) ||
        time(b.createdAt) - time(a.createdAt) ||
        a.id.localeCompare(b.id),
    );

  const labelKey = (venture: Venture) => {
    const name = venture.name?.trim();
    return name ? `name:${name.toLocaleLowerCase()}` : `unnamed:${day(venture.createdAt)}`;
  };
  const total = new Map<string, number>();
  for (const venture of visible) total.set(labelKey(venture), (total.get(labelKey(venture)) ?? 0) + 1);

  const seen = new Map<string, number>();
  return visible.map((venture) => {
    const key = labelKey(venture);
    const index = (seen.get(key) ?? 0) + 1;
    seen.set(key, index);
    return {
      id: venture.id,
      name: venture.name?.trim() || null,
      createdAt: venture.createdAt,
      alone: venture.alone,
      duplicateIndex: (total.get(key) ?? 0) > 1 ? index : null,
    };
  });
}
