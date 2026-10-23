"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Antwort auf die einmalige Highlight-Frage in Connect.
 *
 * Das Haekchen ist vorgewaehlt, aber die Antwort wird erst mit dem Absenden
 * gezaehlt: `highlight_prompt_answered_at` ist der Beleg, dass gefragt wurde.
 * Ohne Profil gibt es nichts zu zeigen und nichts zu fragen.
 */
export async function answerHighlightPromptAction(formData: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login?next=/connect");
  await client
    .from("network_profiles")
    .update({
      highlightable: formData.get("highlightable") === "yes",
      highlight_prompt_answered_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  revalidatePath("/connect");
  redirect("/connect");
}
