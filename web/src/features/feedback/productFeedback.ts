export const PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS = [
  {
    value: "matching_besser_verstehen",
    label: "Matching besser verstehen",
  },
  {
    value: "unterschiede_klarer_sehen",
    label: "Unterschiede klarer sehen",
  },
  {
    value: "entscheidungen_treffen",
    label: "Entscheidungen treffen",
  },
  {
    value: "zusammenarbeit_strukturieren",
    label: "Zusammenarbeit strukturieren",
  },
  {
    value: "konflikte_greifbarer_machen",
    label: "Konflikte greifbarer machen",
  },
  {
    value: "anderes",
    label: "anderes",
  },
] as const;

export type ProductFeedbackSource = "nav" | "workbook";
export type ProductFeedbackAssistanceChoice =
  (typeof PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS)[number]["value"];

export type ProductFeedbackSubmissionInput = {
  source: ProductFeedbackSource;
  invitationId?: string | null;
  q1Value: string;
  q2Value: string;
  q3Value: string;
  q4Choice?: ProductFeedbackAssistanceChoice | null;
  q4OtherText?: string | null;
  q5Text?: string | null;
};

export type SanitizedProductFeedbackSubmission = {
  source: ProductFeedbackSource;
  invitationId: string | null;
  q1Value: string;
  q2Value: string;
  q3Value: string;
  q4Choice: ProductFeedbackAssistanceChoice | null;
  q4OtherText: string | null;
  q5Text: string | null;
};

export function sanitizeProductFeedbackSubmission(
  input: ProductFeedbackSubmissionInput
):
  | {
      ok: true;
      value: SanitizedProductFeedbackSubmission;
    }
  | {
      ok: false;
      error: "missing_required";
      fields: Array<"q1Value" | "q2Value" | "q3Value">;
    } {
  const q1Value = input.q1Value.trim();
  const q2Value = input.q2Value.trim();
  const q3Value = input.q3Value.trim();
  const missingFields: Array<"q1Value" | "q2Value" | "q3Value"> = [];

  if (!q1Value) missingFields.push("q1Value");
  if (!q2Value) missingFields.push("q2Value");
  if (!q3Value) missingFields.push("q3Value");

  if (missingFields.length > 0) {
    return {
      ok: false,
      error: "missing_required",
      fields: missingFields,
    };
  }

  const q4Choice = PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS.some(
    (option) => option.value === input.q4Choice
  )
    ? (input.q4Choice ?? null)
    : null;
  const q4OtherText =
    q4Choice === "anderes" ? normalizeOptionalText(input.q4OtherText) : null;

  return {
    ok: true,
    value: {
      source: input.source,
      invitationId: normalizeOptionalText(input.invitationId),
      q1Value,
      q2Value,
      q3Value,
      q4Choice,
      q4OtherText,
      q5Text: normalizeOptionalText(input.q5Text),
    },
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}
