import {
  getAlignmentItems,
  type AnswerFormatId,
  type MissingCode,
} from "@/features/instruments/v2/alignmentRegistryV2";
import {
  getContextBlocks,
  getValueCases,
  type ContextAnswerFormat,
} from "@/features/instruments/v2/contextRegistryV2";

/**
 * Antworten auf das Instrument v2 - die Form, in der sie gespeichert werden.
 *
 * Gegenstück zur Migration `20261054120000_alignment_answers_v2.sql`. Die
 * Datenbank prüft dieselben Regeln noch einmal; das ist Absicht und keine
 * Doppelung: Ein Server-Action-Fehler darf keine Antwort erzeugen, die eine
 * Auslassung als Wert ausgibt.
 *
 * ---------------------------------------------------------------------------
 * DIE EINE REGEL, AUS DER ALLES FOLGT
 * ---------------------------------------------------------------------------
 *
 * ENTWEDER EIN WERT ODER EIN GRUND, NIE BEIDES UND NIE KEINES. In v1 stand
 * `choice_value text NOT NULL` - eine Zeichenkette, die es geben musste. Wer
 * „möchte ich nicht angeben" festhalten wollte, musste es als Wert
 * hineinschreiben, und ab da war eine Verweigerung nicht mehr von einer
 * Antwort zu unterscheiden. Sie wurde mitgemittelt.
 *
 * Deshalb ist `AlignmentAnswer` hier ein Entweder-oder und kein Objekt mit
 * zwei optionalen Feldern: Ein Zustand, den es nicht geben darf, soll sich
 * nicht hinschreiben lassen.
 */

/** Auch das Format gehört zur Antwort - siehe Kommentar in der Migration. */
export type StoredAnswerFormat = AnswerFormatId | ContextAnswerFormat | "value_case";

export type AlignmentAnswerValue =
  /** F, C und importance_rating: eine Stufe von 1 bis 5. Nie 0, nie eine Mitte. */
  | { scale: 1 | 2 | 3 | 4 | 5 }
  /** Die Options-KENNUNG, nie der Text - siehe ContextOption. */
  | { optionId: string; text?: string }
  | { optionIds: string[]; text?: string }
  | { text: string }
  | { fields: Record<string, string> }
  | { min: number; max?: number; unit: string }
  | { min: number; max?: number; currency: string; basis?: "brutto" | "netto" }
  | { per: { recipient: string; min: number; max?: number }[]; unit: string }
  | { windows: { days: string[]; from: string; to: string }[] }
  | { date: string }
  /** Die Wertekarte: beide Anliegen getrennt, dann der Weg. */
  | {
      importanceA: 1 | 2 | 3 | 4 | 5;
      importanceB: 1 | 2 | 3 | 4 | 5;
      path: "A" | "B" | "other" | "unknown";
      text?: string;
    };

export type AlignmentAnswer = {
  blockId: string;
  answerFormat: StoredAnswerFormat;
} & (
  | { value: AlignmentAnswerValue; missingCode?: never }
  | { value?: never; missingCode: MissingCode["code"] }
);

/**
 * In welchem Fragebogen ein Block liegt.
 *
 * Die Trennung folgt der Quelle, nicht der Technik: Die Wertefälle und die
 * Grenzfragen sind beide Teil E („Neues Modul für Prioritäten und Grenzen"),
 * alles andere ist Teil D. Deshalb braucht v2 KEINEN neuen Modulwert - die
 * vorhandenen `base` und `values` treffen genau diese Grenze, und
 * `instrument_id` unterscheidet die Fassungen.
 */
export function moduleOfBlock(blockId: string): "base" | "values" {
  return blockId.startsWith("W") || blockId.startsWith("L") ? "values" : "base";
}

/** Das Format, in dem ein Block beantwortet wird - aus der Registratur. */
export function answerFormatOfBlock(blockId: string): StoredAnswerFormat | null {
  const item = getAlignmentItems().find((entry) => entry.itemId === blockId);
  if (item) return item.answerFormat;

  const block = getContextBlocks().find((entry) => entry.blockId === blockId);
  if (block) return block.answerFormat;

  const value = getValueCases().find((entry) => entry.caseId === blockId);
  return value ? "value_case" : null;
}

/** Jede Kennung, die das Instrument kennt - Präferenzen, Kontext, Wertefälle. */
export function allBlockIds(): string[] {
  return [
    ...getAlignmentItems().map((item) => item.itemId),
    ...getContextBlocks().map((block) => block.blockId),
    ...getValueCases().map((value) => value.caseId),
  ];
}

/**
 * In welchem Modus eine Antwort gegeben wurde.
 *
 * Teil F7 verlangt, dass jede Antwort ihren Antwortmodus kennt - „gewuenschte
 * Praxis", „tatsaechliche Ressource" oder „hypothetischer Fall". Das ist keine
 * eigene Spalte, sondern folgt eindeutig aus dem Block, und eine abgeleitete
 * Angabe kann nicht von der Wirklichkeit abweichen.
 *
 * WARUM DIE UNTERSCHEIDUNG ZAEHLT: Eine Praeferenz sagt, wie jemand ARBEITEN
 * MOECHTE. Eine Ressourcenangabe sagt, was er zusagen KANN. Ein Wertefall
 * sagt, wie er in einer erfundenen Lage entscheiden WUERDE. Wer diese drei
 * nebeneinanderstellt, als waeren sie dasselbe, vergleicht einen Wunsch mit
 * einer Zusage.
 */
export type AnswerMode = "intended_practice" | "actual_resource" | "hypothetical_case";

export function answerModeOfBlock(blockId: string): AnswerMode {
  if (blockId.startsWith("W")) return "hypothetical_case";
  if (blockId.startsWith("R")) return "actual_resource";
  // Ziele, Grenzen, Regeln und die acht Praeferenzen beschreiben alle eine
  // gewuenschte Praxis - was jemand sich vornimmt, nicht was er zusagt.
  return "intended_practice";
}
