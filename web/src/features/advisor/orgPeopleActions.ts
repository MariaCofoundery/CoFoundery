"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Eine Karte in "Wer ist wer" eintragen (20270327120000). Wer was darf, prueft die Datenbank: die Person alles fuer
 * sich, die Inhaberin Kurzzeile, Text und Sichtbarkeit fuer andere - nie den Kontakt, nie gegen eine Zuruecknahme.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function saveOrgMemberCardAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const fromSetup = formData.get("back") === "setup";
  const back = (extra: string) => (fromSetup ? `/advisor/los-gehts?org=${encodeURIComponent(orgId)}&schritt=people${extra}` : `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=members${extra}#wer-ist-wer`);
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(back(""))}`);
  if (!UUID.test(orgId) || !UUID.test(userId)) redirect(back("&cardError=failed"));
  const { error } = await client.rpc("save_org_member_card", {
    p_org_id: orgId,
    p_user_id: userId,
    p_headline: String(formData.get("headline") ?? "").slice(0, 120),
    p_about: String(formData.get("about") ?? "").slice(0, 600),
    p_contact: String(formData.get("contact") ?? "").slice(0, 200),
    p_shown: formData.get("shown") === "yes",
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(back(error ? `&cardError=${/self_hidden/.test(error.message) ? "hidden" : "failed"}` : `&cardSaved=${encodeURIComponent(userId)}`));
}
