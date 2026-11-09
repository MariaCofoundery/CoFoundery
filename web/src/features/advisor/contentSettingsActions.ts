"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBrandColor, isChannel, isPostStatus, CONTENT_KINDS, type ContentKind } from "@/features/advisor/socialCalendarModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";

/**
 * Marken, Saeulen, Formate und der Standard fuer neue Beitraege (20270411120000). Wer das Recht "Termine, Formate und
 * Materialien pflegen" hat, pflegt sie; die Datenbank prueft das. Der Rueckweg wird aus der Organisation zusammengesetzt.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return UUID.test(text) ? text : null;
};

async function context(formData: FormData) {
  const orgId = uuidOrNull(formData.get("orgId"));
  if (!orgId) redirect(teamraumHref("social", "", {}));
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login");
  return { client, orgId: orgId as string, back: (extra: Record<string, string> = {}) => `${teamraumHref("social", orgId as string, { reiter: "einstellungen", ...extra })}` };
}

function done(path: string): never {
  revalidatePath("/advisor/teamraum", "layout");
  redirect(path);
}

export async function saveContentItemAction(formData: FormData) {
  const { client, orgId, back } = await context(formData);
  const kind = String(formData.get("kind") ?? "") as ContentKind;
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const color = String(formData.get("color") ?? "");
  if (!CONTENT_KINDS.includes(kind) || !name) done(back({ contentError: "1" }));
  const { error } = await client.rpc("save_content_item", {
    p_org_id: orgId,
    p_id: uuidOrNull(formData.get("id")),
    p_kind: kind,
    p_name: name,
    p_color: kind === "brand" && isBrandColor(color) ? color : null,
  });
  done(back(error ? { contentError: "1" } : { contentSaved: "1" }));
}

export async function deleteContentItemAction(formData: FormData) {
  const { client, back } = await context(formData);
  const id = uuidOrNull(formData.get("id"));
  const { error } = id ? await client.rpc("delete_content_item", { p_id: id }) : { error: { message: "id" } };
  done(back(error ? { contentError: "1" } : { contentSaved: "1" }));
}

export async function saveContentDefaultsAction(formData: FormData) {
  const { client, orgId, back } = await context(formData);
  const channel = String(formData.get("channel") ?? "");
  const status = String(formData.get("status") ?? "");
  const { error } = await client.rpc("save_content_defaults", {
    p_org_id: orgId,
    p_brand_id: uuidOrNull(formData.get("brandId")),
    p_pillar_id: uuidOrNull(formData.get("pillarId")),
    p_format_id: uuidOrNull(formData.get("formatId")),
    p_channel: isChannel(channel) ? channel : null,
    p_approver_user_id: uuidOrNull(formData.get("approver")),
    p_status: isPostStatus(status) ? status : null,
  });
  done(back(error ? { contentError: "1" } : { contentSaved: "1" }));
}
