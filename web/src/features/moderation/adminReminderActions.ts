"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/moderation/access";

const KEYS = ["problem_research", "db_dump"] as const;

/** Haelt fest, ob eine wiederkehrende Erinnerung erledigt ist (oder nimmt es zurueck). */
export async function markReminderDoneAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const key = String(form.get("key") ?? "");
  if ((KEYS as readonly string[]).includes(key)) {
    await client.rpc("admin_mark_reminder_done", { p_key: key, p_done: form.get("done") !== "no" });
  }
  revalidatePath("/admin");
  redirect("/admin");
}
