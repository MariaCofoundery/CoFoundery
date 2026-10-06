"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendAdvisorPersonInviteEmail } from "@/lib/email/sendAdvisorPersonInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";
import { orgErrorCode, type OrgActionErrorCode } from "@/features/advisor/orgErrors";

/**
 * Organisation anlegen, Menschen aufnehmen, Mitgliedschaft beenden.
 *
 * NIEMAND LEGT KONTEN FÜR ANDERE AN. Die Organisation lädt per Mail ein, jeder
 * meldet sich selbst an, und die Mitgliedschaft verbindet beides - wer Konten
 * für andere Menschen anlegt, hält deren Zugangsdaten.
 *
 * Wer was darf, prüft die Datenbank: Aufnehmen und Beenden kann nur, wer die
 * Organisation führt. Eine zweite Kopie dieser Regel hier wäre die erste, die
 * ausläuft.
 */

const PATH = "/advisor/dashboard";
const ANCHOR = "#advisor-org";

function back(error: OrgActionErrorCode): never {
  revalidatePath(PATH);
  redirect(`${PATH}?orgError=${encodeURIComponent(error)}${ANCHOR}`);
}

/**
 * Eine ausgesetzte Organisation verwaltet niemand weiter. Austreten bleibt
 * moeglich - das ist kein Verwalten, sondern Gehen.
 */
async function assertOrgActive(client: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const { data } = await client.from("advisor_orgs").select("status").eq("id", orgId).maybeSingle();
  if ((data as { status?: string } | null)?.status === "suspended") back("org_suspended");
}

function done(): never {
  revalidatePath(PATH);
  redirect(`${PATH}${ANCHOR}`);
}

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);
  return { client, userId: user.id };
}

export async function createAdvisorOrgAction(formData: FormData) {
  const { client } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 120) back("org_name");

  const { error } = await client.rpc("create_advisor_org", { p_name: name });
  if (error) back(orgErrorCode(error.message));
  done();
}

export async function inviteOrgAdvisorAction(formData: FormData) {
  const { client } = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) back("email");
  await assertOrgActive(client, orgId);

  const token = randomBytes(24).toString("hex");
  const { error } = await client.rpc("create_advisor_org_invite", {
    p_org_id: orgId,
    p_email: email,
    p_token_hash: createHash("sha256").update(token).digest("hex"),
    p_role: formData.get("role") === "owner" ? "owner" : "advisor",
  });
  if (error) back(orgErrorCode(error.message));

  // Dieselbe Mail wie bei einer Person, mit einer anderen Adresse dahinter:
  // Sie sagt, dass jemand fragt, und sie verspricht nichts.
  await sendAdvisorPersonInviteEmail({
    recipientEmail: email,
    note: null,
    url: `${getPublicAppOrigin()}/invite/advisor-org/${token}`,
  });
  done();
}

export async function setOrgMembershipAction(formData: FormData) {
  const { client } = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  await assertOrgActive(client, orgId);
  const { data, error } = await client.rpc("set_advisor_org_membership", {
    p_org_id: orgId,
    p_user_id: String(formData.get("userId") ?? ""),
    p_status: formData.get("status") === "active" ? "active" : "revoked",
  });
  if (error) back(orgErrorCode(error.message));
  // Keine Zeile getroffen: Die Mitgliedschaft gibt es (so) nicht mehr.
  if (data === false) back("org_not_member");
  done();
}

/**
 * Selbst-Austritt (Phase 12C.1B). Die Datenbank prueft alles: nur die eigene
 * aktive Mitgliedschaft, und eine Inhaberin nur, wenn eine andere bleibt.
 * Danach endet jeder Zugriff ueber die Organisation sofort.
 */
export async function leaveOrgAction(formData: FormData) {
  const { client } = await requireUser();
  const { error } = await client.rpc("leave_advisor_org", {
    p_org_id: String(formData.get("orgId") ?? ""),
  });
  if (error) back(orgErrorCode(error.message));
  done();
}

/**
 * Was die Organisation über sich sagt.
 *
 * GEMELDET AM 25.09.2026: "Ich habe als Advisor quasi den Accelerator angelegt,
 * aber ich bin noch nicht ganz so zufrieden damit, wie das dann so aussieht."
 *
 * Sie hatte bis dahin einen Namen, einen Status und eine Sitzanzahl - und eine
 * Founderin, die um Freigabe gebeten wurde, sah davon nicht einmal den Namen.
 * Diese Angaben stehen deshalb nicht hier zur Zierde: Sie sind das, was an der
 * Einwilligungsstelle gelesen wird.
 *
 * DIE LÄNGEN PRÜFT DIE DATENBANK, nicht diese Aktion. Hier steht nur, was für
 * eine brauchbare Rückmeldung nötig ist - eine zweite Kopie der Regeln wäre
 * die erste, die ausläuft. Was hier geprüft wird, ist die FORM der Eingabe:
 * dass aus einer Zeile Text eine Liste wird.
 */
export async function updateAdvisorOrgProfileAction(formData: FormData) {
  const { client } = await requireUser();

  const orgId = String(formData.get("orgId") ?? "").trim();
  if (!orgId) back("org_failed");
  await assertOrgActive(client, orgId);

  // Schwerpunkte kommen als eine Zeile mit Kommas - acht sind das Maximum,
  // und leere Stücke fliegen raus, damit "a,,b" nicht drei Einträge ergibt.
  const focusRaw = String(formData.get("focus") ?? "").trim();
  const focus = focusRaw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 8);

  const { error } = await client.rpc("update_advisor_org_profile", {
    p_org_id: orgId,
    p_name: String(formData.get("name") ?? "").trim() || null,
    p_description: String(formData.get("description") ?? "").trim() || null,
    p_website_url: String(formData.get("websiteUrl") ?? "").trim() || null,
    p_focus: focus.length > 0 ? focus : null,
    p_location_region: String(formData.get("locationRegion") ?? "").trim() || null,
  });
  if (error) back(orgErrorCode(error.message));
  done();
}
