const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["Ã„", "Ä"],
  ["Ã–", "Ö"],
  ["Ãœ", "Ü"],
  ["Ã¤", "ä"],
  ["Ã¶", "ö"],
  ["Ã¼", "ü"],
  ["ÃŸ", "ß"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€ž", "„"],
  ["â€œ", "“"],
  ["â€", "„"],
  ["â€", "“"],
  ["â€", "”"],
  ["â€™", "’"],
  ["â€¦", "…"],
  ["Â·", "·"],
  ["Â", ""],
];

const SHARP_S_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Schliess/g, "Schließ"],
  [/schliess/g, "schließ"],
  [/Heisst/g, "Heißt"],
  [/heisst/g, "heißt"],
  [/Massgeb/g, "Maßgeb"],
  [/massgeb/g, "maßgeb"],
  [/Gröss/g, "Größ"],
  [/gröss/g, "größ"],
];

export function normalizeGermanText(value: string | null | undefined) {
  if (!value) return value ?? "";

  let normalized = value.normalize("NFC");

  for (const [source, target] of MOJIBAKE_REPLACEMENTS) {
    normalized = normalized.split(source).join(target);
  }

  normalized = normalized
    .replace(/Ae/g, "Ä")
    .replace(/Oe/g, "Ö")
    .replace(/Ue/g, "Ü")
    .replace(/ae/g, "ä")
    .replace(/oe/g, "ö")
    .replace(/ue/g, (match, offset, input) => {
      const previousChar = input[offset - 1] ?? "";
      return previousChar === "q" || previousChar === "Q" ? match : "ü";
    });

  for (const [pattern, target] of SHARP_S_REPLACEMENTS) {
    normalized = normalized.replace(pattern, target);
  }

  return normalized;
}
