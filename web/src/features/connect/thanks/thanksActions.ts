"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { parseThanksForm } from "./thanksModel";

const CONTACTS = "/connect/contacts";

export async function sendThanksAction(formData: FormData) {
  const { client } = await requireConnectMember(CONTACTS);
  const parsed = parseThanksForm(formData);
  const id = String(formData.get("request_id") ?? "").trim();
  if (!parsed) redirect(`/connect/danke/${encodeURIComponent(id)}?error=invalid`);
  const { error } = await client.rpc("send_network_thanks", {
    p_request_id: parsed.requestId, p_help_types: parsed.helpTypes, p_outcome: parsed.outcome ?? "", p_body: parsed.body ?? "", p_show: parsed.show,
  });
  if (error) redirect(`${CONTACTS}?error=thanks`);
  revalidatePath(CONTACTS);
  redirect(`${CONTACTS}?changed=thanked`);
}

export async function setThanksHiddenAction(formData: FormData) {
  const { client } = await requireConnectMember(CONTACTS);
  const id = String(formData.get("id") ?? "").trim();
  const hidden = formData.get("hidden") === "1";
  if (!id) redirect(`${CONTACTS}?error=thanks`);
  const { error } = await client.rpc("set_network_thanks_hidden", { p_thanks_id: id, p_hidden: hidden });
  if (error) redirect(`${CONTACTS}?error=thanks`);
  revalidatePath(CONTACTS);
  redirect(`${CONTACTS}?changed=${hidden ? "thanks_hidden" : "thanks_shown"}`);
}
