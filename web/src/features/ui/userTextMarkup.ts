/**
 * Einfache Auszeichnung in Texten, die Menschen eingeben (Feedback an Maria, 04.11.2026): wie in
 * Chat-Programmen gewohnt, `**fett**` und `*kursiv*` oder `_kursiv_`.
 *
 * BEWUSST KLEIN UND OHNE HTML: Der Text wird in Stuecke zerlegt, nie als HTML ausgegeben - ein
 * eingegebenes `<script>` bleibt Text. Keine Links, keine Ueberschriften, keine Listen: Ein Link aus
 * einem fremden Profil waere ein Weg, Menschen woanders hinzuschicken.
 *
 * Wann ein Zeichen zaehlt:
 *   - Direkt nach dem oeffnenden und vor dem schliessenden Zeichen steht kein Leerzeichen
 *     ("2 * 3 * 4" bleibt Rechnung).
 *   - `_` nur an Wortgrenzen ("snake_case_name" bleibt, wie es ist).
 *   - Kursiv geht nicht ueber einen Zeilenumbruch, fett schon.
 * Zeilenumbrueche bleiben Text; die Anzeige erhaelt sie wie bisher (`whitespace-pre-wrap`).
 */
export type UserTextPart =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: UserTextPart[] }
  | { kind: "em"; children: UserTextPart[] };

const PATTERNS: { kind: "strong" | "em"; regex: RegExp; lead: boolean }[] = [
  { kind: "strong", regex: /\*\*(?=\S)([\s\S]*?\S)\*\*/, lead: false },
  { kind: "strong", regex: /(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/, lead: true },
  { kind: "em", regex: /(^|[^*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![*\w])/, lead: true },
  { kind: "em", regex: /(^|[^\w])_(?=[^\s_])([^_\n]*?[^\s_])_(?!\w)/, lead: true },
];

export function parseUserText(text: string): UserTextPart[] {
  const parts: UserTextPart[] = [];
  let rest = text;
  while (rest.length > 0) {
    let best: { index: number; length: number; kind: "strong" | "em"; inner: string; lead: string } | null = null;
    for (const pattern of PATTERNS) {
      const match = pattern.regex.exec(rest);
      if (!match) continue;
      const lead = pattern.lead ? match[1] : "";
      const inner = pattern.lead ? match[2] : match[1];
      const index = match.index + lead.length;
      if (!best || index < best.index) best = { index, length: match[0].length - lead.length, kind: pattern.kind, inner, lead };
    }
    if (!best) {
      parts.push({ kind: "text", text: rest });
      break;
    }
    if (best.index > 0) parts.push({ kind: "text", text: rest.slice(0, best.index) });
    parts.push({ kind: best.kind, children: parseUserText(best.inner) });
    rest = rest.slice(best.index + best.length);
  }
  // Benachbarte Textstuecke zusammenfassen.
  return parts.reduce<UserTextPart[]>((merged, part) => {
    const last = merged[merged.length - 1];
    if (part.kind === "text" && last?.kind === "text") last.text += part.text;
    else merged.push(part);
    return merged;
  }, []);
}
