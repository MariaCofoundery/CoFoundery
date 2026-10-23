"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/moderation/access";

/** Haelt fest, ob die woechentliche Recherche-Erinnerung erledigt ist (oder nimmt es zurueck). */
export async function markProblemResearchDoneAction(form: FormData) {
  const client = await requirePlatformAdmin();
  await client.rpc("admin_mark_reminder_done", { p_key: "problem_research", p_done: form.get("done") !== "no" });
  revalidatePath("/admin");
  redirect("/admin");
}
