/**
 * Ausrichtung fuer den Willkommenstext einer Programmseite - pro Zeile.
 *
 * Mittig und rechtsbuendig stehen als Zeilenanfang "::c " und "::r "; linksbuendig
 * ist der Normalfall und hat kein Zeichen. Eine Ausrichtung gilt fuer alle Zeilen,
 * die von der Markierung beruehrt werden (ohne Markierung: die Zeile an der
 * Schreibmarke). Eine neue Ausrichtung ERSETZT die alte, statt sich zu stapeln.
 */
export type TextAlign = "left" | "center" | "right";

const MARKER = /^::([cr]) /;
const MARK_OF: Record<TextAlign, string> = { left: "", center: "::c ", right: "::r " };

export function alignOfLine(line: string): { align: TextAlign; rest: string } {
  const match = line.match(MARKER);
  if (!match) return { align: "left", rest: line };
  return { align: match[1] === "c" ? "center" : "right", rest: line.slice(match[0].length) };
}

export function changeTextAlign(text: string, selectionStart: number, selectionEnd: number, align: TextAlign) {
  const from = text.lastIndexOf("\n", Math.max(0, selectionStart) - 1) + 1;
  const toBreak = text.indexOf("\n", selectionEnd);
  const to = toBreak === -1 ? text.length : toBreak;
  const lines = text.slice(from, to).split("\n");

  let start = selectionStart;
  let end = selectionEnd;
  let offset = from;
  const next = lines.map((line) => {
    const { rest } = alignOfLine(line);
    const changed = MARK_OF[align] + rest;
    const delta = changed.length - line.length;
    const lineStart = offset;
    offset += line.length + 1;
    // Die Auswahl rutscht mit, damit sie auf dem Text stehen bleibt.
    if (lineStart < selectionStart) start += delta;
    if (lineStart <= selectionEnd) end += delta;
    return changed;
  });

  const first = from + MARK_OF[align].length;
  return {
    text: text.slice(0, from) + next.join("\n") + text.slice(to),
    selectionStart: Math.max(first, start),
    selectionEnd: Math.max(first, end),
  };
}
