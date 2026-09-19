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
  redirect(back(error ? "error=setup_request" : "saved=setup_request"));
}
