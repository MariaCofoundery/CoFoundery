import {
  getSectionsV21,
  type AnswerFormatV21,
  type MissingCode,
} from "@/features/instruments/v21/registryV21";
import { basisOf } from "@/features/instruments/v21/progressV21";

/**
 * Was der Fragebogen anzeigt - fertig zusammengestellt auf dem Server.
 *
 * ALLES, WAS DER BROWSER BRAUCHT, UND NICHTS DARÜBER HINAUS. Die Registratur
 * bleibt auf dem Server: Sie enthält zu jeder Frage die Begründung, den
 * Auswertungshinweis und die Herkunft. Das ist Material für uns, nicht für
 * den Bildschirm.
 *
 * Insbesondere geht `note` NICHT mit. „Kein Beleg für Analysefähigkeit“ ist
 * eine Notiz an uns; auf dem Bildschirm läse es sich wie ein Kommentar zur
 * Person, die gerade antwortet.
 */

export type OptionView = {
  optionId: string;
  label: string;
  requiresText: boolean;
  exclusive: boolean;
};

export type ItemView = {
  itemId: string;
  /** Worin gezählt wird — bei `number_range`. Ohne Angabe: keine Einheit. */
  unit?: string | null;
  conditionHint?: string | null;
  /**
   * Eine Frage über mehreren Items.
   *
   * S01a bis S01f fragen sechsmal dasselbe über je ein anderes Ziel. Die
   * Oberfläche zeigt sie einmal, wenn sie sich ändert.
   */
  groupPrompt?: string | null;
  prompt: string;
  hint: string | null;
  answerFormat: AnswerFormatV21;
  options: OptionView[];
  /** Kennung UND Beschriftung - die Beschriftung hängt am Item, nicht am Code. */
  offeredMissing: { code: MissingCode; label: string }[];
  /** Für Wertefälle: die beiden Anliegen und die Wichtigkeitsstufen. */
  concerns: string[] | null;
  /**
   * Die beiden Wege — was man in dieser Lage tun würde.
   *
   * Sie standen in der Registratur und kamen hier nie an: Die Wegwahl zeigte
   * stattdessen die ANLIEGEN als Beschriftung. „früh wissen, wie sich die
   * finanzielle Situation entwickeln könnte" ist aber kein Weg, sondern der
   * Grund für einen — die Frage „welchen Weg würdest du wählen?" war damit
   * nicht beantwortbar.
   */
  paths: string[] | null;
  ratingOptions: string[] | null;
  ratingMissing: string | null;
  /** Die Texte des Dreischritt-Musters — sonst stehen dort Knöpfe ohne Frage. */
  valueCase: {
    importancePrompt: string;
    pathPrompt: string;
    otherLabel: string;
    unknownLabel: string;
  } | null;
  /** Für Eingabemasken: die benannten Felder, etwa Wochentag/von/bis/Zeitzone. */
  fields: string[] | null;
  /**
   * Zusatzangaben, die nur bei bestimmten Antworten sinnvoll sind.
   *
   * R04 hat sie, und sie fehlten hier zuerst - derselbe Fehler, den die
   * fachliche Durchsicht schon einmal gefunden hat („R02 und R03 erscheinen
   * ohne ihre Eingabefelder"). Ein Test faengt ihn jetzt ab.
   */
  conditionalFields: string[] | null;
  /** Die Frage, aus der sich die Wiederholungen ergeben - oder null. */
  basisItemId: string | null;
  followup: {
    question: string;
    /** Mit Kennungen, wie jede andere Antwort auch. */
    options: { optionId: string; label: string; exclusive: boolean }[];
    other: string | null;
    optional: boolean;
    multiple: boolean;
    fields: string[];
    when: string | null;
    /** Welche Antwort die Folgefrage erscheinen laesst - null heisst: immer. */
    triggerOptionId: string | null;
  } | null;
};

export type SectionView = { section: string; items: ItemView[] };

export function buildSectionsV21(): SectionView[] {
  return getSectionsV21().map(({ section, items }) => ({
    section,
    items: items.map((item) => {
      const followup = item.followup;

      return {
        itemId: item.itemId,
        prompt: item.prompt,
        hint: item.hint,
        answerFormat: item.answerFormat,
        options: item.options.map((option) => ({
          optionId: option.optionId,
          label: option.label,
          requiresText: option.requiresText,
          exclusive: option.exclusive,
        })),
        offeredMissing: item.missing.map((entry) => ({ code: entry.code, label: entry.label })),
        concerns: item.concerns ?? null,
        // v2.1 kennt weder die Wege noch die Texte des Musters. Dort bleibt
        // die Wegwahl, wie sie war - der Bogen ist archiviert.
        paths: null,
        ratingOptions: item.ratingOptions ?? null,
        valueCase: null,
        ratingMissing: item.ratingMissing ?? null,
        fields: item.fields ?? null,
        conditionalFields: item.conditionalFields ?? null,
        basisItemId: basisOf(item.itemId),
        followup: followup?.question
          ? {
              question: followup.question,
              options: followup.options ?? [],
              other: followup.other ?? null,
              optional: followup.optional ?? false,
              multiple: followup.multiple ?? false,
              fields: followup.fields ?? [],
              when: followup.when ?? null,
              triggerOptionId: followup.triggerOptionId ?? null,
            }
          : null,
      };
    }),
  }));
}
