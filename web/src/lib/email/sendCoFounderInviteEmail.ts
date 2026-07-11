import type { AppLocale } from "@/i18n/config";
import { resolveEmailLocale, type EmailLocaleInput } from "@/features/email/emailLocale";
import {
  getCoFounderContextLabel,
  getCoFounderInviteEmailCopy,
  getCoFounderModuleLabel,
  getEmailPrivacyUrl,
} from "@/features/email/emailMessages";

type SendCoFounderInviteEmailParams = {
  inviteeEmail: string;
  inviteUrl: string;
  inviterDisplayName: string | null;
  teamName?: string | null;
  reportScope: "basis" | "basis_plus_values";
  teamContext: "pre_founder" | "existing_team";
  locale?: EmailLocaleInput;
};

type SendCoFounderInviteEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

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

function buildReplyToAddress() {
  return process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined;
}

function buildHtmlBody(params: SendCoFounderInviteEmailParams, locale: AppLocale) {
  const copy = getCoFounderInviteEmailCopy(locale, {
    inviterDisplayName: params.inviterDisplayName,
  });
  const contextLabel = escapeHtml(getCoFounderContextLabel(locale, params.teamContext));
  const moduleLabel = escapeHtml(getCoFounderModuleLabel(locale, params.reportScope));
  const teamName = params.teamName?.trim() ? escapeHtml(params.teamName.trim()) : null;
  const inviteUrl = escapeHtml(params.inviteUrl);
  const privacyUrl = escapeHtml(getEmailPrivacyUrl(locale));

  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(copy.preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0;background:linear-gradient(180deg,#f8fafc 0%,#ffffff 100%);">
                <img
                  src="https://cofoundery.de/cofoundery-align-logo.svg"
                  alt="Cofoundery Align"
                  width="176"
                  height="34"
                  style="display:block;height:auto;width:176px;max-width:100%;margin:0;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0 0 10px;font-size:12px;line-height:18px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">
                  ${escapeHtml(copy.eyebrow)}
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:34px;color:#0f172a;font-weight:700;">
                  ${escapeHtml(copy.greeting)}
                </h1>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  ${escapeHtml(copy.inviterLine)}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  ${escapeHtml(copy.productIntro)}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 10px;font-size:13px;line-height:20px;font-weight:700;color:#0f172a;">
                        ${escapeHtml(copy.listTitle)}
                      </p>
                      ${copy.bullets
                        .map(
                          (bullet, index) =>
                            `<p style="margin:0${index < copy.bullets.length - 1 ? " 0 8px" : ""};font-size:14px;line-height:22px;color:#475569;">• ${escapeHtml(bullet)}</p>`
                        )
                        .join("")}
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0;">
                  <tr>
                    <td style="padding:0;">
                      <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">
                        ${teamName ? `${escapeHtml(copy.teamLabel)}: <strong>${teamName}</strong><br />` : ""}
                        ${escapeHtml(copy.contextLabel)}: <strong>${contextLabel}</strong><br />
                        ${escapeHtml(copy.moduleLabel)}: <strong>${moduleLabel}</strong>
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:15px;line-height:25px;color:#334155;">
                  ${escapeHtml(copy.personalNote)}
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${inviteUrl}" style="display:inline-block;margin-top:28px;padding:14px 22px;border-radius:999px;background:#67e8f9;color:#082f49;text-decoration:none;font-size:15px;font-weight:700;">
                    ${escapeHtml(copy.cta)}
                  </a>
                </p>
                <div style="margin-top:12px;padding:16px 18px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">
                    ${escapeHtml(copy.fallback)}
                  </p>
                  <p style="margin:0;font-size:13px;line-height:22px;word-break:break-all;color:#0f172a;">
                    <a href="${inviteUrl}" style="color:#0f172a;">${inviteUrl}</a>
                  </p>
                </div>
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">
                    ${escapeHtml(copy.footerReason)}
                  </p>
                  <p style="margin:0 0 12px;font-size:13px;line-height:21px;color:#64748b;">
                    ${escapeHtml(copy.footerIgnore)}
                  </p>
                  <p style="margin:0;font-size:13px;line-height:21px;color:#64748b;">
                    ${escapeHtml(locale === "en" ? "Privacy:" : "Mehr zum Datenschutz:")} <a href="${privacyUrl}" style="color:#475569;text-decoration:underline;">${escapeHtml(copy.privacy)}</a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildTextBody(params: SendCoFounderInviteEmailParams, locale: AppLocale) {
  const copy = getCoFounderInviteEmailCopy(locale, {
    inviterDisplayName: params.inviterDisplayName,
  });
  const teamName = params.teamName?.trim();

  return [
    copy.greeting,
    "",
    copy.inviterLine,
    "",
    copy.productIntro,
    "",
    `${copy.listTitle}:`,
    ...copy.bullets.map((bullet) => `- ${bullet}`),
    "",
    ...(teamName ? [`${copy.teamLabel}: ${teamName}`] : []),
    `${copy.contextLabel}: ${getCoFounderContextLabel(locale, params.teamContext)}`,
    `${copy.moduleLabel}: ${getCoFounderModuleLabel(locale, params.reportScope)}`,
    "",
    copy.personalNote,
    "",
    `${copy.cta}:`,
    params.inviteUrl,
    "",
    copy.footerReason,
    copy.footerIgnore,
    "",
    `${copy.privacy}: ${getEmailPrivacyUrl(locale)}`,
  ].join("\n");
}

export function buildCoFounderInviteEmailPayload(params: SendCoFounderInviteEmailParams) {
  const locale = resolveEmailLocale(params.locale);
  const copy = getCoFounderInviteEmailCopy(locale, {
    inviterDisplayName: params.inviterDisplayName,
  });

  return {
    subject: copy.subject,
    html: buildHtmlBody(params, locale),
    text: buildTextBody(params, locale),
  };
}

export async function sendCoFounderInviteEmail(
  params: SendCoFounderInviteEmailParams
): Promise<SendCoFounderInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = buildFromAddress();

  if (!apiKey) {
    return { ok: false, error: "missing_resend_api_key" };
  }

  if (!from) {
    return { ok: false, error: "missing_resend_from_email" };
  }

  const payload = buildCoFounderInviteEmailPayload(params);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.inviteeEmail],
      reply_to: buildReplyToAddress(),
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    return {
      ok: false,
      error: `resend_request_failed:${response.status}:${responseText}`,
    };
  }

  const responsePayload = (await response.json()) as { id?: string | null };
  return { ok: true, id: responsePayload.id ?? null };
}
