import { PRODUCT_NAME } from "@/features/brand";
import { getEmailLogoUrl, getEmailPrivacyUrl } from "@/features/email/emailMessages";
import { publicNewsletterCopy, type PublicNewsletterLanguage } from "@/features/newsletter/publicNewsletterCopy";

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const SENDER_NAME = `Maria | ${PRODUCT_NAME}`;

type Params = { recipientEmail: string; confirmUrl: string; language: PublicNewsletterLanguage };

/** Die Bestaetigungsmail der Newsletter-Anmeldung ohne Konto (Double-Opt-in). Ein Knopf, kein Tracking-Pixel. */
export function buildPublicNewsletterConfirmHtml({ confirmUrl, language }: Pick<Params, "confirmUrl" | "language">) {
  const c = publicNewsletterCopy(language).mail;
  return `<!DOCTYPE html>
<html lang="${language}">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;"><img src="${esc(getEmailLogoUrl())}" alt="Made2Found" width="176" height="44" style="display:block;height:auto;width:176px;"></td></tr>
          <tr><td style="padding:24px 32px 32px;">
            <h1 style="margin:0 0 16px;font-size:26px;line-height:33px;color:#0f172a;">${esc(c.headline)}</h1>
            <p style="margin:0 0 22px;font-size:16px;line-height:26px;color:#334155;">${esc(c.intro)}</p>
            <p style="margin:0 0 8px;"><a href="${esc(confirmUrl)}" style="display:inline-block;padding:15px 24px;border-radius:999px;background:#6d28d9;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;">${esc(c.cta)}</a></p>
            <p style="margin:0 0 26px;font-size:14px;line-height:22px;color:#64748b;">${esc(c.hint)}</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#334155;white-space:pre-line;">${esc(c.signoff)}</p>
            <p style="margin:0;font-size:12px;line-height:20px;color:#94a3b8;"><a href="${esc(getEmailPrivacyUrl(language))}" style="color:#94a3b8;">${esc(c.privacy)}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendPublicNewsletterConfirmEmail(params: Params): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };
  const c = publicNewsletterCopy(params.language).mail;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${fromEmail}>`,
      to: [params.recipientEmail],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
      subject: c.subject,
      html: buildPublicNewsletterConfirmHtml(params),
      text: `${c.headline}\n\n${c.intro}\n\n${c.cta}: ${params.confirmUrl}\n\n${c.hint}\n\n${c.signoff}`,
    }),
  });
  return response.ok ? { ok: true } : { ok: false, error: `resend_${response.status}` };
}
