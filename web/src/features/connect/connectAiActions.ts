"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAiAvailability } from "@/features/ai/aiAvailability";
import { createClient } from "@/lib/supabase/server";

/**
 * Einen eigenen, veroeffentlichten Eintrag von der KI lesen lassen.
 *
 * NUR AUF AUSDRUECKLICHE ANFORDERUNG. Veroeffentlichen loest keine KI aus;
 * diese Aktion ist der einzige Weg, auf dem ein CONNECT-Text in die
 * Warteschlange kommt - und sie haengt an einem Knopf, vor dem steht, was
 * passiert.
 *
 * DREI BEDINGUNGEN, hier geprueft und nicht nur in der Oberflaeche:
 *   1. der eigene Eintrag (`owner_user_id`),
 *   2. ein aktiver, nicht abgelaufener Eintrag - ein Entwurf ist fuer niemanden
 *      sichtbar, auch nicht fuer ein Modell,
 *   3. eine erreichbare KI - sonst laege der Text in der Schlange, ohne dass
 *      der Knopf je angezeigt worden waere.
 *
 * Die Datenbank prueft beim Lesen noch einmal Eigentum und Status
 * (`get_ai_job_source_text`), und `enqueue_ai_job` legt keinen zweiten
 * offenen Auftrag fuer denselben Eintrag an.
 */
export async function requestListingResourceProposalsAction(formData: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login?next=/connect/my");
  const { data: eligible } = await client.rpc("is_network_member");
  if (!eligible) redirect("/dashboard");

  const listingId = String(formData.get("listingId") ?? "").trim();
  const { data: listing, error } = listingId
    ? await client
        .from("network_listings")
        .select("id, status, expires_at")
        .eq("id", listingId)
        .eq("owner_user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };
  if (error || !listing) redirect("/connect/my?error=save");

  const back = `/connect/listings/${listing.id}`;
  const active =
    listing.status === "active" &&
    Boolean(listing.expires_at && new Date(listing.expires_at) > new Date());
  if (!active) redirect(`${back}?ai=unavailable`);
  if (!(await getAiAvailability(client))) redirect(`${back}?ai=unavailable`);

  const { error: enqueueError } = await client.rpc("enqueue_ai_job", {
    p_job_type: "connect_resource_extraction",
    p_source_table: "network_listings",
    p_source_id: listing.id,
  });
  if (enqueueError) redirect(`${back}?ai=failed`);

  revalidatePath(back);
  redirect(`${back}?ai=requested`);
}
