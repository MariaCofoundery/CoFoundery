import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * Erwartungsabgleich vor einer Finanzierung.
 *
 * Jede Person beantwortet fuer sich, dann sieht das Team vor allem, wo die Antworten
 * verschieden sind. Keine richtige Antwort, kein Score, kein Vergleich mit anderen Teams,
 * kein Freitext. Was a, b und c je Frage heissen, steht in den Texten (teams.financing.alignment).
 */
export const FINANCING_ALIGNMENT_QUESTIONS = ["pace", "control", "dilution", "exit", "horizon", "involvement", "time"] as const;
export type FinancingAlignmentQuestion = (typeof FINANCING_ALIGNMENT_QUESTIONS)[number];

export const FINANCING_ALIGNMENT_ANSWERS = ["a", "b", "c", "unsure"] as const;
export type FinancingAlignmentAnswer = (typeof FINANCING_ALIGNMENT_ANSWERS)[number];

export const isFinancingAlignmentAnswer = (value: unknown): value is FinancingAlignmentAnswer =>
  typeof value === "string" && (FINANCING_ALIGNMENT_ANSWERS as readonly string[]).includes(value);

/** Wo ein Unterschied im Founder Setup besprochen wird. */
export const FINANCING_ALIGNMENT_SETUP_TOPIC: Record<FinancingAlignmentQuestion, FounderSetupItemKey> = {
  pace: "vision_goals",
  control: "decision_rights",
  dilution: "investor_dilution",
  exit: "company_sale",
  horizon: "vision_goals",
  involvement: "investor_dilution",
  time: "time_commitment",
};

export type FinancingAlignmentAnswers = Record<FinancingAlignmentQuestion, FinancingAlignmentAnswer>;

/** Nimmt nur eine vollstaendige Antwortliste mit bekannten Werten an. */
export function parseFinancingAlignmentAnswers(input: unknown): FinancingAlignmentAnswers | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const out = {} as FinancingAlignmentAnswers;
  for (const question of FINANCING_ALIGNMENT_QUESTIONS) {
    const value = source[question];
    if (!isFinancingAlignmentAnswer(value)) return null;
    out[question] = value;
  }
  return out;
}

export type QuestionComparison = {
  question: FinancingAlignmentQuestion;
  /**
   * same   alle dasselbe gewaehlt
   * differ mindestens zwei verschiedene echte Antworten (a, b, c)
   * open   hoechstens eine echte Antwort, aber mindestens eine Person weiss es noch nicht:
   *        ein offener Punkt, kein Streit
   */
  state: "same" | "differ" | "open";
  answers: Array<{ userId: string; answer: FinancingAlignmentAnswer }>;
};

/**
 * Vergleicht die Antworten je Frage. "Einig" heisst: alle dieselbe Wahl. Eine Person, die es noch
 * nicht weiss, macht daraus keinen Streit, sondern einen offenen Punkt.
 */
export function compareFinancingAlignment(
  rows: ReadonlyArray<{ userId: string; question: string; answer: string }>
): QuestionComparison[] {
  return FINANCING_ALIGNMENT_QUESTIONS.map((question) => {
    const answers = rows
      .filter((row) => row.question === question && isFinancingAlignmentAnswer(row.answer))
      .map((row) => ({ userId: row.userId, answer: row.answer as FinancingAlignmentAnswer }));
    const distinct = new Set(answers.map((entry) => entry.answer));
    const real = new Set(answers.map((entry) => entry.answer).filter((answer) => answer !== "unsure"));
    const state: QuestionComparison["state"] = real.size >= 2 ? "differ" : distinct.size === 1 ? "same" : "open";
    return { question, state, answers };
  });
}
