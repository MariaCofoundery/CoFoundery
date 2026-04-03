"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sanitizeProductFeedbackSubmission,
  type ProductFeedbackSubmissionInput,
} from "@/features/feedback/productFeedback";

export type SubmitProductFeedbackResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "not_authenticated" | "invalid_input" | "insert_failed";
    };

export async function submitProductFeedbackAction(
  input: ProductFeedbackSubmissionInput
): Promise<SubmitProductFeedbackResult> {
  const sanitized = sanitizeProductFeedbackSubmission(input);
  if (!sanitized.ok) {
    return { ok: false, reason: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const { value } = sanitized;
  const { error } = await supabase.from("product_feedback").insert({
    user_id: user.id,
    invitation_id: value.invitationId,
    source: value.source,
    q1_value: value.q1Value,
    q2_value: value.q2Value,
    q3_value: value.q3Value,
    q4_choice: value.q4Choice,
    q4_other_text: value.q4OtherText,
    q5_text: value.q5Text,
  });

  if (error) {
    return { ok: false, reason: "insert_failed" };
  }

  return { ok: true };
}
