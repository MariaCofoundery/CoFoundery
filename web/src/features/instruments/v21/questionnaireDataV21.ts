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
  prompt: string;
  hint: string | null;
  answerFormat: AnswerFormatV21;
  options: OptionView[];
  /** Kennung UND Beschriftung - die Beschriftung hängt am Item, nicht am Code. */
  offeredMissing: { code: MissingCode; label: string }[];
  /** Für Wertefälle: die beiden Anliegen und die Wichtigkeitsstufen. */
  concerns: string[] | null;
  ratingOptions: string[] | null;
  ratingMissing: string | null;
  /** Für Eingabemasken: die benannten Felder, etwa Wochentag/von/bis/Zeitzone. */
  fields: string[] | null;
  /** Die Frage, aus der sich die Wiederholungen ergeben - oder null. */
  basisItemId: string | null;
  followup: {
    question: string;
    options: string[];
    other: string | null;
    optional: boolean;
    when: string | null;
  } | null;
};

export type SectionView = { section: string; items: ItemView[] };

export function buildSectionsV21(): SectionView[] {
  return getSectionsV21().map(({ section, items }) => ({
    section,
    items: items.map((item) => {
      const followup = item.followup as
        | { question?: string; options?: string[]; other?: string; optional?: boolean; when?: string }
        | undefined;

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
        ratingOptions: item.ratingOptions ?? null,
        ratingMissing: item.ratingMissing ?? null,
        fields: item.fields ?? null,
        basisItemId: basisOf(item.itemId),
        followup: followup?.question
          ? {
              question: followup.question,
              options: followup.options ?? [],
              other: followup.other ?? null,
              optional: followup.optional ?? false,
              when: followup.when ?? null,
            }
          : null,
      };
    }),
  }));
}
