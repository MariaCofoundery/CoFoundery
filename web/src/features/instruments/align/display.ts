/** Locale overlays for platform-owned display fields, never for saved answers or user text. */
import strings from "./display.en.json";
import contextualOptions from "./displayOptions.en.json";
import type { AppLocale } from "@/i18n/config";
import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v21/readoutV21";

type DisplayItem = { prompt: string; section: string; hint?: string | null; unit?: string;
  options: readonly { label: string }[]; missing?: readonly { label: string }[];
  concerns?: string[]; paths?: string[]; ratingOptions?: string[] };

export function alignmentDisplayText(value: string, locale: AppLocale) {
  if (locale !== "en") return value;
  const catalog = strings as Record<string, string>;
  if (catalog[value]) return catalog[value];
  // The server has already interpolated a partner name in R02. Translate the
  // owned template while preserving that name verbatim.
  for (const [template, english] of Object.entries(catalog)) {
    if (!template.includes("[Name]")) continue;
    const [before, after] = template.split("[Name]");
    if (value.startsWith(before) && value.endsWith(after)) {
      const name = value.slice(before.length, value.length - after.length);
      return english.replace("[Name]", name === "der anderen Person" ? "the other person" : name);
    }
  }
  return value;
}
/**
 * Prompt-aware option label. Every place that shows an answer option (readouts,
 * maps, discussion prompts) goes through this, so the same answer reads the
 * same everywhere. Display only: stored values and comparisons stay German.
 */
export function alignmentOptionText(prompt: string, label: string, locale: AppLocale) {
  return locale === "en"
    ? (contextualOptions as Record<string, Record<string, string>>)[prompt]?.[label] ?? alignmentDisplayText(label, locale)
    : label;
}
export function alignmentDisplayItem<T extends DisplayItem>(item: T, locale: AppLocale): T {
  if (locale !== "en") return item;
  const text = (value: string) => alignmentDisplayText(value, locale);
  return { ...item, prompt: text(item.prompt), section: text(item.section),
    ...(item.hint ? { hint: text(item.hint) } : {}), ...(item.unit ? { unit: text(item.unit) } : {}),
    options: item.options.map(o => ({ ...o, label: alignmentOptionText(item.prompt, o.label, locale) })),
    ...(item.missing ? { missing: item.missing.map(m => ({ ...m, label: text(m.label) })) } : {}),
    ...(item.concerns ? { concerns: item.concerns.map(text) } : {}),
    ...(item.paths ? { paths: item.paths.map(text) } : {}),
    ...(item.ratingOptions ? { ratingOptions: item.ratingOptions.map(text) } : {}),
  };
}
export function alignmentDisplayEntry(entry: ReadoutEntry, locale: AppLocale): ReadoutEntry {
  if (locale !== "en") return entry;
  const label = (s: string) => alignmentOptionText(entry.prompt, s, locale);
  const text = (s: string) => alignmentDisplayText(s, locale);
  const v = entry.value;
  let value: ReadoutValue | null = v;
  // Free text, names, conditions and the stored response values are intentionally untouched.
  if (v?.kind === "ordinal" || v?.kind === "choice") value = { ...v, label: label(v.label) };
  if (v?.kind === "choices") value = { ...v, labels: v.labels.map(label), priority: v.priority ? label(v.priority) : null };
  if (v?.kind === "case") value = { ...v, path: text(v.path), concerns: v.concerns.map(c => ({ ...c, label: text(c.label), importance: { ...c.importance, label: text(c.importance.label) } })) };
  // This exact sentinel is emitted by readAnswer when the referenced boundary
  // has been removed. Other boundary text and the response itself remain unchanged.
  if (v?.kind === "perEntry") value = { ...v, entries: v.entries.map(e => ({ ...e, about: e.about === "zu einer Grenze, die es nicht mehr gibt" ? text(e.about) : e.about })) };
  if (v?.kind === "number") value = { ...v, unit: text(v.unit) };
  if (v?.kind === "perPerson") value = { ...v, per: v.per.map(p => ({ ...p, unit: text(p.unit) })) };
  if (v?.kind === "windows") value = { ...v, windows: v.windows.map(w => ({ ...w, day: text(w.day) })) };
  return { ...entry, prompt: text(entry.prompt), section: text(entry.section), value,
    missing: entry.missing ? { ...entry.missing, label: text(entry.missing.label) } : null };
}

/** Presentation overlay for questionnaire data. IDs, validation flags and raw units stay stable. */
export function alignmentQuestionView(item: import("@/features/instruments/v21/questionnaireDataV21").ItemView, locale: AppLocale) {
  const text = (s: string) => alignmentDisplayText(s, locale);
  const optional = (s: string | null | undefined) => s == null ? s : text(s);
  return { ...item, prompt: text(item.prompt), hint: optional(item.hint) ?? null,
    groupPrompt: optional(item.groupPrompt), conditionHint: optional(item.conditionHint),
    options: item.options.map(o => ({ ...o, label: alignmentOptionText(item.prompt, o.label, locale) })),
    offeredMissing: item.offeredMissing.map(m => ({ ...m, label: text(m.label) })),
    concerns: item.concerns?.map(text) ?? null, paths: item.paths?.map(text) ?? null,
    ratingOptions: item.ratingOptions?.map(text) ?? null, ratingMissing: optional(item.ratingMissing) ?? null,
    fields: item.fields?.map(text) ?? null, conditionalFields: item.conditionalFields?.map(text) ?? null,
    valueCase: item.valueCase ? { ...item.valueCase, importancePrompt: text(item.valueCase.importancePrompt), pathPrompt: text(item.valueCase.pathPrompt), otherLabel: text(item.valueCase.otherLabel), unknownLabel: text(item.valueCase.unknownLabel) } : null,
    followup: item.followup ? { ...item.followup, question: text(item.followup.question), other: optional(item.followup.other) ?? null, fields: item.followup.fields.map(text), options: item.followup.options.map(o => ({ ...o, label: text(o.label) })) } : null,
  };
}
