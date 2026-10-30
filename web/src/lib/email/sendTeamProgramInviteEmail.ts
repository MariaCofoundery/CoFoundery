import { PRODUCT_NAME } from "@/features/brand";

/**
 * Die Einladung einer Organisation an ein Team, per Mail an eine Gruenderin
 * oder einen Gruender. Die Adresse wird nur fuer diesen Versand benutzt und
 * nirgends gespeichert.
 *
 * WAS DRINSTEHT: wer einlaedt (der Name der Organisation) und der Link. Und
 * dass der Link nur die Einladung oeffnet - das Team ist erst dabei, wenn ALLE
 * im Team zugestimmt haben. Es verspricht nichts und gibt nichts frei.
 *
 * Zweisprachig, weil die Sprache einer Person ohne Konto unbekannt ist.
 */
type Params = { recipientEmail: string; orgName: string; url: string };
type Result = { ok: true; id: string | null } | { ok: false; error: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendTeamProgramInviteEmail(params: Params): Promise<Result> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  // Nicht eingerichtet ist nicht kaputt: Der Link steht dem Absender trotzdem zum Weitergeben zur Verfuegung.
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!fromEmail) return { ok: false, error: "missing_resend_from_email" };
  const from = `${process.env.RESEND_FROM_NAME?.trim() || PRODUCT_NAME} <${fromEmail}>`;
  const org = escapeHtml(params.orgName);
  const url = escapeHtml(params.url);

  const html = [
    `<p>Hallo,</p>`,
    `<p>${org} lädt euer Team über ${PRODUCT_NAME} zu seinem Programm ein.</p>`,
    `<p><a href="${url}">Einladung ansehen</a></p>`,
    `<p>Der Link öffnet nur die Einladung. Euer Team ist erst dabei, wenn alle im Team zugestimmt haben. Weitere Freigaben werden dadurch nicht geöffnet, und ihr könnt die Teilnahme jederzeit beenden.</p>`,
    `<hr>`,
    `<p>${org} invites your team to its program via ${PRODUCT_NAME}. The link only opens the invitation. Your team only joins once everyone on it has agreed.</p>`,
  ].join("\n");
  const text =
    `${params.orgName} lädt euer Team über ${PRODUCT_NAME} zu seinem Programm ein.\n\n${params.url}\n\n` +
    "Der Link öffnet nur die Einladung. Euer Team ist erst dabei, wenn alle im Team zugestimmt haben. " +
    "Weitere Freigaben werden dadurch nicht geöffnet, und ihr könnt die Teilnahme jederzeit beenden.\n\n" +
    `${params.orgName} invites your team to its program via ${PRODUCT_NAME}. The link only opens the invitation. ` +
    "Your team only joins once everyone on it has agreed.";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [params.recipientEmail],
        subject: `${params.orgName} lädt euer Team ein / invites your team`,
        html,
        text,
      }),
    });
    if (!response.ok) return { ok: false, error: `resend_${response.status}` };
    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch {
    return { ok: false, error: "unexpected_delivery_error" };
  }
}
