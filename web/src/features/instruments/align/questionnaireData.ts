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

export function buildSections(scope: AssessmentScope): SectionView[] {
  return getSectionsV22(scope).map(({ section, items }) => ({
    section,
    items: items.map(toView),
  }));
}

function toView(item: RegistryItemV22): ItemView {
  return {
    itemId: item.itemId,
    prompt: item.prompt,
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
export function readableItems(scope: AssessmentScope): ReadableItem[] {
  return getItemsV22(scope).map((item) => ({
    itemId: item.itemId,
    section: item.section,
    prompt: item.prompt,
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
