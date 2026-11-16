import { PRODUCT_NAME } from "@/features/brand";
import { resolveEmailLocale, type EmailLocaleInput } from "@/features/email/emailLocale";
import { getNewsletterWelcomeCopy } from "@/features/email/newsletterWelcomeCopy";

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const SENDER_NAME = `Maria | ${PRODUCT_NAME}`;
const SERIF = "Georgia,'Times New Roman',serif";

export type WelcomeParams = {
  recipientEmail: string;
  locale?: EmailLocaleInput;
  /** Absolute Adressen, vom Aufrufer gebaut (die App-Adresse kennt nur der Server). */
  photoUrl: string;
  miaUrl: string;
  logoUrl: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  privacyUrl: string;
  imprintUrl: string;
};

const p = (text: string) => `<p style="margin:0 0 14px;font-family:${SERIF};font-size:17px;line-height:27px;color:#2a2840;">${esc(text)}</p>`;
const h2 = (text: string) => `<h2 style="margin:26px 0 10px;font-family:${SERIF};font-size:21px;line-height:27px;color:#4b2bb8;">${esc(text)}</h2>`;
const bullet = (lead: string, text: string) => `<p style="margin:0 0 10px;font-family:${SERIF};font-size:17px;line-height:25px;color:#2a2840;">&#9679;&nbsp; <strong>${esc(lead)}</strong> ${esc(text)}</p>`;

/** Die Willkommensmail im Look des Newsletters (warmes Papier, Kopf in den Markenfarben): Tabellen und Inline-Stile, wie Mail-Programme es vertragen. */
export function buildNewsletterWelcomeHtml(params: WelcomeParams) {
  const copy = getNewsletterWelcomeCopy(resolveEmailLocale(params.locale));
  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}">
  <body style="margin:0;padding:0;background:#f4f3fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(copy.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:20px 10px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fbf8f3;">
          <tr><td align="center" bgcolor="#5b3df5" style="background-color:#5b3df5;background-image:linear-gradient(110deg,#4b2bb8,#6d28d9 45%,#0a9ec2);padding:26px 12px 24px;font-family:Arial,sans-serif;font-size:24px;font-weight:bold;letter-spacing:3px;color:#ffffff;"><table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto 12px;"><tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:36px;padding:8px;"><img src="${esc(params.logoUrl)}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;"></td></tr></table>MADE2FOUND</td></tr>
          <tr><td style="padding:30px 28px 8px;">
            <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:28px;line-height:34px;color:#4b2bb8;">${esc(copy.headline)}</h1>
            ${p(copy.intro)}
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background:#ece6fb;border-radius:18px;"><tr>
              <td width="110" valign="middle" style="padding:18px 0 18px 18px;"><img src="${esc(params.photoUrl)}" alt="Maria" width="92" height="92" style="display:block;width:92px;height:92px;border-radius:46px;border:3px solid #ffffff;"></td>
              <td valign="middle" style="padding:18px;font-family:${SERIF};font-size:16px;line-height:24px;color:#33307a;">${esc(copy.bio)}</td>
            </tr></table>
            ${h2(copy.howTitle)}
            ${copy.how.map(p).join("\n            ")}
            ${h2(copy.thenTitle)}
            ${p(copy.then)}
            <div style="margin:24px 0;border-top:3px dotted #d9c9a8;"></div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e3f4f8;border-radius:16px;"><tr>
              <td valign="bottom" style="padding:16px 8px 16px 18px;">
                <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1px;color:#0a6f8a;">${esc(copy.learnedTitle)}</p>
                ${copy.learned.map((l) => bullet(l.lead, l.text)).join("\n                ")}
              </td>
              <td width="96" valign="bottom" style="padding:0 14px 12px 0;"><img src="${esc(params.miaUrl)}" alt="Mia" width="80" style="display:block;width:80px;height:auto;"></td>
            </tr></table>
            ${h2(copy.whyTitle)}
            ${p(copy.whyIntro)}
            ${copy.areas.map((a) => bullet(a.lead, a.text)).join("\n            ")}
            ${h2(copy.expectTitle)}
            ${p(copy.expect)}
            <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:22px auto;"><tr><td bgcolor="#5b3df5" style="border-radius:14px;background-color:#5b3df5;background-image:linear-gradient(90deg,#5b3df5,#0a88c2);"><a href="${esc(params.ctaUrl)}" style="display:inline-block;padding:15px 30px;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(copy.cta)}</a></td></tr></table>
            ${p(copy.outro)}
            <p style="margin:0 0 6px;font-family:${SERIF};font-size:17px;line-height:27px;color:#2a2840;">${esc(copy.bye)}</p>
            <p style="margin:0 0 24px;font-family:${SERIF};font-size:26px;font-style:italic;color:#4b2bb8;">${esc(copy.signature)}</p>
          </td></tr>
          <tr><td align="center" bgcolor="#2a2840" style="background:#2a2840;padding:18px;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#cfcde6;">
            <a href="${esc(params.unsubscribeUrl)}" style="color:#cfcde6;">${esc(copy.unsubscribe)}</a> &middot; <a href="${esc(params.privacyUrl)}" style="color:#cfcde6;">${esc(copy.privacy)}</a> &middot; <a href="${esc(params.imprintUrl)}" style="color:#cfcde6;">${esc(copy.imprint)}</a><br>${esc(PRODUCT_NAME)}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Reiner Text fuer Mail-Programme ohne HTML. */
export function buildNewsletterWelcomeText(params: WelcomeParams) {
  const c = getNewsletterWelcomeCopy(resolveEmailLocale(params.locale));
  return [
    c.headline, "", c.intro, "", c.bio, "",
    c.howTitle, ...c.how.flatMap((t) => ["", t]), "",
    c.thenTitle, "", c.then, "",
    c.learnedTitle, ...c.learned.map((l) => `- ${l.lead} ${l.text}`), "",
    c.whyTitle, "", c.whyIntro, ...c.areas.map((a) => `- ${a.lead} ${a.text}`), "",
    c.expectTitle, "", c.expect, "", `${c.cta}: ${params.ctaUrl}`, "", c.outro, "", c.bye, c.signature, "",
    `${c.unsubscribe}: ${params.unsubscribeUrl}`,
  ].join("\n");
}

export async function sendNewsletterWelcomeEmail(params: WelcomeParams): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };
  const copy = getNewsletterWelcomeCopy(resolveEmailLocale(params.locale));
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${fromEmail}>`,
      to: [params.recipientEmail],
      reply_to: process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined,
      subject: copy.subject,
      html: buildNewsletterWelcomeHtml(params),
      text: buildNewsletterWelcomeText(params),
      headers: { "List-Unsubscribe": `<${params.unsubscribeUrl}>` },
    }),
  });
  if (!response.ok) return { ok: false, error: `resend_${response.status}` };
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, id: payload?.id ?? null };
}
