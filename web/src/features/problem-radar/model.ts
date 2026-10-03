export const radarRoot = "/admin/problem-radar";
export const statuses = ["new", "reviewed", "relevant", "discarded"] as const;
export const sourceTypes = ["rss", "public_api", "public_web", "public_forum", "public_repository_issues", "public_review_source", "other"] as const;
export const methods = ["manual_url", "rss", "official_api", "approved_http"] as const;
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function pageNumber(value: unknown) { return typeof value === "string" && /^\d{1,4}$/.test(value) ? Number(value) : 0; }
export function filter(value: unknown, options: readonly string[]) { return typeof value === "string" && options.includes(value) ? value : null; }
/** Syntax only. DB owns canonicalization, source scope, identity and all grants. */
export function safeRadarUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\\x00-\x1f]/.test(value)) return null;
  if (!/^https?:\/\/[a-z0-9][a-z0-9.-]*(?::(?:80|443))?(?:[/?#]|$)/i.test(value)) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.port ? value : null;
  } catch { return null; }
}
export const sourceFields = ["name", "domain", "allowed_path", "source_type", "retrieval_method", "source_language", "region", "target_context", "source_nature", "source_origin", "policy_references", "review_note"] as const;
export const signalFields = ["source_id", "source_url", "source_title", "source_date", "source_language", "summary_language", "summary", "problem_observation", "affected_context", "availability", "stable_public_item_id"] as const;
export function sourceInput(form: FormData) {
  return { ...Object.fromEntries(sourceFields.map(key => [key, String(form.get(key) ?? "").trim()])), is_public: form.get("is_public") === "on" };
}
export function signalInput(form: FormData) {
  const input = Object.fromEntries(signalFields.map(key => [key, String(form.get(key) ?? "").trim()]));
  if (!uuid(input.source_id) || !safeRadarUrl(input.source_url) || form.get("minimized") !== "on") return null;
  return { ...input, source_date: input.source_date || null, tags: String(form.get("tags") ?? "").split(",").map(t => t.trim()).filter(Boolean), sensitivity: "clear" };
}
export type RadarSource = {
  id: string; revision: number; name: string; domain: string; allowed_path: string; source_type: string; retrieval_method: string;
  is_public: boolean; permission_state: string; status: string; source_language: string; region: string; target_context: string;
  source_nature: string; source_origin: string; policy_references: string; review_note: string;
  reviewed_at: string | null; review_due_at: string | null; usable: boolean;
};
export type RadarSignal = {
  id: string; source_id: string; revision: number; source_url: string | null; source_title: string | null; source_date: string | null;
  captured_at: string; source_language: string; summary_language: string; summary: string | null; problem_observation: string | null;
  affected_context: string | null; tags: string[]; review_status: string; sensitivity: string; usage_block: boolean; availability: string;
  created_by: string | null; reviewed_by: string | null; reviewed_at: string | null; review_due_at: string; delete_after: string | null;
  source_name: string; source_type: string; source_region: string; source_usable: boolean; usable: boolean; overdue: boolean; expired: boolean;
};
