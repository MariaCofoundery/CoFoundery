import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { readAnswer, type ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import {
  compareV21,
  agendaV21,
  type ItemComparison,
} from "@/features/instruments/v21/comparisonV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

/**
 * Der Vergleich zweier Menschen, fertig zusammengestellt.
 *
 * Reine Funktion über bereits geladenen Zeilen - damit sie ohne Datenbank
 * prüfbar bleibt. Was aus der Datenbank kommt, steht in der Seite.
 */

export type StoredRow = {
  block_id: string;
  value: unknown;
  missing_code: string | null;
  marked_for_discussion?: boolean | null;
};

export type SideInput = {
  name: string;
  instrumentId: string;
  rows: readonly StoredRow[];
  /** Was diese Person ausdrücklich NICHT freigegeben hat. */
  notSharedItemIds?: readonly string[];
};

export type ComparisonV21 = {
  sections: { section: string; items: ItemComparison[] }[];
  agenda: ReturnType<typeof agendaV21>;
  /** Was jemand zurückgehalten hat - genannt, nicht als Antwort getarnt. */
  notShared: { itemId: string; side: "a" | "b" }[];
};

/**
 * Zwei Fassungen werden nicht gemischt.
 *
 * WIRFT, STATT ZU RATEN. Eine Auswertung, die auf eine andere Fassung trifft,
 * hat zwei Möglichkeiten: abbrechen oder so tun, als wäre es die eigene. Das
 * Zweite ist die stille Umdeutung, gegen die dieses ganze Instrument gebaut
 * ist - A01 heißt in v2 und v2.1 nicht dasselbe.
 */
export function assertComparableV21(a: string, b: string): void {
  for (const instrumentId of [a, b]) {
    if (instrumentId !== ALIGNMENT_V21_INSTRUMENT_ID) {
      throw new Error(
        `instrument_mismatch: erwartet ${ALIGNMENT_V21_INSTRUMENT_ID}, bekommen ${instrumentId}`,
      );
    }
  }
}

export function buildComparisonV21(a: SideInput, b: SideInput): ComparisonV21 {
  // ZUERST DIE FASSUNG. Alles Weitere wäre sinnlos, wenn die beiden
  // verschiedene Instrumente ausgefüllt haben.
  assertComparableV21(a.instrumentId, b.instrumentId);

  const withheldA = new Set(a.notSharedItemIds ?? []);
  const withheldB = new Set(b.notSharedItemIds ?? []);

  const readA = readSide(a.rows, withheldA);
  const readB = readSide(b.rows, withheldB);

  const sections = compareV21(readA, readB);

  // Beide Markierungen zählen. „Darüber möchte ich sprechen“ ist ein Wunsch
  // an das Gespräch, nicht an die andere Person - er gilt auch dann, wenn nur
  // eine von beiden ihn gesetzt hat.
  const marked = [
    ...a.rows.filter((row) => row.marked_for_discussion).map((row) => row.block_id),
    ...b.rows.filter((row) => row.marked_for_discussion).map((row) => row.block_id),
  ];

  return {
    sections,
    agenda: agendaV21(sections, marked),
    notShared: [
      ...[...withheldA].map((itemId) => ({ itemId, side: "a" as const })),
      ...[...withheldB].map((itemId) => ({ itemId, side: "b" as const })),
    ],
  };
}

/**
 * Zurückgehaltene Antworten kommen gar nicht erst herein.
 *
 * Nicht ausgegraut, nicht als „fehlt“ - sie werden nicht gelesen. Wer eine
 * Antwort nicht freigibt, hat entschieden, dass die andere Person sie nicht
 * sieht; sie durch den Vergleich laufen zu lassen und erst in der Anzeige zu
 * verstecken wäre ein Versehen weg vom Datenleck.
 */
function readSide(
  rows: readonly StoredRow[],
  withheld: Set<string>,
): Record<string, ReadoutEntry> {
  const out: Record<string, ReadoutEntry> = {};
  for (const row of rows) {
    if (withheld.has(row.block_id)) continue;
    const answer = (row.missing_code
      ? { blockId: row.block_id, missingCode: row.missing_code }
      : { blockId: row.block_id, value: row.value }) as AlignmentAnswerV21;
    const entry = readAnswer(answer);
    if (entry) out[row.block_id] = entry;
  }
  return out;
}
