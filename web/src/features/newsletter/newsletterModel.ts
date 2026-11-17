/**
 * Newsletter "Aus dem Netzwerk": das Modell einer Ausgabe. Rein (kein Server-Code), damit Editor und Versand dasselbe benutzen.
 * Eine Ausgabe besteht aus Bausteinen, nicht aus freiem HTML: So sieht sie in jedem Mail-Programm stimmig aus.
 */
export const LOOKS = ["light", "night", "plain"] as const;
export type Look = (typeof LOOKS)[number];
export const HEADER_MODES = ["gradient", "image", "none"] as const;
export const FONTS = ["serif", "sans"] as const;
export const BUTTON_STYLES = ["round", "square", "outline"] as const;
export const HEADING_CASES = ["normal", "upper"] as const;
export const LANGUAGES = ["de", "en"] as const;
export type NewsletterLanguage = (typeof LANGUAGES)[number];
/** Wer die Ausgabe bekommt: Mitglieder (mit Konto), die Nur-Newsletter-Liste (ohne Konto, z. B. aus dem Blog) oder beide. */
export const AUDIENCES = ["members", "public", "all"] as const;
export type NewsletterAudience = (typeof AUDIENCES)[number];
export const ACCENTS = ["#5b3df5", "#0a88c2", "#2dbfa8", "#d4286b", "#e08a1e"] as const;

export type EntryItem = { kind: "listing" | "problem"; id: string; title: string };
export type Block =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "entries"; title: string; items: EntryItem[] }
  | { id: string; type: "button"; label: string; href: string }
  | { id: string; type: "quote"; text: string; by: string }
  | { id: string; type: "image"; path: string; alt: string }
  | { id: string; type: "divider" };
export type BlockType = Block["type"];

export type IssueData = {
  title: string; subject: string; preheader: string;
  look: Look; accent: string; headerMode: (typeof HEADER_MODES)[number]; headerImagePath: string; headerAlt: string;
  font: (typeof FONTS)[number]; buttonStyle: (typeof BUTTON_STYLES)[number]; headingCase: (typeof HEADING_CASES)[number];
  language: NewsletterLanguage; audience: NewsletterAudience;
  blocks: Block[];
};

export const LIMITS = { blocks: 40, text: 6000, subject: 120, preheader: 200, items: 12, itemTitle: 140, label: 60 } as const;

const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list as readonly string[]).includes(String(value)) ? (value as T) : fallback;
const str = (value: unknown, max: number) => (typeof value === "string" ? value : "").slice(0, max);
const idOf = (value: unknown, index: number) => (typeof value === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(value) ? value : `b${index}`);

/** Gibt nur Links zurueck, die in einer Mail etwas zu suchen haben: https oder ein Pfad dieser App. */
export function safeHref(value: string, appOrigin: string): string | null {
  const v = value.trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v;
  if (/^\/[A-Za-z0-9\-._~/?=&%#]*$/.test(v) && !v.startsWith("//")) return `${appOrigin}${v}`;
  return null;
}

export function sanitizeBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  raw.slice(0, LIMITS.blocks).forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const b = entry as Record<string, unknown>;
    const id = idOf(b.id, index);
    switch (b.type) {
      case "text": out.push({ id, type: "text", text: str(b.text, LIMITS.text) }); break;
      case "quote": out.push({ id, type: "quote", text: str(b.text, 400), by: str(b.by, 80) }); break;
      case "button": out.push({ id, type: "button", label: str(b.label, LIMITS.label), href: str(b.href, 300) }); break;
      case "image": out.push({ id, type: "image", path: str(b.path, 200).replace(/[^A-Za-z0-9._-]/g, ""), alt: str(b.alt, 200) }); break;
      case "divider": out.push({ id, type: "divider" }); break;
      case "entries": {
        const items = Array.isArray(b.items) ? b.items.slice(0, LIMITS.items).flatMap((item): EntryItem[] => {
          const i = item as Record<string, unknown>;
          const kind = i?.kind === "problem" ? "problem" : i?.kind === "listing" ? "listing" : null;
          const itemId = typeof i?.id === "string" && /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null;
          return kind && itemId ? [{ kind, id: itemId, title: str(i.title, LIMITS.itemTitle) }] : [];
        }) : [];
        out.push({ id, type: "entries", title: str(b.title, LIMITS.label), items });
        break;
      }
    }
  });
  return out;
}

export function normalizeIssue(raw: Record<string, unknown>): IssueData {
  const accent = typeof raw.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.accent) ? raw.accent : ACCENTS[0];
  return {
    title: str(raw.title, 120), subject: str(raw.subject, LIMITS.subject), preheader: str(raw.preheader, LIMITS.preheader),
    look: pick(LOOKS, raw.look, "night"), accent, headerMode: pick(HEADER_MODES, raw.headerMode, "gradient"),
    headerImagePath: str(raw.headerImagePath, 200).replace(/[^A-Za-z0-9._-]/g, ""), headerAlt: str(raw.headerAlt, 200),
    font: pick(FONTS, raw.font, "serif"), buttonStyle: pick(BUTTON_STYLES, raw.buttonStyle, "round"), headingCase: pick(HEADING_CASES, raw.headingCase, "normal"),
    language: pick(LANGUAGES, raw.language, "de"), audience: pick(AUDIENCES, raw.audience, "members"), blocks: sanitizeBlocks(raw.blocks),
  };
}

/** Von der Datenbankzeile (snake_case) zum Modell. */
export function issueFromRow(row: Record<string, unknown>): IssueData {
  return normalizeIssue({
    title: row.title, subject: row.subject, preheader: row.preheader, look: row.look, accent: row.accent, headerMode: row.header_mode,
    headerImagePath: row.header_image_path, headerAlt: row.header_alt, font: row.font, buttonStyle: row.button_style, headingCase: row.heading_case, language: row.language, audience: row.audience, blocks: row.blocks,
  });
}

/** Vom Modell zur Nutzlast der Speicher-Funktion. */
export function issueToPayload(issue: IssueData) {
  return {
    title: issue.title, subject: issue.subject, preheader: issue.preheader, look: issue.look, accent: issue.accent, header_mode: issue.headerMode,
    header_image_path: issue.headerImagePath, header_alt: issue.headerAlt, font: issue.font, button_style: issue.buttonStyle, heading_case: issue.headingCase, language: issue.language, audience: issue.audience, blocks: issue.blocks,
  };
}

export function emptyIssue(base?: Partial<IssueData>): IssueData {
  return normalizeIssue({
    look: "night", accent: ACCENTS[0], headerMode: "gradient", font: "serif", buttonStyle: "round", headingCase: "normal", ...base,
    blocks: [{ id: "intro", type: "text", text: "Hallo,\n\n" }, { id: "go", type: "button", label: "Zu Connect", href: "/connect" }],
    title: "", subject: "", preheader: "", headerImagePath: "", headerAlt: "",
  });
}
