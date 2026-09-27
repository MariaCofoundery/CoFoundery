import {
  ALIGNMENT_REGISTRY_V2,
  getAlignmentItems,
  getAlignmentPreferences,
  type MissingCode,
} from "@/features/instruments/v2/alignmentRegistryV2";
import {
  CONTEXT_REGISTRY_V2,
  getContextBlocks,
  getValueCases,
} from "@/features/instruments/v2/contextRegistryV2";
import {
  answerFormatOfBlock,
  answerModeOfBlock,
  type AnswerMode,
  type StoredAnswerFormat,
} from "@/features/instruments/v2/alignmentAnswersV2";

/**
 * Was jemand geantwortet hat - lesbar gemacht, nicht ausgewertet.
 *
 * ---------------------------------------------------------------------------
 * STUFE 0 AUS TEIL F1, UND NICHTS DARÜBER HINAUS
 * ---------------------------------------------------------------------------
 *
 * Das Gutachten erlaubt hier ausdrücklich nur: die Antworten, ihre
 * Originaleinheiten, die Bedingungen und die Gesprächsmarkierungen. Keine
 * latenten Dimensionswerte, keine Normränge, keine Ampeln, keine
 * Kompatibilitätsprozente.
 *
 * DIE WICHTIGSTE ZEILE DES GANZEN TEILS: „Die fünfstufigen Antworten werden
 * intern als geordnete Kategorien gespeichert; ein nummerierter Antwortcode
 * wird nicht automatisch zu einem Messwert."
 *
 * Deshalb gibt dieses Modul für eine Fünferantwort NIE eine Zahl heraus, die
 * wie ein Wert aussieht. Es gibt die Beschriftung („manchmal") und die
 * Position in der Reihenfolge (3 von 5) - und die Position heißt `position`
 * und nicht `value`, damit niemand versucht, damit zu rechnen.
 *
 * WARUM DAS SO STRENG IST. Eine 3 sieht aus wie eine Zahl, also wird sie
 * addiert. Dann gemittelt. Dann verglichen. Dann steht im Report „ihr liegt
 * 1,4 auseinander", und niemand kann mehr sagen, was das bedeutet - weil es
 * nichts bedeutet. Genau diesen Weg ist v1 gegangen.
 *
 * ---------------------------------------------------------------------------
 * ES GIBT HIER KEINE ZUSAMMENFASSUNG, UND DAS IST ABSICHT
 * ---------------------------------------------------------------------------
 *
 * Teil F1 gibt die Formel für einen Skalenindex an und schreibt im selben
 * Absatz: „Für das MVP mit zwei Items je Kandidat wird diese Formel NICHT
 * freigegeben." Sie ist deshalb nicht implementiert - nicht auskommentiert,
 * nicht hinter einem Schalter, nicht vorbereitet. Ein Test hält fest, dass es
 * sie nicht gibt.
 */

export type ReadoutValue =
  /** Fünferskala: Beschriftung und Position. Die Position ist KEIN Messwert. */
  | { kind: "category"; label: string; position: number; of: number }
  | { kind: "choice"; labels: string[]; own: string | null }
  | { kind: "text"; text: string }
  | { kind: "fields"; fields: { label: string; text: string }[] }
  | { kind: "range"; min: number; max: number | null; unit: string }
  | { kind: "money"; min: number; max: number | null; currency: string; basis: string | null }
  | { kind: "recipients"; unit: string; per: { recipient: string; min: number; max: number | null }[] }
  | { kind: "windows"; windows: { days: string[]; from: string; to: string }[] }
  | { kind: "date"; date: string }
  | {
      kind: "case";
      concerns: { label: string; importance: { label: string; position: number; of: number } }[];
      path: { key: string; label: string };
      own: string | null;
    };

export type ReadoutEntry = {
  blockId: string;
  prompt: string;
  /** Teil der Messversion - gehört neben die Antwort, nicht weggelassen. */
  condition: string | null;
  answerMode: AnswerMode;
  answerFormat: StoredAnswerFormat;
} & (
  | { answered: true; value: ReadoutValue; missing?: never; comparable: true }
  | {
      answered: false;
      value?: never;
      missing: { code: MissingCode["code"]; label: string | null };
      /**
       * NICHT VERGLEICHBAR HEISST NICHT SCHLECHT. Teil F2: „Für vertrauliche
       * Finanzangaben ist Auslassen kein negativer Befund. Die betreffenden
       * Felder erscheinen lediglich als nicht vergleichbar."
       */
      comparable: false;
    }
);

export type StoredAnswerRow = {
  block_id: string;
  answer_format: string;
  value: Record<string, unknown> | null;
  missing_code: string | null;
};

/**
 * Die drei Unsicherheiten aus Teil F2 - getrennt, wie das Gutachten verlangt.
 *
 * Sie stehen hier als Daten und nicht als Satz in einer Komponente, weil sie
 * überall dieselben sein müssen: im Einzelreport, im Vergleich, im Export.
 */
export const READOUT_UNCERTAINTIES = [
  {
    key: "self_assessment",
    text:
      "„Noch offen“ und „kann ich noch nicht einschätzen“ sind Antworten über " +
      "den eigenen Klärungsstand - keine Messungenauigkeit.",
  },
  {
    key: "measurement",
    text:
      "Diese Antworten erlauben noch keine präzise Einordnung eines stabilen " +
      "Merkmals. Zuverlässigkeit und Struktur des Instruments sind nicht geprüft.",
  },
  {
    key: "situation",
    text:
      "Ziele und Zusagen gelten zum angegebenen Datum, in der jetzigen Phase " +
      "und unter den genannten Bedingungen. Eine Veränderung kann richtig sein.",
  },
] as const;

export function buildReadout(rows: readonly StoredAnswerRow[]): ReadoutEntry[] {
  const entries: ReadoutEntry[] = [];
  for (const row of rows) {
    const entry = readOne(row);
    if (entry) entries.push(entry);
  }
  return entries;
}

function readOne(row: StoredAnswerRow): ReadoutEntry | null {
  const format = answerFormatOfBlock(row.block_id);
  if (!format) return null;

  const base = {
    blockId: row.block_id,
    prompt: promptOf(row.block_id),
    condition: conditionOf(row.block_id),
    answerMode: answerModeOfBlock(row.block_id),
    answerFormat: format,
  };

  if (row.missing_code) {
    const known = ALIGNMENT_REGISTRY_V2.missingCodes.find((entry) => entry.code === row.missing_code);
    return {
      ...base,
      answered: false,
      // KEIN ZAHLENWERT IRGENDWO. Nicht null, nicht 0, nicht die Mitte.
      missing: { code: row.missing_code as MissingCode["code"], label: known?.label ?? null },
      comparable: false,
    };
  }

  const value = row.value ?? {};
  const read = readValue(row.block_id, format, value);
  if (!read) return null;
  return { ...base, answered: true, value: read, comparable: true };
}

function readValue(
  blockId: string,
  format: StoredAnswerFormat,
  value: Record<string, unknown>
): ReadoutValue | null {
  const category = (raw: unknown, labels: string[]) => {
    const position = Number(raw);
    if (!Number.isInteger(position) || position < 1 || position > labels.length) return null;
    return { label: labels[position - 1], position, of: labels.length };
  };

  switch (format) {
    case "F":
    case "C": {
      const labels = ALIGNMENT_REGISTRY_V2.answerFormats[format].labels;
      const read = category(value.scale, labels);
      return read ? { kind: "category", ...read } : null;
    }

    case "importance_rating": {
      const read = category(value.scale, CONTEXT_REGISTRY_V2.importanceLabels);
      return read ? { kind: "category", ...read } : null;
    }

    case "single_choice":
    case "multi_choice": {
      const block = getContextBlocks().find((entry) => entry.blockId === blockId);
      if (!block) return null;
      // DIE KENNUNG WIRD ZURUECKUEBERSETZT, nicht der gespeicherte Text
      // angezeigt - Teil F7: „Randomisierte Optionen werden vor Interpretation
      // auf ihre stabilen IDs zurückgeführt."
      const ids = format === "single_choice"
        ? [String(value.optionId ?? "")]
        : (Array.isArray(value.optionIds) ? (value.optionIds as string[]) : []);
      const labels = ids
        .map((id) => block.options.find((option) => option.optionId === id)?.value)
        .filter((label): label is string => Boolean(label));
      if (labels.length !== ids.length) return null;
      return { kind: "choice", labels, own: text(value.text) };
    }

    case "free_text": {
      const written = text(value.text);
      return written ? { kind: "text", text: written } : null;
    }

    case "structured_text": {
      const fields = value.fields;
      if (!fields || typeof fields !== "object") return null;
      const filled = Object.entries(fields as Record<string, unknown>)
        .map(([label, entry]) => ({ label, text: String(entry ?? "").trim() }))
        .filter((entry) => entry.text);
      return filled.length ? { kind: "fields", fields: filled } : null;
    }

    case "number_range": {
      const unit = text(value.unit);
      if (!unit || typeof value.min !== "number") return null;
      return { kind: "range", min: value.min, max: num(value.max), unit };
    }

    case "money_range": {
      const currency = text(value.currency);
      if (!currency || typeof value.min !== "number") return null;
      return { kind: "money", min: value.min, max: num(value.max), currency, basis: text(value.basis) };
    }

    case "person_number_range": {
      const unit = text(value.unit);
      const per = Array.isArray(value.per) ? (value.per as Record<string, unknown>[]) : [];
      if (!unit || per.length === 0) return null;
      // A→B UND B→A SIND GETRENNTE BEZIEHUNGEN. Deshalb bleibt jede Erwartung
      // bei ihrem Empfaenger und wird nicht ueber Personen gemittelt.
      return {
        kind: "recipients",
        unit,
        per: per.map((entry) => ({
          recipient: String(entry.recipient ?? ""),
          min: Number(entry.min),
          max: num(entry.max),
        })),
      };
    }

    case "time_windows": {
      const windows = Array.isArray(value.windows) ? (value.windows as Record<string, unknown>[]) : [];
      if (windows.length === 0) return null;
      return {
        kind: "windows",
        windows: windows.map((entry) => ({
          days: Array.isArray(entry.days) ? (entry.days as string[]) : [],
          from: String(entry.from ?? ""),
          to: String(entry.to ?? ""),
        })),
      };
    }

    case "date": {
      const date = text(value.date);
      return date ? { kind: "date", date } : null;
    }

    case "value_case": {
      const card = getValueCases().find((entry) => entry.caseId === blockId);
      if (!card) return null;
      const labels = CONTEXT_REGISTRY_V2.importanceLabels;
      const a = category(value.importanceA, labels);
      const b = category(value.importanceB, labels);
      const path = card.paths.find((entry) => entry.key === value.path);
      if (!a || !b || !path) return null;
      // BEIDE ANLIEGEN BLEIBEN GETRENNT. Keine Differenz, keine Summe - Teil E:
      // „Keine Differenz-, Summen- oder Werte-Gesamtskala."
      return {
        kind: "case",
        concerns: [
          { label: card.concerns[0].label, importance: a },
          { label: card.concerns[1].label, importance: b },
        ],
        path: { key: path.key, label: path.label },
        own: text(value.text),
      };
    }
  }
}

function promptOf(blockId: string): string {
  const item = getAlignmentItems().find((entry) => entry.itemId === blockId);
  if (item) return item.prompt;
  const block = getContextBlocks().find((entry) => entry.blockId === blockId);
  if (block) return block.prompt;
  return getValueCases().find((entry) => entry.caseId === blockId)?.situation ?? blockId;
}

/**
 * Die Bedingung der Praeferenz, zu der ein Item gehoert.
 *
 * Ueber den Leser und nicht ueber die rohe Registratur - sonst stuende im
 * Report der Originalwortlaut und im Fragebogen die ueberarbeitete Fassung.
 * Dieselbe Bedingung, zweimal verschieden formuliert, waere schlimmer als gar
 * keine: Sie sieht aus wie zwei verschiedene Einschraenkungen.
 */
function conditionOf(blockId: string): string | null {
  const preference = getAlignmentPreferences().find((entry) =>
    entry.items.some((item) => item.itemId === blockId)
  );
  return preference?.condition ?? null;
}

const text = (raw: unknown): string | null => {
  const written = String(raw ?? "").trim();
  return written === "" ? null : written;
};

const num = (raw: unknown): number | null => (typeof raw === "number" ? raw : null);
