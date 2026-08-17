import { normalizeLocale } from "@/i18n/config";
import { normalizeGermanText } from "@/lib/normalizeGermanText";

export function normalizeWorkbookSystemText(
  text: string,
  locale: string | null | undefined
) {
  return normalizeLocale(locale) === "de" ? normalizeGermanText(text) : text;
}

export function normalizeWorkbookSystemTextWithProtectedValues(
  text: string,
  locale: string | null | undefined,
  protectedValues: readonly string[]
) {
  const replacements = protectedValues
    .filter((value) => value.length > 0)
    .map((value, index) => ({
      placeholder: `\u0000workbook-identity-${index}\u0000`,
      value,
    }));
  const protectedText = replacements.reduce(
    (current, replacement) =>
      current.split(replacement.value).join(replacement.placeholder),
    text
  );
  const normalized = normalizeWorkbookSystemText(protectedText, locale);

  return replacements.reduce(
    (current, replacement) =>
      current.split(replacement.placeholder).join(replacement.value),
    normalized
  );
}
