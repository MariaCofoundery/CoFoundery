import type { CompareMethod, CompareStance } from "@/features/modules/types";

/**
 * Die Vergleichsregeln von Venture Alignment v2 (Beta 1) - an EINER Stelle.
 *
 * ALLE SCHWELLEN SIND BETA-HYPOTHESEN, keine Produktzusage. Wer sie nach der Erprobung aendert,
 * aendert diese Datei - weder die Engine noch die Oberflaeche noch die Texte enthalten Schwellen.
 * Methode (WIE wird verglichen) und Bedeutung (WAS heisst ein Unterschied) sind getrennt: die
 * Methode steht in `method`, die Bedeutung in den Signalen der Schwellen.
 *
 * KEIN SCORE, KEINE AMPEL, KEIN MATCH, KEIN RANKING. Ein Signal waehlt nur den Hinweistext; es wird
 * nie zu einer Zahl verrechnet. Ist eine Schwelle fachlich unklar, gilt `conversation_only`
 * (ein Gespraechsimpuls) statt einer kuenstlichen Bewertung.
 */
export type Signal = "same" | "none" | "neutral_difference" | "needs_clarification" | "conversation_only";
export type DifferenceSignal = Exclude<Signal, "same" | "none">;
type Step = { minDistance: number; signal: "neutral_difference" | "needs_clarification" };

export type ItemRule =
  | {
      method: "equality";
      /** Was ein Unterschied zwischen zwei konkreten Antworten bedeutet. */
      difference: DifferenceSignal;
      /** Antworten ausserhalb der Aussage („noch kein klares Bild“): immer ein Gespraechsimpuls. */
      conversationOptions?: readonly string[];
      /** Hat jemand diese Option gewaehlt und die anderen nicht, gilt `needs_clarification`. */
      escalateIfChosen?: readonly string[];
    }
  | {
      method: "ordinal_distance";
      /** Die geordnete Skala; `income_months` ordnet nach Monaten bis zum Einkommensbedarf. */
      scale: readonly string[] | "income_months";
      /** Antworten ausserhalb der Skala: Gespraechsimpuls. */
      conversationOptions?: readonly string[];
      /** Abstand ab dem ein Signal gilt (aufsteigend). Darunter: kein Hinweis. */
      steps: readonly Step[];
    }
  | {
      method: "set_overlap";
      difference: DifferenceSignal;
      /** Zwei Optionen, die verschiedene Personen halten: dann `needs_clarification`. */
      escalatePairs?: readonly (readonly [string, string])[];
    }
  | {
      method: "numeric_range";
      steps: readonly Step[];
      /** 0 gegen einen Wert > 0 ist immer `needs_clarification`. */
      zeroVersusPositive?: boolean;
    }
  | { method: "crosscheck"; against: string };

/** „Einkommensbedarf ab“: Monate, die „nicht innerhalb von zwölf Monaten“ ordnend gilt (nur zum Ordnen). */
export const INCOME_NOT_WITHIN_YEAR_MONTHS = 13;

export const COMPARE_RULES: Readonly<Record<string, ItemRule>> = {
  Z01: { method: "equality", difference: "needs_clarification", conversationOptions: ["Z01_o5"] },
  Z02: { method: "set_overlap", difference: "conversation_only" },
  Z03: { method: "equality", difference: "conversation_only" },
  F01: {
    method: "ordinal_distance",
    scale: ["F01_o1", "F01_o2", "F01_o3"],
    conversationOptions: ["F01_o4", "F01_o5"],
    steps: [{ minDistance: 1, signal: "neutral_difference" }, { minDistance: 2, signal: "needs_clarification" }],
  },
  F02: {
    method: "ordinal_distance",
    scale: ["F02_o1", "F02_o2", "F02_o3"],
    conversationOptions: ["F02_o4"],
    steps: [{ minDistance: 1, signal: "neutral_difference" }, { minDistance: 2, signal: "needs_clarification" }],
  },
  O01: { method: "set_overlap", difference: "conversation_only" },
  C01: { method: "numeric_range", steps: [{ minDistance: 1, signal: "neutral_difference" }] },
  C02: { method: "crosscheck", against: "C01" },
  C03: {
    method: "set_overlap",
    difference: "neutral_difference",
    escalatePairs: [["C03_o1", "C03_o7"]],
  },
  C04: {
    method: "equality",
    difference: "neutral_difference",
    conversationOptions: ["C04_o5"],
    escalateIfChosen: ["C04_o4"],
  },
  M01: {
    method: "ordinal_distance",
    scale: "income_months",
    steps: [{ minDistance: 3, signal: "neutral_difference" }, { minDistance: 6, signal: "needs_clarification" }],
  },
  M02: {
    method: "ordinal_distance",
    scale: ["M02_o1", "M02_o2", "M02_o3", "M02_o4", "M02_o5"],
    steps: [{ minDistance: 1, signal: "neutral_difference" }, { minDistance: 2, signal: "needs_clarification" }],
  },
  M03: {
    method: "numeric_range",
    steps: [{ minDistance: 2, signal: "neutral_difference" }, { minDistance: 4, signal: "needs_clarification" }],
    zeroVersusPositive: true,
  },
  T01: {
    method: "ordinal_distance",
    scale: ["T01_o1", "T01_o2", "T01_o3", "T01_o4"],
    steps: [{ minDistance: 1, signal: "neutral_difference" }, { minDistance: 2, signal: "needs_clarification" }],
  },
  T02: {
    method: "ordinal_distance",
    scale: ["T02_o1", "T02_o2", "T02_o3", "T02_o4"],
    steps: [{ minDistance: 1, signal: "neutral_difference" }, { minDistance: 2, signal: "needs_clarification" }],
  },
  E01: {
    method: "ordinal_distance",
    scale: ["E01_o1", "E01_o2", "E01_o3", "E01_o4", "E01_o5"],
    steps: [{ minDistance: 1, signal: "neutral_difference" }, { minDistance: 3, signal: "needs_clarification" }],
  },
  E02: { method: "equality", difference: "needs_clarification", conversationOptions: ["E02_o5"] },
  // Bis der Pretest zeigt, welche Unterschiede Klaerung brauchen: jeder Unterschied ein Gespraechsimpuls.
  // Kein Veto-Thema wird anders behandelt als ein anderes.
  E03: { method: "set_overlap", difference: "conversation_only" },
  N01: {
    method: "ordinal_distance",
    scale: ["N01_o1", "N01_o2", "N01_o3", "N01_o4"],
    conversationOptions: ["N01_o5"],
    steps: [{ minDistance: 1, signal: "neutral_difference" }, { minDistance: 2, signal: "needs_clarification" }],
  },
};

/** Die Bedeutung eines Unterschieds als Stance fuer die Modulbeschreibung (Registry): die staerkste Stufe der Regel. */
export function stanceOf(rule: ItemRule): CompareStance {
  const signals: Signal[] = [];
  if (rule.method === "equality" || rule.method === "set_overlap") {
    signals.push(rule.difference);
    if (rule.method === "set_overlap" && rule.escalatePairs?.length) signals.push("needs_clarification");
    if (rule.method === "equality" && rule.escalateIfChosen?.length) signals.push("needs_clarification");
  } else if (rule.method === "ordinal_distance" || rule.method === "numeric_range") {
    signals.push(...rule.steps.map((step) => step.signal));
  } else {
    signals.push("needs_clarification");
  }
  if (signals.includes("needs_clarification")) return "needs_clarification";
  if (signals.includes("conversation_only")) return "conversation_only";
  return "neutral_difference";
}

export function methodOf(rule: ItemRule): CompareMethod {
  return rule.method;
}

/** Wie stark ein Signal ist - nur zum Waehlen des staerksten, nie als Wert. */
export const SIGNAL_PRECEDENCE: Readonly<Record<Signal, number>> = {
  same: 0,
  none: 1,
  neutral_difference: 2,
  conversation_only: 3,
  needs_clarification: 4,
};
