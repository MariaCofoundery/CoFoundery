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
  const greeting = inviterName ? `Hi, ${inviterName} möchte dich einladen.` : "Hi, du wurdest eingeladen.";
  const inviterLine = inviterName
    ? `${inviterName} möchte mit dir eure Co-Founder Dynamik anschauen.`
    : "Jemand möchte mit dir eure Co-Founder Dynamik anschauen.";

  const contextLabel = escapeHtml(buildContextLabel(params.teamContext));
  const moduleLabel = escapeHtml(buildModuleLabel(params.reportScope));
  const inviteUrl = escapeHtml(params.inviteUrl);

  return `<!DOCTYPE html>
<html lang="de">
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 20px;">
                <p style="margin:0 0 12px;font-size:12px;line-height:18px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">
                  Cofoundery
                </p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:34px;color:#0f172a;">
                  ${greeting}
                </h1>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  ${inviterLine}
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#334155;">
                  Cofoundery Align hilft zwei Gründer:innen dabei, ihre Zusammenarbeit früh klarer zu sehen und wichtige Unterschiede besser einzuordnen.
                </p>
                <p style="margin:0 0 28px;font-size:16px;line-height:26px;color:#334155;">
                  Du bekommst daraus einen strukturierten Matching-Report und ein gemeinsames Workbook, mit dem ihr die wichtigsten Themen konkret besprechen könnt.
                </p>
                <p style="margin:0 0 28px;font-size:16px;line-height:26px;color:#334155;">
                  Der aktuelle Kontext ist <strong>${contextLabel}</strong>, gestartet wird mit <strong>${moduleLabel}</strong>.
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
    ? `${params.inviterDisplayName} möchte mit dir eure Co-Founder Dynamik anschauen.`
    : "Jemand möchte mit dir eure Co-Founder Dynamik anschauen.";

  return [
    "Hi,",
    "",
    inviterLine,
    "",
    "Cofoundery Align hilft zwei Gründer:innen dabei, ihre Zusammenarbeit früh klarer zu sehen und wichtige Unterschiede besser einzuordnen.",
    "Du bekommst daraus einen strukturierten Matching-Report und ein gemeinsames Workbook, mit dem ihr die wichtigsten Themen konkret besprechen könnt.",
    "",
    `Kontext: ${buildContextLabel(params.teamContext)}`,
    `Start mit: ${buildModuleLabel(params.reportScope)}`,
    "",
    "Starte hier direkt mit eurem Matching:",
    params.inviteUrl,
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
        ? `${params.inviterDisplayName} möchte mit dir eure Co-Founder Dynamik anschauen`
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
