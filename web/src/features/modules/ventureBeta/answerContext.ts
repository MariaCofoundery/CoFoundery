import { alignmentDisplayText } from "@/features/instruments/align/display";
import type { AnswerTextContext } from "@/features/modules/ventureBeta/answerText";
import type { AppLocale } from "@/i18n/config";

/** Anzeige-Helfer der Beta: Texte ueber die Anzeigeschicht, Datum und Betrag nach Sprache. */
export function answerContextFor(locale: AppLocale): AnswerTextContext {
  return {
    show: (text) => alignmentDisplayText(text, locale),
    formatDate: (iso) => {
      const date = new Date(`${iso}T00:00:00`);
      return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
    },
    formatUnit: (unit) => {
      const shown = alignmentDisplayText(unit, locale);
      return locale === "en" ? shown.charAt(0).toLowerCase() + shown.slice(1) : shown;
    },
    formatAmount: (amount, currency) => {
      try {
        return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
      } catch {
        return `${amount} ${currency}`;
      }
    },
  };
}
