import { workstyleItemFor, type WorkstyleForm } from "@/features/instruments/workstyle/registry";
import { workstyleV3Item } from "@/features/instruments/workstyle/researchSets";

export type WorkstyleAnswerValue =
  | Readonly<{ response_value: 1 | 2 | 3 | 4 | 5; missing_reason: null }>
  | Readonly<{ response_value: null; missing_reason: "cannot_assess" }>;

export type VersionedWorkstyleAnswer = WorkstyleAnswerValue & Readonly<{
  assessment_key: "founder-workstyle-pretest";
  assessment_version: string;
  item_key: string;
  item_version: string;
}>;

/** Pure validation for a future write service; this function does not persist answers. */
export function parseWorkstyleAnswer(
  identity: { assessment_version: string; item_key: string; item_version: string },
  assignedForm: WorkstyleForm | null,
  input: unknown,
): VersionedWorkstyleAnswer {
  if (identity.assessment_version === "8.5a-v1" ? !assignedForm || !["A", "B", "C"].includes(assignedForm) : assignedForm !== null) throw new Error("unknown_workstyle_form");
  if (identity.assessment_version === "8.5a-v3") throw new Error("workstyle_v3_answer_parser_required");
  const item = workstyleItemFor(identity.item_key, identity.item_version, identity.assessment_version);
  if (item.research_only && item.form !== assignedForm) throw new Error("workstyle_item_not_assigned");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_workstyle_answer");
  const data = input as Record<string, unknown>;
  if (Object.keys(data).length !== 2 || !("response_value" in data) || !("missing_reason" in data)) throw new Error("invalid_workstyle_answer");
  const value = data.response_value;
  const missing = data.missing_reason;
  const version = { assessment_key: "founder-workstyle-pretest" as const, ...identity };
  if (value === null && missing === "cannot_assess" && item.missing_reasons.includes(missing)) {
    return { ...version, response_value: null, missing_reason: missing };
  }
  if (missing === null && typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) {
    return { ...version, response_value: value as 1 | 2 | 3 | 4 | 5, missing_reason: null };
  }
  throw new Error("invalid_workstyle_answer");
}

export type WorkstyleV3Answer = Readonly<{
  assessment_key: "founder-workstyle-pretest";
  assessment_version: "8.5a-v3";
  item_key: string;
  item_version: string;
  response_value: number | null;
  response_option: string | null;
  missing_reason: "cannot_assess" | null;
  rendered_order: string[] | null;
}>;

/** Preserve category identity and presentation independently from ordinal values. */
export function parseWorkstyleV3Answer(itemKey: string, itemVersion: string, input: unknown): WorkstyleV3Answer {
  // Phase 11.6C: auch die Welle-1-Ueberarbeitungen (EVI-04r, EL-03r, EL-06r).
  const item = workstyleV3Item(itemKey);
  if (!item || item.item_version !== itemVersion) throw new Error("unknown_workstyle_item");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_workstyle_answer");
  const data = input as Record<string, unknown>;
  const keys = ["response_value", "response_option", "missing_reason", "rendered_order"];
  if (Object.keys(data).length !== keys.length || keys.some(key => !(key in data))) throw new Error("invalid_workstyle_answer");
  if (JSON.stringify(data.rendered_order) !== JSON.stringify(item.rendered_order ?? null)) throw new Error("invalid_workstyle_presentation");
  const value = data.response_value;
  const option = data.response_option;
  const missing = data.missing_reason;
  if ([value, option, missing].filter(v => v !== null).length !== 1) throw new Error("invalid_workstyle_answer");
  const categorical = ["comparative", "behavioral"].includes(item.response_format);
  const valid = missing === "cannot_assess" || (categorical
    ? typeof option === "string" && item.options?.some(o => o.option_id === option)
    : typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5);
  if (!valid || (missing !== null && missing !== "cannot_assess")) throw new Error("invalid_workstyle_answer");
  return { assessment_key: "founder-workstyle-pretest", assessment_version: "8.5a-v3", item_key: itemKey, item_version: itemVersion,
    response_value: value as number | null, response_option: option as string | null, missing_reason: missing as "cannot_assess" | null,
    rendered_order: item.rendered_order ? [...item.rendered_order] : null };
}
