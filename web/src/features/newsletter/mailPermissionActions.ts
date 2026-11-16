"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireConnectMember } from "@/features/connect/connectAccess";

/** "Darf in Mails erscheinen": die einstellende Person erlaubt oder verbietet, dass ihr Eintrag (ohne Namen) im Newsletter vorkommt. */
export async function setAllowInMailsAction(formData: FormData) {
  const { client } = await requireConnectMember("/connect");
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "").trim();
  const allow = formData.get("allow") === "1";
  const back = kind === "problem" ? `/connect/problems/${id}` : `/connect/listings/${id}`;
  if ((kind !== "listing" && kind !== "problem") || !id) redirect(back);
  await client.rpc("set_allow_in_mails", { p_kind: kind, p_id: id, p_allow: allow });
  revalidatePath(back);
  redirect(back);
}
