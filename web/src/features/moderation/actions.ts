"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { isModerationStatus, moderationFilter, moderationPage, moderationUrl } from "@/features/moderation/model";

export async function moderateReportAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const destination = moderationUrl(moderationFilter(formData.get("filter")), moderationPage(formData.get("page")));
  const resultUrl = (result: string) => `${destination}${destination.includes("?") ? "&" : "?"}result=${result}`;
  const id = formData.get("report_id");
  const status = formData.get("status");
  const note = formData.get("admin_note");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || !isModerationStatus(status) || typeof note !== "string" || note.trim().length > 2000) {
    redirect(resultUrl("invalid"));
  }
  const { error } = await client.rpc("moderate_network_report", {
    p_report_id: id, p_status: status, p_admin_note: note.trim() || null,
  });
  if (error) redirect(resultUrl("error"));
  revalidatePath("/admin/moderation");
  redirect(resultUrl("saved"));
}
