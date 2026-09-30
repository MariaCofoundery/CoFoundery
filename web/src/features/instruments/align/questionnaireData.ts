import {
  getSectionsV22,
  getItemsV22,
  type AssessmentScope,
  type RegistryItemV22,
} from "@/features/instruments/align/registries";
import type { AnswerableItem } from "@/features/instruments/v21/answersV21";
import type { ReadableItem } from "@/features/instruments/v21/readoutV21";
import type { ItemView, SectionView } from "@/features/instruments/v21/questionnaireDataV21";

/**
 * Was ein Fragebogen anzeigt - für beide Bögen.
 *
 * ---------------------------------------------------------------------------
 * DIESELBE FORM WIE V2.1, UND ZWAR ABSICHTLICH
 * ---------------------------------------------------------------------------
 *
 * `ItemView` ist die Form, die das Eingabefeld erwartet. Eine zweite,
 * fast gleiche Form würde ein zweites Eingabefeld nach sich ziehen - und zwei
 * Felder für dieselben dreizehn Antwortformate laufen auseinander, sobald
 * jemand eines davon anfasst.
 *
 * ALLES, WAS DER BROWSER BRAUCHT, UND NICHTS DARÜBER HINAUS. Die Begründungen
 * aus der Registratur gehen nicht mit: „Kein Beleg für Analysefähigkeit“ ist
 * eine Notiz an uns; auf dem Bildschirm läse sie sich wie ein Kommentar zur
 * Person, die gerade antwortet.
 */

/**
 * Wer mit `[Name]` gemeint ist.
 *
 * ---------------------------------------------------------------------------
 * R02 FRAGT NACH EINER ERWARTUNG AN EINE BESTIMMTE PERSON
 * ---------------------------------------------------------------------------
 *
 * „Wie viele Stunden pro Woche erwartest Du … ungefähr von [Name]?“ Der
 * Platzhalter steht in der Quelle und gehört zur Frage - eine Erwartung ohne
 * Gegenüber ist keine Erwartung. Bis zum 29.09.2026 stand er wörtlich auf dem
 * Bildschirm, samt der Maskierung aus dem Markdown.
 *
 * DER ERSATZ IST NIE LEER. Ohne Namen steht „der anderen Person“ da - dritte
 * Person, also grammatisch richtig, und ehrlicher als eine eckige Klammer, die
 * wie ein Fehler aussieht.
 */
export const OHNE_NAMEN = "der anderen Person";

export function withPartner(prompt: string, partnerName?: string | null): string {
  return prompt.replace(/\[Name\]/g, partnerName?.trim() || OHNE_NAMEN);
}

export function buildSections(
  scope: AssessmentScope,
  partnerName?: string | null,
): SectionView[] {
  return getSectionsV22(scope)
    .map(({ section, items }) => ({
      section,
      // AUSSER DEN ZURUECKGEZOGENEN. Sie bleiben in der Registratur, damit
      // gespeicherte Antworten lesbar bleiben - vorgelegt werden sie nicht
      // mehr.
      items: items.filter((item) => !item.retired).map((item) => toView(item, partnerName)),
    }))
    .filter((group) => group.items.length > 0);
}

function toView(item: RegistryItemV22, partnerName?: string | null): ItemView {
  return {
    itemId: item.itemId,
    groupPrompt: item.groupPrompt ?? null,
    unit: item.unit ?? null,
    conditionHint: item.conditionHint ?? null,
    prompt: withPartner(item.prompt, partnerName),
    hint: item.hint,
    // Die Formate von v2.2 sind eine Teilmenge derer von v2.1 - das Feld kennt
    // sie alle.
    answerFormat: item.answerFormat as ItemView["answerFormat"],
    options: item.options.map((option) => ({
      optionId: option.optionId,
      label: option.label,
      requiresText: option.requiresText,
      exclusive: option.exclusive,
    })),
    offeredMissing: item.missing.map((entry) => ({ code: entry.code, label: entry.label })),
    concerns: item.concerns ?? null,
    ratingOptions: item.ratingOptions ?? null,
    ratingMissing: item.ratingMissing ?? null,
    fields: null,
    conditionalFields: null,
    // `showAfter` heisst in v2.1 `basisItemId` - dieselbe Sache, anderer Name.
    basisItemId: item.showAfter ?? null,
    followup: item.followUpQuestion
      ? {
          question: item.followUpQuestion,
          options: [],
          other: null,
          optional: true,
          multiple: false,
          fields: [],
          when: null,
          triggerOptionId: null,
        }
      : null,
  };
}

/** Die Frage in der Form, die die Antwortprüfung braucht. */
export function answerableOf(item: RegistryItemV22): AnswerableItem {
  return {
    itemId: item.itemId,
    answerFormat: item.answerFormat,
    options: item.options,
    missing: item.missing,
    concerns: item.concerns,
    ratingOptions: item.ratingOptions,
    maxChoices: item.maxChoices,
  };
}

/**
 * Die Fragen eines Bogens in der Form, die die Lesbarmachung braucht.
 *
 * HIER UND NICHT IN `reportData`. Dort steht `server-only`, und ein Test, der
 * nur die Fragen braucht, zöge damit die ganze Datenbankanbindung mit herein -
 * und scheitert an `next/headers`. Eine reine Funktion gehört in ein reines
 * Modul.
 */
export function readableItems(
  scope: AssessmentScope,
  partnerName?: string | null,
): ReadableItem[] {
  return getItemsV22(scope).map((item) => ({
    itemId: item.itemId,
    section: item.section,
    prompt: withPartner(item.prompt, partnerName),
    answerFormat: item.answerFormat,
    options: item.options.map((option) => ({
      optionId: option.optionId,
      label: option.label,
    })),
    missing: item.missing,
    concerns: item.concerns,
    ratingOptions: item.ratingOptions,
  }));
}

/**
 * Welche Anschlussfrage auf welcher Grundfrage aufbaut.
 *
 * ---------------------------------------------------------------------------
 * ABGELEITET, NICHT AUFGEZÄHLT
 * ---------------------------------------------------------------------------
 *
 * Eine feste Liste wäre nach dem ersten neuen Item falsch. Die Regel stattdessen:
 * Eine Frage, die je Eintrag geschrieben wird (`free_text_per_entry`), hängt an
 * der Frage, die die Einträge anlegt — und `showAfter` sagt, an welcher.
 *
 * Wozu: Wer in L01 eine Grenze streicht, lässt eine Antwort auf L02 zurück, die
 * auf nichts mehr zeigt. Sie wird nicht stillschweigend gelöscht — sie wird
 * benannt, damit die Person entscheiden kann.
 */
export function followUpPairs(scope: AssessmentScope): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (const item of getItemsV22(scope)) {
    if (item.answerFormat === "free_text_per_entry" && item.showAfter) {
      pairs[item.itemId] = item.showAfter;
    }
  }
  return pairs;
}
