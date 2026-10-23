"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/moderation/access";

const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Als gelesen markieren (oder wieder als neu) und zum naechsten springen. */
export async function markFeedbackReadAction(form: FormData) {
  const client = await requirePlatformAdmin();
  const id = form.get("id");
  const tab = ["new", "all", "read"].includes(String(form.get("tab"))) ? String(form.get("tab")) : "new";
  if (uuid(id)) await client.rpc("admin_mark_feedback_read", { p_id: id, p_read: form.get("read") !== "no" });
  const next = form.get("next");
  revalidatePath("/admin");
  redirect(`/admin?tab=${tab}${uuid(next) ? `&id=${next}` : ""}#feedback`);
}
