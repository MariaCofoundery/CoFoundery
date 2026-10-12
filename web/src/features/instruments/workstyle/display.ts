/** Display-only overlay. Persisted IDs, versions, order and response values stay unchanged. */
import en from "./display.en.json";
import type { AppLocale } from "@/i18n/config";
import { workstyleResponseOptions, type WorkstyleItem } from "@/features/instruments/workstyle/registry";

export function workstyleDisplayItem(item: WorkstyleItem, locale: AppLocale): WorkstyleItem {
  if (locale !== "en" || item.assessment_version !== "8.5a-v3") return item;
  const copy = (en.items as Record<string, { prompt: string; alternatives?: Record<string, string>; options?: Record<string, string> }>)[item.item_key];
  if (!copy) throw new Error(`missing_workstyle_display:${item.item_key}`);
  return {
    ...item, prompt: copy.prompt,
    alternatives: item.alternatives?.map(a => ({ ...a, label: copy.alternatives?.[a.option_id] ?? a.label })),
    options: item.options?.map(o => ({ ...o, label: copy.options?.[o.option_id] ?? (en.comparative as Record<string, string>)[o.option_id] ?? o.label })),
  };
}

export function workstyleDisplayOptions(item: WorkstyleItem, locale: AppLocale) {
  const options = workstyleResponseOptions(item);
  if (locale !== "en" || item.assessment_version !== "8.5a-v3") return options;
  const display = workstyleDisplayItem(item, locale);
  if (display.options?.length) return display.options.map(o => ({ value: o.option_id, label: o.label }));
  const labels = (en.response_formats as Record<string, string[]>)[item.response_format];
  if (!labels) throw new Error(`missing_workstyle_response_display:${item.response_format}`);
  return options.map((o, index) => ({ ...o, label: labels[index] }));
}

export function workstyleMissingLabel(locale: AppLocale) {
  return locale === "en" ? en.cannot_assess : "Kann ich noch nicht einschätzen";
}
