/**
 * Workstyle als Gesprächskontext (Spec §15) – NACH dem Matching, nur bei beidseitiger Zustimmung
 * (`workstyle_discovery_enabled`). Ändert weder Gate noch Relevanz, Reihenfolge oder Confidence.
 * Kein Compatibility-Score. Die Punkte selbst liefert die bestehende FIND-Logik (workstyleSignals).
 */
import type { FindMatchResult, WorkstyleContext } from "@/lib/matching/v01/types";

export function attachWorkstyleContext(
  result: FindMatchResult,
  consent: Readonly<{ a: boolean; b: boolean }>,
  points: WorkstyleContext["points"],
): FindMatchResult {
  const allowed = consent.a === true && consent.b === true && result.eligibility.status !== "ineligible";
  return { ...result, workstyleContext: allowed ? { points: [...points] } : null };
}
