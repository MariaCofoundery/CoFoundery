/** Empfehlungen (20270414120000): Arten, Themen und Filter. Keine Sterne, keine Rangfolge nach Beliebtheit. */
export const REC_KINDS = ["software", "person", "org", "project"] as const;
export type RecKind = (typeof REC_KINDS)[number];
export const REC_TOPICS = ["ki", "recht", "finanzen", "marketing", "vertrieb", "produkt", "team", "gesundheit", "nachhaltigkeit", "design"] as const;
export type RecTopic = (typeof REC_TOPICS)[number];
export const REC_REPORT_CATEGORIES = ["discrimination", "misleading", "harmful", "spam", "other"] as const;
export const REC_SINCE = ["30", "90", "365"] as const;
export const REC_COMMENT_MAX = 280;

export type Recommendation = {
  id: string; kind: RecKind; title: string; sub: string | null; url: string | null; subjectUserId: string | null; ventureId: string | null;
  topics: string[]; region: string | null; comment: string; authorUserId: string; authorName: string; publishedAt: string | null; mine: boolean;
};

export type RecFilters = { kinds: RecKind[]; topics: RecTopic[]; region: string; q: string; since: string; sort: "new" | "alpha"; page: number };

export const isRecKind = (v: unknown): v is RecKind => typeof v === "string" && (REC_KINDS as readonly string[]).includes(v);
export const isRecTopic = (v: unknown): v is RecTopic => typeof v === "string" && (REC_TOPICS as readonly string[]).includes(v);

const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export function parseRecFilters(sp: Record<string, string | string[] | undefined>): RecFilters {
  const since = String(many(sp.wann)[0] ?? "");
  const page = Number.parseInt(String(many(sp.seite)[0] ?? "1"), 10);
  return {
    kinds: many(sp.was).filter(isRecKind),
    topics: many(sp.thema).filter(isRecTopic),
    region: String(many(sp.region)[0] ?? "").trim().slice(0, 60),
    q: String(many(sp.suche)[0] ?? "").trim().slice(0, 80),
    since: (REC_SINCE as readonly string[]).includes(since) ? since : "",
    sort: many(sp.sortieren)[0] === "alpha" ? "alpha" : "new",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 50) : 1,
  };
}

/** Nur die Adresse mit https zulassen; die Datenbank prueft es noch einmal. */
export function cleanHttpsUrl(raw: string): string | null {
  const v = raw.trim();
  if (!/^https:\/\/[^\s]+$/.test(v) || v.length > 400) return null;
  try { return new URL(v).protocol === "https:" ? v : null; } catch { return null; }
}

export const REC_PAGE_SIZE = 24;
