import { PRODUCT_NAME } from "@/features/brand";
import type { OrgRole } from "@/features/advisor/orgRights";

/**
 * Die Einladung eines Advisors in eine Organisation.
 *
 * Sie ist NICHT die Mail an eine begleitete Person: dort bittet jemand um Zugang zu Teilen eines
 * Founderprofils, hier lädt eine Organisation eine Kollegin oder einen Kollegen ein, mitzuarbeiten.
 * Die Mail sagt, wer einlädt, wohin, in welcher Rolle, mit welcher Adresse man sich anmeldet und dass
 * erst der Klick auf der Einladungsseite Mitglied macht. Sie nennt keine Teams und keine Personen.
 */

type Params = {
  recipientEmail: string;
  orgName: string;
  inviterName: string | null;
  role: OrgRole;
  url: string;
};

type Result = { ok: true; id: string | null } | { ok: false; error: string };

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
  const fromName = process.env.RESEND_FROM_NAME?.trim() || PRODUCT_NAME;
  return `${fromName} <${fromEmail}>`;
}

export function buildAdvisorOrgInviteSubject(params: Pick<Params, "orgName" | "inviterName">) {
  return params.inviterName
    ? `${params.inviterName} lädt dich zu ${params.orgName} bei ${PRODUCT_NAME} ein`
    : `Einladung zu ${params.orgName} bei ${PRODUCT_NAME}`;
}

export async function sendAdvisorOrgInviteEmail(params: Params): Promise<Result> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = buildFromAddress();
  // Nicht eingerichtet ist nicht kaputt: Die Einladung steht trotzdem in der Liste, mit dem Link zum Weitergeben.
  if (!apiKey) return { ok: false, error: "missing_resend_api_key" };
  if (!from) return { ok: false, error: "missing_resend_from_email" };

  const who = params.inviterName ? escapeHtml(params.inviterName) : "Jemand";
  const org = escapeHtml(params.orgName);
  const roleText =
    params.role === "owner" ? "als Admin" : params.role === "coordinator" ? "als Koordination" : params.role === "guest" ? "als Gast (nur lesend)" : "als Advisor";
  const html = [
    "<p>Hallo,</p>",
    `<p>${who} hat dich zu <strong>${org}</strong> bei ${PRODUCT_NAME} eingeladen, ${roleText}.`,
    "Gemeinsam arbeitet ihr dann an einem Programm: mit Plan, Experten-Liste, Lernbereich und den Teams,",
    "für die du als Bezugsperson eingetragen bist.</p>",
    `<p><a href="${escapeHtml(params.url)}">Einladung ansehen</a></p>`,
    "<p><strong>So geht es weiter:</strong> Melde dich mit genau dieser E-Mail-Adresse an",
    `(${escapeHtml(params.recipientEmail)}). Hast du noch kein Konto, wird dabei eines angelegt.`,
    "Danach siehst du die Einladung und bestätigst mit einem Klick. Erst dann gehörst du dazu.</p>",
    "<p>Du hast die Einladung nicht erwartet? Dann ignoriere diese Mail, es passiert nichts.</p>",
  ].join("\n");
  const text =
    `${params.inviterName ?? "Jemand"} hat dich zu ${params.orgName} bei ${PRODUCT_NAME} eingeladen, ${roleText}.\n\n` +
    `Einladung ansehen: ${params.url}\n\n` +
    `So geht es weiter: Melde dich mit genau dieser E-Mail-Adresse an (${params.recipientEmail}). ` +
    "Hast du noch kein Konto, wird dabei eines angelegt. Danach siehst du die Einladung und bestätigst mit einem Klick. " +
    "Erst dann gehörst du dazu.\n\n" +
    "Du hast die Einladung nicht erwartet? Dann ignoriere diese Mail, es passiert nichts.";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [params.recipientEmail], subject: buildAdvisorOrgInviteSubject(params), html, text }),
    });
    if (!response.ok) return { ok: false, error: `resend_${response.status}` };
    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch {
    return { ok: false, error: "unexpected_delivery_error" };
  }
}
