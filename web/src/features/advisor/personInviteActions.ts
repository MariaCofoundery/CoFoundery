"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADVISOR_SCOPES } from "@/features/advisor/personAccessData";
import { sendAdvisorPersonInviteEmail } from "@/lib/email/sendAdvisorPersonInviteEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

/**
 * Eine Person einladen - von innen.
 *
 * ENTSCHIEDEN AM 23.09.2026: "Sie können eine Einladungs-E-Mail rausschicken,
 * aber die kommt von innen. Ich bin eingeloggt bei CoFoundery und schicke dem
 * Founder einen Token oder eine E-Mail - so wie wir das auch mit dem
 * Co-Founder haben."
 *
 * WARUM NICHT SUCHEN: Eine Suche nach einer E-Mail-Adresse hätte verraten, ob
 * es zu ihr ein Konto gibt. Das ist eine Auskunft über einen Menschen, die
 * niemand geben sollte. Eine Einladung verrät nichts - sie geht an eine
 * Adresse, die der Advisor ohnehin kennt.
 *
 * DER TOKEN ENTSTEHT HIER, die Datenbank bekommt nur seinen Hash. Wer die
 * Datenbank liest, kann damit keine Einladung annehmen. Dieselbe Bauweise wie
 * bei der Team-Einladung.
 */

const PATH = "/advisor/dashboard";

function back(error: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?error=${encodeURIComponent(error)}#person-invites`);
}

export async function invitePersonAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const note = String(formData.get("note") ?? "").trim();
  const scopes = ADVISOR_SCOPES.filter((scope) => formData.get(`scope_${scope}`) === "on");

  if (!email.includes("@") || email.length < 3) back("email");
  // Ohne Umfang ist die Einladung eine Frage ohne Inhalt.
  if (scopes.length === 0) back("scopes");

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // IN WESSEN NAMEN gefragt wird, entscheidet der Halter des spaeteren
  // Zugangs - und damit, ob er bleibt, wenn diese Advisorin geht. Ob sie in
  // der Organisation ueberhaupt aktiv ist, prueft die Datenbank.
  const holder = String(formData.get("holder") ?? "self");
  const orgId = holder.startsWith("org:") ? holder.slice(4) : null;

  const { error } = await client.rpc("create_advisor_person_invite", {
    p_email: email,
    p_token_hash: tokenHash,
    p_scopes: scopes,
    p_note: note.length > 0 ? note : null,
    p_org_id: orgId,
  });
  if (error) back("create");

  // DIE MAIL IST BESTENFALLS. Geht sie nicht raus, ist die Einladung trotzdem
  // angelegt - und der Advisor sieht sie in seiner Liste samt Zustand. Eine
  // Einladung, die an einem Mailfehler scheitert, wäre schlimmer: Dann stünde
  // nirgends, dass gefragt wurde.
  await sendAdvisorPersonInviteEmail({
    recipientEmail: email,
    note: note.length > 0 ? note : null,
    url: `${getPublicAppOrigin()}/invite/person-access/${token}`,
  });

  revalidatePath(PATH);
  redirect(`${PATH}?notice=invited#person-invites`);
}

export async function revokePersonInviteAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);

  await client.rpc("revoke_advisor_person_invite", {
    p_invite_id: String(formData.get("inviteId") ?? ""),
  });
  revalidatePath(PATH);
  redirect(`${PATH}#person-invites`);
}
