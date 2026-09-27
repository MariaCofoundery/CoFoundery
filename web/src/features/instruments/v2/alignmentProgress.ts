import { getMvpAlignmentItems } from "@/features/instruments/v2/alignmentRegistryV2";
import { getMvpContextBlocks, getMvpValueCases } from "@/features/instruments/v2/contextRegistryV2";
import { moduleOfBlock } from "@/features/instruments/v2/alignmentAnswersV2";

/**
 * Was für eine Abgabe vorliegen muss.
 *
 * ---------------------------------------------------------------------------
 * ES GIBT KEINE ÜBERSPRUNGENE FRAGE MEHR
 * ---------------------------------------------------------------------------
 *
 * In v1 war „nicht beantwortet" ein Zustand ohne Aussage - man wusste nicht,
 * ob jemand die Frage nicht verstanden, nicht gewollt oder nicht gesehen hat.
 * Deshalb musste die Auswertung raten, und Raten hieß meistens: die Mitte.
 *
 * In v2 hat jedes Auslassen ein Wort: „noch offen", „möchte ich nicht
 * angeben", „kann ich noch nicht einschätzen", „vertraulich klären". Ein Test
 * beweist, dass sich JEDER der 107 Blöcke beantworten lässt, notfalls mit
 * einem Grund.
 *
 * Damit wird Vollständigkeit zumutbar - und zur Regel: Eine Abgabe verlangt
 * für jeden Block der Gesprächsfassung eine Zeile. Das ist keine Härte,
 * sondern das Gegenteil: Niemand muss mehr etwas hinschreiben, was er nicht
 * meint, nur um weiterzukommen.
 */

export type AlignmentModule = "base" | "values";

/**
 * Die Blöcke eines Fragebogens - und bei `base` des jeweiligen Schrittes.
 *
 * Schritt 1 ist das erste Ausfüllen. Schritt 2 sind die Zusagen: Stunden,
 * Geld, Termine. Die kommen später, weil sie eine Festlegung verlangen, bevor
 * überhaupt klar ist, mit wem.
 */
export function requiredBlocks(module: AlignmentModule, step?: 1 | 2): string[] {
  const all = [
    ...getMvpAlignmentItems().map((item) => item.itemId),
    ...getMvpContextBlocks(step).map((block) => block.blockId),
    ...getMvpValueCases().map((value) => value.caseId),
  ];

  return all
    .filter((blockId) => moduleOfBlock(blockId) === module)
    // Die Präferenzitems gehören zum ersten Schritt; `getMvpContextBlocks`
    // filtert schon selbst, die Items müssen hier ausgenommen werden.
    .filter((blockId) => step !== 2 || !isPreferenceItem(blockId))
    .sort();
}

function isPreferenceItem(blockId: string): boolean {
  return getMvpAlignmentItems().some((item) => item.itemId === blockId);
}

/** Was für eine Abgabe noch fehlt. Leer heißt: kann abgegeben werden. */
export function missingRequiredBlocks(
  module: AlignmentModule,
  answeredBlockIds: readonly string[],
  step?: 1 | 2
): string[] {
  const answered = new Set(answeredBlockIds);
  return requiredBlocks(module, step).filter((blockId) => !answered.has(blockId));
}
