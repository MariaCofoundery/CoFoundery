/**
 * KI-Checkliste "So startet ihr KI-nativ" (20270412120000): acht feste Fragen, die Werkzeuge des Teams und seine Ablaeufe.
 * Das Team besitzt seine Angaben; die Organisation gibt nur einen Hinweis und Links mit. Kein Score, keine KI-Aufrufe.
 */
export const AI_ITEM_KEYS = ["repeat", "data", "owner", "rules", "small", "document", "review", "tools"] as const;
export type AiItemKey = (typeof AI_ITEM_KEYS)[number];
export type AiItemState = "done" | "skip";

export const AI_TOOL_MODES = ["hand", "part", "auto"] as const;
export type AiToolMode = (typeof AI_TOOL_MODES)[number];
export type AiStepMode = "hand" | "auto";

export type AiItem = { key: AiItemKey; state: AiItemState; note: string | null };
export type AiTool = { id: string; name: string; purpose: string | null; accessUserIds: string[]; mode: AiToolMode; connectedTo: string | null };
export type AiFlowStep = { text: string; who: string | null; mode: AiStepMode };
export type AiFlow = { id: string; name: string; steps: AiFlowStep[] };
export type AiTipLink = { label: string; url: string };
export type AiTip = { programId: string; teamId: string; orgName: string; note: string | null; links: AiTipLink[] };

export const isAiItemKey = (value: unknown): value is AiItemKey => (AI_ITEM_KEYS as readonly unknown[]).includes(value);
export const isAiToolMode = (value: unknown): value is AiToolMode => (AI_TOOL_MODES as readonly unknown[]).includes(value);

/** Wie viele der acht Fragen geklaert sind ("nicht relevant" zaehlt als geklaert) - nur eine Zahl fuer die Leiste. */
export function clearedCount(items: AiItem[]): number {
  return items.filter((item) => item.state === "done" || item.state === "skip").length;
}

/** Ein Ablauf in Zahlen: Schritte von Hand und automatisch - ohne Urteil. */
export function flowCounts(steps: AiFlowStep[]): { hand: number; auto: number } {
  return { hand: steps.filter((step) => step.mode === "hand").length, auto: steps.filter((step) => step.mode === "auto").length };
}

export const isHttpsUrl = (value: string) => /^https:\/\/\S+$/.test(value) && value.length <= 400;

export function stepsOf(value: unknown): AiFlowStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) return [];
    return [{ text, who: typeof row.who === "string" && row.who ? row.who : null, mode: row.mode === "auto" ? "auto" : "hand" } satisfies AiFlowStep];
  });
}

export function linksOf(value: unknown): AiTipLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    return label && isHttpsUrl(url) ? [{ label, url }] : [];
  });
}
