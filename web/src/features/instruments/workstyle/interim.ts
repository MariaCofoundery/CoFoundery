import type { AppLocale } from "@/i18n/config";
import { workstyleDisplayItem, workstyleDisplayOptions } from "@/features/instruments/workstyle/display";
import type { WorkstyleItem } from "@/features/instruments/workstyle/registry";

/** Nach so vielen beantworteten Situationen zeigt der Fragebogen einmal "Das hast du bisher gesagt". */
export const INTERIM_AFTER = 3;

type AnswerLike = { item_key: string; response_value: number | null; response_option?: string | null; missing_reason: "cannot_assess" | null };

/**
 * "Das hast du bisher gesagt" - die ersten beantworteten Situationen in den Worten der Person.
 *
 * Nichts wird neu gerechnet oder gedeutet: Bei einer Zweierwahl steht die gewaehlte Aussage (mit "eher" oder "deutlich eher"),
 * bei einer Skalenfrage die gewaehlte Stufe. Kein Punkt, kein Typ, keine Richtung - drei Antworten sind noch keine.
 * Unbeantwortete ("Kann ich noch nicht einschaetzen") erscheinen nicht.
 */
export function interimRows(
  answers: readonly AnswerLike[],
  items: readonly WorkstyleItem[],
  locale: AppLocale,
  words: { strong: string; lean: string },
  limit = INTERIM_AFTER,
): { itemKey: string; context: string; text: string }[] {
  const rows: { itemKey: string; context: string; text: string }[] = [];
  for (const source of items) {
    const answer = answers.find((candidate) => candidate.item_key === source.item_key);
    if (!answer || answer.missing_reason) continue;
    const item = workstyleDisplayItem(source, locale);
    let text: string | null = null;
    if (item.response_format === "comparative" && answer.response_option) {
      const side = answer.response_option.endsWith("_a") ? "A" : answer.response_option.endsWith("_b") ? "B" : null;
      const chosen = item.alternatives?.find((alternative) => alternative.option_id === side)?.label;
      if (chosen) text = `${answer.response_option.startsWith("strong_") ? words.strong : words.lean}: ${chosen}`;
    } else if (typeof answer.response_value === "number") {
      const options = workstyleDisplayOptions(source, locale);
      text = options.find((option) => option.value === answer.response_value)?.label ?? null;
    }
    if (!text) continue;
    // Die Frage am Ende ("Was beschreibt dich eher?") faellt weg; der Anlass davor bleibt.
    const sentences = item.prompt.split(/(?<=[.?!])\s+/);
    const context = (sentences.length > 1 && sentences[sentences.length - 1].endsWith("?") ? sentences.slice(0, -1) : sentences).join(" ");
    rows.push({ itemKey: source.item_key, context, text });
    if (rows.length >= limit) break;
  }
  return rows;
}
