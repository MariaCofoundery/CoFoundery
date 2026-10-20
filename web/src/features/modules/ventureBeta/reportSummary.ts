import type { ItemResult } from "@/features/modules/ventureBeta/compare";
import { COMPARE_RULES, type Signal } from "@/features/modules/ventureBeta/compareConfig";
import { BETA_REPORT_GROUPS } from "@/features/modules/ventureBeta/registry";

/**
 * Die Kurzfassung des Teamreports - rein aus den Vergleichssignalen, ohne Wert.
 *
 * „Das Wichtigste": welche Themen einig sind, welche ein Gespraech lohnen und welche eine konkrete Abstimmung
 * brauchen. Daraus entsteht KEIN Gesamtergebnis: Es gibt nur Listen von Themen, keine Zahl, die ein Urteil
 * waere, und keine Rangfolge. Die Reihenfolge ist die der Fragen.
 */
export type SignalClass = "agreed" | "different" | "talk" | "clarify";

export function classOf(signal: Signal): SignalClass {
  switch (signal) {
    case "same":
      return "agreed";
    case "needs_clarification":
      return "clarify";
    case "conversation_only":
      return "talk";
    default:
      return "different";
  }
}

/**
 * Die Klasse eines Ergebnisses.
 *
 * Ein Kreuzvergleich (ZC02 gegen ZC01) meldet `none`, wenn es KEINE Luecke gibt - also wenn die Erwartungen
 * gedeckt sind. Das ist Einigkeit und kein Unterschied. Bei den uebrigen Regeln heisst `none`: die Antworten
 * unterscheiden sich, aber unter der Schwelle - ein Unterschied ohne Handlungsbedarf.
 */
export function classOfResult(result: Pick<ItemResult, "itemId" | "signal">): SignalClass {
  if (result.signal === "none" && COMPARE_RULES[result.itemId]?.method === "crosscheck") return "agreed";
  return classOf(result.signal);
}

export type ReportSummary = {
  agreed: string[];
  different: string[];
  talk: string[];
  clarify: string[];
  /** Je Gruppe die Klassen ihrer Fragen - fuer die Punktereihe in der Uebersicht. */
  tiles: { key: string; classes: SignalClass[] }[];
};

export function summarizeReport(results: readonly ItemResult[]): ReportSummary {
  const byId = new Map(results.map((result) => [result.itemId, result]));
  const summary: ReportSummary = { agreed: [], different: [], talk: [], clarify: [], tiles: [] };
  for (const group of BETA_REPORT_GROUPS) {
    const classes: SignalClass[] = [];
    for (const id of group.itemIds) {
      const result = byId.get(id);
      if (!result) continue;
      const cls = classOfResult(result);
      classes.push(cls);
      summary[cls].push(id);
    }
    summary.tiles.push({ key: group.key, classes });
  }
  return summary;
}
