type SendAdvisorInviteEmailParams = {
  advisorEmail: string;
  advisorName: string | null;
  inviteUrl: string;
  founderAName: string;
  founderBName: string;
  teamName?: string | null;
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
    ? "Bestehendes Founder-Team"
    : "Frühe Abstimmung vor einer engeren Zusammenarbeit";
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
  )} möchten Sie gezielt als Advisor in ihren Cofoundery-Align-Kontext einbinden.`;
  const inviteUrl = escapeHtml(params.inviteUrl);
  const privacyUrl = escapeHtml(buildPrivacyUrl());
  const contextLabel = escapeHtml(teamContextLabel(params.teamContext));
  const teamName = params.teamName?.trim() ? escapeHtml(params.teamName.trim()) : null;

  return `<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Persönliche Advisor-Einladung von ${escapeHtml(params.founderAName)} und ${escapeHtml(
        params.founderBName
      )} für Cofoundery Align.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0;background:linear-gradient(180deg,#f8fafc 0%,#ffffff 100%);">
                <p style="margin:0;">
                  <img
                    src="https://cofoundery.de/cofoundery-align-logo.svg"
                    alt="Cofoundery Align"
                    width="176"
                    style="display:block;border:0;max-width:176px;height:auto;"
                  />
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0 0 10px;font-size:12px;line-height:18px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">
                  Persönliche Advisor-Einladung
                </p>
                <p style="margin:0 0 18px;font-size:16px;line-height:26px;color:#0f172a;">
                  ${advisorGreetingName}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  ${founderLine}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Cofoundery Align hilft Founder-Teams dabei, Unterschiede früh sichtbar zu machen, Spannungen besser einzuordnen und wichtige Gespräche strukturierter zu führen.
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Als Advisor erhalten Sie Zugriff auf den freigegebenen Teamkontext, das gemeinsame Workbook und den Advisor-Report, um Beobachtungen, Rückfragen und nächste sinnvolle Schritte beizutragen.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 10px;font-size:13px;line-height:20px;font-weight:700;color:#0f172a;">
                        Was Sie sehen können
                      </p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#475569;">
                        • den freigegebenen Teamkontext und die relevanten Founder-Perspektiven
                      </p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#475569;">
                        • das Workbook mit den aktuellen Arbeitsständen des Teams
                      </p>
                      <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">
                        • den Advisor-Report als strukturierte Grundlage für Ihre Begleitung
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-size:14px;line-height:22px;color:#475569;">
                  ${teamName ? `Team/Projekt: <strong>${teamName}</strong><br />` : ""}
                  Kontext: <strong>${contextLabel}</strong>
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${inviteUrl}" style="display:inline-block;margin-top:28px;padding:14px 22px;border-radius:999px;background:#67e8f9;color:#082f49;text-decoration:none;font-size:15px;font-weight:700;">
                    Advisor-Zugang oeffnen
                  </a>
                </p>
                <div style="margin-top:12px;padding:16px 18px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#64748b;">
                    Falls der Button nicht funktioniert, können Sie auch direkt diesen Link öffnen:
                  </p>
                  <p style="margin:0;font-size:13px;line-height:22px;word-break:break-all;color:#0f172a;">
                    <a href="${inviteUrl}" style="color:#0f172a;">${inviteUrl}</a>
                  </p>
                </div>
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#64748b;">
                    Sie erhalten diese E-Mail, weil ${escapeHtml(params.founderAName)} und ${escapeHtml(
                      params.founderBName
                    )} Sie gezielt als Advisor einbinden möchten.
                  </p>
                  <p style="margin:0 0 12px;font-size:13px;line-height:22px;color:#64748b;">
                    Wenn Sie diese Einladung nicht annehmen möchten, können Sie die E-Mail einfach ignorieren.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:22px;color:#64748b;">
                    Mehr zum Datenschutz: <a href="${privacyUrl}" style="color:#475569;text-decoration:underline;">Datenschutzerklärung</a>
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

function buildTextBody(params: SendAdvisorInviteEmailParams) {
  const greeting = params.advisorName?.trim()
    ? `Hi ${params.advisorName.trim()},`
    : "Hi,";
  const privacyUrl = buildPrivacyUrl();
  const teamName = params.teamName?.trim();

  return [
    greeting,
    "",
    `${params.founderAName} und ${params.founderBName} möchten Sie gezielt als Advisor in ihren Cofoundery-Align-Kontext einbinden.`,
    "",
    "Cofoundery Align hilft Founder-Teams dabei, Unterschiede früh sichtbar zu machen, Spannungen besser einzuordnen und wichtige Gespräche strukturierter zu führen.",
    "",
    "Als Advisor erhalten Sie Zugriff auf den freigegebenen Teamkontext, das gemeinsame Workbook und den Advisor-Report, um Beobachtungen, Rückfragen und nächste sinnvolle Schritte beizutragen.",
    "",
    "Was Sie sehen können:",
    "- den freigegebenen Teamkontext und relevante Founder-Perspektiven",
    "- das Workbook mit den aktuellen Arbeitsständen des Teams",
    "- den Advisor-Report als strukturierte Grundlage für Ihre Begleitung",
    "",
    ...(teamName ? [`Team/Projekt: ${teamName}`] : []),
    `Kontext: ${teamContextLabel(params.teamContext)}`,
    "",
    "Advisor-Zugang oeffnen:",
    params.inviteUrl,
    "",
    "Sie erhalten diese E-Mail, weil die beiden Founder Sie gezielt als Advisor einbinden möchten.",
    "Wenn Sie diese Einladung nicht annehmen möchten, können Sie die E-Mail einfach ignorieren.",
    "",
    `Datenschutzerklärung: ${privacyUrl}`,
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
      subject: `${params.founderAName} und ${params.founderBName} möchten Sie als Advisor einbinden`,
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
