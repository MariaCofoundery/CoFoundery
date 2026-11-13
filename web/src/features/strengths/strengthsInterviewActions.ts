"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Die Handlungen des Stärken-Interviews.
 *
 * DIESELBE MECHANIK WIE DIRECTION (`directionInterviewActions.ts`), andere
 * Art und andere Fragen. Was danach passiert, ist eigen: Keine Einordnung in
 * Bereiche, sondern - auf ausdrückliche Anforderung - eine Auswertung des
 * ganzen Gesprächs (`request_strength_proposals`).
 */

const PATH = "/profile/strengths-interview";

function back(error: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?error=${encodeURIComponent(error)}`);
}

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);
  return { client, userId: user.id };
}

/**
 * Die Auswertung anfordern - für ein ganzes, abgeschlossenes Gespräch.
 *
 * NUR AUF DIESEN KNOPFDRUCK. Die Datenbank prüft, dass das Gespräch der
 * Person gehört, ein Stärken-Interview ist und abgeschlossen wurde.
 */
export async function requestStrengthProposalsAction(formData: FormData) {
  const { client } = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");

  const { error } = await client.rpc("request_strength_proposals", { p_session_id: sessionId });
  if (error) back("ask");

  revalidatePath(PATH);
  redirect(`${PATH}?notice=reading`);
}
