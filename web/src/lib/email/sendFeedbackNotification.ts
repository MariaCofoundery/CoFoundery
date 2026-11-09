import { PRODUCT_NAME } from "@/features/brand";
import "server-only";

import type { SanitizedFeedback } from "@/features/feedback/feedbackModel";

type Result =
  | { ok: true }
  | { ok: false; error: "missing_feedback_notification_email" | "missing_resend_api_key" | "missing_resend_from_email" | "resend_request_failed" | "resend_unavailable" };

const KIND_LABEL: Record<SanitizedFeedback["kind"], string> = { help: "Das hat geholfen", unclear: "Das war unklar", bug: "Da ist ein Fehler", missing: "Das fehlt mir" };
const MOMENT_LABEL: Record<NonNullable<SanitizedFeedback["moment"]>, string> = { setup_done: "nach dem Einrichten", workstyle_report: "nach dem eigenen Arbeitsprofil", team_workstyle: "nach dem Teamvergleich" };
const IMPORTANCE_LABEL: Record<NonNullable<SanitizedFeedback["importance"]>, string> = { minor: "Nebensache", important: "Wichtig", very: "Sehr wichtig" };

/** Neues Feedback (Panel, 09.11.2026): Art, Ort, Text. Keine E-Mail-Adresse - die steht nur im Admin-Bereich und nur mit Erlaubnis. */
export function buildPanelFeedbackNotificationPayload(params: SanitizedFeedback & { userId: string | null }) {
  const text = [
    `Neues Feedback: ${KIND_LABEL[params.kind]}`,
    "",
    `Bereich: ${params.area}`,
    ...(params.pagePath ? [`Seite: ${params.pagePath}`] : []),
    ...(params.moment ? [`Anlass: ${MOMENT_LABEL[params.moment]}`] : []),
    ...(params.importance ? [`Wichtigkeit: ${IMPORTANCE_LABEL[params.importance]}`] : []),
    ...(params.device ? [`Gerät: ${params.device === "phone" ? "Handy" : "Computer"}`] : []),
    `Darf angeschrieben werden: ${params.mayContact ? "ja" : "nein"}`,
    ...(params.invitationId ? [`Invitation-ID: ${params.invitationId}`] : []),
    `Nutzer: ${params.userId || "anonym"}`,
    "",
    params.message,
  ].join("\n");
  return { subject: `Neues Feedback zu ${PRODUCT_NAME}: ${KIND_LABEL[params.kind]}`, text };
}

/** Same Resend REST/config pattern as the other lib/email/send* helpers. */
async function deliver(payload: { subject: string; text: string }): Promise<Result> {
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
        from: `${process.env.RESEND_FROM_NAME?.trim() || PRODUCT_NAME} <${fromEmail}>`,
        to: [recipient],
        reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
        ...payload,
      }),
    });
    // Never return/log a provider response body containing submitted data.
    return response.ok ? { ok: true } : { ok: false, error: "resend_request_failed" };
  } catch {
    return { ok: false, error: "resend_unavailable" };
  }
}

export async function sendPanelFeedbackNotification(params: SanitizedFeedback & { userId: string | null }): Promise<Result> {
  return deliver(buildPanelFeedbackNotificationPayload(params));
}
