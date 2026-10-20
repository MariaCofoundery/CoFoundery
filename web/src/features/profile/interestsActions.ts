"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseInterests } from "@/features/profile/interests";
import { writeInterests } from "@/features/profile/interestsData";
import { createClient } from "@/lib/supabase/server";

/**
 * „Wofuer ich hier bin" speichern. Aendert nichts an Rollen oder Zugaengen -
 * siehe `interests.ts`.
 */
export async function saveInterestsAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/profile%3Fstep%3Didentity");

  const ok = await writeInterests(client, user.id, parseInterests(formData.getAll("interest")));
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect(ok ? "/profile?step=identity&saved=interests" : "/profile?step=identity&error=save");
}
