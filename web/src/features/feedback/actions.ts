"use server";

import { createClient } from "@/lib/supabase/server";
import { sendFeedbackNotification, sendPanelFeedbackNotification } from "@/lib/email/sendFeedbackNotification";
import { sanitizeFeedbackSubmission, type FeedbackSubmissionInput } from "@/features/feedback/feedbackModel";
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

  // The insert is complete. Notification failures must never change its result.
  try {
    const notification = await sendFeedbackNotification({ ...value, userId: user.id });
    if (!notification.ok) {
      console.warn("[feedback] notification_not_sent", notification.error);
    }
  } catch {
    // Do not log provider exceptions: they can contain feedback or addresses.
    console.warn("[feedback] notification_not_sent", "unexpected_mail_error");
  }

  return { ok: true };
}

/**
 * Feedback aus dem Panel (09.11.2026). Bereich und Seite bestimmt der SERVER aus der Adresse - die Eingabe kann weder
 * einen Bereich vorgeben noch eine Kennung oder einen Code in die Seite schmuggeln. Die Erlaubnis zum Anschreiben gilt
 * nur bei ausdruecklichem Ja.
 */
export async function submitFeedbackAction(input: FeedbackSubmissionInput): Promise<SubmitProductFeedbackResult> {
  const sanitized = sanitizeFeedbackSubmission(input);
  if (!sanitized.ok) return { ok: false, reason: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_authenticated" };

  const { value } = sanitized;
  const { error } = await supabase.from("product_feedback").insert({
    user_id: user.id,
    invitation_id: value.invitationId,
    source: value.source,
    kind: value.kind,
    message: value.message,
    importance: value.importance,
    area: value.area,
    page_path: value.pagePath,
    device: value.device,
    may_contact: value.mayContact,
  });
  if (error) return { ok: false, reason: "insert_failed" };

  // Der Eintrag steht. Eine fehlgeschlagene Benachrichtigung aendert daran nichts.
  try {
    const notification = await sendPanelFeedbackNotification({ ...value, userId: user.id });
    if (!notification.ok) console.warn("[feedback] notification_not_sent", notification.error);
  } catch {
    console.warn("[feedback] notification_not_sent", "unexpected_mail_error");
  }
  return { ok: true };
}
