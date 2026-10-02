import "server-only";

import { PRODUCT_NAME } from "@/features/brand";
import { PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS, type SanitizedProductFeedbackSubmission } from "@/features/feedback/productFeedback";
import feedbackCopy from "../../../messages/de/feedback.json";

type Params = SanitizedProductFeedbackSubmission & { userId: string | null };
type Result =
  | { ok: true }
  | { ok: false; error: "missing_feedback_notification_email" | "missing_resend_api_key" | "missing_resend_from_email" | "resend_request_failed" | "resend_unavailable" };

/** Only the sanitized data already used by the feedback insert. No extra lookup. */
export function buildFeedbackNotificationPayload(params: Params) {
  const category = PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS.find((option) => option.value === params.q4Choice)?.label;
  const text = [
    "Neues Feedback",
    "",
    `Kontext: ${params.source === "workbook" ? "Workbook" : "Navigation"} (${params.source})`,
    ...(params.invitationId ? [`Invitation-ID: ${params.invitationId}`] : []),
    `Nutzer: ${params.userId || "anonym"}`,
    ...(category ? [`Gewünschte Unterstützung: ${category}`] : []),
    "",
    "Feedback:",
    feedbackCopy.questions.q1,
    params.q1Value,
    "",
    feedbackCopy.questions.q2,
    params.q2Value,
    "",
    feedbackCopy.questions.q3,
    params.q3Value,
    ...(params.q4OtherText ? ["", feedbackCopy.questions.q4Other, params.q4OtherText] : []),
    ...(params.q5Text ? ["", feedbackCopy.questions.q5, params.q5Text] : []),
  ].join("\n");

  // Plain text avoids interpreting submitted content as HTML; no images or links.
  return { subject: `Neues Feedback zu ${PRODUCT_NAME}`, text };
}

/** Same Resend REST/config pattern as the other lib/email/send* helpers. */
export async function sendFeedbackNotification(params: Params): Promise<Result> {
  const recipient = process.env.FEEDBACK_NOTIFICATION_EMAIL?.trim();
  if (!recipient) return { ok: false, error: "missing_feedback_notification_email" };
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      // Bound the best-effort attempt so an unavailable provider cannot stall the form.
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        from: `${process.env.RESEND_FROM_NAME?.trim() || "Cofoundery"} <${fromEmail}>`,
        to: [recipient],
        reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
        ...buildFeedbackNotificationPayload(params),
      }),
    });
    // Never return/log a provider response body containing submitted data.
    return response.ok ? { ok: true } : { ok: false, error: "resend_request_failed" };
  } catch {
    return { ok: false, error: "resend_unavailable" };
  }
}
