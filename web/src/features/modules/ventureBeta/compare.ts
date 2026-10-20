import type { RegistryItemV22 } from "@/features/instruments/align/registries";
import {
  COMPARE_RULES,
  INCOME_NOT_WITHIN_YEAR_MONTHS,
  SIGNAL_PRECEDENCE,
  type ItemRule,
  type Signal,
} from "@/features/modules/ventureBeta/compareConfig";
import { betaCoreItems } from "@/features/modules/ventureBeta/registry";
import type { TradeoffsComparisonPerson } from "@/features/modules/tradeoffs/teamParse";

/**
 * Der Vergleich der Beta: beschreibend, symmetrisch, ohne Wert.
 *
 * Er liest nur, was der Team-Lesepfad liefert (die Allowlist der team-sichtbaren Bloecke) - private
 * Felder kommen hier gar nicht an. Es gibt kein Gesamtergebnis, keine Rangfolge von Personen und
 * keinen Mittelwert: Bei drei oder vier Foundern wird je Item der Abstand der Antworten betrachtet
 * (kleinste gegen groesste Stufe), bei ZC02 jedes Paar einzeln.
 */
export type ParsedAnswer =
  | { kind: "option"; optionId: string; date?: string; text?: string }
  | { kind: "options"; optionIds: string[]; texts: Record<string, string> }
  | { kind: "number"; number: number; to?: number; unit: string }
  | { kind: "amount"; amount: number; currency: string }
  | { kind: "missing"; code: string }
  | { kind: "none" };

export type CompareCell = { personId: string; name: string; isViewer: boolean; answer: ParsedAnswer };

/** Eine Erwartungsluecke von ZC02 gegen ZC01 - je Paar, nie ein Teamdurchschnitt. */
export type PairGap = {
  expectedBy: { personId: string; name: string; isViewer: boolean };
  offeredBy: { personId: string; name: string; isViewer: boolean };
  expected: number;
  offered: number;
};

export type ItemResult = {
  itemId: string;
  signal: Signal;
  cells: CompareCell[];
  pairGaps: PairGap[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseAnswer(
  row: { value: Record<string, unknown> | null; missing_reason: string | null } | undefined
): ParsedAnswer {
  if (!row) return { kind: "none" };
  if (row.missing_reason) return { kind: "missing", code: row.missing_reason };
  const value = row.value;
  if (!isRecord(value)) return { kind: "none" };
  if (Array.isArray(value.optionIds)) {
    return {
      kind: "options",
      optionIds: value.optionIds.filter((id): id is string => typeof id === "string"),
      texts: isRecord(value.texts) ? (value.texts as Record<string, string>) : {},
    };
  }
  if (typeof value.optionId === "string") {
    return {
      kind: "option",
      optionId: value.optionId,
      ...(typeof value.date === "string" ? { date: value.date } : {}),
      ...(typeof value.text === "string" ? { text: value.text } : {}),
    };
  }
  if (typeof value.number === "number") {
    return {
      kind: "number",
      number: value.number,
      ...(typeof value.to === "number" ? { to: value.to } : {}),
      unit: typeof value.unit === "string" ? value.unit : "",
    };
  }
  if (typeof value.amount === "number") {
    return { kind: "amount", amount: value.amount, currency: typeof value.currency === "string" ? value.currency : "EUR" };
  }
  return { kind: "none" };
}

/** Ganze Monate von `now` bis zu einem Datum (YYYY-MM-DD); nie negativ. */
export function monthsUntil(date: string, now: Date): number {
  const target = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return 0;
  const months = (target.getUTCFullYear() - now.getUTCFullYear()) * 12 + (target.getUTCMonth() - now.getUTCMonth());
  return Math.max(0, months);
}

const strongest = (signals: Signal[]): Signal =>
  signals.reduce<Signal>((best, signal) => (SIGNAL_PRECEDENCE[signal] > SIGNAL_PRECEDENCE[best] ? signal : best), "same");

function stepSignal(distance: number, steps: ItemRule extends infer R ? (R extends { steps: infer S } ? S : never) : never): Signal {
  let signal: Signal = distance === 0 ? "same" : "none";
  for (const step of steps as readonly { minDistance: number; signal: Signal }[]) {
    if (distance >= step.minDistance) signal = step.signal;
  }
  return signal;
}

function rankOf(rule: Extract<ItemRule, { method: "ordinal_distance" }>, answer: ParsedAnswer, now: Date): number | null {
  if (answer.kind !== "option") return null;
  if (rule.scale === "income_months") {
    if (answer.optionId === "M01_o1") return 0;
    if (answer.optionId === "M01_o2") return answer.date ? monthsUntil(answer.date, now) : null;
    if (answer.optionId === "M01_o3") return INCOME_NOT_WITHIN_YEAR_MONTHS;
    return null;
  }
  const index = rule.scale.indexOf(answer.optionId);
  return index >= 0 ? index : null;
}

function evaluate(rule: ItemRule, cells: CompareCell[], now: Date): Signal {
  const answers = cells.map((cell) => cell.answer);
  // Ein Auslassungsgrund oder keine Antwort: nichts Vergleichbares - ein Gespraechsimpuls, kein Urteil.
  if (answers.some((answer) => answer.kind === "missing" || answer.kind === "none")) return "conversation_only";

  switch (rule.method) {
    case "equality": {
      const ids = answers.map((answer) => (answer.kind === "option" ? answer.optionId : ""));
      const identical = ids.every((id) => id === ids[0]);
      if (identical) return rule.conversationOptions?.includes(ids[0]!) ? "conversation_only" : "same";
      if (ids.some((id) => rule.conversationOptions?.includes(id))) return "conversation_only";
      if (ids.some((id) => rule.escalateIfChosen?.includes(id))) return "needs_clarification";
      return rule.difference;
    }

    case "ordinal_distance": {
      const options = answers.map((answer) => (answer.kind === "option" ? answer : null));
      if (options.some((answer) => answer && rule.conversationOptions?.includes(answer.optionId))) {
        const same = options.every((answer) => answer?.optionId === options[0]?.optionId);
        return same ? "same" : "conversation_only";
      }
      const ranks = options.map((answer) => (answer ? rankOf(rule, answer, now) : null));
      if (ranks.some((rank) => rank === null)) return "conversation_only";
      const values = ranks as number[];
      const distance = Math.max(...values) - Math.min(...values);
      const identical = options.every((answer) => answer?.optionId === options[0]?.optionId && answer?.date === options[0]?.date);
      if (identical) return "same";
      return stepSignal(distance, rule.steps);
    }

    case "set_overlap": {
      const sets = answers.map((answer) => (answer.kind === "options" ? [...answer.optionIds].sort() : []));
      const identical = sets.every((set) => set.join("|") === sets[0]!.join("|"));
      if (identical) return "same";
      // Zwei Optionen, die VERSCHIEDENE Personen halten. Haelt eine Person beide, ist das keine Spannung
      // zwischen Menschen - mit drei oder vier Foundern kaeme es sonst haeufiger zu Fehlalarmen.
      for (const [a, b] of rule.escalatePairs ?? []) {
        if (sets.some((set, i) => set.includes(a) && sets.some((other, j) => j !== i && other.includes(b)))) return "needs_clarification";
      }
      return rule.difference;
    }

    case "numeric_range": {
      const numbers = answers.map((answer) => (answer.kind === "number" ? answer.number : null));
      if (numbers.some((value) => value === null)) return "conversation_only";
      const values = numbers as number[];
      if (rule.zeroVersusPositive && values.some((v) => v === 0) && values.some((v) => v > 0)) return "needs_clarification";
      const distance = Math.max(...values) - Math.min(...values);
      return stepSignal(distance, rule.steps);
    }

    case "crosscheck":
      // Wird je Paar ausgewertet (`pairGapsOf`), nicht hier.
      return "none";
  }
}

/** ZC02 jeder Person gegen ZC01 JEDES anderen aktuellen Mitglieds - nie gegen einen Durchschnitt. */
export function pairGapsOf(expectedItemId: string, againstItemId: string, people: readonly TradeoffsComparisonPerson[]): PairGap[] {
  const gaps: PairGap[] = [];
  const answerOf = (person: TradeoffsComparisonPerson, itemId: string) =>
    parseAnswer(person.answers.find((entry) => entry.item_key === itemId));
  for (const expectedBy of people) {
    const expectation = answerOf(expectedBy, expectedItemId);
    if (expectation.kind !== "number") continue;
    for (const offeredBy of people) {
      if (offeredBy.personId === expectedBy.personId) continue;
      const offer = answerOf(offeredBy, againstItemId);
      if (offer.kind !== "number") continue;
      const offered = offer.to ?? offer.number;
      // Eine Luecke gibt es nur, wenn das Angebot UNTER der Erwartung liegt - ein hoeheres Angebot ist keine.
      if (offered < expectation.number) {
        gaps.push({
          expectedBy: { personId: expectedBy.personId, name: expectedBy.name, isViewer: expectedBy.isViewer },
          offeredBy: { personId: offeredBy.personId, name: offeredBy.name, isViewer: offeredBy.isViewer },
          expected: expectation.number,
          offered,
        });
      }
    }
  }
  return gaps;
}

export function compareBeta(
  people: readonly TradeoffsComparisonPerson[],
  options: { now?: Date; items?: readonly RegistryItemV22[] } = {}
): ItemResult[] {
  const now = options.now ?? new Date();
  return (options.items ?? betaCoreItems()).map((item) => {
    const rule = COMPARE_RULES[item.itemId];
    const cells: CompareCell[] = people.map((person) => ({
      personId: person.personId,
      name: person.name,
      isViewer: person.isViewer,
      answer: parseAnswer(person.answers.find((entry) => entry.item_key === item.itemId)),
    }));
    if (!rule) return { itemId: item.itemId, signal: "none" as Signal, cells, pairGaps: [] };
    if (rule.method === "crosscheck") {
      const pairGaps = pairGapsOf(item.itemId, rule.against, people);
      const missing = cells.some((cell) => cell.answer.kind === "missing" || cell.answer.kind === "none");
      const signal: Signal = pairGaps.length > 0 ? "needs_clarification" : missing ? "conversation_only" : "none";
      return { itemId: item.itemId, signal, cells, pairGaps };
    }
    return { itemId: item.itemId, signal: evaluate(rule, cells, now), cells, pairGaps: [] };
  });
}

export { strongest as strongestSignal };
