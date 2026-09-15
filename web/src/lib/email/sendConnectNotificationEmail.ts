import type { AppLocale } from "@/i18n/config";
import { resolveEmailLocale, type EmailLocaleInput } from "@/features/email/emailLocale";
import {
  getConnectNotificationEmailCopy,
  getEmailPrivacyUrl,
  type ConnectNotificationCopyKind,
} from "@/features/email/emailMessages";

/**
 * Die Benachrichtigung fuer Connect.
 *
 * Bewusst knapp: Was passiert ist, wer es war, ein Knopf. Kein Inhalt der
 * Nachricht, kein Auszug aus der Anfrage - eine Mail landet in Postfaechern,
 * die wir nicht kennen, und in Vorschauen auf Sperrbildschirmen. Was jemand
 * geschrieben hat, steht in CoFoundery.
 */

type Params = {
  recipientEmail: string;
  kind: ConnectNotificationCopyKind;
  senderName: string | null;
  url: string;
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

function buildFromAddress() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) return null;
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "Cofoundery";
  return `${fromName} <${fromEmail}>`;
}

function buildHtmlBody(params: Params, locale: AppLocale) {
  const copy = getConnectNotificationEmailCopy(locale, {
    kind: params.kind,
    senderName: params.senderName,
  });
  const url = escapeHtml(params.url);
  const privacyUrl = escapeHtml(getEmailPrivacyUrl(locale));

  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;"><img src="https://cofoundery.de/cofoundery-align-logo.svg" alt="Cofoundery Align" width="176" height="34" style="display:block;height:auto;width:176px;max-width:100%;" /></td></tr>
          <tr><td style="padding:24px 32px 32px;">
            <p style="margin:0 0 10px;font-size:12px;line-height:18px;letter-spacing:.12em;text-transform:uppercase;color:#6d28d9;">${escapeHtml(copy.eyebrow)}</p>
            <h1 style="margin:0 0 18px;font-size:26px;line-height:32px;color:#0f172a;">${escapeHtml(copy.headline)}</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:26px;color:#334155;">${escapeHtml(copy.intro)}</p>
            <p style="margin:0 0 28px;"><a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#6d28d9;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(copy.cta)}</a></p>
            <p style="margin:0 0 10px;font-size:13px;line-height:21px;color:#64748b;">${escapeHtml(copy.note)}</p>
            <p style="margin:0 0 22px;font-size:13px;line-height:21px;color:#64748b;">${escapeHtml(copy.settings)}</p>
            <div style="padding:16px 18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;"><p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">${escapeHtml(copy.fallback)}</p><p style="margin:0;font-size:13px;line-height:22px;word-break:break-all;"><a href="${url}" style="color:#0f172a;">${url}</a></p></div>
            <p style="margin:22px 0 0;font-size:12px;line-height:20px;color:#94a3b8;"><a href="${privacyUrl}" style="color:#94a3b8;">${escapeHtml(copy.privacy)}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendConnectNotificationEmail(params: Params): Promise<Result> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = buildFromAddress();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!from) return { ok: false, error: "missing_resend_from_email" };

  const locale = resolveEmailLocale(params.locale);
  const copy = getConnectNotificationEmailCopy(locale, {
    kind: params.kind,
    senderName: params.senderName,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.recipientEmail],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
      subject: copy.subject,
      html: buildHtmlBody(params, locale),
    }),
  });

  if (!response.ok) {
    return { ok: false, error: `resend_${response.status}` };
  }

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, id: payload?.id ?? null };
}
