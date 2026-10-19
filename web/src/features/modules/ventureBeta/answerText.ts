import type { RegistryItemV22 } from "@/features/instruments/align/registries";
import type { ParsedAnswer } from "@/features/modules/ventureBeta/compare";

/**
 * Eine Antwort als Text - fuer die eigene Zusammenfassung und den Team-Report.
 *
 * Die Beschriftungen kommen aus der Registry (`show` uebersetzt sie auf Englisch), nicht aus den
 * gespeicherten Werten. Freitext der Person („anderes“) bleibt unuebersetzt, wie er geschrieben wurde.
 */
export type AnswerTextContext = {
  show: (text: string) => string;
  formatDate: (isoDate: string) => string;
  formatAmount: (amount: number, currency: string) => string;
  /** Eine Einheit mitten im Satz („12 hours per week"): auf Englisch klein, auf Deutsch bleibt das Nomen gross. */
  formatUnit: (unit: string) => string;
};

export function answerText(item: RegistryItemV22, answer: ParsedAnswer, ctx: AnswerTextContext): string {
  const labelOf = (optionId: string, text?: string) => {
    const option = item.options.find((candidate) => candidate.optionId === optionId);
    if (!option) return optionId;
    const label = ctx.show(option.label);
    return option.requiresText && text?.trim() ? `${label}: ${text.trim()}` : label;
  };

  switch (answer.kind) {
    case "option": {
      const base = labelOf(answer.optionId, answer.text);
      return answer.date ? `${base} (${ctx.formatDate(answer.date)})` : base;
    }
    case "options":
      return answer.optionIds.map((id) => labelOf(id, answer.texts[id])).join(" · ");
    case "number": {
      const unit = answer.unit ? ` ${ctx.formatUnit(answer.unit)}` : "";
      return answer.to !== undefined && answer.to !== answer.number
        ? `${answer.number}–${answer.to}${unit}`
        : `${answer.number}${unit}`;
    }
    case "amount":
      return ctx.formatAmount(answer.amount, answer.currency);
    case "missing": {
      const reason = item.missing.find((entry) => entry.code === answer.code);
      return ctx.show(reason?.label ?? answer.code);
    }
    case "none":
      return "";
  }
}
