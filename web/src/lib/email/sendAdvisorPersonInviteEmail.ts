/**
 * Die Einladung an eine Person, von einem angemeldeten Advisor.
 *
 * WAS DRINSTEHT UND WAS NICHT: dass jemand um Zugang zu Teilen des Profils
 * bittet, die Begründung des Advisors, und der Link. NICHT, worum es im
 * Einzelnen geht - die Umfänge stehen auf der Seite, auf der entschieden
 * wird. Eine Mail landet in fremden Postfächern; sie soll nicht aufzählen,
 * welche Auswertungen es über einen Menschen gibt.
 *
 * UND SIE VERSPRICHT NICHTS. "Jemand möchte dich begleiten" ist eine Frage,
 * kein Zugang - das steht auch so darin, damit niemand denkt, er habe mit dem
 * Klick auf den Link schon zugestimmt.
 */

type SendAdvisorPersonInviteEmailParams = {
  recipientEmail: string;
  note: string | null;
  url: string;
};

type SendAdvisorPersonInviteEmailResult =
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

export async function sendAdvisorPersonInviteEmail(
  params: SendAdvisorPersonInviteEmailParams
): Promise<SendAdvisorPersonInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = buildFromAddress();

  // NICHT EINGERICHTET IST NICHT KAPUTT: Ohne Schlüssel geht keine Mail raus,
  // und die Einladung steht trotzdem in der Liste des Advisors - mit dem Link
  // zum Weitergeben.
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!from) return { ok: false, error: "missing_resend_from_email" };

  const subject = "Jemand möchte dich bei CoFoundery begleiten";
  const note = params.note ? `<p>„${escapeHtml(params.note)}“</p>` : "";
  const html = [
    "<p>Hallo,</p>",
    "<p>jemand bittet dich über CoFoundery um Zugang zu Teilen deines Founderprofils,",
    "um dich zu begleiten.</p>",
    note,
    `<p><a href="${escapeHtml(params.url)}">Anfrage ansehen</a></p>`,
    "<p>Der Link öffnet nur die Anfrage. Du entscheidest danach selbst, welche Teile",
    "sichtbar werden - einzeln, und du kannst es jederzeit zurücknehmen.</p>",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.recipientEmail],
        subject,
        html,
        text:
          "Jemand bittet dich über CoFoundery um Zugang zu Teilen deines Founderprofils.\n" +
          (params.note ? `\n"${params.note}"\n` : "") +
          `\n${params.url}\n\n` +
          "Der Link öffnet nur die Anfrage. Du entscheidest danach selbst, welche Teile " +
          "sichtbar werden - einzeln, und du kannst es jederzeit zurücknehmen.",
      }),
    });

    if (!response.ok) return { ok: false, error: `resend_${response.status}` };
    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch {
    return { ok: false, error: "unexpected_delivery_error" };
  }
}
