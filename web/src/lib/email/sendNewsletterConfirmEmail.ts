import { PRODUCT_NAME } from "@/features/brand";
import { getEmailLogoUrl, getEmailPrivacyUrl } from "@/features/email/emailMessages";
import { resolveEmailLocale, type EmailLocaleInput } from "@/features/email/emailLocale";
import { getNewsletterConfirmCopy } from "@/features/email/newsletterConfirmCopy";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const SENDER_NAME = `Maria | ${PRODUCT_NAME}`;

type Params = { recipientEmail: string; name: string | null; confirmUrl: string; locale?: EmailLocaleInput };

export function buildNewsletterConfirmHtml(params: Params) {
  const locale = resolveEmailLocale(params.locale);
  const copy = getNewsletterConfirmCopy(locale, params.name);
  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;"><img src="${escapeHtml(getEmailLogoUrl())}" alt="Made2Found" width="176" height="44" style="display:block;height:auto;width:176px;"></td></tr>
          <tr><td style="padding:24px 32px 32px;">
            <h1 style="margin:0 0 16px;font-size:26px;line-height:33px;color:#0f172a;">${escapeHtml(copy.headline)}</h1>
            <p style="margin:0 0 22px;font-size:16px;line-height:26px;color:#334155;">${escapeHtml(copy.intro)}</p>
            <p style="margin:0 0 8px;"><a href="${escapeHtml(params.confirmUrl)}" style="display:inline-block;padding:15px 24px;border-radius:999px;background:#6d28d9;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;">${escapeHtml(copy.cta)}</a></p>
            <p style="margin:0 0 26px;font-size:14px;line-height:22px;color:#64748b;">${escapeHtml(copy.ctaHint)}</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#334155;white-space:pre-line;">${escapeHtml(copy.signoff)}</p>
            <p style="margin:0;font-size:12px;line-height:20px;color:#94a3b8;"><a href="${escapeHtml(getEmailPrivacyUrl(locale))}" style="color:#94a3b8;">${escapeHtml(copy.privacy)}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendNewsletterConfirmEmail(params: Params): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };
  const copy = getNewsletterConfirmCopy(resolveEmailLocale(params.locale), params.name);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${fromEmail}>`,
      to: [params.recipientEmail],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
      subject: copy.subject,
      html: buildNewsletterConfirmHtml(params),
    }),
  });
  if (!response.ok) return { ok: false, error: `resend_${response.status}` };
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, id: payload?.id ?? null };
}
