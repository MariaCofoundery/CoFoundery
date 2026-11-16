/**
 * Die kleine Auszeichnung im Newsletter-Editor. Bewusst wenig, damit jede Mail sauber aussieht:
 *   **fett**   *kursiv*   [Text](https://adresse)   "# " Ueberschrift   "## " kleine Ueberschrift   "- " Liste
 * Alles andere ist Text. Erst wird ALLES maskiert, dann werden die wenigen Zeichen zurueckverwandelt - eingefuegtes HTML kommt nie durch.
 */
export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function renderInline(text: string, linkColor: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, (_m, label: string, url: string) => `<a href="${url}" style="color:${linkColor};text-decoration:underline;">${label}</a>`);
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g, "$1<em>$2</em>");
  return html;
}

export type RichStyle = { color: string; linkColor: string; fontSize: number; lineHeight: number; headingCase: "normal" | "upper"; headingColor: string };

/** Mehrzeiliger Text in Absaetze, Ueberschriften und Listen. */
export function renderRich(text: string, style: RichStyle): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p style="margin:0 0 14px;font-size:${style.fontSize}px;line-height:${style.lineHeight}px;color:${style.color};">${paragraph.map((l) => renderInline(l, style.linkColor)).join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) out.push(`<ul style="margin:0 0 14px;padding-left:22px;font-size:${style.fontSize}px;line-height:${style.lineHeight}px;color:${style.color};">${list.map((l) => `<li style="margin:0 0 6px;">${renderInline(l, style.linkColor)}</li>`).join("")}</ul>`);
    list = [];
  };
  const heading = (value: string, size: number) => {
    const shown = style.headingCase === "upper" ? value.toUpperCase() : value;
    return `<h2 style="margin:6px 0 10px;font-size:${size}px;line-height:${size + 6}px;color:${style.headingColor};${style.headingCase === "upper" ? "letter-spacing:.06em;" : ""}">${renderInline(shown, style.linkColor)}</h2>`;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === "") { flushParagraph(); flushList(); continue; }
    if (line.startsWith("## ")) { flushParagraph(); flushList(); out.push(heading(line.slice(3), 19)); continue; }
    if (line.startsWith("# ")) { flushParagraph(); flushList(); out.push(heading(line.slice(2), 24)); continue; }
    if (line.startsWith("- ")) { flushParagraph(); list.push(line.slice(2)); continue; }
    flushList(); paragraph.push(line);
  }
  flushParagraph(); flushList();
  return out.join("");
}

/** Dieselbe Auszeichnung als reiner Text (fuer die Textfassung der Mail). */
export function toPlain(text: string): string {
  return text.replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, "$1 ($2)").replace(/\*\*([^*\n]+?)\*\*/g, "$1").replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])/g, "$1$2").replace(/^#{1,2} /gm, "");
}
