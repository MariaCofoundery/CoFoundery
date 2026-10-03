import { WORKSTYLE_PRETEST_V1, previewWorkstyleForm, type WorkstyleForm } from "@/features/instruments/workstyle/registry";
import type { ResearchRow } from "@/features/instruments/workstyle/data";

export function median(values: readonly number[]): number | null {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function workstyleStatistics(rows: readonly ResearchRow[]) {
  const forms = (["A", "B", "C"] as const).map(form => ({ form, n: rows.filter(row => row.form === form).length }));
  function itemStats(itemKey: string, group: readonly ResearchRow[]) {
    const eligible = group.filter(row => previewWorkstyleForm(row.form).some(item => item.item_key === itemKey));
    const answers = eligible.flatMap(row => row.answers.filter(answer => answer.item_key === itemKey));
    const missing = answers.filter(answer => answer.missing_reason !== null).length;
    return { n: answers.length, eligible: eligible.length, missing, missingPercent: answers.length ? missing / answers.length * 100 : null,
      distribution: [1, 2, 3, 4, 5].map(value => answers.filter(answer => answer.response_value === value && answer.missing_reason === null).length),
      medianTimeMs: median(eligible.flatMap(row => typeof row.timings[itemKey] === "number" ? [row.timings[itemKey]] : [])),
      flags: { unclear: eligible.filter(row => row.feedback?.unclear_items?.includes(itemKey)).length,
        unsuitable: eligible.filter(row => row.feedback?.unsuitable_items?.includes(itemKey)).length,
        desirable: eligible.filter(row => row.feedback?.desirable_items?.includes(itemKey)).length } };
  }
  const incomplete = rows.filter(row => !row.completed_at);
  const dropPositions = new Map<string, number>();
  for (const row of incomplete) {
    const items = previewWorkstyleForm(row.form);
    const firstMissing = items.findIndex(item => !row.answers.some(answer => answer.item_key === item.item_key));
    const label = firstMissing === -1 ? "Abgabe ausstehend" : `${firstMissing + 1}: ${items[firstMissing].item_key}`;
    dropPositions.set(label, (dropPositions.get(label) ?? 0) + 1);
  }
  return { n: rows.length, forms, completed: rows.filter(row => row.completed_at).length,
    completionRate: rows.length ? rows.filter(row => row.completed_at).length / rows.length : null,
    medianDurationMs: median(rows.flatMap(row => row.completed_at ? [Date.parse(row.completed_at) - Date.parse(row.started_at)] : [])),
    dropPositions: [...dropPositions].map(([position, n]) => ({ position, n })),
    items: WORKSTYLE_PRETEST_V1.items.map(item => ({ item, ...itemStats(item.item_key, rows) })),
    coreByForm: WORKSTYLE_PRETEST_V1.core_item_keys.map(itemKey => ({ itemKey,
      forms: forms.map(({ form }) => ({ form, ...itemStats(itemKey, rows.filter(row => row.form === form)) })) })),
    feedback: rows.filter(row => row.feedback).map(row => ({ session_id: row.session_id, form: row.form, feedback: row.feedback! })) };
}

/** Long format, including not-yet-answered assigned items. No identity or free-text feedback. */
export function workstyleLongExport(rows: readonly ResearchRow[]): string {
  const header = ["session_id", "form", "assessment_version", "item_key", "item_version", "usage", "context_group", "founder_experience", "venture_phase", "response_value", "missing_reason", "response_state", "started_at", "completed_at", "completed", "response_time_ms", "consent_version"];
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const data = rows.flatMap(row => previewWorkstyleForm(row.form as WorkstyleForm).map(item => {
    const answer = row.answers.find(answer => answer.item_key === item.item_key);
    return [row.session_id, row.form, row.assessment_version, item.item_key, answer?.item_version ?? item.item_version, item.usage,
      row.context.team_size, row.context.founder_experience, row.context.venture_phase, answer?.response_value, answer?.missing_reason,
      !answer ? "not_answered" : answer.missing_reason ? "missing" : "answered", row.started_at, row.completed_at, Boolean(row.completed_at), row.timings[item.item_key], row.consent_version];
  }));
  return [header, ...data].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
