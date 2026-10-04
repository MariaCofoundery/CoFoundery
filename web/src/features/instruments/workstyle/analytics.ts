import { workstyleRegistryFor, workstyleSessionItems } from "@/features/instruments/workstyle/registry";
import type { ResearchRow } from "@/features/instruments/workstyle/data";

export function median(values: readonly number[]): number | null {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function workstyleStatistics(input: readonly ResearchRow[], version = "8.5a-v1") {
  const registry = workstyleRegistryFor(version);
  const rows = input.filter(row => row.assessment_version === version);
  const forms = (version === "8.5a-v1" ? (["A", "B", "C"] as const) : []).map(form => ({ form, n: rows.filter(row => row.form === form).length }));
  function itemStats(itemKey: string, group: readonly ResearchRow[]) {
    const eligible = group.filter(row => workstyleSessionItems(row.assessment_version, row.form).some(item => item.item_key === itemKey));
    const answers = eligible.flatMap(row => row.answers.filter(answer => answer.item_key === itemKey && answer.item_version === registry.items.find(item => item.item_key === itemKey)?.item_version));
    const missing = answers.filter(answer => answer.missing_reason !== null).length;
    return { n: answers.length, eligible: eligible.length, missing, missingPercent: answers.length ? missing / answers.length * 100 : null,
      distribution: [1, 2, 3, 4, 5].map(value => answers.filter(answer => answer.response_value === value && answer.missing_reason === null).length),
      medianTimeMs: median(eligible.flatMap(row => typeof row.timings[itemKey] === "number" ? [row.timings[itemKey]] : [])),
      flags: { clearRealistic: eligible.filter(row => row.feedback?.clear_realistic_items?.includes(itemKey)).length, unclear: eligible.filter(row => row.feedback?.unclear_items?.includes(itemKey)).length,
        unsuitable: eligible.filter(row => row.feedback?.unsuitable_items?.includes(itemKey)).length,
        desirable: eligible.filter(row => row.feedback?.desirable_items?.includes(itemKey)).length } };
  }
  const incomplete = rows.filter(row => !row.completed_at);
  const dropPositions = new Map<string, number>();
  for (const row of incomplete) {
    const items = workstyleSessionItems(row.assessment_version, row.form);
    const firstMissing = items.findIndex(item => !row.answers.some(answer => answer.item_key === item.item_key));
    const openPosition = version === "8.5a-v2" ? row.resume_position ?? firstMissing : firstMissing;
    const label = openPosition === -1 ? "Abgabe ausstehend" : `${openPosition + 1}: ${items[openPosition].item_key}`;
    dropPositions.set(label, (dropPositions.get(label) ?? 0) + 1);
  }
  return { n: rows.length, forms, completed: rows.filter(row => row.completed_at).length,
    completionRate: rows.length ? rows.filter(row => row.completed_at).length / rows.length : null,
    medianDurationMs: median(rows.flatMap(row => row.completed_at ? [Date.parse(row.completed_at) - Date.parse(row.started_at)] : [])),
    dropPositions: [...dropPositions].map(([position, n]) => ({ position, n })),
    items: registry.items.map(item => ({ item, ...itemStats(item.item_key, rows) })),
    coreByForm: (version === "8.5a-v1" ? registry.core_item_keys : []).map(itemKey => ({ itemKey,
      forms: forms.map(({ form }) => ({ form, ...itemStats(itemKey, rows.filter(row => row.form === form)) })) })),
    feedback: rows.filter(row => row.feedback).map(row => ({ session_id: row.session_id, form: row.form, feedback: row.feedback! })) };
}

/** Long format, including not-yet-answered assigned items. No identity or free-text feedback. */
export function workstyleLongExport(input: readonly ResearchRow[], version = "8.5a-v1"): string {
  const registry = workstyleRegistryFor(version);
  const rows = input.filter(row => row.assessment_version === version);
  const header = ["session_id", "form", "assessment_version", "manifest_version", "item_key", "item_version", "usage", "research_only", "context_group", "founder_experience", "venture_phase", "response_value", "missing_reason", "response_state", "started_at", "completed_at", "completed", "response_time_ms", "consent_version"];
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const data = rows.flatMap(row => workstyleSessionItems(row.assessment_version, row.form).map(item => {
    const answer = row.answers.find(answer => answer.item_key === item.item_key);
    return [row.session_id, row.form, row.assessment_version, registry.registry_version, item.item_key, answer?.item_version ?? item.item_version, item.usage, item.research_only,
      row.context.team_size, row.context.founder_experience, row.context.venture_phase, answer?.response_value, answer?.missing_reason,
      !answer ? "not_answered" : answer.missing_reason ? "missing" : "answered", row.started_at, row.completed_at, Boolean(row.completed_at), row.timings[item.item_key], row.consent_version];
  }));
  return [header, ...data].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
