import { getEmailLogoUrl, getEmailPrivacyUrl } from "@/features/email/emailMessages";
import { PRODUCT_NAME } from "@/features/brand";
import { digestCopy, digestTotal, type DigestLine } from "@/features/notifications/deliveryRhythm";
import { resolveEmailLocale, type EmailLocaleInput } from "@/features/email/emailLocale";
import type { AppLocale } from "@/i18n/config";

/**
 * Die Morgenuebersicht (18.11.2026): eine Mail statt vieler.
 *
 * Nur Art und Anzahl, nie ein Name und nie ein Inhalt - eine Mail landet in
 * Postfaechern, die wir nicht kennen (dieselbe Regel wie bei jeder Mail aus dem
 * Netzwerk, sendNetworkNotificationEmail.ts). Was dasteht, steht in Made2Found.
 */
type Params = {
  recipientEmail: string;
  lines: DigestLine[];
  openUrl: string;
  settingsUrl: string;
  locale?: EmailLocaleInput;
};

type Result = { ok: true; id: string | null } | { ok: false; error: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildDigestHtml(params: Params, locale: AppLocale) {
  const copy = digestCopy(locale, digestTotal(params.lines));
  const open = escapeHtml(params.openUrl);
  const settings = escapeHtml(params.settingsUrl);
  const privacyUrl = escapeHtml(getEmailPrivacyUrl(locale));
  const rows = params.lines
    .map(
      (line) =>
        `<tr><td style="padding:12px 0;border-bottom:1px solid #e3e5f2;font-size:16px;line-height:24px;color:#0f172a;">${escapeHtml(line.label)}</td><td align="right" style="padding:12px 0;border-bottom:1px solid #e3e5f2;font-size:16px;line-height:24px;font-weight:700;color:#0f172a;">${line.count}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;"><img src="${escapeHtml(getEmailLogoUrl())}" alt="Made2Found" width="176" height="44" style="display:block;height:auto;width:176px;max-width:100%;" /></td></tr>
          <tr><td style="padding:24px 32px 32px;">
            <p style="margin:0 0 10px;font-size:12px;line-height:18px;letter-spacing:.12em;text-transform:uppercase;color:#6d28d9;">${escapeHtml(copy.eyebrow)}</p>
            <h1 style="margin:0 0 18px;font-size:26px;line-height:32px;color:#0f172a;">${escapeHtml(copy.headline)}</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:26px;color:#334155;">${escapeHtml(copy.intro)}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;border-top:1px solid #e3e5f2;">${rows}</table>
            <p style="margin:0 0 28px;"><a href="${open}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#6d28d9;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(copy.cta)}</a></p>
            <p style="margin:0 0 10px;font-size:13px;line-height:21px;color:#64748b;">${escapeHtml(copy.note)} <a href="${settings}" style="color:#64748b;">${escapeHtml(copy.changeRhythm)}</a></p>
            <div style="padding:16px 18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;"><p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">${escapeHtml(copy.fallback)}</p><p style="margin:0;font-size:13px;line-height:22px;word-break:break-all;"><a href="${open}" style="color:#0f172a;">${open}</a></p></div>
            <p style="margin:22px 0 0;font-size:12px;line-height:20px;color:#94a3b8;"><a href="${privacyUrl}" style="color:#94a3b8;">${escapeHtml(copy.privacy)}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendNotificationDigestEmail(params: Params): Promise<Result> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };
  const from = `${process.env.RESEND_FROM_NAME?.trim() || PRODUCT_NAME} <${fromEmail}>`;

  const locale = resolveEmailLocale(params.locale);
  const copy = digestCopy(locale, digestTotal(params.lines));

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [params.recipientEmail],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
      subject: copy.subject,
      html: buildDigestHtml(params, locale),
    }),
  });
  if (!response.ok) return { ok: false, error: `resend_${response.status}` };
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, id: payload?.id ?? null };
}
