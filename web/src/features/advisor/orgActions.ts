"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendAdvisorPersonInviteEmail } from "@/lib/email/sendAdvisorPersonInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

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

function back(error: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?error=${encodeURIComponent(error)}${ANCHOR}`);
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
  if (error) back("org_create");
  done();
}

export async function inviteOrgAdvisorAction(formData: FormData) {
  const { client } = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) back("email");

  const token = randomBytes(24).toString("hex");
  const { error } = await client.rpc("create_advisor_org_invite", {
    p_org_id: orgId,
    p_email: email,
    p_token_hash: createHash("sha256").update(token).digest("hex"),
    p_role: formData.get("role") === "owner" ? "owner" : "advisor",
  });
  if (error) back("org_invite");

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
  const { error } = await client.rpc("set_advisor_org_membership", {
    p_org_id: String(formData.get("orgId") ?? ""),
    p_user_id: String(formData.get("userId") ?? ""),
    p_status: formData.get("status") === "active" ? "active" : "revoked",
  });
  if (error) back("org_membership");
  done();
}
