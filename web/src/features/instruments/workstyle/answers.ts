import { workstyleItemFor, type WorkstyleForm } from "@/features/instruments/workstyle/registry";

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
