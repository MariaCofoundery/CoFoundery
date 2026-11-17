/**
 * Die kleine Auszeichnung fuer Blog-Texte - als Daten, nicht als HTML: Die Seite baut daraus React-Elemente, eingefuegtes HTML kommt nie durch.
 *   **fett**   *kursiv*   [Text](https://adresse)   "# " "## " "### " Ueberschriften   "- " Liste
 * Die Ueberschrift des Beitrags ist h1; "# " im Text wird deshalb h2, "## " h3, "### " h4.
 */
export type Inline = { kind: "text"; text: string } | { kind: "strong"; text: string } | { kind: "em"; text: string } | { kind: "link"; text: string; href: string };
export type RichBlock =
  | { kind: "heading"; level: 2 | 3 | 4; inline: Inline[] }
  | { kind: "paragraph"; inline: Inline[] }
  | { kind: "list"; items: Inline[][] };

const TOKEN = /\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)|\*\*([^*\n]+?)\*\*|(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = (m.index ?? 0) + (m[4] ? m[4].length : 0);
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    if (m[1] !== undefined) out.push({ kind: "link", text: m[1], href: m[2] });
    else if (m[3] !== undefined) out.push({ kind: "strong", text: m[3] });
    else out.push({ kind: "em", text: m[5] });
    last = (m.index ?? 0) + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export function parseRich(text: string): RichBlock[] {
  const out: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => { if (paragraph.length) out.push({ kind: "paragraph", inline: parseInline(paragraph.join(" ")) }); paragraph = []; };
  const flushList = () => { if (list.length) out.push({ kind: "list", items: list.map(parseInline) }); list = []; };
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") { flushParagraph(); flushList(); continue; }
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) { flushParagraph(); flushList(); out.push({ kind: "heading", level: (heading[1].length + 1) as 2 | 3 | 4, inline: parseInline(heading[2]) }); continue; }
    if (line.startsWith("- ")) { flushParagraph(); list.push(line.slice(2)); continue; }
    flushList(); paragraph.push(line);
  }
  flushParagraph(); flushList();
  return out;
}

/** Reiner Text ohne Auszeichnung (fuer Beschreibungen und den Feed). */
export function toPlainText(text: string): string {
  return text.replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, "$1").replace(/\*\*([^*\n]+?)\*\*/g, "$1").replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g, "$1$2").replace(/^#{1,3} /gm, "").replace(/^- /gm, "").replace(/\s+/g, " ").trim();
}
