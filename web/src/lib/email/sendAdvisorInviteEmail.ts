type SendAdvisorInviteEmailParams = {
  advisorEmail: string;
  advisorName: string | null;
  inviteUrl: string;
  founderAName: string;
  founderBName: string;
  teamContext: "pre_founder" | "existing_team";
};

type SendAdvisorInviteEmailResult =
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

function teamContextLabel(teamContext: "pre_founder" | "existing_team") {
  return teamContext === "existing_team"
    ? "Sie begleiten ein bestehendes Founder-Team."
    : "Sie begleiten ein Pre-Founder-Team in einer fruehen Abstimmung.";
}

function buildPrivacyUrl() {
  return "https://cofoundery.de/datenschutz";
}

function buildHtmlBody(params: SendAdvisorInviteEmailParams) {
  const advisorGreetingName = params.advisorName?.trim()
    ? `Hi ${escapeHtml(params.advisorName.trim())},`
    : "Hi,";
  const founderLine = `${escapeHtml(params.founderAName)} und ${escapeHtml(
    params.founderBName
  )} moechten Sie als Advisor in ihren Cofoundery-Align-Kontext einbinden.`;
  const inviteUrl = escapeHtml(params.inviteUrl);
  const privacyUrl = escapeHtml(buildPrivacyUrl());

  return `<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 28px;">
                <p style="margin:0 0 20px;">
                  <img
                    src="https://cofoundery.de/cofoundery-align-logo.svg"
                    alt="Cofoundery Align"
                    width="168"
                    style="display:block;border:0;max-width:168px;height:auto;"
                  />
                </p>
                <p style="margin:0 0 18px;font-size:16px;line-height:26px;color:#0f172a;">
                  ${advisorGreetingName}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  ${founderLine}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Cofoundery Align hilft Founder-Teams dabei, Unterschiede frueh sichtbar zu machen, Spannungen besser einzuordnen und wichtige Gespraeche strukturierter zu fuehren.
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Als Advisor erhalten Sie Zugriff auf das freigegebene Workbook und die wichtigsten Einblicke aus dem Founder-Kontext, um Beobachtungen, Rueckfragen und naechste sinnvolle Schritte zu ergaenzen.
                </p>
                <p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#475569;">
                  ${escapeHtml(teamContextLabel(params.teamContext))}
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#67e8f9;color:#082f49;text-decoration:none;font-size:15px;font-weight:700;">
                    Advisor-Zugang oeffnen
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#64748b;">
                  Falls der Button nicht funktioniert, koennen Sie auch direkt diesen Link oeffnen:
                </p>
                <p style="margin:0 0 18px;font-size:13px;line-height:22px;word-break:break-all;color:#0f172a;">
                  <a href="${inviteUrl}" style="color:#0f172a;">${inviteUrl}</a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#64748b;">
                  Sie erhalten diese E-Mail, weil zwei Founder Sie direkt als Advisor einbinden moechten.
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#64748b;">
                  Wenn diese Einladung fuer Sie nicht relevant ist, koennen Sie diese E-Mail einfach ignorieren.
                </p>
                <p style="margin:0;font-size:13px;line-height:22px;color:#64748b;">
                  Hinweise zum Datenschutz finden Sie hier:
                  <a href="${privacyUrl}" style="color:#0f172a;">Datenschutzerklaerung</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildTextBody(params: SendAdvisorInviteEmailParams) {
  const greeting = params.advisorName?.trim()
    ? `Hi ${params.advisorName.trim()},`
    : "Hi,";
  const privacyUrl = buildPrivacyUrl();

  return [
    greeting,
    "",
    `${params.founderAName} und ${params.founderBName} moechten Sie als Advisor in ihren Cofoundery-Align-Kontext einbinden.`,
    "",
    "Cofoundery Align hilft Founder-Teams dabei, Unterschiede frueh sichtbar zu machen, Spannungen besser einzuordnen und wichtige Gespraeche strukturierter zu fuehren.",
    "",
    "Als Advisor erhalten Sie Zugriff auf das freigegebene Workbook und die wichtigsten Einblicke aus dem Founder-Kontext, um Beobachtungen, Rueckfragen und naechste sinnvolle Schritte zu ergaenzen.",
    teamContextLabel(params.teamContext),
    "",
    "Advisor-Zugang oeffnen:",
    params.inviteUrl,
    "",
    "Falls der Button nicht funktioniert, koennen Sie auch direkt den Link oben verwenden.",
    "",
    "Sie erhalten diese E-Mail, weil zwei Founder Sie direkt als Advisor einbinden moechten.",
    "Wenn diese Einladung fuer Sie nicht relevant ist, koennen Sie diese E-Mail einfach ignorieren.",
    "",
    `Datenschutzerklaerung: ${privacyUrl}`,
  ].join("\n");
}

export async function sendAdvisorInviteEmail(
  params: SendAdvisorInviteEmailParams
): Promise<SendAdvisorInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = buildFromAddress();

  if (!apiKey) {
    return { ok: false, error: "missing_resend_api_key" };
  }

  if (!from) {
    return { ok: false, error: "missing_resend_from_email" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.advisorEmail],
      reply_to: buildReplyToAddress(),
      subject: `${params.founderAName} und ${params.founderBName} laden Sie als Advisor ein`,
      html: buildHtmlBody(params),
      text: buildTextBody(params),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    return {
      ok: false,
      error: `resend_request_failed:${response.status}:${responseText}`,
    };
  }

  const payload = (await response.json()) as { id?: string | null };
  return { ok: true, id: payload.id ?? null };
}
