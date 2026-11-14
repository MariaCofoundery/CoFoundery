import { PRODUCT_NAME } from "@/features/brand";
import { getEmailLogoUrl, getEmailPrivacyUrl } from "@/features/email/emailMessages";
import { resolveEmailLocale, type EmailLocaleInput } from "@/features/email/emailLocale";
import { getOnboardingReminderCopy, type OnboardingReminderStep } from "@/features/email/onboardingReminderCopy";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function buildFromAddress() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) return null;
  return `${process.env.RESEND_FROM_NAME?.trim() || PRODUCT_NAME} <${fromEmail}>`;
}

type Params = {
  recipientEmail: string;
  round: 1 | 2;
  nextStep: OnboardingReminderStep;
  name: string | null;
  url: string;
  unsubscribeUrl: string;
  locale?: EmailLocaleInput;
};

/** Der Text als HTML-Mail. Eigene Vorlage, weil die Netzwerk-Benachrichtigungen bewusst knapp sind; hier soll es warm sein. */
export function buildOnboardingReminderHtml(params: Params) {
  const locale = resolveEmailLocale(params.locale);
  const copy = getOnboardingReminderCopy(locale, { round: params.round, nextStep: params.nextStep, name: params.name });
  const pains = copy.pains
    .map((pain) => `<li style="margin:0 0 8px;font-size:16px;line-height:25px;color:#334155;">${escapeHtml(pain)}</li>`)
    .join("");
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
            <p style="margin:0 0 10px;font-size:13px;line-height:20px;letter-spacing:.08em;text-transform:uppercase;color:#6d28d9;font-weight:bold;">${escapeHtml(copy.painTitle)}</p>
            <ul style="margin:0 0 22px;padding-left:20px;">${pains}</ul>
            <p style="margin:0 0 6px;font-size:16px;line-height:24px;color:#0f172a;font-weight:bold;">${escapeHtml(copy.solutionTitle)}</p>
            <p style="margin:0 0 26px;font-size:16px;line-height:26px;color:#334155;">${escapeHtml(copy.solution)}</p>
            <p style="margin:0 0 8px;"><a href="${escapeHtml(params.url)}" style="display:inline-block;padding:15px 24px;border-radius:999px;background:#6d28d9;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;">${escapeHtml(copy.cta)}</a></p>
            <p style="margin:0 0 26px;font-size:14px;line-height:22px;color:#64748b;">${escapeHtml(copy.ctaHint)}</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#334155;white-space:pre-line;">${escapeHtml(copy.signoff)}</p>
            <p style="margin:0 0 8px;font-size:12px;line-height:20px;color:#94a3b8;">${escapeHtml(copy.why)}</p>
            <p style="margin:0;font-size:12px;line-height:20px;color:#94a3b8;"><a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#94a3b8;">${escapeHtml(copy.unsubscribe)}</a> · <a href="${escapeHtml(getEmailPrivacyUrl(locale))}" style="color:#94a3b8;">${escapeHtml(copy.privacy)}</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendOnboardingReminderEmail(params: Params): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = buildFromAddress();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!from) return { ok: false, error: "missing_resend_from_email" };

  const locale = resolveEmailLocale(params.locale);
  const copy = getOnboardingReminderCopy(locale, { round: params.round, nextStep: params.nextStep, name: params.name });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [params.recipientEmail],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
      subject: copy.subject,
      html: buildOnboardingReminderHtml(params),
      // Abmelden mit einem Klick, auch im Mailprogramm selbst.
      headers: { "List-Unsubscribe": `<${params.unsubscribeUrl}>` },
    }),
  });
  if (!response.ok) return { ok: false, error: `resend_${response.status}` };
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, id: payload?.id ?? null };
}
