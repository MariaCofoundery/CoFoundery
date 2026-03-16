export type QuestionnaireQuestionType = "likert" | "scenario" | "forced_choice";

export type QuestionnaireQuestion = {
  id: string;
  dimension: string;
  type: string | null;
  prompt: string;
  sort_order: number;
  is_active?: boolean;
  category?: string | null;
  optionA?: string | null;
  optionB?: string | null;
  option_a?: string | null;
  option_b?: string | null;
};

function normalizeQuestionRow(raw: Record<string, unknown>): QuestionnaireQuestion {
  return {
    id: String(raw.id ?? ""),
    dimension: String(raw.dimension ?? ""),
    type: typeof raw.type === "string" ? raw.type : null,
    prompt: String(raw.prompt ?? ""),
    sort_order: Number(raw.sort_order ?? 0),
    is_active: typeof raw.is_active === "boolean" ? raw.is_active : undefined,
    category: typeof raw.category === "string" ? raw.category : null,
    optionA:
      typeof raw.optionA === "string"
        ? raw.optionA
        : typeof raw.option_a === "string"
          ? raw.option_a
          : null,
    optionB:
      typeof raw.optionB === "string"
        ? raw.optionB
        : typeof raw.option_b === "string"
          ? raw.option_b
          : null,
    option_a: typeof raw.option_a === "string" ? raw.option_a : null,
    option_b: typeof raw.option_b === "string" ? raw.option_b : null,
  };
}

export function normalizeQuestionnaireQuestions(rows: unknown[]): QuestionnaireQuestion[] {
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return [];
    }
    return [normalizeQuestionRow(row as Record<string, unknown>)];
  });
}

