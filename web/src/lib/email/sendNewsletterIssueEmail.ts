import { PRODUCT_NAME } from "@/features/brand";

/**
 * Versand einer Ausgabe ueber Resend. Pakete bis 100 Mails je Aufruf (`/emails/batch`): Das schont das Tempolimit des Dienstes
 * (zwei Anfragen pro Sekunde) und die Laufzeit des Zeitplans. Jede Mail hat ihren eigenen Abmelde-Link.
 */
export type NewsletterMail = { to: string; subject: string; html: string; text: string; unsubscribeUrl: string };

const SENDER_NAME = `Maria | ${PRODUCT_NAME}`;

export async function sendNewsletterBatch(mails: NewsletterMail[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };
  if (mails.length === 0) return { ok: true };
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined;
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(
      mails.slice(0, 100).map((mail) => ({
        from: `${SENDER_NAME} <${fromEmail}>`,
        to: [mail.to],
        reply_to: replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: { "List-Unsubscribe": `<${mail.unsubscribeUrl}>` },
      })),
    ),
  });
  if (!response.ok) return { ok: false, error: `resend_${response.status}` };
  return { ok: true };
}
