"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Eine Karte in "Wer ist wer" eintragen (20270327120000, erweitert 20270408120000). Wer was darf, prueft die Datenbank:
 * die Person alles fuer sich; die Inhaberin Kurzzeile, Text, Kontakt, Sichtbarkeit und WELCHE Startups die Karte sehen -
 * fuer jede Person, aber nie gegen eine Zuruecknahme der Person selbst.
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
  // Die Auswahl der Startups kommt nur aus dem Formular der Inhaberin: "alle" = leere Liste, "ausgewaehlte" = die Haken.
  const audienceMode = formData.get("audience");
  const picked = formData.getAll("programId").map(String).filter((id) => UUID.test(id));
  if (audienceMode === "selected" && formData.get("shown") === "yes" && picked.length === 0) redirect(back("&cardError=audience"));
  const { error } = await client.rpc("save_org_member_card", {
    p_org_id: orgId,
    p_user_id: userId,
    p_headline: String(formData.get("headline") ?? "").slice(0, 120),
    p_about: String(formData.get("about") ?? "").slice(0, 600),
    p_contact: formData.has("contact") ? String(formData.get("contact") ?? "").slice(0, 200) : null,
    p_shown: formData.get("shown") === "yes",
    p_program_ids: audienceMode === "selected" ? picked : audienceMode === "all" ? [] : null,
  });
  revalidatePath("/advisor/organisation");
  revalidatePath("/programm");
  redirect(back(error ? `&cardError=${/self_hidden/.test(error.message) ? "hidden" : /audience_invalid/.test(error.message) ? "audience" : "failed"}` : `&cardSaved=${encodeURIComponent(userId)}`));
}
