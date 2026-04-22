type SendAdvisorTeamFounderInviteEmailParams = {
  inviteeEmail: string;
  inviteUrl: string;
  advisorName: string | null;
  teamName?: string | null;
  counterpartLabel?: string | null;
};

type SendAdvisorTeamFounderInviteEmailResult =
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

function buildPrivacyUrl() {
  return "https://cofoundery.de/datenschutz";
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

function buildHtmlBody(params: SendAdvisorTeamFounderInviteEmailParams) {
  const advisorName = params.advisorName?.trim() ? escapeHtml(params.advisorName.trim()) : null;
  const teamName = params.teamName?.trim() ? escapeHtml(params.teamName.trim()) : null;
  const counterpartLabel = params.counterpartLabel?.trim()
    ? escapeHtml(params.counterpartLabel.trim())
    : "die zweite Founder-Person";
  const inviteUrl = escapeHtml(params.inviteUrl);
  const privacyUrl = escapeHtml(buildPrivacyUrl());

  return `<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Einladung in ein von einem Advisor initiiertes Founder-Matching bei Cofoundery Align.
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
                  Founder-Einladung
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:34px;color:#0f172a;font-weight:700;">
                  Hi,
                </h1>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  ${advisorName
                    ? `${advisorName} möchte euch in ein strukturiertes Founder-Matching mit Cofoundery Align einladen.`
                    : "Du wurdest in ein strukturiertes Founder-Matching mit Cofoundery Align eingeladen."}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Mit diesem Schritt bestätigst du nur deinen Start in den Flow. Sobald auch ${counterpartLabel} gestartet ist, wird euer gemeinsamer Matching-Kontext automatisch angelegt.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0 0 10px;font-size:13px;line-height:20px;font-weight:700;color:#0f172a;">
                        Was danach entsteht
                      </p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#475569;">
                        • ein gemeinsamer Matching-Kontext für beide Founder
                      </p>
                      <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#475569;">
                        • ein Alignment-Workbook, sobald ihr beide gestartet habt
                      </p>
                      <p style="margin:0;font-size:14px;line-height:22px;color:#475569;">
                        • ein sauberer Fortschrittsblick für eure begleitende Advisor-Person
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-size:14px;line-height:22px;color:#475569;">
                  ${teamName ? `Team/Projekt: <strong>${teamName}</strong><br />` : ""}Kontext: <strong>Founder-Matching</strong>
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${inviteUrl}" style="display:inline-block;margin-top:28px;padding:14px 22px;border-radius:999px;background:#67e8f9;color:#082f49;text-decoration:none;font-size:15px;font-weight:700;">
                    Matching starten
                  </a>
                </p>
                <div style="margin-top:12px;padding:16px 18px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">
                    Falls der Button nicht funktioniert, kannst du auch direkt diesen Link öffnen:
                  </p>
                  <p style="margin:0;font-size:13px;line-height:22px;word-break:break-all;color:#0f172a;">
                    <a href="${inviteUrl}" style="color:#0f172a;">${inviteUrl}</a>
                  </p>
                </div>
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">
                    Du erhältst diese E-Mail, weil du von einer Advisor-Person gezielt in ein Founder-Matching eingeladen wurdest.
                  </p>
                  <p style="margin:0 0 12px;font-size:13px;line-height:21px;color:#64748b;">
                    Wenn du nicht teilnehmen möchtest oder die Einladung für dich nicht relevant ist, kannst du diese E-Mail einfach ignorieren.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:21px;color:#64748b;">
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

function buildTextBody(params: SendAdvisorTeamFounderInviteEmailParams) {
  const teamName = params.teamName?.trim();
  const advisorLine = params.advisorName?.trim()
    ? `${params.advisorName.trim()} möchte euch in ein strukturiertes Founder-Matching mit Cofoundery Align einladen.`
    : "Du wurdest in ein strukturiertes Founder-Matching mit Cofoundery Align eingeladen.";
  const counterpartLine = params.counterpartLabel?.trim()
    ? `Sobald auch ${params.counterpartLabel.trim()} gestartet ist, wird euer gemeinsamer Matching-Kontext automatisch angelegt.`
    : "Sobald auch die zweite Founder-Person gestartet ist, wird euer gemeinsamer Matching-Kontext automatisch angelegt.";

  return [
    "Hi,",
    "",
    advisorLine,
    "",
    "Mit diesem Schritt bestätigst du nur deinen Start in den Flow.",
    counterpartLine,
    "",
    "Was danach entsteht:",
    "- ein gemeinsamer Matching-Kontext für beide Founder",
    "- ein Alignment-Workbook, sobald ihr beide gestartet habt",
    "- ein sauberer Fortschrittsblick für eure begleitende Advisor-Person",
    "",
    ...(teamName ? [`Team/Projekt: ${teamName}`] : []),
    "Kontext: Founder-Matching",
    "",
    "Matching starten:",
    params.inviteUrl,
    "",
    "Du erhältst diese E-Mail, weil du von einer Advisor-Person gezielt in ein Founder-Matching eingeladen wurdest.",
    "Wenn du nicht teilnehmen möchtest oder die Einladung für dich nicht relevant ist, kannst du diese E-Mail einfach ignorieren.",
    "",
    `Datenschutzerklärung: ${buildPrivacyUrl()}`,
  ].join("\n");
}

export async function sendAdvisorTeamFounderInviteEmail(
  params: SendAdvisorTeamFounderInviteEmailParams
): Promise<SendAdvisorTeamFounderInviteEmailResult> {
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
      to: [params.inviteeEmail],
      reply_to: buildReplyToAddress(),
      subject: params.advisorName?.trim()
        ? `${params.advisorName.trim()} lädt dich in ein Founder-Matching ein`
        : "Einladung in ein Founder-Matching",
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
