import { escapeHtml, renderRich, toPlain, type RichStyle } from "@/features/newsletter/newsletterMarkup";
import { safeHref, type Block, type IssueData } from "@/features/newsletter/newsletterModel";

/**
 * Die Mail zu einer Ausgabe. EIN Renderer fuer Vorschau, Testmail und Versand - was du in der Vorschau siehst, ist, was ankommt.
 * Tabellen und feste Farben, weil Mail-Programme weder Verlaeufe noch Spezialschriften verlaesslich kennen:
 * der Verlauf steckt hinter einer festen Hintergrundfarbe, die Schrift ist Georgia oder Arial.
 */
export type RenderContext = {
  appOrigin: string;
  imageUrl: (path: string) => string;
  unsubscribeUrl: string;
  privacyUrl: string;
  imprintUrl: string;
  logoUrl?: string;
};

type Theme = { page: string; card: string; text: string; sub: string; item: string; label: string; border: string; headerFallback: string };
const THEMES: Record<IssueData["look"], Theme> = {
  light: { page: "#f4f3fb", card: "#ffffff", text: "#14152b", sub: "#4a4d68", item: "#f7f6fd", label: "#6d28d9", border: "#d9dcec", headerFallback: "#6d49e0" },
  night: { page: "#0e0e22", card: "#17173a", text: "#f1efff", sub: "#b9b6e6", item: "#221f52", label: "#7ee8d6", border: "#3a3580", headerFallback: "#2c2470" },
  plain: { page: "#f3f1ea", card: "#faf9f5", text: "#1f1f1f", sub: "#55524a", item: "#efede6", label: "#7a4a1f", border: "#dedbd0", headerFallback: "#7a4a1f" },
};
const FONT_STACK = { serif: "Georgia,'Times New Roman',serif", sans: "Arial,Helvetica,sans-serif" } as const;
const KIND_PATH = { listing: "/connect/listings/", problem: "/connect/problems/" } as const;

export function buttonHtml(issue: IssueData, theme: Theme, label: string, href: string): string {
  const radius = issue.buttonStyle === "round" ? "999px" : issue.buttonStyle === "square" ? "6px" : "999px";
  const outline = issue.buttonStyle === "outline";
  const bg = outline ? "transparent" : issue.accent;
  const color = outline ? (issue.look === "night" ? theme.text : issue.accent) : "#ffffff";
  const border = outline ? `2px solid ${issue.look === "night" ? theme.text : issue.accent}` : `2px solid ${issue.accent}`;
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;border-radius:${radius};background:${bg};border:${border};color:${color};text-decoration:none;font-weight:bold;font-size:16px;">${escapeHtml(label)}</a>`;
}

function blockHtml(block: Block, issue: IssueData, theme: Theme, ctx: RenderContext): string {
  const rich: RichStyle = { color: theme.text, linkColor: issue.look === "night" ? "#7ee8d6" : issue.accent, fontSize: 16, lineHeight: 25, headingCase: issue.headingCase, headingColor: theme.text };
  switch (block.type) {
    case "text": return renderRich(block.text, rich);
    case "divider": return `<hr style="border:none;border-top:1px solid ${theme.border};margin:22px 0;">`;
    case "quote": return `<blockquote style="margin:0 0 18px;padding:12px 16px;border-left:4px solid ${issue.accent};background:${theme.item};color:${theme.text};font-size:17px;line-height:26px;font-style:italic;">„${escapeHtml(block.text)}“${block.by ? `<br><span style="font-size:13px;font-style:normal;color:${theme.sub};">${escapeHtml(block.by)}</span>` : ""}</blockquote>`;
    case "button": {
      const href = safeHref(block.href, ctx.appOrigin);
      return href && block.label ? `<p style="margin:6px 0 18px;">${buttonHtml(issue, theme, block.label, href)}</p>` : "";
    }
    case "image": return block.path ? `<p style="margin:0 0 18px;"><img src="${escapeHtml(ctx.imageUrl(block.path))}" alt="${escapeHtml(block.alt)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border-radius:12px;"></p>` : "";
    case "entries": {
      if (block.items.length === 0) return "";
      const title = block.title ? `<p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;font-weight:bold;color:${theme.label};">${escapeHtml(block.title.toUpperCase())}</p>` : "";
      const rows = block.items.map((item) => `<tr><td style="padding:0 0 10px;"><a href="${escapeHtml(ctx.appOrigin + KIND_PATH[item.kind] + item.id)}" style="display:block;padding:13px 16px;border-radius:14px;background:${theme.item};color:${theme.text};text-decoration:none;font-size:16px;line-height:23px;font-weight:bold;">${escapeHtml(item.title)}</a></td></tr>`).join("");
      return `${title}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;">${rows}</table>`;
    }
  }
}

export function renderNewsletterHtml(issue: IssueData, ctx: RenderContext): string {
  const theme = THEMES[issue.look];
  const font = FONT_STACK[issue.font];
  const headerTitle = issue.headingCase === "upper" ? "AUS DEM NETZWERK" : "Aus dem Netzwerk";
  const header =
    issue.headerMode === "image" && issue.headerImagePath
      ? `<tr><td style="padding:0;"><img src="${escapeHtml(ctx.imageUrl(issue.headerImagePath))}" alt="${escapeHtml(issue.headerAlt)}" width="600" style="display:block;width:100%;height:auto;"></td></tr>`
      : issue.headerMode === "gradient"
        ? `<tr><td style="padding:26px 32px;background-color:${issue.look === "night" ? theme.headerFallback : issue.accent};background-image:linear-gradient(120deg,${issue.accent},#0a80b8);color:#ffffff;font-size:26px;line-height:32px;font-weight:bold;">${escapeHtml(headerTitle)}</td></tr>`
        : `<tr><td style="padding:26px 32px 0;color:${theme.text};font-size:24px;line-height:30px;font-weight:bold;">${escapeHtml(headerTitle)}</td></tr>`;
  const body = issue.blocks.map((block) => blockHtml(block, issue, theme, ctx)).join("");
  const footerColor = theme.sub;
  return `<!DOCTYPE html>
<html lang="de">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escapeHtml(issue.subject)}</title></head>
  <body style="margin:0;padding:0;background:${theme.page};font-family:${font};color:${theme.text};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(issue.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${theme.page};padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${theme.card};border:1px solid ${theme.border};border-radius:20px;overflow:hidden;">
          ${header}
          <tr><td style="padding:26px 32px 12px;font-family:${font};">${body}</td></tr>
          <tr><td style="padding:8px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:${footerColor};">
            <p style="margin:0 0 6px;">Du bekommst diese Mail, weil du dich für „Aus dem Netzwerk“ angemeldet und per Mail bestätigt hast.</p>
            <p style="margin:0;"><a href="${escapeHtml(ctx.unsubscribeUrl)}" style="color:${footerColor};">Mit einem Klick abmelden</a> · <a href="${escapeHtml(ctx.privacyUrl)}" style="color:${footerColor};">Datenschutz</a> · <a href="${escapeHtml(ctx.imprintUrl)}" style="color:${footerColor};">Impressum</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Die Textfassung fuer Programme ohne Bilder und fuer die Spam-Pruefung. */
export function renderNewsletterText(issue: IssueData, ctx: RenderContext): string {
  const parts: string[] = [issue.headingCase === "upper" ? "AUS DEM NETZWERK" : "Aus dem Netzwerk", ""];
  for (const block of issue.blocks) {
    if (block.type === "text") parts.push(toPlain(block.text), "");
    else if (block.type === "quote") parts.push(`„${block.text}“${block.by ? ` – ${block.by}` : ""}`, "");
    else if (block.type === "button") { const href = safeHref(block.href, ctx.appOrigin); if (href && block.label) parts.push(`${block.label}: ${href}`, ""); }
    else if (block.type === "entries") { if (block.title) parts.push(block.title); for (const item of block.items) parts.push(`- ${item.title}: ${ctx.appOrigin}${KIND_PATH[item.kind]}${item.id}`); parts.push(""); }
    else if (block.type === "divider") parts.push("---", "");
  }
  parts.push("--", `Abmelden: ${ctx.unsubscribeUrl}`, `Datenschutz: ${ctx.privacyUrl}`, `Impressum: ${ctx.imprintUrl}`);
  return parts.join("\n");
}
