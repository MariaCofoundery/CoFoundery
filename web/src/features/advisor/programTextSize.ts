/**
 * Groesse in Stufen fuer den Willkommenstext einer Programmseite.
 *
 * Die Stufe steht als Zeichenzahl um den Text: ++ (eine Stufe groesser), +++
 * (zwei), ++++ (drei); -- (eine Stufe kleiner), --- (zwei). Jeder Klick auf
 * "groesser" oder "kleiner" aendert die Stufe um eins und ERSETZT die alten
 * Zeichen, statt neue dazuzuschreiben. Ohne Auswahl gilt das Wort an der
 * Schreibmarke.
 */
export const MAX_BIGGER = 3;
export const MAX_SMALLER = 2;

export function changeTextSize(text: string, selectionStart: number, selectionEnd: number, delta: 1 | -1) {
  let start = selectionStart;
  let end = selectionEnd;
  if (start === end) {
    while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
    while (end < text.length && !/\s/.test(text[end])) end += 1;
  }
  let inner = text.slice(start, end);
  let level = 0;

  // Die Auswahl schliesst die Zeichen schon ein: ++Text++ / --Text--
  const inside = inner.match(/^(\++|-+)([^+\n-][^\n]*?)\1$/);
  if (inside && inside[1].length >= 2) {
    level = inside[1][0] === "+" ? inside[1].length - 1 : -(inside[1].length - 1);
    inner = inside[2];
  } else {
    // Die Auswahl steht innerhalb der Zeichen: davor und dahinter gleich viele + oder -.
    const before = text.slice(0, start).match(/(\++|-+)$/);
    const after = text.slice(end).match(/^(\++|-+)/);
    if (before && after && before[1] === after[1] && before[1].length >= 2) {
      level = before[1][0] === "+" ? before[1].length - 1 : -(before[1].length - 1);
      start -= before[1].length;
      end += after[1].length;
    }
  }

  const next = Math.max(-MAX_SMALLER, Math.min(MAX_BIGGER, level + delta));
  const mark = next > 0 ? "+".repeat(next + 1) : next < 0 ? "-".repeat(-next + 1) : "";
  // Die Auswahl bleibt auf dem Text selbst (ohne die Zeichen), damit der naechste Klick
  // dieselbe Stelle trifft und man nicht neu markieren muss.
  return {
    text: text.slice(0, start) + mark + inner + mark + text.slice(end),
    selectionStart: start + mark.length,
    selectionEnd: start + mark.length + inner.length,
  };
}
