import { uuid } from "@/features/problem-radar/model";
export const hypothesisFields = [
  "title",
  "problem_statement",
  "affected_context",
  "geographic_context",
  "hypothesis_language",
  "open_questions",
  "counter_observations",
  "evidence_limits",
] as const;
export type EvidenceSignal = {
  id: string;
  revision: number;
  usable: boolean;
  origin_key?: string | null;
  summary?: string;
  problem_observation?: string;
  source_url?: string;
  source_date?: string | null;
  source_name?: string;
  domain?: string;
  source_language?: string;
  summary_language?: string;
  region?: string;
  tags?: string[];
};
export type Hypothesis = Record<(typeof hypothesisFields)[number], string> & {
  id: string;
  revision: number;
  status: "draft" | "reviewed" | "archived";
  needs_review: boolean;
  ready: boolean;
  can_handoff: boolean;
  review_due_at: string | null;
  delete_after: string;
  signals: EvidenceSignal[];
  evidence: {
    signals: number;
    sources: number;
    domains: number;
    origins: number;
    unknown_origins: number;
    earliest_date: string | null;
    latest_date: string | null;
    unknown_dates: number;
    languages: string[];
    regions: string[];
    tags: string[];
  };
};
export type ImportCount = {
  signal_key: string;
  workspaces: number;
  entries: number;
  restricted: boolean;
  redactable_texts: number;
  redactable_links: number;
};
export function hypothesisInput(form: FormData) {
  return Object.fromEntries(
    hypothesisFields.map((k) => [k, String(form.get(k) ?? "").trim()]),
  );
}
export function handoffInput(form: FormData) {
  try {
    const input: unknown = JSON.parse(String(form.get("handoff") ?? ""));
    if (!input || typeof input !== "object") return null;
    const p = input as Record<string, unknown>;
    if (
      !uuid(p.id) ||
      !uuid(p.request) ||
      !Number.isSafeInteger(p.revision) ||
      Number(p.revision) < 1 ||
      typeof p.title !== "string" ||
      !p.title.trim() ||
      p.title.length > 160 ||
      typeof p.description !== "string" ||
      p.description.length > 3000
    )
      return null;
    if (
      !Array.isArray(p.signals) ||
      !Array.isArray(p.links) ||
      p.signals.length > 100 ||
      p.links.length > 100 ||
      !p.signals.every(uuid) ||
      !p.links.every(uuid) ||
      new Set(p.signals).size !== p.signals.length ||
      new Set(p.links).size !== p.links.length ||
      !p.links.every(
        (id) => p.signals instanceof Array && p.signals.includes(id),
      )
    )
      return null;
    return {
      p_id: p.id,
      p_revision: Number(p.revision),
      p_request: p.request,
      p_title: p.title.trim(),
      p_description: p.description.trim(),
      p_signals: p.signals as string[],
      p_links: p.links as string[],
      p_confirm: form.get("confirm") === "on",
    };
  } catch {
    return null;
  }
}
