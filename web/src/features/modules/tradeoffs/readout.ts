import type { RegistryItemV22 } from "@/features/instruments/align/registries";

/**
 * Das eigene Ergebnis nach der Abgabe - aus dem, was die Person gewaehlt hat.
 *
 * NUR AUS GEWAEHLTEN WEGEN UND GEWICHTEN. Es gibt hier keine
 * Charakterisierung, keinen Typ, keine KI und keine Wertung: Jede Aussage
 * beschreibt, was in dieser Situation angekreuzt wurde - nicht, was das ueber
 * die Person heisst.
 *
 * Die Funktion liefert STRUKTUR, keine Saetze: Die Formulierungen stehen im
 * Sprachbundle (DE/EN), die Beschriftungen kommen aus der Registry. So bleibt
 * das Modell pruefbar, ohne Texte zu vergleichen.
 *
 * ZUORDNUNG WEG <-> ANLIEGEN: In W03-W06 gehoert der erste Weg zum ersten
 * Anliegen und der zweite zum zweiten (Wirkung/Angebot mit Wirkung,
 * Austausch/noch ein Austausch, Puffer/Reserve, gleicher Anteil/gleich
 * verteilen). Ein Test haelt das fest.
 */
export type TradeoffItem = Pick<
  RegistryItemV22,
  "itemId" | "prompt" | "concerns" | "paths" | "ratingOptions" | "missing"
>;

export type TradeoffAnswer = {
  value?: Record<string, unknown> | null;
  missingCode?: string | null;
};

export type TradeoffStatement =
  /** Beide Anliegen gleich gewichtet. */
  | { kind: "weights_equal"; level: string }
  /** Eines staerker gewichtet; `lessIsHigh`: auch das andere war ziemlich oder sehr wichtig. */
  | { kind: "weights_more"; more: string; less: string; lessLevel: string; lessIsHigh: boolean }
  /** Der zuerst gewaehlte Weg. */
  | { kind: "path"; path: string }
  | { kind: "path_other" }
  | { kind: "path_unknown" }
  /** Der Weg gehoert zum Anliegen, das niedriger gewichtet wurde. */
  | { kind: "path_against_weight"; pathConcern: string; more: string }
  /** Keine Antwort, sondern ein Auslassungsgrund. */
  | { kind: "not_decided"; label: string };

export type TradeoffReadout = {
  itemId: string;
  prompt: string;
  /** Der gewaehlte Weg: `A`, `B`, `other`, `unknown` - oder `null`, wenn nichts gewaehlt wurde. */
  path: "A" | "B" | "other" | "unknown" | null;
  statements: TradeoffStatement[];
};

const rank = (value: unknown): number | null =>
  typeof value === "number" && value >= 1 && value <= 5 ? value : null;

export function readTradeoff(item: TradeoffItem, answer: TradeoffAnswer | null): TradeoffReadout {
  const base = { itemId: item.itemId, prompt: item.prompt };

  if (!answer || !answer.value) {
    const reason = item.missing.find((entry) => entry.code === answer?.missingCode);
    return {
      ...base,
      path: null,
      statements: answer?.missingCode
        ? [{ kind: "not_decided", label: reason?.label ?? answer.missingCode }]
        : [],
    };
  }

  const { value } = answer;
  const concerns = item.concerns ?? [];
  const paths = item.paths ?? [];
  const levels = item.ratingOptions ?? [];
  const a = rank(value.importanceA);
  const b = rank(value.importanceB);
  const chosen = value.path === "A" || value.path === "B" || value.path === "other" || value.path === "unknown" ? value.path : null;
  const statements: TradeoffStatement[] = [];

  let more: 0 | 1 | null = null;
  if (a !== null && b !== null) {
    if (a === b) {
      statements.push({ kind: "weights_equal", level: levels[a - 1] ?? String(a) });
    } else {
      more = a > b ? 0 : 1;
      const lessRank = more === 0 ? b : a;
      statements.push({
        kind: "weights_more",
        more: concerns[more] ?? "",
        less: concerns[more === 0 ? 1 : 0] ?? "",
        lessLevel: levels[lessRank - 1] ?? String(lessRank),
        lessIsHigh: lessRank >= 4,
      });
    }
  }

  if (chosen === "A" || chosen === "B") {
    const index = chosen === "A" ? 0 : 1;
    statements.push({ kind: "path", path: paths[index] ?? "" });
    // Nur wenn die Gewichte verschieden sind UND der Weg zum niedriger
    // gewichteten Anliegen gehoert: Das ist ein Gespraechsanlass, kein Befund.
    if (more !== null && index !== more) {
      statements.push({ kind: "path_against_weight", pathConcern: concerns[index] ?? "", more: concerns[more] ?? "" });
    }
  } else if (chosen === "other") {
    statements.push({ kind: "path_other" });
  } else if (chosen === "unknown") {
    statements.push({ kind: "path_unknown" });
  }

  return { ...base, path: chosen, statements };
}

/** Die vier Situationen als Ergebnis - in der Reihenfolge der Registry. */
export function readTradeoffs(
  items: readonly TradeoffItem[],
  answers: readonly { block_id: string; value: Record<string, unknown> | null; missing_code: string | null }[]
): TradeoffReadout[] {
  return items.map((item) => {
    const row = answers.find((candidate) => candidate.block_id === item.itemId);
    return readTradeoff(item, row ? { value: row.value, missingCode: row.missing_code } : null);
  });
}
