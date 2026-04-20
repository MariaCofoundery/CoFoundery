type SendCoFounderInviteEmailParams = {
  inviteeEmail: string;
  inviteUrl: string;
  inviterDisplayName: string | null;
  reportScope: "basis" | "basis_plus_values";
  teamContext: "pre_founder" | "existing_team";
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

function buildContextLabel(teamContext: "pre_founder" | "existing_team") {
  return teamContext === "existing_team"
    ? "ihr arbeitet bereits zusammen"
    : "ihr prüft eine mögliche Zusammenarbeit";
}

function buildModuleLabel(reportScope: "basis" | "basis_plus_values") {
  return reportScope === "basis_plus_values" ? "Basis und Werte" : "Basis";
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

function buildHtmlBody(params: SendCoFounderInviteEmailParams) {
  const inviterName = params.inviterDisplayName ? escapeHtml(params.inviterDisplayName) : null;
  const greeting = inviterName ? `Hi,` : "Hi,";
  const inviterLine = inviterName
    ? `${inviterName} hat dich eingeladen, gemeinsam eure Co-Founder Dynamik mit Cofoundery Align anzuschauen.`
    : "Du wurdest eingeladen, gemeinsam eure Co-Founder Dynamik mit Cofoundery Align anzuschauen.";

  const contextLabel = escapeHtml(buildContextLabel(params.teamContext));
  const moduleLabel = escapeHtml(buildModuleLabel(params.reportScope));
  const inviteUrl = escapeHtml(params.inviteUrl);
  const privacyUrl = escapeHtml(buildPrivacyUrl());

  return `<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 28px;">
                <img
                  src="https://cofoundery.de/cofoundery-align-logo.svg"
                  alt="Cofoundery Align"
                  width="168"
                  height="32"
                  style="display:block;height:auto;width:168px;max-width:100%;margin:0 0 20px;"
                />
                <h1 style="margin:0 0 16px;font-size:28px;line-height:34px;color:#0f172a;font-weight:700;">
                  ${greeting}
                </h1>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  ${inviterLine}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Cofoundery Align hilft Gründer:innen dabei, Zusammenarbeit früh klarer zu sehen, Unterschiede besser einzuordnen und wichtige Themen bewusst zu besprechen.
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Du bekommst daraus einen strukturierten Matching-Report und ein gemeinsames Workbook, mit dem ihr eure wichtigsten Spannungs- und Entscheidungsfelder konkret anschauen könnt.
                </p>
                <p style="margin:0 0 28px;font-size:15px;line-height:25px;color:#475569;">
                  Kontext: <strong>${contextLabel}</strong>. Ihr startet mit <strong>${moduleLabel}</strong>.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#67e8f9;color:#082f49;text-decoration:none;font-size:15px;font-weight:700;">
                    Matching starten
                  </a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:22px;color:#64748b;">
                  Falls der Button nicht funktioniert, kannst du auch direkt diesen Link öffnen:
                </p>
                <p style="margin:0;font-size:13px;line-height:22px;word-break:break-all;color:#0f172a;">
                  <a href="${inviteUrl}" style="color:#0f172a;">${inviteUrl}</a>
                </p>
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">
                    Du erhältst diese E-Mail, weil dich jemand direkt zu einem gemeinsamen Co-Founder Matching eingeladen hat.
                  </p>
                  <p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#64748b;">
                    Wenn die Einladung für dich nicht relevant ist, kannst du diese E-Mail einfach ignorieren.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:21px;color:#64748b;">
                    <a href="${privacyUrl}" style="color:#475569;text-decoration:underline;">Datenschutzerklärung</a>
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

function buildTextBody(params: SendCoFounderInviteEmailParams) {
  const inviterLine = params.inviterDisplayName
    ? `${params.inviterDisplayName} hat dich eingeladen, gemeinsam eure Co-Founder Dynamik mit Cofoundery Align anzuschauen.`
    : "Du wurdest eingeladen, gemeinsam eure Co-Founder Dynamik mit Cofoundery Align anzuschauen.";

  return [
    "Hi,",
    "",
    inviterLine,
    "",
    "Cofoundery Align hilft Gründer:innen dabei, Zusammenarbeit früh klarer zu sehen, Unterschiede besser einzuordnen und wichtige Themen bewusst zu besprechen.",
    "Du bekommst daraus einen strukturierten Matching-Report und ein gemeinsames Workbook, mit dem ihr eure wichtigsten Spannungs- und Entscheidungsfelder konkret anschauen könnt.",
    "",
    `Kontext: ${buildContextLabel(params.teamContext)}`,
    `Start mit: ${buildModuleLabel(params.reportScope)}`,
    "",
    "Starte hier direkt mit eurem Matching:",
    params.inviteUrl,
    "",
    "Du erhältst diese E-Mail, weil dich jemand direkt zu einem gemeinsamen Co-Founder Matching eingeladen hat.",
    "Wenn die Einladung für dich nicht relevant ist, kannst du diese E-Mail einfach ignorieren.",
    "",
    `Datenschutzerklärung: ${buildPrivacyUrl()}`,
  ].join("\n");
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
      subject: params.inviterDisplayName
        ? `${params.inviterDisplayName} möchte mit dir euer Co-Founder Matching starten`
        : "Du wurdest zu einem Co-Founder Matching eingeladen",
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
