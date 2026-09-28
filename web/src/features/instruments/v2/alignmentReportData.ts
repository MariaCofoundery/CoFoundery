import { ALIGNMENT_REGISTRY_V2, getAlignmentPreferences } from "@/features/instruments/v2/alignmentRegistryV2";
import { getContextBlocks, getValueCases } from "@/features/instruments/v2/contextRegistryV2";
import {
  READOUT_UNCERTAINTIES,
  buildReadout,
  type ReadoutEntry,
  type StoredAnswerRow,
} from "@/features/instruments/v2/alignmentReadout";
import { CONVERSATION_LIBRARY_V2 } from "@/features/instruments/v2/conversationCardsV2";
import { requiredBlocks } from "@/features/instruments/v2/alignmentProgress";

/**
 * Der Einzelreport - was du geantwortet hast, geordnet.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER NICHT STEHT
 * ---------------------------------------------------------------------------
 *
 * Kein Profil, kein Typ, keine Einordnung, keine Zahl. Teil F4 sagt für
 * Solo-Founder: „Angezeigt werden eigene Präferenzen, Angebotsrahmen und
 * offene Anforderungen an künftige Partner." Genau das ist es.
 *
 * DER EINZELREPORT IST KEIN BEFUND ÜBER DICH, SONDERN EINE VORBEREITUNG. Er
 * dient dem Gespräch, das noch kommt - und deshalb steht am Ende keine
 * Zusammenfassung, sondern eine Liste offener Punkte.
 *
 * ---------------------------------------------------------------------------
 * WAS OFFEN GEBLIEBEN IST, IST EIN EIGENER ABSCHNITT
 * ---------------------------------------------------------------------------
 *
 * „Noch offen" ist im Produkt der nützlichste Befund: Es benennt genau die
 * Stellen, über die zu sprechen wäre. Sie zwischen die beantworteten Fragen zu
 * mischen hieße, sie zu verstecken.
 */

export type ReportSection = {
  key: string;
  label: string;
  /** Die Bedingung gilt für die ganze Gruppe, nicht je Frage. */
  condition: string | null;
  entries: ReadoutEntry[];
};

export type AlignmentReport = {
  sections: ReportSection[];
  /** Was noch offen ist - eigener Abschnitt, nicht eingestreut. */
  open: { entry: ReadoutEntry; label: string | null }[];
  /** Was noch gar nicht beantwortet wurde. */
  unanswered: string[];
  /** Zur Besprechung markiert. */
  marked: string[];
  uncertainties: typeof READOUT_UNCERTAINTIES;
  /** Der Text für „noch kein Team“ aus Teil G, wenn kein Vergleich vorliegt. */
  soloNote: { observed: string; meaning: string; question: string } | null;
};

const GROUP_LABELS: Record<string, string> = {
  S: "Unternehmerische Ziele",
  R: "Ressourcen und Zusagen",
  B: "Risiken und Grenzen",
  G: "Entscheidungs- und Konfliktvereinbarungen",
  L: "Deine Grenzen",
};

/** Auslassungsgründe, die ein Gesprächsanlass sind - und die, die keiner sind. */
const OPEN_CODES = new Set(["undecided", "cannot_assess", "confidential_first"]);

export function buildAlignmentReport(
  rows: readonly StoredAnswerRow[],
  options: { hasComparison?: boolean; markedBlockIds?: readonly string[] } = {}
): AlignmentReport {
  const entries = buildReadout(rows);
  const byId = new Map(entries.map((entry) => [entry.blockId, entry]));

  const sections: ReportSection[] = [];

  for (const preference of getAlignmentPreferences()) {
    const found = preference.items
      .map((item) => byId.get(item.itemId))
      .filter((entry): entry is ReadoutEntry => Boolean(entry));
    if (found.length) {
      sections.push({
        key: preference.id,
        label: preference.label,
        // EINMAL ÜBER DER GRUPPE STATT ÜBER JEDER FRAGE. Sie gilt für alle
        // Items der Präferenz; sie fünfmal zu wiederholen macht sie zur
        // Randnotiz, die niemand mehr liest.
        condition: preference.condition,
        entries: found,
      });
    }
  }

  for (const group of ["S", "R", "B", "G", "L"] as const) {
    const found = getContextBlocks(group)
      .map((block) => byId.get(block.blockId))
      .filter((entry): entry is ReadoutEntry => Boolean(entry));
    if (found.length) {
      sections.push({ key: group, label: GROUP_LABELS[group], condition: null, entries: found });
    }
  }

  const cases = getValueCases()
    .map((card) => byId.get(card.caseId))
    .filter((entry): entry is ReadoutEntry => Boolean(entry));
  if (cases.length) {
    sections.push({ key: "W", label: "Prioritäten und Grenzen", condition: null, entries: cases });
  }

  const open = entries
    .filter((entry) => !entry.answered)
    .filter((entry) => OPEN_CODES.has(entry.missing!.code))
    .map((entry) => ({ entry, label: entry.missing!.label }));

  const answered = new Set(entries.map((entry) => entry.blockId));
  const unanswered = [...requiredBlocks("base", 1), ...requiredBlocks("base", 2), ...requiredBlocks("values")]
    .filter((blockId) => !answered.has(blockId));

  const solo = CONVERSATION_LIBRARY_V2.cards.find((card) => card.id === "solo");

  return {
    sections,
    open,
    unanswered,
    marked: [...(options.markedBlockIds ?? [])],
    uncertainties: READOUT_UNCERTAINTIES,
    soloNote:
      options.hasComparison || !solo
        ? null
        : { observed: solo.observed, meaning: solo.meaning, question: solo.question },
  };
}

/** Die Fassung, aus der dieser Report stammt - gehört sichtbar dazu. */
export const REPORT_INSTRUMENT_LABEL = `${ALIGNMENT_REGISTRY_V2.instrumentId} (${ALIGNMENT_REGISTRY_V2.registryVersion}, ${ALIGNMENT_REGISTRY_V2.status})`;
