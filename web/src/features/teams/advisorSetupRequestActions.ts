"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Die begleitende Person bittet um Freigabe des Founder Setup.
 *
 * Vorher konnte nur ein FOUNDER eine Freigabe vorschlagen - der Advisor musste
 * es ausserhalb des Produkts sagen und hoffen, dass die Founder den Weg finden.
 *
 * Diese Aktion vergibt KEINE Berechtigung. Sie legt eine Anfrage an; jedes
 * Teammitglied stimmt weiterhin selbst zu. Die Pruefung liegt vollstaendig in
 * `request_founder_team_advisor_setup_grant` - insbesondere, dass die Quelle
 * dort GESUCHT und nicht uebergeben wird. Hier wird nichts davon nachgebaut.
 */
export async function requestFounderSetupAccessAction(
  invitationId: string,
  relationshipId: string
) {
  const back = (query: string) =>
    `/advisor/session?invitationId=${encodeURIComponent(invitationId)}&${query}`;

  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back(""))}`);

  const client = await createClient();
  const { error } = await client.rpc("request_founder_team_advisor_setup_grant", {
    p_relationship_id: relationshipId,
  });

  revalidatePath("/advisor/session");
  revalidatePath("/advisor/dashboard");

  if (!error) {
    redirect(back("saved=setup_request"));
  }

  // BEHOBEN am 20.09.2026: Hier stand eine einzige Meldung, die eine Ursache
  // BEHAUPTET hat ("moeglicherweise ist deine Freigabe nicht mehr aktiv") -
  // und in Marias Fall war sie falsch. Das Team hatte einfach noch kein
  // Founder-Homebase.
  //
  // Die Funktion unterscheidet das jetzt ueber den Fehlercode: P0002 heisst
  // "kein Founder-Team", 42501 heisst "nicht berechtigt". Eine Meldung, die
  // eine falsche Ursache nennt, schickt Menschen an die falsche Stelle.
  const missingTeam =
    error.code === "P0002" || error.message.includes("setup_team_missing");
  redirect(back(missingTeam ? "error=setup_request_no_team" : "error=setup_request"));
}
