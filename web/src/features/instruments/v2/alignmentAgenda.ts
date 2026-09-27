import type { BlockComparison, Clarification } from "@/features/instruments/v2/alignmentComparison";

/**
 * Worüber ihr sprechen solltet - in einer Reihenfolge, die man nachlesen kann.
 *
 * ---------------------------------------------------------------------------
 * DIE REIHENFOLGE STEHT IN TEIL F6, UND SIE IST KEIN RISIKORANG
 * ---------------------------------------------------------------------------
 *
 * 1. Jemand hat das Thema selbst zur Besprechung markiert.
 * 2. Eine konkrete Erwartung ist nicht gedeckt oder eine Grenze berührt.
 * 3. Eine Regel, die ihr für einen geplanten Schritt braucht, ist offen.
 * 4. Alles Übrige, was unterschiedlich beantwortet wurde.
 *
 * Das Gutachten sagt dazu ausdrücklich: „Diese Reihenfolge ist eine
 * UX-Entscheidung, kein validierter Risikorang." Sie behauptet nicht, dass
 * Punkt 1 gefährlicher ist als Punkt 4 - sie behauptet, dass man dort anfangen
 * sollte.
 *
 * UND DER SATZ DANEBEN IST DER WICHTIGERE: „Nicht still die größten
 * numerischen Differenzen als die wichtigsten Konflikte wählen."
 *
 * Das wäre der naheliegende Weg gewesen - sortiere nach Abstand, oben steht
 * der größte. Er ist falsch, weil er zwei Dinge verwechselt: wie weit zwei
 * Antworten auseinanderliegen und wie sehr das jemanden beschäftigt. Deshalb
 * steht die selbst gesetzte Markierung ganz oben, auch wenn beide dieselbe
 * Antwort gegeben haben. Wer sagt „darüber möchte ich reden", weiß das besser
 * als jede Rechnung.
 */

export type AgendaReason = "marked" | "expectation_or_limit" | "open_rule" | "different";

export type AgendaItem = {
  blockId: string;
  prompt: string;
  /** 1 bis 4 - die Regel aus F6, nicht ein Schweregrad. */
  priority: 1 | 2 | 3 | 4;
  reason: AgendaReason;
  detail?: string;
  markedBy: BlockComparison["markedBy"];
};

/**
 * Wofür ein Team ein Thema später markieren kann.
 *
 * Teil F6: „Nach der ersten Klärung können Teams markieren: verstanden /
 * vereinbart / weiterer Gesprächsbedarf / derzeit nicht relevant." Und der
 * Nachsatz, der das Missverständnis ausschließt, das sonst entstünde:
 * „‚Vereinbart‘ heißt dokumentierter Konsens, nicht gemessene psychologische
 * Kompatibilität."
 */
export const AGENDA_OUTCOMES = [
  "understood",
  "agreed",
  "needs_more_talk",
  "not_relevant_now",
] as const;
export type AgendaOutcome = (typeof AGENDA_OUTCOMES)[number];

/** Regeln, die ein Team braucht, bevor es den nächsten Schritt geht. */
const RULE_BLOCKS = ["G01", "G02", "G03", "G04"];

export function buildAgenda(
  comparisons: readonly BlockComparison[],
  clarifications: readonly Clarification[]
): AgendaItem[] {
  const byBlock = new Map(comparisons.map((entry) => [entry.blockId, entry]));
  const items = new Map<string, AgendaItem>();

  const add = (item: AgendaItem) => {
    const existing = items.get(item.blockId);
    // Die kleinere Zahl gewinnt: Ein markiertes Thema bleibt oben, auch wenn
    // es zusätzlich unterschiedlich beantwortet wurde.
    if (!existing || item.priority < existing.priority) items.set(item.blockId, item);
  };

  // 1. Selbst markiert - vor allem anderen, auch bei gleicher Antwort.
  for (const entry of comparisons) {
    if (entry.markedBy.length > 0) {
      add({
        blockId: entry.blockId,
        prompt: entry.prompt,
        priority: 1,
        reason: "marked",
        markedBy: entry.markedBy,
      });
    }
  }

  // 2. Eine Erwartung ist nicht gedeckt oder eine Grenze berührt.
  for (const clarification of clarifications) {
    if (clarification.kind !== "expectation_not_covered") continue;
    for (const blockId of clarification.blockIds) {
      const entry = byBlock.get(blockId);
      add({
        blockId,
        prompt: entry?.prompt ?? blockId,
        priority: 2,
        reason: "expectation_or_limit",
        detail: clarification.detail,
        markedBy: entry?.markedBy ?? [],
      });
    }
  }

  // 3. Eine notwendige Regel ist offen.
  for (const clarification of clarifications) {
    if (clarification.kind !== "decision_rule_unclear") continue;
    for (const blockId of clarification.blockIds) {
      const entry = byBlock.get(blockId);
      add({
        blockId,
        prompt: entry?.prompt ?? blockId,
        priority: 3,
        reason: "open_rule",
        detail: clarification.detail,
        markedBy: entry?.markedBy ?? [],
      });
    }
  }
  for (const blockId of RULE_BLOCKS) {
    const entry = byBlock.get(blockId);
    if (entry && entry.state === "not_comparable") {
      add({
        blockId,
        prompt: entry.prompt,
        priority: 3,
        reason: "open_rule",
        detail: "Diese Regel hat noch nicht jeder von euch beantwortet.",
        markedBy: entry.markedBy,
      });
    }
  }

  // 4. Alles Übrige, was unterschiedlich beantwortet wurde.
  for (const entry of comparisons) {
    if (entry.state !== "different") continue;
    add({
      blockId: entry.blockId,
      prompt: entry.prompt,
      priority: 4,
      reason: "different",
      markedBy: entry.markedBy,
    });
  }

  // Innerhalb einer Stufe bleibt die Reihenfolge des Fragebogens. KEINE
  // Sortierung nach Abstand - genau die verbietet F6.
  const order = new Map(comparisons.map((entry, index) => [entry.blockId, index]));
  return [...items.values()].sort(
    (a, b) => a.priority - b.priority || (order.get(a.blockId) ?? 0) - (order.get(b.blockId) ?? 0)
  );
}
