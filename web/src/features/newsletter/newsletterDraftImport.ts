import { normalizeIssue, type IssueData } from "@/features/newsletter/newsletterModel";

/**
 * "Entwurf einfuegen": Der Newsletter-Skill schreibt eine Ausgabe als JSON, der Admin fuegt sie ein. Rein (kein Server-Code), damit es testbar ist.
 * Das JSON wird wie jede Eingabe behandelt: Es geht durch dieselbe Bereinigung wie ein Speichern im Editor (Bausteine, Laengen, Links, Farben).
 * Fehlende Look-Angaben kommen aus der letzten Ausgabe (`base`), damit der Look nicht jedes Mal neu gewaehlt werden muss.
 */
export type DraftImportResult = { ok: true; issue: IssueData } | { ok: false; error: "empty" | "invalid" | "too_big" | "no_content" };

const MAX_BYTES = 100_000;

export function parseDraftJson(text: string, base: Partial<IssueData> = {}): DraftImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (trimmed.length > MAX_BYTES) return { ok: false, error: "too_big" };
  // Haeufig kommt das JSON in einem Markdown-Codeblock an: den Zaun entfernen.
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try { parsed = JSON.parse(unfenced); } catch { return { ok: false, error: "invalid" }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "invalid" };
  const issue = normalizeIssue({ ...base, ...(parsed as Record<string, unknown>) });
  if (!issue.subject.trim() || issue.blocks.length === 0) return { ok: false, error: "no_content" };
  return { ok: true, issue };
}
