"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnSearchPreferences } from "@/features/discovery/discoveryData";
import { buildDiscoverySearchCriteria } from "@/features/discovery/savedSearchFromPreferences";
import { createClient } from "@/lib/supabase/server";

/**
 * Eine Discovery-Suche merken - mit Benachrichtigung.
 *
 * Anders als in Connect gibt es hier keine zweite Suchmaske, und das ist
 * Absicht: Discovery speichert die Kriterien laengst, in den
 * Suchpraeferenzen. Eine zweite Stelle, an der man dasselbe noch einmal
 * eingrenzt, waere ein zweiter Ort, an dem etwas anderes stehen kann als im
 * Kopf der suchenden Person.
 *
 * Gemerkt wird deshalb, was gerade angewendet ist. Neu ist nur zweierlei: ein
 * Name, damit die Meldung nach Wochen noch zuzuordnen ist, und die
 * ausdruecklich gesuchten Faehigkeiten - die kommen in den Praeferenzen nicht
 * vor, weil sie dort nie gebraucht wurden.
 *
 * Die Alignment-Dimensionen werden mitgeschrieben, wirken aber nur in der
 * Liste. Warum, steht in discoverySavedSearchMatching.ts.
 */

/** Angekreuzte Bereiche - nur plausible Kennungen, gekappt. */
function parseAreaIds(values: FormDataEntryValue[]) {
  return [
    ...new Set(
      values
        .map((value) => String(value).trim())
        .filter((value) => value.length > 0 && value.length <= 64)
    ),
  ].slice(0, 8);
}

export async function saveDiscoverySearchAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=%2Fdiscovery");

  const label = String(formData.get("label") ?? "").trim();
  if (label.length < 2 || label.length > 80) {
    redirect("/discovery?mode=search&searchResult=label#search");
  }

  const preferences = await getOwnSearchPreferences(user.id).catch(() => null);

  const { error } = await client.from("saved_searches").insert({
    user_id: user.id,
    context: "discovery",
    label,
    query: "",
    ...buildDiscoverySearchCriteria(preferences),
    capability_area_ids: parseAreaIds(formData.getAll("capability_area_ids")),
    include_listings: false,
    include_problems: false,
  });

  if (error) {
    // Eine Suche ohne ein einziges Kriterium waere ein Abonnement auf jedes
    // neue Profil. Die Datenbank laesst sie nicht zu.
    redirect(
      `/discovery?mode=search&searchResult=${error.message.includes("not_empty") ? "empty" : "failed"}#search`
    );
  }

  revalidatePath("/discovery/searches");
  redirect("/discovery/searches?saved=created");
}

export async function setDiscoverySearchNotifyAction(formData: FormData) {
  const client = await createClient();
  const id = String(formData.get("search_id") ?? "").trim();
  const notify = String(formData.get("notify") ?? "") === "true";

  const { error } = await client.from("saved_searches").update({ notify }).eq("id", id);
  if (error) redirect("/discovery/searches?error=save");

  revalidatePath("/discovery/searches");
  redirect("/discovery/searches");
}

export async function deleteDiscoverySearchAction(formData: FormData) {
  const client = await createClient();
  const id = String(formData.get("search_id") ?? "").trim();

  const { error } = await client.from("saved_searches").delete().eq("id", id);
  if (error) redirect("/discovery/searches?error=save");

  revalidatePath("/discovery/searches");
  redirect("/discovery/searches?saved=deleted");
}
