import "server-only";

import { PRODUCT_NAME } from "@/features/brand";
import { buildCronAlertPayload, cronAlertNeeded, type CronJobName } from "@/features/privacy/cronAlert";

type Result =
  | { ok: true }
  | { ok: false; error: "not_needed" | "missing_alert_email" | "missing_resend_api_key" | "missing_resend_from_email" | "resend_request_failed" | "resend_unavailable" };

/**
 * Best effort: Ein fehlgeschlagener Alarm darf den Lauf nicht noch einmal
 * scheitern lassen. Empfänger ist `CRON_ALERT_EMAIL`, ersatzweise
 * `FEEDBACK_NOTIFICATION_EMAIL`. Ohne beides bleibt es still.
 */
export async function sendCronFailureAlert(job: CronJobName, status: number, body: Record<string, unknown>): Promise<Result> {
  if (!cronAlertNeeded(status, body)) return { ok: false, error: "not_needed" };
  const recipient = (process.env.CRON_ALERT_EMAIL || process.env.FEEDBACK_NOTIFICATION_EMAIL)?.trim();
  if (!recipient) return { ok: false, error: "missing_alert_email" };
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        from: `${process.env.RESEND_FROM_NAME?.trim() || PRODUCT_NAME} <${fromEmail}>`,
        to: [recipient],
        ...buildCronAlertPayload(job, status, body),
      }),
    });
    return response.ok ? { ok: true } : { ok: false, error: "resend_request_failed" };
  } catch {
    return { ok: false, error: "resend_unavailable" };
  }
}
