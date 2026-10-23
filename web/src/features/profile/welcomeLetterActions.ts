"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** "Gelesen": haelt fest, seit wann die Person den Begruessungsbrief kennt. */
export async function confirmWelcomeLetterAction() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;
  await client
    .from("person_core")
    .update({ welcome_letter_seen_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("welcome_letter_seen_at", null);
  revalidatePath("/", "layout");
}
