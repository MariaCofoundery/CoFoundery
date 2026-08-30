import type { AppLocale } from "@/i18n/config";
import { getEmailPrivacyUrl, getFounderInTheWildHandoffEmailCopy } from "@/features/email/emailMessages";
import { resolveEmailLocale, type EmailLocaleInput } from "@/features/email/emailLocale";

type Params = {
  recipientEmail: string;
  roundUrl: string;
  founderName: string | null;
  locale?: EmailLocaleInput;
};

type Result = { ok: true; id: string | null } | { ok: false; error: string };

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function fromAddress() {
  const email = process.env.RESEND_FROM_EMAIL?.trim();
  return email ? `${process.env.RESEND_FROM_NAME?.trim() || "Cofoundery"} <${email}>` : null;
}

function html(params: Params, locale: AppLocale) {
  const copy = getFounderInTheWildHandoffEmailCopy(locale, { founderName: params.founderName });
  const roundUrl = escapeHtml(params.roundUrl);
  const privacyUrl = escapeHtml(getEmailPrivacyUrl(locale));
  return `<!DOCTYPE html><html lang="${copy.htmlLang}"><body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;"><tr><td style="padding:28px 32px 0;"><img src="https://cofoundery.de/cofoundery-align-logo.svg" alt="Cofoundery Align" width="176" height="34" style="display:block;height:auto;width:176px;max-width:100%;" /></td></tr><tr><td style="padding:24px 32px 32px;"><p style="margin:0 0 10px;font-size:12px;line-height:18px;letter-spacing:.12em;text-transform:uppercase;color:#6d28d9;">${escapeHtml(copy.eyebrow)}</p><h1 style="margin:0 0 18px;font-size:28px;line-height:34px;color:#0f172a;">${escapeHtml(copy.greeting)}</h1><p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">${escapeHtml(copy.intro)}</p><p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">${escapeHtml(copy.privacy)}</p><p style="margin:0;font-size:17px;line-height:27px;font-weight:700;color:#0f172a;">${escapeHtml(copy.turn)}</p><p style="margin:28px 0;"><a href="${roundUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#6d28d9;color:#fff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(copy.cta)}</a></p><div style="padding:16px 18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;"><p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">${escapeHtml(copy.fallback)}</p><p style="margin:0;font-size:13px;line-height:22px;word-break:break-all;"><a href="${roundUrl}" style="color:#0f172a;">${roundUrl}</a></p></div><p style="margin:24px 0 0;font-size:13px;line-height:21px;color:#64748b;"><a href="${privacyUrl}" style="color:#475569;text-decoration:underline;">${escapeHtml(copy.privacyLink)}</a></p></td></tr></table></td></tr></table></body></html>`;
}

function text(params: Params, locale: AppLocale) {
  const copy = getFounderInTheWildHandoffEmailCopy(locale, { founderName: params.founderName });
  return [copy.greeting, "", copy.intro, "", copy.privacy, "", copy.turn, "", `${copy.cta}:`, params.roundUrl, "", `${copy.privacyLink}: ${getEmailPrivacyUrl(locale)}`].join("\n");
}

export function buildFounderInTheWildHandoffEmailPayload(params: Params) {
  const locale = resolveEmailLocale(params.locale);
  const copy = getFounderInTheWildHandoffEmailCopy(locale, { founderName: params.founderName });
  return { subject: copy.subject, html: html(params, locale), text: text(params, locale) };
}

export async function sendFounderInTheWildHandoffEmail(params: Params): Promise<Result> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = fromAddress();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!from) return { ok: false, error: "missing_resend_from_email" };
  const payload = buildFounderInTheWildHandoffEmailPayload(params);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [params.recipientEmail], reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined, ...payload }),
  });
  if (!response.ok) return { ok: false, error: `resend_request_failed:${response.status}` };
  const responsePayload = await response.json() as { id?: string | null };
  return { ok: true, id: responsePayload.id ?? null };
}
