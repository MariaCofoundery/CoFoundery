import { readTradeoff, type TradeoffItem, type TradeoffReadout } from "@/features/modules/tradeoffs/readout";
import type { TradeoffsComparisonPerson } from "@/features/modules/tradeoffs/teamParse";

/**
 * Der Vergleich `path_and_weights` fuer „Werte & Zielkonflikte" - `conversation_only`.
 *
 * NUR BESCHREIBEN, NIE BEWERTEN. Je Situation steht, was jede Person gewaehlt
 * und gewichtet hat, und ob Wege und Gewichte uebereinstimmen. Daraus folgt
 * keine Aussage ueber die Zusammenarbeit: Ein Unterschied ist ein
 * Gespraechsanlass, kein Konflikt, und Uebereinstimmung ist keine Qualitaet.
 * Es gibt keine Zahl, keine Rangfolge und kein „passt".
 *
 * `open` heisst: nicht vergleichbar (ein Auslassungsgrund, „anderer Weg" oder
 * „noch offen") - dann sagt der Vergleich dazu nichts, statt zu raten.
 */
export type DifferenceKind = "same" | "different" | "open";

export type CompareCell = {
  personId: string;
  name: string;
  isViewer: boolean;
  readout: TradeoffReadout;
  /** Die beiden Anliegen mit der gewaehlten Stufe - leer, wenn keine Gewichte angegeben wurden. */
  weights: { concern: string; level: string }[];
  /** Der gewaehlte erste Weg: sein Wortlaut, `other`, `unknown` oder `none`. */
  path: { kind: "chosen"; label: string } | { kind: "other" | "unknown" | "none" };
  /** Ein Auslassungsgrund statt einer Antwort. */
  missingLabel: string | null;
};

export type CompareRow = {
  itemId: string;
  prompt: string;
  cells: CompareCell[];
  paths: DifferenceKind;
  weights: DifferenceKind;
};

const rank = (value: unknown): number | null =>
  typeof value === "number" && value >= 1 && value <= 5 ? value : null;

function kindOf(values: readonly (string | null)[]): DifferenceKind {
  if (values.some((value) => value === null)) return "open";
  return new Set(values).size === 1 ? "same" : "different";
}

export function compareTradeoffs(
  items: readonly TradeoffItem[],
  people: readonly TradeoffsComparisonPerson[]
): CompareRow[] {
  return items.map((item) => {
    const cells: CompareCell[] = [];
    const pathKeys: (string | null)[] = [];
    const weightKeys: (string | null)[] = [];
    for (const person of people) {
      const row = person.answers.find((answer) => answer.item_key === item.itemId);
      const answer = row ? { value: row.value, missingCode: row.missing_reason } : null;
      const readout = readTradeoff(item, answer);
      const a = rank(row?.value?.importanceA);
      const b = rank(row?.value?.importanceB);
      const concerns = item.concerns ?? [];
      const levels = item.ratingOptions ?? [];
      const chosen = readout.path;
      const missing = readout.statements.find((statement) => statement.kind === "not_decided");
      cells.push({
        personId: person.personId,
        name: person.name,
        isViewer: person.isViewer,
        readout,
        weights:
          a !== null && b !== null
            ? [
                { concern: concerns[0] ?? "", level: levels[a - 1] ?? String(a) },
                { concern: concerns[1] ?? "", level: levels[b - 1] ?? String(b) },
              ]
            : [],
        path:
          chosen === "A" || chosen === "B"
            ? { kind: "chosen", label: (item.paths ?? [])[chosen === "A" ? 0 : 1] ?? "" }
            : chosen === "other" || chosen === "unknown"
              ? { kind: chosen }
              : { kind: "none" },
        missingLabel: missing?.kind === "not_decided" ? missing.label : null,
      });
      pathKeys.push(chosen === "A" || chosen === "B" ? chosen : null);
      weightKeys.push(a !== null && b !== null ? `${a}/${b}` : null);
    }
    return { itemId: item.itemId, prompt: item.prompt, cells, paths: kindOf(pathKeys), weights: kindOf(weightKeys) };
  });
}
