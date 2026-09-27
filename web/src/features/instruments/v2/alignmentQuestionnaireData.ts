import { ALIGNMENT_REGISTRY_V2, getAlignmentPreferences, getMvpAlignmentItems } from "@/features/instruments/v2/alignmentRegistryV2";
import {
  CONTEXT_REGISTRY_V2,
  getMvpContextBlocks,
  getMvpValueCases,
  type ContextBlock,
  type ValueCase,
} from "@/features/instruments/v2/contextRegistryV2";
import { answerFormatOfBlock, type StoredAnswerFormat } from "@/features/instruments/v2/alignmentAnswersV2";
import { requiredBlocks, type AlignmentModule } from "@/features/instruments/v2/alignmentProgress";
import { offeredMissingCodes } from "@/features/instruments/v2/validateAlignmentAnswer";
import type { MissingCode } from "@/features/instruments/v2/alignmentRegistryV2";

/**
 * Was ein Fragebogen anzeigt - fertig zusammengestellt auf dem Server.
 *
 * ALLES, WAS DER BROWSER BRAUCHT, UND NICHTS DARÜBER HINAUS. Die Registratur
 * bleibt auf dem Server: Sie enthält zu jedem Block die Begründung, den
 * Evidenzstatus und die Auswertungsregel. Das ist Material für uns, nicht für
 * den Bildschirm - und es sind 107 Blöcke, die sonst in jedem Browser lägen.
 */

export type AlignmentBlockView = {
  blockId: string;
  prompt: string;
  answerFormat: StoredAnswerFormat;
  /** Die Bedingung gehört zur Messung, nicht zur Verzierung - siehe unten. */
  condition: string | null;
  scaleLabels: string[];
  /**
   * Kennung UND Beschriftung.
   *
   * DIE BESCHRIFTUNG KOMMT AUS DER REGISTRATUR, NICHT AUS DEM TEXTBESTAND.
   * „Noch offen" und „möchte ich nicht angeben" sind Antwortmöglichkeiten und
   * damit Teil der Messung - genauso wie die Fragen. Sie zweimal zu pflegen
   * hiesse, dass sie auseinanderlaufen können; sie zu übersetzen hiesse,
   * etwas anderes zu messen.
   */
  offeredMissing: { code: MissingCode["code"]; label: string }[];
  block?: ContextBlock;
  valueCase?: ValueCase;
};

export type AlignmentSectionView = {
  key: string;
  /** Überschrift aus der Quelle, etwa „Unternehmerische Ziele". */
  label: string | null;
  blocks: AlignmentBlockView[];
};

const GROUP_LABELS: Record<string, string> = {
  S: "Unternehmerische Ziele",
  R: "Ressourcen und Zusagen",
  B: "Risiken und Grenzen",
  G: "Entscheidungs- und Konfliktvereinbarungen",
  L: "Deine Grenzen",
};


/** Die Auslassungsgründe eines Blocks, mit ihrer Beschriftung aus der Quelle. */
function missingFor(blockId: string): { code: MissingCode["code"]; label: string }[] {
  const labels = new Map(ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => [entry.code, entry.label]));
  return offeredMissingCodes(blockId)
    // 'technical' ist ein Befund des Systems und hat deshalb gar keine
    // Beschriftung - er wird niemandem angeboten.
    .filter((code) => code !== "technical")
    .map((code) => ({ code, label: labels.get(code) ?? code }));
}

export function buildAlignmentSections(
  module: AlignmentModule,
  step?: 1 | 2
): AlignmentSectionView[] {
  const wanted = new Set(requiredBlocks(module, step));
  const sections: AlignmentSectionView[] = [];

  if (module === "base") {
    // ueber den Leser, nicht ueber die rohe Registratur: sonst stuende hier
    // der Originalwortlaut und in jeder anderen Ansicht die ueberarbeitete
    // Fassung - dieselbe Frage, zweimal verschieden gestellt.
    for (const preference of getAlignmentPreferences()) {
      const blocks = getMvpAlignmentItems()
        .filter((item) => wanted.has(item.itemId))
        .filter((item) => preference.items.some((entry) => entry.itemId === item.itemId))
        .map((item) => ({
          blockId: item.itemId,
          prompt: item.prompt,
          answerFormat: item.answerFormat as StoredAnswerFormat,
          // OHNE DIESEN SATZ MISST DIE PRÄFERENZ ETWAS ANDERES. „Stell dir
          // vor, dein Verantwortungsbereich ist vereinbart" ist kein
          // Hilfetext, den die Oberfläche weglassen darf.
          condition: preference.condition,
          scaleLabels: ALIGNMENT_REGISTRY_V2.answerFormats[item.answerFormat].labels,
          offeredMissing: missingFor(item.itemId),
        }));
      if (blocks.length) sections.push({ key: preference.id, label: preference.label, blocks });
    }
  }

  for (const group of ["S", "R", "B", "G", "L"] as const) {
    const blocks = getMvpContextBlocks(step)
      .filter((block) => block.group === group && wanted.has(block.blockId))
      .map((block) => ({
        blockId: block.blockId,
        prompt: block.prompt,
        answerFormat: block.answerFormat as StoredAnswerFormat,
        condition: null,
        scaleLabels: CONTEXT_REGISTRY_V2.importanceLabels,
        offeredMissing: missingFor(block.blockId),
        block,
      }));
    if (blocks.length) sections.push({ key: group, label: GROUP_LABELS[group], blocks });
  }

  const cards = getMvpValueCases().filter((value) => wanted.has(value.caseId));
  for (const card of cards) {
    sections.push({
      key: card.caseId,
      label: card.title,
      blocks: [{
        blockId: card.caseId,
        // Die Situation IST die Frage - sie steht als Absatz über den Wegen.
        prompt: card.situation,
        answerFormat: answerFormatOfBlock(card.caseId)!,
        condition: null,
        scaleLabels: CONTEXT_REGISTRY_V2.importanceLabels,
        offeredMissing: missingFor(card.caseId),
        valueCase: card,
      }],
    });
  }

  return sections;
}
