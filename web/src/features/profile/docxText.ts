/**
 * Text aus dem Dokumentteil einer Word-Datei (word/document.xml).
 *
 * Rein und ohne Abhaengigkeit, damit sie sich testen laesst: Die Datei wird
 * im Browser entpackt, hierher kommt nur der XML-Text.
 *
 * Absaetze und Zeilenumbrueche bleiben Zeilenumbrueche, Tabs werden Leerzeichen.
 * Mehr braucht die Auswertung nicht - sie sucht Woerter, kein Layout.
 */
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function docxXmlToText(xml: string): string {
  const withBreaks = xml
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:(?:br|cr)\b[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n");
  const parts: string[] = [];
  // Zeilenumbrueche und Textstuecke in Dokumentreihenfolge einsammeln.
  const token = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|[\n\t]/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(withBreaks)) !== null) {
    parts.push(match[1] === undefined ? match[0] : match[1]);
  }
  return parts
    .join("")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
      if (entity[0] === "#") {
        const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
      }
      return ENTITIES[entity.toLowerCase()] ?? "";
    })
    .replace(/\t/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
