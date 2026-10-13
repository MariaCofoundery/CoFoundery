/**
 * Reihenfolge und Gleichstände (Spec §9, §11.1).
 *
 * - Gleicher Relevanzwert heißt Gleichstand und wird als `tieGroup` ausgewiesen.
 * - Die sekundäre Reihenfolge (Veröffentlichung neueste zuerst, dann ID) dient NUR der stabilen
 *   Anzeige. Sie ist kein Relevanzsignal und darf nicht als Matchingqualität ausgewertet werden.
 * - Ausgeschlossene (`ineligible`) Ergebnisse stehen nie in einer Rangliste.
 */
import type { Ranked } from "@/lib/matching/v01/types";

export type RankInput<R> = Readonly<{ result: R; score: number; publishedAt: string | null; id: string }>;

function compareSecondary(x: RankInput<unknown>, y: RankInput<unknown>): number {
  if (x.publishedAt !== y.publishedAt) {
    if (x.publishedAt === null) return 1;
    if (y.publishedAt === null) return -1;
    return x.publishedAt < y.publishedAt ? 1 : -1;
  }
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
}

export function rankWithTies<R>(items: readonly RankInput<R>[]): Ranked<R>[] {
  const sorted = [...items].sort((x, y) => (x.score !== y.score ? y.score - x.score : compareSecondary(x, y)));
  const counts = new Map<number, number>();
  for (const it of sorted) counts.set(it.score, (counts.get(it.score) ?? 0) + 1);
  const groupIds = new Map<number, string>();
  return sorted.map((it, i) => {
    let tieGroup: string | null = null;
    if ((counts.get(it.score) ?? 0) > 1) {
      if (!groupIds.has(it.score)) groupIds.set(it.score, `tie-${groupIds.size + 1}`);
      tieGroup = groupIds.get(it.score) ?? null;
    }
    return { rank: i + 1, result: it.result, tieGroup, secondaryOrder: `${it.publishedAt ?? ""}|${it.id}` };
  });
}
