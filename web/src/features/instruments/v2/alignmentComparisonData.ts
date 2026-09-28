import { buildReadout, type StoredAnswerRow } from "@/features/instruments/v2/alignmentReadout";
import {
  assertComparableInstruments,
  clarificationsNeeded,
  compareBlocks,
  expectationGaps,
  type BlockComparison,
  type Clarification,
  type ExpectationGap,
  type Side,
} from "@/features/instruments/v2/alignmentComparison";
import { buildAgenda, type AgendaItem } from "@/features/instruments/v2/alignmentAgenda";
import {
  buildConversationCards,
  type ConversationCard,
} from "@/features/instruments/v2/conversationCardsV2";

/**
 * Der Vergleich zweier Menschen, fertig zusammengestellt.
 *
 * Reine Funktion über bereits geladenen Zeilen - damit sie ohne Datenbank
 * prüfbar bleibt. Was aus der Datenbank kommt, steht in der Seite.
 */

export type ComparisonSideInput = {
  name: string;
  instrumentId: string;
  rows: readonly StoredAnswerRow[];
  markedBlockIds: readonly string[];
  /** Was diese Person ausdrücklich nicht freigegeben hat. */
  notSharedBlockIds: readonly string[];
};

export type AlignmentComparison = {
  comparisons: BlockComparison[];
  gaps: ExpectationGap[];
  clarifications: Clarification[];
  agenda: AgendaItem[];
  cards: ConversationCard[];
};

export function buildAlignmentComparison(
  a: ComparisonSideInput,
  b: ComparisonSideInput
): AlignmentComparison {
  // ZUERST DIE FASSUNG. Alles Weitere waere sinnlos, wenn die beiden
  // verschiedene Instrumente ausgefuellt haben.
  assertComparableInstruments(a.instrumentId, b.instrumentId);

  const readA = buildReadout(a.rows);
  const readB = buildReadout(b.rows);

  const comparisons = compareBlocks(
    readA, readB, a.markedBlockIds, b.markedBlockIds, a.notSharedBlockIds, b.notSharedBlockIds
  );

  const gaps = expectationGaps(offersOf(readA, "a").concat(offersOf(readB, "b")),
                               expectationsOf(readA, "a").concat(expectationsOf(readB, "b")));

  const clarifications = clarificationsNeeded(comparisons, gaps);
  const agenda = buildAgenda(comparisons, clarifications);
  const cards = buildConversationCards(agenda, {
    nameA: a.name, nameB: b.name, comparisons, gaps,
  });

  return { comparisons, gaps, clarifications, agenda, cards };
}

/** Was jemand an Zeit zusagt - R01. */
function offersOf(entries: ReturnType<typeof buildReadout>, side: Side) {
  const entry = entries.find((one) => one.blockId === "R01");
  if (!entry?.answered || entry.value.kind !== "range") return [];
  return [{ side, min: entry.value.min, max: entry.value.max, unit: entry.value.unit }];
}

/** Was jemand von wem erwartet - R02, je Empfänger getrennt. */
function expectationsOf(entries: ReturnType<typeof buildReadout>, side: Side) {
  const entry = entries.find((one) => one.blockId === "R02");
  if (!entry?.answered || entry.value.kind !== "recipients") return [];
  const unit = entry.value.unit;
  return entry.value.per.map((one) => ({
    side, recipient: one.recipient, min: one.min, max: one.max, unit,
  }));
}
